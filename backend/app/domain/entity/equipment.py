from enum import StrEnum


class EquipmentType(StrEnum):
    ELECTRIC_MOTOR = "MOTOR_ELETRICO"
    PUMP = "BOMBA"
    ELECTRICAL_PANEL = "PAINEL_ELETRICO"
    COMPRESSOR = "COMPRESSOR"
    OTHER = "OUTRO"


EQUIPMENT_TYPE_OPTIONS = {
    EquipmentType.ELECTRIC_MOTOR: {"label": "Motor elétrico"},
    EquipmentType.PUMP: {"label": "Bomba"},
    EquipmentType.ELECTRICAL_PANEL: {"label": "Painel elétrico"},
    EquipmentType.COMPRESSOR: {"label": "Compressor"},
    EquipmentType.OTHER: {"label": "Outro"},
}
