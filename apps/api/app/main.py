import sys
import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    auth, health, customers, payments, subscriptions, risk, copilot,
    opportunities, evaluation, audit, experiments, dashboard, search,
    simulation, policy, demo,
)
from app.api.routes import revenue as revenue_routes
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
log = get_logger("paypilot.api")

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(payments.router)
app.include_router(subscriptions.router)
app.include_router(risk.router)
app.include_router(copilot.router)
app.include_router(opportunities.router)
app.include_router(evaluation.router)
app.include_router(audit.router)
app.include_router(experiments.router)
app.include_router(revenue_routes.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(simulation.router)
app.include_router(policy.router)
app.include_router(demo.router)


@app.on_event("startup")
def on_startup() -> None:
    """
    Run Alembic migrations to head on every startup.

    On failure the full traceback is logged before re-raising so that
    Render/uvicorn logs show the actual error instead of a silent exit(3).
    The exception is always re-raised so uvicorn reports the process as
    failed (exit 3) rather than masking a broken database state.
    """
    from alembic import command
    from alembic.config import Config
    from pathlib import Path

    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"

    # Log which DATABASE_URL we are about to connect to (host only, no password).
    _safe_db_url = _redact_db_url(settings.database_url_resolved)
    log.info("startup: running alembic migrations", extra={"db_url": _safe_db_url})

    cfg = Config(str(alembic_ini))

    try:
        command.upgrade(cfg, "head")
        log.info("startup: migrations applied to head — api ready")
    except Exception as exc:  # noqa: BLE001
        # Log the full traceback so it appears in Render logs.
        # Do NOT log settings.DATABASE_URL directly — use the redacted form.
        log.error(
            "startup: alembic migration FAILED — process will exit",
            extra={
                "db_url": _safe_db_url,
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
        # Also print to stderr for environments where the JSON logger is not
        # captured (e.g. early Render build output).
        print(
            f"\n[STARTUP FAILURE] Alembic migration failed.\n"
            f"DB host: {_safe_db_url}\n"
            f"Error: {type(exc).__name__}: {exc}\n",
            file=sys.stderr,
        )
        traceback.print_exc(file=sys.stderr)
        # Re-raise so uvicorn exits with code 3 (expected failure) rather than
        # silently continuing with a broken schema.
        raise


def _redact_db_url(url: str) -> str:
    """Return the DB URL with the password replaced by ***."""
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(url)
        if parsed.password:
            netloc = parsed.netloc.replace(f":{parsed.password}@", ":***@")
            return urlunparse(parsed._replace(netloc=netloc))
        return url
    except Exception:
        return "<redacted>"
