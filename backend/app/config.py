"""Runtime configuration loaded before database modules are imported."""

import os
from pathlib import Path

from dotenv import load_dotenv


# Resolve this from the source file so `uvicorn app.main:app` works whether it
# is launched from the repository root, backend/, or a service manager.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"

# Keep values supplied by a service manager/container authoritative, while
# making the documented local `.env` configuration available to Uvicorn.
load_dotenv(ENV_FILE, override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
