from fastapi import APIRouter, HTTPException, status

from app.schemas.telemetry import SystemTelemetry
from app.services.telemetry_service import get_system_telemetry

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.get("/system", response_model=SystemTelemetry)
async def get_local_system_telemetry() -> SystemTelemetry:
    try:
        telemetry = get_system_telemetry()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local system telemetry.",
        ) from exc

    if telemetry is None or not any(value is not None for value in telemetry.values()):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local system telemetry.",
        )

    return SystemTelemetry(**telemetry)
