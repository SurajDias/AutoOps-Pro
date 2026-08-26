"""PostgreSQL-only fixtures for AutoOps integration tests."""

import os

import pytest
from sqlalchemy.orm import Session


# This must be set before importing the database module, which makes an
# accidental production DATABASE_URL initialization impossible in pytest.
os.environ["AUTOOPS_TESTING"] = "1"

from app.config import TEST_DATABASE_URL
from app.database.postgres import Base, configure_database, validate_test_database_url
from app.database.models import Incident  # noqa: F401 - registers the table with Base metadata


@pytest.fixture(scope="session")
def test_engine():
    """Create the incident schema only in the explicitly configured test DB."""
    database_url = validate_test_database_url(TEST_DATABASE_URL)
    engine = configure_database(database_url)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def db_session(test_engine):
    """Provide a rollback-isolated SQLAlchemy session for each integration test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
