"""Pure timeline coverage for persisted operator feedback semantics."""

from datetime import datetime

from app.api.incident_api import _operator_feedback_for, _timeline_for
from app.database.models import Incident


def test_operator_feedback_timeline_event_records_review_not_execution():
    incident = Incident(
        id=1,
        service_name="api-gateway",
        severity="Critical",
        anomaly_type="High CPU",
        root_cause="CPU saturation",
        recommendation="scale_cpu",
        status="Open",
        timestamp=datetime(2026, 9, 3, 10),
        evidence_snapshot={"recommended_action": "scale_cpu"},
        feedback_status="accepted",
        feedback_reason="Matches the observed bottleneck.",
        feedback_created_at=datetime(2026, 9, 3, 11),
        feedback_action="scale_cpu",
    )

    feedback = _operator_feedback_for(incident)
    event = _timeline_for(incident)[-1]

    assert feedback == {
        "status": "accepted",
        "reason": "Matches the observed bottleneck.",
        "created_at": "2026-09-03T11:00:00+00:00",
        "action": "scale_cpu",
    }
    assert event["event_type"] == "recommendation_accepted"
    assert event["title"] == "Recommendation accepted"
    assert "Operator accepted" in event["description"]
    assert "executed" not in event["description"]
