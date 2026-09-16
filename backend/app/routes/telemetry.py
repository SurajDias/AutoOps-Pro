from fastapi import APIRouter, HTTPException, status

from app.schemas.telemetry import ListeningPort, NetworkInterface, SystemTelemetry
from app.services.telemetry_service import (
    get_listening_ports_telemetry,
    get_network_interfaces_telemetry,
    get_system_telemetry,
)

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


@router.get("/network-interfaces", response_model=list[NetworkInterface])
async def get_local_network_interfaces() -> list[NetworkInterface]:
    try:
        interfaces = get_network_interfaces_telemetry()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local network interfaces telemetry.",
        ) from exc

    if interfaces is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local network interfaces telemetry.",
        )

    return [NetworkInterface(**interface_data) for interface_data in interfaces]


@router.get("/listening-ports", response_model=list[ListeningPort])
async def get_local_listening_ports() -> list[ListeningPort]:
    try:
        ports = get_listening_ports_telemetry()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local listening ports telemetry.",
        ) from exc

    if ports is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local listening ports telemetry.",
        )

    return [ListeningPort(**port_data) for port_data in ports]


@router.get("/network", response_model=list[NetworkInterface])
async def get_local_network_telemetry() -> list[NetworkInterface]:
    try:
        telemetry = get_network_interfaces_telemetry()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local network telemetry.",
        ) from exc

    if telemetry is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to collect local network telemetry.",
        )

    return [NetworkInterface(**interface_data) for interface_data in telemetry]
