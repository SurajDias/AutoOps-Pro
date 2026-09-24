"""Safety checks for destructive PostgreSQL integration-test fixtures."""

import pytest
from pathlib import Path

from app.database.postgres import validate_test_database_url


def test_local_backend_launcher_applies_alembic_before_serving():
    launcher = Path(__file__).parents[2] / "scripts" / "start_backend.sh"
    contents = launcher.read_text()

    assert 'alembic" -c "$PROJECT_ROOT/alembic.ini" upgrade head' in contents
    assert contents.index("upgrade head") < contents.index("exec \"$PROJECT_ROOT/.venv/bin/uvicorn\"")


@pytest.mark.parametrize("database_name", ["autoops_test", "autoops_ci"])
def test_validate_test_database_url_accepts_explicit_safe_databases(database_name):
    database_url = f"postgresql://postgres:postgres@127.0.0.1:5432/{database_name}"

    assert validate_test_database_url(database_url) == database_url


@pytest.mark.parametrize("database_name", ["autoops", "autoops_prod"])
def test_validate_test_database_url_rejects_non_test_databases(database_name):
    database_url = f"postgresql://postgres:postgres@127.0.0.1:5432/{database_name}"

    with pytest.raises(RuntimeError, match="explicitly safe test database"):
        validate_test_database_url(database_url)


def test_validate_test_database_url_rejects_missing_url():
    with pytest.raises(RuntimeError, match="TEST_DATABASE_URL is required"):
        validate_test_database_url(None)
