from fastapi import APIRouter, HTTPException
from app.models.simulator import WhatIfSimulator

router = APIRouter(prefix="/simulator", tags=["Simulator"])

simulator = WhatIfSimulator()


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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))