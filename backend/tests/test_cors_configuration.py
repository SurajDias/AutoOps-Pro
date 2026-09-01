"""Focused startup configuration tests for the CORS allowlist."""

import pytest

from app.main import DEFAULT_CORS_ORIGINS, parse_cors_origins


def test_default_localhost_origins_are_preserved():
    assert parse_cors_origins(DEFAULT_CORS_ORIGINS) == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ]


def test_explicit_multiple_origins_are_accepted():
    assert parse_cors_origins("http://localhost:5173, http://127.0.0.1:5173") == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_wildcard_origin_is_rejected_with_credentials_enabled():
    with pytest.raises(RuntimeError, match="must not include '\\*' when credentials are enabled"):
        parse_cors_origins("*")


def test_valid_explicit_production_origin_is_accepted():
    assert parse_cors_origins("https://app.example.com") == ["https://app.example.com"]
