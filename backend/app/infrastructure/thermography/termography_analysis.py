from __future__ import annotations

import json
import math
import struct
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image


IR_DATA_PATH = "Images/Main/IR.data"
IR_INFO_PATH = "Images/Main/IRImageInfo.gpbenc"
VISIBLE_INFO_PATH = "Images/Main/VLImageInfo.gpbenc"
CALIBRATION_PATH = "CalibrationData.gpbenc"
VISIBLE_IMAGE_CANDIDATES = (
    "Images/Main/028001E0.jpg",
    "Images/Main/028001E1.jpg",
    "Thumbnails/014000F0.jpg",
)
REQUIRED_PARAMETERS = {
    10: "emissivity",
    11: "reflected_temp",
    12: "transmission",
}
MAX_EXPANDED_MEMBER_SIZE = 100 * 1024 * 1024
MAX_EXPANDED_ARCHIVE_SIZE = 200 * 1024 * 1024


class InvalidThermographyFile(ValueError):
    """Arquivo IS2 sem dados radiométricos completos ou íntegros."""


@dataclass(frozen=True)
class ProcessedThermography:
    matrix_file_name: str
    visible_image_file_name: str
    thermal_image_file_name: str
    thermal_overlay_file_name: str
    metadata_file_name: str
    metadata: dict[str, Any]


def read_varint(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while offset < len(data):
        byte = data[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, offset
        shift += 7
        if shift > 70:
            break
    raise InvalidThermographyFile("Metadado protobuf inválido ou incompleto.")


def parse_protobuf_fields(data: bytes) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    offset = 0
    while offset < len(data):
        tag, offset = read_varint(data, offset)
        field_number, wire_type = tag >> 3, tag & 0x07
        if field_number == 0:
            raise InvalidThermographyFile("Metadado protobuf contém um campo inválido.")
        if wire_type == 0:
            value, offset = read_varint(data, offset)
        elif wire_type == 1:
            if offset + 8 > len(data):
                raise InvalidThermographyFile("Metadado protobuf truncado.")
            value, offset = data[offset:offset + 8], offset + 8
        elif wire_type == 2:
            length, offset = read_varint(data, offset)
            if offset + length > len(data):
                raise InvalidThermographyFile("Metadado protobuf truncado.")
            value, offset = data[offset:offset + length], offset + length
        elif wire_type == 5:
            if offset + 4 > len(data):
                raise InvalidThermographyFile("Metadado protobuf truncado.")
            value, offset = data[offset:offset + 4], offset + 4
        else:
            raise InvalidThermographyFile("Tipo de campo protobuf não suportado.")
        fields.append({"field_number": field_number, "wire_type": wire_type, "value": value})
    return fields


def _float_from_field(field: dict[str, Any]) -> float:
    try:
        if field["wire_type"] == 5:
            value = struct.unpack("<f", field["value"])[0]
        elif field["wire_type"] == 1:
            value = struct.unpack("<d", field["value"])[0]
        else:
            raise ValueError
    except (struct.error, ValueError, TypeError) as error:
        raise InvalidThermographyFile("Parâmetro radiométrico inválido no arquivo.") from error
    if not math.isfinite(value):
        raise InvalidThermographyFile("O arquivo contém um parâmetro radiométrico não finito.")
    return float(value)


def extract_ir_parameters(data: bytes) -> dict[str, float]:
    """Retorna apenas os parâmetros encontrados; nunca inventa defaults."""
    values: dict[str, float] = {}
    for field in parse_protobuf_fields(data):
        name = REQUIRED_PARAMETERS.get(field["field_number"])
        if name and field["wire_type"] in (1, 5):
            values[name] = _float_from_field(field)
    missing = sorted(set(REQUIRED_PARAMETERS.values()) - set(values))
    if missing:
        labels = {
            "emissivity": "emissividade",
            "reflected_temp": "temperatura refletida",
            "transmission": "transmissão",
        }
        raise InvalidThermographyFile(
            "Arquivo rejeitado: metadados obrigatórios ausentes ("
            + ", ".join(labels[name] for name in missing)
            + ")."
        )
    if not 0 < values["emissivity"] <= 1:
        raise InvalidThermographyFile("Emissividade deve ser maior que 0 e menor ou igual a 1.")
    if values["reflected_temp"] <= -273.15:
        raise InvalidThermographyFile("Temperatura refletida está abaixo do zero absoluto.")
    if not 0 < values["transmission"] <= 1:
        raise InvalidThermographyFile("Transmissão deve ser maior que 0 e menor ou igual a 1.")
    return values


def extract_calibration_curves(data: bytes) -> list[dict[str, float]]:
    curves: list[dict[str, float]] = []
    for field in parse_protobuf_fields(data):
        if field["field_number"] != 3 or field["wire_type"] != 2:
            continue
        try:
            level2 = parse_protobuf_fields(field["value"])
        except InvalidThermographyFile:
            continue
        for subfield in level2:
            if subfield["wire_type"] != 2:
                continue
            try:
                entries = parse_protobuf_fields(subfield["value"])
                values = {
                    item["field_number"]: _float_from_field(item)
                    for item in entries
                    if item["field_number"] in (1, 2, 3, 4, 5)
                    and item["wire_type"] in (1, 5)
                }
            except InvalidThermographyFile:
                continue
            if len(values) == 5 and values[1] < values[2]:
                curves.append({
                    "min_temp": values[1], "max_temp": values[2],
                    "A": values[3], "B": values[4], "C": values[5],
                })
    unique = {
        tuple(round(curve[key], 6) for key in ("min_temp", "max_temp", "A", "B", "C")): curve
        for curve in curves
    }
    result = sorted(unique.values(), key=lambda curve: curve["min_temp"])
    if not result:
        raise InvalidThermographyFile("O arquivo não contém curvas de calibração válidas.")
    return result


def extract_raw_matrix(data: bytes) -> np.ndarray:
    header_size = 640
    if len(data) <= header_size or (len(data) - header_size) % 2:
        raise InvalidThermographyFile("Dados radiométricos ausentes ou truncados.")
    raw_values = np.frombuffer(data[header_size:], dtype="<u2").copy()
    total = raw_values.size
    if total == 240 * 320:
        height, width = 240, 320
    else:
        possible = [
            (height, total // height)
            for height in range(1, math.isqrt(total) + 1)
            if total % height == 0
        ]
        if not possible:
            raise InvalidThermographyFile("Não foi possível determinar a resolução térmica.")
        height, width = min(possible, key=lambda pair: abs(pair[1] / pair[0] - 4 / 3))
    return raw_values.reshape(height, width)


def raw_to_temperature(raw_matrix: np.ndarray, curves: list[dict[str, float]]) -> np.ndarray:
    raw = raw_matrix.astype(np.float64)
    temperature = np.full(raw.shape, np.nan, dtype=np.float64)
    for curve in curves:
        t_min, t_max = curve["min_temp"], curve["max_temp"]
        a, b, c = curve["A"], curve["B"], curve["C"]
        raw_edges = (a + b * t_min + c * t_min**2, a + b * t_max + c * t_max**2)
        mask = (raw >= min(raw_edges)) & (raw <= max(raw_edges)) & np.isnan(temperature)
        if not np.any(mask):
            continue
        values = raw[mask]
        if abs(c) < 1e-15:
            if abs(b) < 1e-15:
                continue
            converted = (values - a) / b
            valid = (converted >= t_min) & (converted <= t_max)
        else:
            discriminant = b**2 - 4 * c * (a - values)
            real = discriminant >= 0
            root = np.sqrt(np.maximum(discriminant, 0))
            first = (-b + root) / (2 * c)
            second = (-b - root) / (2 * c)
            first_valid = real & (first >= t_min) & (first <= t_max)
            second_valid = real & ~first_valid & (second >= t_min) & (second <= t_max)
            converted = np.where(first_valid, first, np.where(second_valid, second, np.nan))
            valid = first_valid | second_valid
        mapped = np.full(values.shape, np.nan, dtype=np.float64)
        mapped[valid] = converted[valid]
        temperature[mask] = mapped
    if not np.isfinite(temperature).any():
        raise InvalidThermographyFile("Não foi possível converter a matriz usando a calibração do arquivo.")
    return temperature


def apply_radiometric_correction(
    temperature_rad: np.ndarray,
    emissivity: float,
    reflected_temp: float,
    transmission: float,
) -> np.ndarray:
    rad_kelvin = temperature_rad + 273.15
    reflected_kelvin = reflected_temp + 273.15
    numerator = rad_kelvin**4 - (1 - emissivity) * reflected_kelvin**4
    denominator = transmission * emissivity
    corrected = np.full(temperature_rad.shape, np.nan, dtype=np.float64)
    valid = np.isfinite(temperature_rad) & (numerator >= 0)
    corrected[valid] = np.power(numerator[valid] / denominator, 0.25) - 273.15
    if not np.isfinite(corrected).any():
        raise InvalidThermographyFile("A correção radiométrica não produziu temperaturas válidas.")
    return corrected


def calculate_statistics(temperature: np.ndarray) -> dict[str, Any]:
    valid = temperature[np.isfinite(temperature)]
    if valid.size == 0:
        raise InvalidThermographyFile("A matriz não contém temperaturas válidas.")
    min_position = tuple(int(value) for value in np.unravel_index(np.nanargmin(temperature), temperature.shape))
    max_position = tuple(int(value) for value in np.unravel_index(np.nanargmax(temperature), temperature.shape))
    return {
        "min": float(np.min(valid)), "max": float(np.max(valid)),
        "mean": float(np.mean(valid)), "median": float(np.median(valid)),
        "p1": float(np.percentile(valid, 1)), "p5": float(np.percentile(valid, 5)),
        "p95": float(np.percentile(valid, 95)), "p99": float(np.percentile(valid, 99)),
        "min_position": {"x": min_position[1], "y": min_position[0]},
        "max_position": {"x": max_position[1], "y": max_position[0]},
    }


def extract_overlay_registration(data: bytes | None, visible_size: tuple[int, int]) -> dict[str, Any]:
    visible_width, visible_height = visible_size
    fields: dict[int, int] = {}
    if data:
        fields = {
            field["field_number"]: int(field["value"])
            for field in parse_protobuf_fields(data)
            if field["wire_type"] == 0
        }

    source_width = fields.get(13, fields.get(1, visible_width))
    source_height = fields.get(14, fields.get(2, visible_height))
    crop_x, crop_y = fields.get(15), fields.get(16)
    crop_width, crop_height = fields.get(17), fields.get(18)
    valid_crop = (
        source_width > 0 and source_height > 0
        and crop_x is not None and crop_y is not None
        and crop_width is not None and crop_height is not None
        and crop_width > 0 and crop_height > 0
        and crop_x >= 0 and crop_y >= 0
        and crop_x + crop_width <= source_width
        and crop_y + crop_height <= source_height
    )

    if not valid_crop:
        return {
            "version": 2,
            "source": "full_frame_fallback",
            "visible_width": visible_width,
            "visible_height": visible_height,
            "x": 0,
            "y": 0,
            "width": visible_width,
            "height": visible_height,
        }

    return {
        "version": 2,
        "source": "VLImageInfo.gpbenc",
        "visible_width": visible_width,
        "visible_height": visible_height,
        "x": round(crop_x / source_width * visible_width),
        "y": round(crop_y / source_height * visible_height),
        "width": round(crop_width / source_width * visible_width),
        "height": round(crop_height / source_height * visible_height),
        "reference_width": source_width,
        "reference_height": source_height,
        "crop_x": crop_x,
        "crop_y": crop_y,
        "crop_width": crop_width,
        "crop_height": crop_height,
    }


class Is2ThermographyProcessor:
    def process(self, content: bytes, output_directory: Path, file_id: str) -> ProcessedThermography:
        try:
            archive = zipfile.ZipFile(BytesIO(content))
        except (zipfile.BadZipFile, OSError) as error:
            raise InvalidThermographyFile("O arquivo enviado não é um pacote IS2 válido.") from error

        with archive:
            members = {item.filename: item for item in archive.infolist()}
            if sum(item.file_size for item in members.values()) > MAX_EXPANDED_ARCHIVE_SIZE:
                raise InvalidThermographyFile("O conteúdo descompactado do IS2 excede o limite permitido.")
            for member in members.values():
                if member.file_size > MAX_EXPANDED_MEMBER_SIZE:
                    raise InvalidThermographyFile("O arquivo IS2 contém um item interno muito grande.")
            required = (IR_DATA_PATH, IR_INFO_PATH, CALIBRATION_PATH)
            missing = [name for name in required if name not in members]
            if missing:
                raise InvalidThermographyFile("Arquivo IS2 incompleto: " + ", ".join(missing))
            parameters = extract_ir_parameters(_read_member(archive, IR_INFO_PATH))
            curves = extract_calibration_curves(_read_member(archive, CALIBRATION_PATH))
            raw_matrix = extract_raw_matrix(_read_member(archive, IR_DATA_PATH))
            visible_info = _read_member(archive, VISIBLE_INFO_PATH) if VISIBLE_INFO_PATH in members else None
            temperature_rad = raw_to_temperature(raw_matrix, curves)
            temperature = apply_radiometric_correction(temperature_rad, **parameters)
            statistics = calculate_statistics(temperature)
            visible_member = next((name for name in VISIBLE_IMAGE_CANDIDATES if name in members), None)
            if not visible_member:
                raise InvalidThermographyFile("O arquivo IS2 não contém uma imagem visual JPEG.")
            visible_bytes = _read_member(archive, visible_member)
            try:
                with Image.open(BytesIO(visible_bytes)) as visible_image:
                    if visible_image.format != "JPEG":
                        raise InvalidThermographyFile("A imagem visual interna do IS2 não é JPEG.")
                    visible_image.verify()
            except InvalidThermographyFile:
                raise
            except Exception as error:
                raise InvalidThermographyFile("A imagem visual interna do IS2 está inválida.") from error

        output_directory.mkdir(parents=True, exist_ok=True)
        matrix_name = f"temperature_matrix_{file_id}.csv"
        visible_name = f"visible_{file_id}.jpg"
        thermal_name = f"thermal_{file_id}.png"
        overlay_name = f"thermal_overlay_{file_id}.png"
        metadata_name = f"metadata_{file_id}.json"
        np.savetxt(output_directory / matrix_name, temperature, delimiter=",", fmt="%.4f")
        (output_directory / visible_name).write_bytes(visible_bytes)
        with Image.open(BytesIO(visible_bytes)) as visible_image:
            visible_size = visible_image.size
        overlay_registration = extract_overlay_registration(visible_info, visible_size)
        self._create_thermal_image(temperature, statistics, output_directory / thermal_name)
        self._create_thermal_overlay(
            temperature,
            output_directory / overlay_name,
            visible_size,
            overlay_registration,
        )
        metadata: dict[str, Any] = {
            "temperature_unit": "°C",
            "resolution": {"width": int(temperature.shape[1]), "height": int(temperature.shape[0])},
            "parameters": parameters,
            "calibration_curve_count": len(curves),
            "visible_image_member": visible_member,
            "overlay_alignment_version": 2,
            "overlay_registration": overlay_registration,
            "statistics": statistics,
        }
        (output_directory / metadata_name).write_text(
            json.dumps(metadata, ensure_ascii=False, allow_nan=False), encoding="utf-8"
        )
        return ProcessedThermography(matrix_name, visible_name, thermal_name, overlay_name, metadata_name, metadata)

    @staticmethod
    def _create_thermal_overlay(
        temperature: np.ndarray,
        output_path: Path,
        visible_size: tuple[int, int],
        registration: dict[str, Any],
    ) -> None:
        valid = np.isfinite(temperature)
        values = temperature[valid]
        minimum = float(np.min(values))
        maximum = float(np.max(values))
        if maximum == minimum:
            normalized = np.zeros(temperature.shape, dtype=np.float64)
        else:
            normalized = (temperature - minimum) / (maximum - minimum)
        rgba = (matplotlib.colormaps["magma"](np.nan_to_num(normalized, nan=0.0)) * 255).astype(np.uint8)
        rgba[..., 3] = np.where(valid, 255, 0).astype(np.uint8)
        thermal_crop = Image.fromarray(rgba).resize(
            (registration["width"], registration["height"]),
            resample=Image.Resampling.BILINEAR,
        )
        canvas = Image.new("RGBA", visible_size, (0, 0, 0, 0))
        canvas.alpha_composite(thermal_crop, (registration["x"], registration["y"]))
        canvas.save(output_path, format="PNG")

    @staticmethod
    def _create_thermal_image(temperature: np.ndarray, statistics: dict[str, Any], output_path: Path) -> None:
        valid = temperature[np.isfinite(temperature)]
        fig, axis = plt.subplots(figsize=(9, 6))
        image = axis.imshow(
            np.ma.masked_invalid(temperature), cmap="magma", origin="upper",
            vmin=float(np.min(valid)), vmax=float(np.max(valid)),
        )
        axis.scatter(
            statistics["max_position"]["x"], statistics["max_position"]["y"],
            marker="x", color="cyan", linewidths=2,
        )
        axis.set_title("Imagem termográfica")
        axis.set_xlabel("X (pixel)")
        axis.set_ylabel("Y (pixel)")
        fig.colorbar(image, ax=axis, label="Temperatura (°C)")
        fig.tight_layout()
        fig.savefig(output_path, dpi=160, format="png")
        plt.close(fig)


def _read_member(archive: zipfile.ZipFile, name: str) -> bytes:
    try:
        return archive.read(name)
    except (zipfile.BadZipFile, RuntimeError, OSError, ValueError) as error:
        raise InvalidThermographyFile(f"Não foi possível ler o item {name} do arquivo IS2.") from error


def create_thermal_overlay_from_files(
    matrix_path: Path,
    visible_path: Path,
    original_path: Path,
    output_path: Path,
) -> dict[str, Any]:
    temperature = np.loadtxt(matrix_path, delimiter=",")
    with Image.open(visible_path) as visible_image:
        visible_size = visible_image.size
    try:
        with zipfile.ZipFile(original_path) as archive:
            visible_info = archive.read(VISIBLE_INFO_PATH) if VISIBLE_INFO_PATH in archive.namelist() else None
    except (zipfile.BadZipFile, OSError, KeyError) as error:
        raise InvalidThermographyFile("Não foi possível recuperar o alinhamento visual do arquivo IS2 original.") from error
    registration = extract_overlay_registration(visible_info, visible_size)
    Is2ThermographyProcessor._create_thermal_overlay(
        temperature,
        output_path,
        visible_size,
        registration,
    )
    return registration


def measure_temperature_region(
    matrix_path: Path,
    registration: dict[str, Any],
    x: float,
    y: float,
    width: float,
    height: float,
) -> dict[str, float | int]:
    visible_width = int(registration["visible_width"])
    visible_height = int(registration["visible_height"])
    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > visible_width or y + height > visible_height:
        raise ValueError("A seleção precisa ficar dentro da imagem visível.")

    crop_x = float(registration["x"])
    crop_y = float(registration["y"])
    crop_right = crop_x + float(registration["width"])
    crop_bottom = crop_y + float(registration["height"])
    left = max(x, crop_x)
    top = max(y, crop_y)
    right = min(x + width, crop_right)
    bottom = min(y + height, crop_bottom)
    if right <= left or bottom <= top:
        raise ValueError("A área selecionada está fora da região que possui dados térmicos.")

    matrix = np.loadtxt(matrix_path, delimiter=",")
    matrix_height, matrix_width = matrix.shape
    column_start = max(0, math.floor((left - crop_x) / float(registration["width"]) * matrix_width))
    row_start = max(0, math.floor((top - crop_y) / float(registration["height"]) * matrix_height))
    column_end = min(matrix_width, math.ceil((right - crop_x) / float(registration["width"]) * matrix_width))
    row_end = min(matrix_height, math.ceil((bottom - crop_y) / float(registration["height"]) * matrix_height))
    region = matrix[row_start:row_end, column_start:column_end]
    values = region[np.isfinite(region)]
    if values.size == 0:
        raise ValueError("A área selecionada não contém pixels térmicos válidos.")

    selected_area = width * height
    measured_area = (right - left) * (bottom - top)
    return {
        "minimum": float(np.min(values)),
        "maximum": float(np.max(values)),
        "mean": float(np.mean(values)),
        "thermal_pixels": int(values.size),
        "thermal_coverage_percent": float(min(100.0, measured_area / selected_area * 100.0)),
    }
