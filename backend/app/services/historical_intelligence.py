"""Deterministic historical incident intelligence from persisted records.

This module calculates historical context for incident investigation by examining
persisted incident records only. It does not use current telemetry or make Bayesian
predictions. All results are derived from recorded fact-bounded data.

ARCHITECTURE:
- Loads all incidents into Python for filtering (safe for datasets < 100K incidents)
- Uses deterministic 4-level priority matching: (service + root_cause) > (service + anomaly) > (root_cause) > (no match)
- Ties broken deterministically: timestamp DESC, then incident ID ASC
- Only includes incidents with timestamp strictly before current incident timestamp
- Filters out empty/whitespace field values to prevent false matches
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Incident


def get_historical_intelligence(incident_id: int, db: Session) -> dict[str, Any]:
    """Calculate historical context for incident investigation.
    
    Returns a structured response containing:
    - Same-service incident count
    - Same-root-cause incident count
    - Same-anomaly-type incident count
    - Most common recommendation for the root cause
    - Most frequently affected service historically
    - Whether this root cause has appeared before
    - Whether this service has had similar incidents
    - List of relevant previous incidents
    
    All data comes from persisted incident records only.
    Temporal correctness: Only includes incidents with timestamp strictly before current incident.
    Deterministic: Ties broken by timestamp DESC, then incident ID ASC.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        return {}

    # Query all incidents excluding the current one by both ID and timestamp.
    # Only include incidents with timestamp strictly before current incident (temporally prior).
    all_incidents = (
        db.query(Incident)
        .filter(
            Incident.id != incident_id,
            Incident.timestamp < incident.timestamp
        )
        .all()
    )
    
    # Sort deterministically: timestamp DESC (most recent), then ID ASC (stable tie-breaker)
    all_incidents.sort(key=lambda x: (x.timestamp, x.id), reverse=(True, False))

    # Count incidents by matching criteria, filtering valid keys
    same_service_incidents = [
        inc for inc in all_incidents
        if _is_valid_key(inc.service_name) 
        and inc.service_name == incident.service_name
    ]
    same_root_cause_incidents = [
        inc for inc in all_incidents
        if _is_valid_key(inc.root_cause)
        and inc.root_cause == incident.root_cause
    ]
    same_anomaly_incidents = [
        inc for inc in all_incidents
        if _is_valid_key(inc.anomaly_type)
        and inc.anomaly_type == incident.anomaly_type
    ]

    # Find similar incidents using deterministic matching priority
    similar_incidents = _find_similar_incidents(
        incident, all_incidents
    )

    # Find most common recommendation for this root cause
    most_common_recommendation = _find_most_common_recommendation(
        incident.root_cause, all_incidents
    )

    # Find most frequently affected service historically
    most_affected_service = _find_most_affected_service(all_incidents)

    return {
        "incident_id": incident_id,
        "historical_summary": {
            "same_service_count": len(same_service_incidents),
            "same_root_cause_count": len(same_root_cause_incidents),
            "same_anomaly_count": len(same_anomaly_incidents),
            "most_frequently_recorded_recommendation": most_common_recommendation,
            "most_affected_service": most_affected_service,
            "root_cause_seen_before": len(same_root_cause_incidents) > 0,
            "similar_incidents_available": len(similar_incidents) > 0,
        },
        "similar_incidents": [
            _serialize_incident(inc) for inc in similar_incidents
        ],
    }


def _is_valid_key(value: str | None) -> bool:
    """Validate a field value for matching.
    
    Returns False for None, empty strings, or whitespace-only strings.
    This prevents false matches from blank/missing data in legacy incidents.
    """
    return value is not None and isinstance(value, str) and value.strip() != ""


def _find_similar_incidents(
    current: Incident, all_incidents: list[Incident]
) -> list[Incident]:
    """Find relevant previous incidents using deterministic matching priority.
    
    Preference order:
    1. Same service + same root cause (most relevant)
    2. Same service + similar anomaly type
    3. Same root cause (anywhere)
    4. None (no match)
    
    Incidents are pre-sorted by timestamp DESC, ID ASC.
    Returns up to 5 most recent matches at the highest priority level.
    """
    # Filter to only valid field values for comparison
    service_valid = _is_valid_key(current.service_name)
    cause_valid = _is_valid_key(current.root_cause)
    anomaly_valid = _is_valid_key(current.anomaly_type)

    # Priority 1: same service + same root cause
    if service_valid and cause_valid:
        priority1 = [
            inc for inc in all_incidents
            if _is_valid_key(inc.service_name)
            and _is_valid_key(inc.root_cause)
            and inc.service_name == current.service_name
            and inc.root_cause == current.root_cause
        ]
        if priority1:
            return priority1[:5]

    # Priority 2: same service + same anomaly type
    if service_valid and anomaly_valid:
        priority2 = [
            inc for inc in all_incidents
            if _is_valid_key(inc.service_name)
            and _is_valid_key(inc.anomaly_type)
            and inc.service_name == current.service_name
            and inc.anomaly_type == current.anomaly_type
        ]
        if priority2:
            return priority2[:5]

    # Priority 3: same root cause (any service)
    if cause_valid:
        priority3 = [
            inc for inc in all_incidents
            if _is_valid_key(inc.root_cause)
            and inc.root_cause == current.root_cause
        ]
        if priority3:
            return priority3[:5]

    # No match
    return []


def _find_most_common_recommendation(
    root_cause: str, incidents: list[Incident]
) -> str | None:
    """Find the most frequently recorded recommendation for a given root cause.
    
    Deterministic tie-breaking: when multiple recommendations have equal frequency,
    returns the one appearing first in earliest-most-recent order (by incident ID ASC
    within same timestamp bucket).
    
    Returns the recommendation string or None if no matching incidents exist.
    """
    matching = [
        inc for inc in incidents
        if _is_valid_key(inc.root_cause)
        and inc.root_cause == root_cause
        and _is_valid_key(inc.recommendation)
    ]
    if not matching:
        return None

    # Count recommendations by frequency
    recommendation_counts: dict[str, int] = {}
    recommendation_first_id: dict[str, int] = {}  # Track first incident ID for tie-breaking
    
    for incident in matching:
        rec = incident.recommendation
        recommendation_counts[rec] = recommendation_counts.get(rec, 0) + 1
        # Store the first incident ID we see for this recommendation (incidents pre-sorted)
        if rec not in recommendation_first_id:
            recommendation_first_id[rec] = incident.id

    # Return most common; ties broken by which appeared first (lowest incident ID)
    if not recommendation_counts:
        return None
    
    max_count = max(recommendation_counts.values())
    candidates = [rec for rec, count in recommendation_counts.items() if count == max_count]
    return min(candidates, key=lambda rec: recommendation_first_id[rec])


def _find_most_affected_service(incidents: list[Incident]) -> str | None:
    """Find the service that appears most frequently in historical incidents.
    
    Deterministic tie-breaking: when multiple services have equal frequency,
    returns the one appearing first in earliest-most-recent order (by incident ID ASC
    within same timestamp bucket).
    
    Returns the service_name string or None if no incidents exist.
    """
    valid_incidents = [
        inc for inc in incidents
        if _is_valid_key(inc.service_name)
    ]
    if not valid_incidents:
        return None

    service_counts: dict[str, int] = {}
    service_first_id: dict[str, int] = {}  # Track first incident ID for tie-breaking
    
    for incident in valid_incidents:
        service = incident.service_name
        service_counts[service] = service_counts.get(service, 0) + 1
        # Store the first incident ID we see for this service (incidents pre-sorted)
        if service not in service_first_id:
            service_first_id[service] = incident.id

    if not service_counts:
        return None
    
    max_count = max(service_counts.values())
    candidates = [svc for svc, count in service_counts.items() if count == max_count]
    return min(candidates, key=lambda svc: service_first_id[svc])


def _serialize_incident(incident: Incident) -> dict[str, Any]:
    """Serialize a persisted incident for historical intelligence response.
    
    Exposing only recorded persisted fields to maintain fact boundary.
    """
    return {
        "id": incident.id,
        "service_name": incident.service_name,
        "severity": incident.severity,
        "anomaly_type": incident.anomaly_type,
        "root_cause": incident.root_cause,
        "recommendation": incident.recommendation,
        "status": incident.status,
        "timestamp": incident.timestamp.isoformat()
        if incident.timestamp and incident.timestamp.tzinfo is None
        else incident.timestamp.isoformat()
        if incident.timestamp
        else None,
        "resolved_at": incident.resolved_at.isoformat()
        if incident.resolved_at and incident.resolved_at.tzinfo is None
        else incident.resolved_at.isoformat()
        if incident.resolved_at
        else None,
        "incident_duration": _calculate_incident_duration(
            incident.timestamp, incident.resolved_at
        )
        if incident.resolved_at
        else None,
    }


def _calculate_incident_duration(
    created_at, resolved_at
) -> str | None:
    """Calculate human-readable incident duration from timestamps.
    
    Only called when resolved_at exists. Returns formatted string like "2h 15m 30s".
    """
    if created_at is None or resolved_at is None:
        return None

    seconds = max(0, int((resolved_at - created_at).total_seconds()))
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    if hours:
        return f"{hours}h {minutes}m {seconds}s"
    if minutes:
        return f"{minutes}m {seconds}s"
    return f"{seconds}s"
