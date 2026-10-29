import pytest
from pydantic import ValidationError

from app.domain.entity.service_order import ServiceOrderPriority, ServiceOrderStatus
from app.infrastructure.persistence.postgres_dashboard_repository import (
    PostgresDashboardRepository,
)
from app.presentation.schemas.dashboard import DashboardSummaryResponse
from app.presentation.schemas.equipment import EquipmentCreate


def test_equipment_schema_accepts_fields_for_selected_type() -> None:
    equipment = EquipmentCreate.model_validate(
        {
            "nome": "Motor principal",
            "tipo": "MOTOR_ELETRICO",
            "especificacoes": {"power_kw": 7.5, "voltage_v": 220},
        }
    )

    assert equipment.name == "Motor principal"
    assert equipment.equipment_type.value == "MOTOR_ELETRICO"
    assert equipment.specifications == {"power_kw": 7.5, "voltage_v": 220}


@pytest.mark.parametrize(
    "specifications",
    [
        {"flow_m3_h": 10},  # valid only for a pump
        {"power_kw": 0},
        {"phase_count": 3.5},
    ],
)
def test_equipment_schema_rejects_invalid_type_specific_specifications(
    specifications: dict[str, float],
) -> None:
    with pytest.raises(ValidationError):
        EquipmentCreate.model_validate(
            {
                "nome": "Painel principal",
                "tipo": "PAINEL_ELETRICO",
                "especificacoes": specifications,
            }
        )


def test_dashboard_response_serializes_portuguese_api_contract() -> None:
    summary = DashboardSummaryResponse.model_validate(
        {
            "open_orders": 3,
            "closed_orders": 4,
            "completed_orders": 3,
            "cancelled_orders": 1,
            "overdue_orders": 1,
            "by_status": {"BACKLOG": 2, "EM_ANDAMENTO": 1},
            "by_priority": {"CRITICA": 1, "ALTA": 2},
            "monthly_activity": [
                {"month": "2026-10", "opened": 5, "completed": 3}
            ],
        }
    )

    result = summary.model_dump(by_alias=True)
    assert result["os_abertas"] == 3
    assert result["por_status"][ServiceOrderStatus.BACKLOG.value] == 2
    assert result["por_prioridade"][ServiceOrderPriority.CRITICAL.value] == 1
    assert result["atividade_mensal"][0] == {
        "mes": "2026-10",
        "abertas": 5,
        "concluidas": 3,
    }
