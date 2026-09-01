"""Public error-message checks for unavailable incident persistence."""

import pytest
from fastapi import HTTPException

from app.database import postgres


def test_unconfigured_database_returns_generic_503(monkeypatch, caplog):
    monkeypatch.setattr(postgres, "SessionLocal", None)

    with pytest.raises(HTTPException) as error:
        next(postgres.get_db())

    assert error.value.status_code == 503
    assert error.value.detail == "Incident persistence is temporarily unavailable."
    assert "DATABASE_URL" not in error.value.detail
    assert "no database session factory is configured" in caplog.text
