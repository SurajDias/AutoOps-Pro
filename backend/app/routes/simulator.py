import logging

from fastapi import APIRouter, HTTPException
from app.models.simulator import WhatIfSimulator

router = APIRouter(prefix="/simulator", tags=["Simulator"])

simulator = WhatIfSimulator()
logger = logging.getLogger(__name__)


@router.post("/simulate")
def simulate_action(payload: dict):
    try:
        metrics = payload.get("metrics")
        action  = payload.get("action")
        context = payload.get("context", {})   # ← NEW: receive context from frontend

        if not metrics or not action:
            raise HTTPException(
                status_code=400,
                detail="metrics and action are required"
            )

        result = simulator.simulate(metrics, action, context)   # ← pass context through

        return {
            "success": True,
            "data": result
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Simulation failed")
        raise HTTPException(status_code=500, detail="Simulation could not be completed.")
