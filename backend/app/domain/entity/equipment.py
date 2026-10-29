from enum import StrEnum


class EquipmentType(StrEnum):
    ELECTRIC_MOTOR = "MOTOR_ELETRICO"
    PUMP = "BOMBA"
    ELECTRICAL_PANEL = "PAINEL_ELETRICO"
    COMPRESSOR = "COMPRESSOR"
    OTHER = "OUTRO"


EQUIPMENT_TYPE_OPTIONS = {
    EquipmentType.ELECTRIC_MOTOR: {
        "label": "Motor elétrico",
        "fields": [
            {"key": "power_kw", "label": "Potência", "unit": "kW"},
            {"key": "voltage_v", "label": "Tensão nominal", "unit": "V"},
            {"key": "current_a", "label": "Corrente nominal", "unit": "A"},
            {"key": "speed_rpm", "label": "Rotação nominal", "unit": "rpm"},
        ],
    },
    EquipmentType.PUMP: {
        "label": "Bomba",
        "fields": [
            {"key": "flow_m3_h", "label": "Vazão nominal", "unit": "m³/h"},
            {"key": "head_m", "label": "Altura manométrica", "unit": "m"},
            {"key": "pressure_bar", "label": "Pressão de operação", "unit": "bar"},
        ],
    },
    EquipmentType.ELECTRICAL_PANEL: {
        "label": "Painel elétrico",
        "fields": [
            {"key": "voltage_v", "label": "Tensão nominal", "unit": "V"},
            {"key": "current_a", "label": "Corrente nominal", "unit": "A"},
            {"key": "phase_count", "label": "Número de fases", "unit": "fases"},
        ],
    },
    EquipmentType.COMPRESSOR: {
        "label": "Compressor",
        "fields": [
            {"key": "power_kw", "label": "Potência", "unit": "kW"},
            {"key": "pressure_bar", "label": "Pressão de operação", "unit": "bar"},
            {"key": "flow_m3_min", "label": "Vazão nominal", "unit": "m³/min"},
        ],
    },
    EquipmentType.OTHER: {"label": "Outro", "fields": []},
}
