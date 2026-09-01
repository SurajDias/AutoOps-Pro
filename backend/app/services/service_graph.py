"""Static service topology and pure dependency-impact analysis."""

from collections import deque
import random
from collections.abc import Iterable, Mapping


# A service points to the services it depends on. This is the sole topology
# definition used by the topology, health, and dependency-analysis services.
SERVICE_DEPENDENCIES: dict[str, tuple[str, ...]] = {
    "gateway": ("auth", "order"),
    "auth": ("db",),
    "order": ("payment", "inventory"),
    "payment": ("db",),
    "inventory": ("db",),
    "db": (),
}

SERVICE_LABELS = {
    "gateway": "API Gateway",
    "auth": "Auth Service",
    "order": "Order Service",
    "payment": "Payment Service",
    "inventory": "Inventory Service",
    "db": "Database",
}

SERVICE_IDS = tuple(SERVICE_DEPENDENCIES)


class UnknownServiceError(ValueError):
    """Raised when an impact request names a service outside the graph."""


def _reverse_dependencies(
    dependencies: Mapping[str, Iterable[str]],
) -> dict[str, list[str]]:
    """Map each dependency to the services that require it, preserving order."""
    reverse = {service_id: [] for service_id in dependencies}
    for service_id, required_services in dependencies.items():
        for required_service in required_services:
            reverse.setdefault(required_service, []).append(service_id)
    return reverse


def classify_blast_radius(impact_count: int) -> dict[str, str]:
    """Classify impact deterministically; this analysis never depends on ML."""
    if impact_count == 0:
        return {"severity": "low", "blast_radius": "contained"}
    if impact_count == 1:
        return {"severity": "medium", "blast_radius": "limited"}
    if impact_count <= 3:
        return {"severity": "high", "blast_radius": "broad"}
    return {"severity": "critical", "blast_radius": "critical"}


def analyze_dependency_impact(
    failed_service: str,
    dependencies: Mapping[str, Iterable[str]] | None = None,
) -> dict:
    """Return all services affected by a failed dependency without mutating state.

    Depth is the shortest number of dependency edges from an affected service
    to ``failed_service``. Each ``dependency_path`` is ordered from the
    affected service to the failed service. Breadth-first traversal makes the
    result deterministic and the visited set prevents cycles from looping.
    """
    graph = SERVICE_DEPENDENCIES if dependencies is None else dependencies
    if failed_service not in graph:
        raise UnknownServiceError(f"Unknown service '{failed_service}'.")

    reverse = _reverse_dependencies(graph)
    visited = {failed_service}
    queue = deque([(failed_service, 0, [failed_service])])
    affected_services = []

    while queue:
        current_service, current_depth, current_path = queue.popleft()
        for dependent_service in reverse.get(current_service, []):
            if dependent_service in visited:
                continue

            visited.add(dependent_service)
            dependency_path = [dependent_service, *current_path]
            impact = {
                "service_id": dependent_service,
                "label": SERVICE_LABELS.get(dependent_service, dependent_service),
                "depth": current_depth + 1,
                "dependency_path": dependency_path,
            }
            affected_services.append(impact)
            queue.append((dependent_service, current_depth + 1, dependency_path))

    directly_affected_services = [
        impact for impact in affected_services if impact["depth"] == 1
    ]
    transitively_affected_services = [
        impact for impact in affected_services if impact["depth"] > 1
    ]
    impact_count = len(affected_services)
    classification = classify_blast_radius(impact_count)

    return {
        "failed_service": failed_service,
        "failed_service_label": SERVICE_LABELS.get(failed_service, failed_service),
        "directly_affected_services": directly_affected_services,
        "transitively_affected_services": transitively_affected_services,
        "affected_services": affected_services,
        "impact_count": impact_count,
        "cascade_depth": max((item["depth"] for item in affected_services), default=0),
        "failure_paths": [
            {
                "service_id": item["service_id"],
                "dependency_path": item["dependency_path"],
            }
            for item in affected_services
        ],
        "depth_definition": "Shortest dependency distance to the failed service.",
        **classification,
    }


def simulate_failure() -> dict:
    """Retain the legacy random demo endpoint without persisting failure state."""
    failed_service = random.choice(SERVICE_IDS)
    impact = analyze_dependency_impact(failed_service)
    statuses = {service_id: "healthy" for service_id in SERVICE_IDS}
    statuses[failed_service] = "failed"
    for affected_service in impact["affected_services"]:
        statuses[affected_service["service_id"]] = "degraded"

    return {
        "failed_service": SERVICE_LABELS[failed_service],
        "cascade_services": [
            affected_service["label"]
            for affected_service in impact["affected_services"]
        ],
        "status": {
            SERVICE_LABELS[service_id]: service_status
            for service_id, service_status in statuses.items()
        },
    }
