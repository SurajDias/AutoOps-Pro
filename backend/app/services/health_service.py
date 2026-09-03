"""Scenario-aware synthetic health overlay for the canonical service graph."""

from app.services.service_graph import SERVICE_IDS
from app.utils.metrics_generator import get_scenario, metrics


HEALTHY = "healthy"
DEGRADED = "degraded"
FAILED = "failed"


def _all(status: str) -> dict[str, str]:
    return {service_id: status for service_id in SERVICE_IDS}


def _fixed_recovery_complete() -> bool:
    """Use the existing synthetic recovery metrics to end the recovery overlay."""
    return (
        metrics.get("cpu", 0) <= 60
        and metrics.get("memory", 0) <= 75
        and metrics.get("response_time", 0) <= 120
        and metrics.get("error_rate", 0) <= 1
    )


def update_service_health() -> dict[str, str]:
    """Return deterministic synthetic state for the active backend scenario.

    This deliberately does not attempt service discovery or live telemetry.
    The topology's dependency direction remains service -> dependency.
    """
    scenario = get_scenario()["name"]

    if scenario == "traffic_spike":
        return {
            "gateway": FAILED,
            "auth": DEGRADED,
            "order": DEGRADED,
            "payment": DEGRADED,
            "inventory": DEGRADED,
            "db": HEALTHY,
        }

    if scenario == "database_stress":
        # DB's reverse dependencies agree exactly with dependency impact:
        # auth/payment/inventory are direct, order/gateway are transitive.
        return {
            "gateway": DEGRADED,
            "auth": DEGRADED,
            "order": DEGRADED,
            "payment": DEGRADED,
            "inventory": DEGRADED,
            "db": FAILED,
        }

    if scenario == "memory_leak":
        # The existing scenario names auth-service as the affected workload.
        # Gateway depends on auth, so it is the only propagated degradation.
        return {
            "gateway": DEGRADED,
            "auth": FAILED,
            "order": HEALTHY,
            "payment": HEALTHY,
            "inventory": HEALTHY,
            "db": HEALTHY,
        }

    if scenario == "fixed":
        # The existing generator moves values toward its healthy target. Keep a
        # recovery indication until those shared synthetic values are healthy.
        return _all(HEALTHY if _fixed_recovery_complete() else DEGRADED)

    # Normal demo and live mode have no scenario-specific service failure.
    return _all(HEALTHY)
