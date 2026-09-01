"""Compatibility adapter for dependency impact analysis.

The deterministic graph analysis lives in ``service_graph``. This module
retains the historical predictor entry point without maintaining another
topology or introducing an ML dependency.
"""

from collections.abc import Iterable, Mapping

from app.services.service_graph import (
    UnknownServiceError,
    analyze_dependency_impact,
    classify_blast_radius,
)


def find_affected_services_and_paths(
    failed_service: str,
    dependencies: Mapping[str, Iterable[str]] | None = None,
) -> tuple[list[str], list[list[str]], int]:
    """Return legacy-friendly affected IDs, paths, and maximum depth."""
    result = analyze_dependency_impact(failed_service, dependencies)
    return (
        [item["service_id"] for item in result["affected_services"]],
        [item["dependency_path"] for item in result["affected_services"]],
        result["cascade_depth"],
    )


def calculate_severity(affected_services: Iterable[object]) -> str:
    """Expose the historic severity helper using the canonical thresholds."""
    return classify_blast_radius(len(list(affected_services)))["severity"]


def cascade_predict(failed_service: str) -> dict:
    """Return canonical, request-local impact data for a selected service."""
    try:
        result = analyze_dependency_impact(failed_service)
    except UnknownServiceError:
        return {"error": "Service not found", "service": failed_service}

    return {"affected_count": result["impact_count"], **result}
