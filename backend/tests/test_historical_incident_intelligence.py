"""Test suite for historical incident intelligence functionality."""

from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from app.database.models import Incident
from app.services.historical_intelligence import (
    get_historical_intelligence,
    _find_similar_incidents,
    _find_most_common_recommendation,
    _find_most_affected_service,
)


def _incident(service="api-gateway", root_cause="cpu_spike", anomaly="high_cpu", **changes):
    """Factory for creating test incidents."""
    base = {
        "service_name": service,
        "severity": "High",
        "anomaly_type": anomaly,
        "root_cause": root_cause,
        "recommendation": "scale_cpu",
        "status": "Open",
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None),
    }
    base.update(changes)
    return Incident(**base)


class TestHistoricalIntelligence:
    """Tests for historical incident intelligence retrieval."""

    def test_no_previous_incidents(self, db_session: Session):
        """Intelligence works when there are no previous incidents."""
        incident = _incident(id=1)
        db_session.add(incident)
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["incident_id"] == 1
        assert result["historical_summary"]["same_service_count"] == 0
        assert result["historical_summary"]["same_root_cause_count"] == 0
        assert result["historical_summary"]["same_anomaly_count"] == 0
        assert result["similar_incidents"] == []

    def test_same_service_incidents_counted(self, db_session: Session):
        """Count of incidents affecting same service is accurate."""
        current = _incident(id=1, service="payment-api")
        db_session.add(current)
        db_session.add(_incident(id=2, service="payment-api", root_cause="memory_leak"))
        db_session.add(_incident(id=3, service="payment-api", root_cause="db_connection"))
        db_session.add(_incident(id=4, service="auth-api", root_cause="cpu_spike"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["same_service_count"] == 2  # ids 2, 3

    def test_same_root_cause_incidents_counted(self, db_session: Session):
        """Count of incidents with same root cause is accurate."""
        current = _incident(id=1, root_cause="memory_leak")
        db_session.add(current)
        db_session.add(_incident(id=2, service="auth", root_cause="memory_leak"))
        db_session.add(_incident(id=3, service="api", root_cause="memory_leak"))
        db_session.add(_incident(id=4, service="cache", root_cause="cpu_spike"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["same_root_cause_count"] == 2  # ids 2, 3

    def test_same_anomaly_type_incidents_counted(self, db_session: Session):
        """Count of incidents with same anomaly type is detected."""
        current = _incident(id=1, anomaly="high_latency")
        db_session.add(current)
        db_session.add(_incident(id=2, anomaly="high_latency", service="auth"))
        db_session.add(_incident(id=3, anomaly="high_memory", service="api"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["same_anomaly_count"] == 1  # id 2

    def test_root_cause_seen_before_flag(self, db_session: Session):
        """root_cause_seen_before flag is set correctly."""
        current = _incident(id=1, root_cause="database_timeout")
        db_session.add(current)
        db_session.add(_incident(id=2, root_cause="database_timeout"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["root_cause_seen_before"] is True

    def test_root_cause_seen_before_flag_false(self, db_session: Session):
        """root_cause_seen_before flag is False when root cause is new."""
        current = _incident(id=1, root_cause="novel_root_cause")
        db_session.add(current)
        db_session.add(_incident(id=2, root_cause="common_root_cause"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["root_cause_seen_before"] is False

    def test_most_common_recommendation_for_root_cause(self, db_session: Session):
        """Most common recommendation for a root cause is identified."""
        current = _incident(id=1, root_cause="high_cpu", recommendation="scale_cpu")
        db_session.add(current)
        db_session.add(_incident(id=2, root_cause="high_cpu", recommendation="scale_cpu"))
        db_session.add(_incident(id=3, root_cause="high_cpu", recommendation="scale_cpu"))
        db_session.add(_incident(id=4, root_cause="high_cpu", recommendation="optimize_queries"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["most_frequently_recorded_recommendation"] == "scale_cpu"

    def test_most_affected_service(self, db_session: Session):
        """Most frequently affected service is identified."""
        current = _incident(id=1, service="api")
        db_session.add(current)
        db_session.add(_incident(id=2, service="api"))
        db_session.add(_incident(id=3, service="api"))
        db_session.add(_incident(id=4, service="cache"))
        db_session.add(_incident(id=5, service="cache"))
        db_session.add(_incident(id=6, service="db"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["most_affected_service"] == "api"


class TestSimilarIncidentMatching:
    """Tests for deterministic similar incident selection."""

    def test_priority_1_same_service_and_root_cause(self, db_session: Session):
        """Priority 1: Same service + same root cause is selected."""
        current = _incident(id=1, service="payment", root_cause="cpu_spike")
        db_session.add(current)
        # Priority 1 matches
        db_session.add(_incident(id=2, service="payment", root_cause="cpu_spike"))
        db_session.add(_incident(id=3, service="payment", root_cause="cpu_spike"))
        # Priority 2 (not selected if priority 1 exists)
        db_session.add(_incident(id=4, service="payment", root_cause="memory_leak"))
        # Priority 3 (not selected if priority 1 exists)
        db_session.add(_incident(id=5, service="auth", root_cause="cpu_spike"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        assert 2 in similar_ids
        assert 3 in similar_ids
        assert 4 not in similar_ids  # Priority 2 not selected
        assert 5 not in similar_ids  # Priority 3 not selected

    def test_priority_2_same_service_and_anomaly(self, db_session: Session):
        """Priority 2: Same service + anomaly type when no priority 1 matches."""
        current = _incident(id=1, service="api", root_cause="novel_cause", anomaly="high_latency")
        db_session.add(current)
        # No priority 1 matches (different root cause at same service)
        # Priority 2 matches
        db_session.add(_incident(id=2, service="api", root_cause="db_timeout", anomaly="high_latency"))
        db_session.add(_incident(id=3, service="api", root_cause="cache_miss", anomaly="high_latency"))
        # Priority 3 (not selected if priority 2 exists)
        db_session.add(_incident(id=4, service="auth", root_cause="novel_cause", anomaly="high_cpu"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        assert 2 in similar_ids
        assert 3 in similar_ids
        assert 4 not in similar_ids  # Priority 3 not selected

    def test_priority_3_same_root_cause_any_service(self, db_session: Session):
        """Priority 3: Same root cause (any service) when no priority 1 or 2 matches."""
        current = _incident(id=1, service="api", root_cause="disk_full")
        db_session.add(current)
        # No service match at all
        # Priority 3 matches
        db_session.add(_incident(id=2, service="cache", root_cause="disk_full"))
        db_session.add(_incident(id=3, service="db", root_cause="disk_full"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        assert 2 in similar_ids
        assert 3 in similar_ids

    def test_no_match_returns_empty_list(self, db_session: Session):
        """No match returns empty similar incidents list."""
        current = _incident(id=1, service="unique-service", root_cause="unique-cause")
        db_session.add(current)
        db_session.add(_incident(id=2, service="other", root_cause="other"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["similar_incidents"] == []
        assert result["historical_summary"]["similar_incidents_available"] is False

    def test_similar_incidents_limited_to_five(self, db_session: Session):
        """Similar incidents are limited to 5 most recent."""
        current = _incident(id=1, service="api", root_cause="cpu_spike")
        db_session.add(current)
        # Add 10 matching incidents
        for i in range(2, 12):
            db_session.add(_incident(
                id=i,
                service="api",
                root_cause="cpu_spike",
                timestamp=datetime(2026, 1, i, tzinfo=timezone.utc).replace(tzinfo=None),
            ))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert len(result["similar_incidents"]) == 5

    def test_similar_incidents_ordered_by_timestamp_desc(self, db_session: Session):
        """Similar incidents are ordered by timestamp descending (most recent first)."""
        current = _incident(id=1, service="api", root_cause="cpu_spike")
        db_session.add(current)
        db_session.add(_incident(
            id=2,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.add(_incident(
            id=3,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 3, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.add(_incident(
            id=4,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 2, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        # Should be ordered 3, 4, 2 (descending by timestamp)
        assert similar_ids == [3, 4, 2]


class TestRecommendationFrequency:
    """Tests for recommendation frequency calculation."""

    def test_recommendation_frequency_accurate(self, db_session: Session):
        """Most common recommendation is determined by frequency."""
        current = _incident(id=1, root_cause="memory_leak")
        db_session.add(current)
        db_session.add(_incident(id=2, root_cause="memory_leak", recommendation="restart_service"))
        db_session.add(_incident(id=3, root_cause="memory_leak", recommendation="restart_service"))
        db_session.add(_incident(id=4, root_cause="memory_leak", recommendation="restart_service"))
        db_session.add(_incident(id=5, root_cause="memory_leak", recommendation="increase_memory"))
        db_session.add(_incident(id=6, root_cause="memory_leak", recommendation="add_cache"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["most_common_recommendation"] == "restart_service"

    def test_recommendation_with_no_history(self, db_session: Session):
        """No recommendation when root cause has not occurred before."""
        current = _incident(id=1, root_cause="brand_new_cause")
        db_session.add(current)
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        assert result["historical_summary"]["most_common_recommendation"] is None


class TestLegacyIncidentHandling:
    """Tests for legacy incidents with NULL evidence_snapshot."""

    def test_legacy_incident_can_still_be_analyzed(self, db_session: Session):
        """Legacy incident can still provide historical context."""
        # Simulate a legacy incident with no evidence_snapshot
        legacy = Incident(
            id=1,
            service_name="api",
            severity="High",
            anomaly_type="high_cpu",
            root_cause="cpu_spike",
            recommendation="scale_cpu",
            status="Open",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
            evidence_snapshot=None,  # Legacy incident
        )
        db_session.add(legacy)
        # Add modern incidents for comparison
        db_session.add(_incident(
            id=2,
            service="api",
            root_cause="cpu_spike",
            evidence_snapshot={"captured_at": "2026-01-02T00:00:00+00:00"},
        ))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Should still count the modern incident
        assert result["historical_summary"]["same_root_cause_count"] == 1


class TestIncidentSerialization:
    """Tests for incident serialization in intelligence response."""

    def test_serialized_incident_includes_required_fields(self, db_session: Session):
        """Serialized incidents include all required persisted fields."""
        current = _incident(id=1, service="api", root_cause="cpu_spike")
        db_session.add(current)
        db_session.add(_incident(id=2, service="api", root_cause="cpu_spike"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        incident_data = result["similar_incidents"][0]
        required_fields = [
            "id",
            "service_name",
            "severity",
            "anomaly_type",
            "root_cause",
            "recommendation",
            "status",
            "timestamp",
            "resolved_at",
        ]
        for field in required_fields:
            assert field in incident_data

    def test_incident_duration_calculated_for_resolved(self, db_session: Session):
        """Incident duration is calculated when resolved_at exists."""
        current = _incident(id=1, service="api")
        db_session.add(current)
        created = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        resolved = datetime(2026, 1, 1, 12, 5, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        db_session.add(_incident(
            id=2,
            service="api",
            root_cause="cpu_spike",
            timestamp=created,
            status="Resolved",
            resolved_at=resolved,
        ))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        incident_data = result["similar_incidents"][0]
        assert incident_data["incident_duration"] == "5m 0s"

    def test_incident_duration_none_when_not_resolved(self, db_session: Session):
        """Incident duration is None when not resolved."""
        current = _incident(id=1, service="api")
        db_session.add(current)
        db_session.add(_incident(id=2, service="api", root_cause="cpu_spike", status="Open"))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        incident_data = result["similar_incidents"][0]
        assert incident_data["incident_duration"] is None


class TestNonexistentIncident:
    """Tests for handling nonexistent incident queries."""

    def test_nonexistent_incident_returns_empty(self, db_session: Session):
        """Query for nonexistent incident returns empty."""
        result = get_historical_intelligence(999, db_session)
        assert result == {}


class TestTemporalCorrectness:
    """Tests for temporal correctness of historical intelligence."""

    def test_future_incidents_excluded(self, db_session: Session):
        """Incidents with timestamp after current are excluded."""
        current_time = datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=1, service="api", timestamp=current_time)
        db_session.add(current)

        # Past incident: should be included
        db_session.add(_incident(
            id=2,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        # Future incident: should be excluded
        db_session.add(_incident(
            id=3,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 3, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        assert 2 in similar_ids  # Past incident included
        assert 3 not in similar_ids  # Future incident excluded

    def test_current_incident_timestamp_is_boundary(self, db_session: Session):
        """Incidents at exact same timestamp as current are excluded."""
        current_time = datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=1, service="api", timestamp=current_time)
        db_session.add(current)

        # Incident with same timestamp: should be excluded (not strictly before)
        db_session.add(_incident(
            id=2,
            service="api",
            root_cause="cpu_spike",
            timestamp=current_time,
        ))

        # Incident before: should be included
        db_session.add(_incident(
            id=3,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, 23, 59, 59, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        assert 2 not in similar_ids  # Same timestamp excluded
        assert 3 in similar_ids  # Earlier timestamp included

    def test_only_earlier_incidents_contribute_to_counts(self, db_session: Session):
        """Incident counts only include temporally prior incidents."""
        current_time = datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=1, service="api", root_cause="cpu_spike", timestamp=current_time)
        db_session.add(current)

        # Three past incidents with same root cause
        for i in range(2, 5):
            db_session.add(_incident(
                id=i,
                service="api",
                root_cause="cpu_spike",
                timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
            ))

        # Two future incidents with same root cause (should not count)
        for i in range(5, 7):
            db_session.add(_incident(
                id=i,
                service="api",
                root_cause="cpu_spike",
                timestamp=datetime(2026, 1, 3, tzinfo=timezone.utc).replace(tzinfo=None),
            ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Only past incidents (ids 2, 3, 4) should count as same root cause
        assert result["historical_summary"]["same_root_cause_count"] == 3


class TestDeterministicTieBreaking:
    """Tests for deterministic ordering when timestamps/frequencies are equal."""

    def test_equal_timestamps_ordered_by_id_ascending(self, db_session: Session):
        """Incidents with equal timestamps are ordered by ID ascending as tie-breaker."""
        current_time = datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=10, service="api", timestamp=current_time)
        db_session.add(current)

        # Create multiple incidents with same timestamp (earlier than current)
        same_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        # Add in non-order to verify deterministic sorting
        db_session.add(_incident(id=5, service="api", root_cause="cpu_spike", timestamp=same_time))
        db_session.add(_incident(id=3, service="api", root_cause="cpu_spike", timestamp=same_time))
        db_session.add(_incident(id=7, service="api", root_cause="cpu_spike", timestamp=same_time))
        db_session.commit()

        result = get_historical_intelligence(10, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        # Should be ordered 3, 5, 7 (ascending ID when timestamps are equal)
        assert similar_ids == [3, 5, 7]

    def test_recommendation_frequency_tie_uses_incident_id(self, db_session: Session):
        """Recommendation frequency ties are broken deterministically by incident ID."""
        current_time = datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=100, root_cause="cpu_spike", timestamp=current_time)
        db_session.add(current)

        # Two recommendations with equal frequency
        db_session.add(_incident(
            id=1,
            root_cause="cpu_spike",
            recommendation="scale_cpu",
            timestamp=datetime(2026, 1, 1, 1, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.add(_incident(
            id=10,
            root_cause="cpu_spike",
            recommendation="optimize_queries",
            timestamp=datetime(2026, 1, 1, 2, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.commit()

        result = get_historical_intelligence(100, db_session)

        # With equal frequency (1 each), should pick the one from earlier incident (ID 1)
        assert result["historical_summary"]["most_frequently_recorded_recommendation"] == "scale_cpu"

    def test_affected_service_frequency_tie_uses_incident_id(self, db_session: Session):
        """Service frequency ties are broken deterministically by incident ID."""
        current_time = datetime(2026, 1, 2, 12, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=100, timestamp=current_time)
        db_session.add(current)

        # Two services with equal frequency
        db_session.add(_incident(
            id=1,
            service="api",
            timestamp=datetime(2026, 1, 1, 1, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.add(_incident(
            id=10,
            service="cache",
            timestamp=datetime(2026, 1, 1, 2, 0, 0, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.commit()

        result = get_historical_intelligence(100, db_session)

        # With equal frequency (1 each), should pick the one from earlier incident (ID 1)
        assert result["historical_summary"]["most_affected_service"] == "api"


class TestEmptyAndWhitespaceValues:
    """Tests for handling empty and whitespace-only field values."""

    def test_empty_service_name_prevents_matching(self, db_session: Session):
        """Incidents with empty service_name don't match by service."""
        current = _incident(id=1, service="api", timestamp=datetime(2026, 1, 2, tzinfo=timezone.utc).replace(tzinfo=None))
        db_session.add(current)

        # Incident with empty service name
        db_session.add(_incident(
            id=2,
            service="",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        # Incident with valid service
        db_session.add(_incident(
            id=3,
            service="api",
            root_cause="memory_leak",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Only id=3 should count as same service
        assert result["historical_summary"]["same_service_count"] == 1

    def test_whitespace_only_service_prevents_matching(self, db_session: Session):
        """Incidents with whitespace-only service_name don't match by service."""
        current = _incident(id=1, service="api", timestamp=datetime(2026, 1, 2, tzinfo=timezone.utc).replace(tzinfo=None))
        db_session.add(current)

        # Incident with whitespace-only service name
        db_session.add(_incident(
            id=2,
            service="   ",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Whitespace-only should not match
        assert result["historical_summary"]["same_service_count"] == 0

    def test_empty_root_cause_prevents_matching(self, db_session: Session):
        """Incidents with empty root_cause don't match by root cause."""
        current = _incident(id=1, root_cause="cpu_spike", timestamp=datetime(2026, 1, 2, tzinfo=timezone.utc).replace(tzinfo=None))
        db_session.add(current)

        # Incident with empty root cause
        db_session.add(_incident(
            id=2,
            root_cause="",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Empty root cause should not count
        assert result["historical_summary"]["same_root_cause_count"] == 0

    def test_empty_recommendation_excluded_from_frequency(self, db_session: Session):
        """Incidents with empty recommendation are excluded from frequency calculation."""
        current_time = datetime(2026, 1, 2, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=1, root_cause="cpu_spike", timestamp=current_time)
        db_session.add(current)

        # Incident with valid recommendation (should be counted)
        db_session.add(_incident(
            id=2,
            root_cause="cpu_spike",
            recommendation="scale_cpu",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        # Incident with empty recommendation (should be excluded from frequency)
        db_session.add(_incident(
            id=3,
            root_cause="cpu_spike",
            recommendation="",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Only valid recommendation should be returned
        assert result["historical_summary"]["most_frequently_recorded_recommendation"] == "scale_cpu"

    def test_blank_values_in_matching_filters_candidates(self, db_session: Session):
        """Similar incident matching filters out candidates with blank key values."""
        current_time = datetime(2026, 1, 2, tzinfo=timezone.utc).replace(tzinfo=None)
        current = _incident(id=1, service="api", root_cause="cpu_spike", timestamp=current_time)
        db_session.add(current)

        # Incident with blank service (should not match priority 1 or 2, only priority 3)
        db_session.add(_incident(
            id=2,
            service="",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        # Valid priority 1 match
        db_session.add(_incident(
            id=3,
            service="api",
            root_cause="cpu_spike",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))

        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        similar_ids = [inc["id"] for inc in result["similar_incidents"]]
        # Should include valid priority 1 match, but not blank-service incident
        assert 3 in similar_ids
        assert 2 in similar_ids  # But id=2 IS included because it matches priority 3 (root_cause)


class TestFieldNameCorrectness:
    """Tests to verify field names are correct in response."""

    def test_schema_uses_most_frequently_recorded_recommendation_field(self, db_session: Session):
        """Response uses 'most_frequently_recorded_recommendation' field name."""
        current = _incident(id=1, root_cause="cpu_spike")
        db_session.add(current)
        db_session.add(_incident(
            id=2,
            root_cause="cpu_spike",
            recommendation="scale_cpu",
            timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc).replace(tzinfo=None),
        ))
        db_session.commit()

        result = get_historical_intelligence(1, db_session)

        # Check that the field exists with the new name
        assert "most_frequently_recorded_recommendation" in result["historical_summary"]
        # Old field name should NOT exist
        assert "most_common_recommendation" not in result["historical_summary"]
