from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """
    Liveness + readiness probe.
    Returns 200 only if the database connection is healthy.
    Used by Render health checks and load balancers.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    status = "ok" if db_status == "ok" else "degraded"

    return {
        "status": status,
        "service": "paypilot-api",
        "database": db_status,
    }
