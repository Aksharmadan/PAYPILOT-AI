import sys
import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    auth,
    health,
    customers,
    payments,
    subscriptions,
    risk,
    copilot,
    opportunities,
    evaluation,
    audit,
    experiments,
    dashboard,
    search,
    simulation,
    policy,
    demo,
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
    Initialize the database on startup.

    For a completely fresh database, create the schema from the current
    SQLAlchemy models and stamp Alembic at head.

    For an existing database, run normal Alembic migrations.

    This handles the current repository state where the initial Alembic
    migration expects core tables such as `customers` to already exist.
    """
    from alembic import command
    from alembic.config import Config
    from pathlib import Path

    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"

    # Log the database URL without exposing the password.
    _safe_db_url = _redact_db_url(settings.database_url_resolved)

    log.info(
        "startup: running database initialization",
        extra={"db_url": _safe_db_url},
    )

    cfg = Config(str(alembic_ini))

    try:
        from sqlalchemy import inspect

        from app.core.database import Base, engine

        # Import all model modules so every SQLAlchemy model is registered
        # in Base.metadata before create_all() runs.
        from app.models import (
            audit,
            experiment,
            merchant,
            policy,
            revenue,
        )

        # Keep the imports above intentionally active.
        _ = audit
        _ = experiment
        _ = merchant
        _ = policy
        _ = revenue

        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        if "customers" not in existing_tables:
            log.info(
                "startup: fresh database detected — "
                "creating schema from SQLAlchemy models"
            )

            # Create all tables defined by the application's SQLAlchemy
            # models, including their PostgreSQL enum types and foreign keys.
            Base.metadata.create_all(bind=engine)

            log.info(
                "startup: base schema created successfully"
            )

            # The current Alembic migration history expects the core
            # application tables to already exist. Since create_all()
            # has created the current schema, mark the database as being
            # at the latest Alembic revision.
            command.stamp(cfg, "head")

            log.info(
                "startup: fresh database stamped at Alembic head — api ready"
            )

        else:
            # Existing database: use the normal Alembic migration path.
            command.upgrade(cfg, "head")

            log.info(
                "startup: migrations applied to head — api ready"
            )

    except Exception as exc:  # noqa: BLE001
        # Log the full traceback so Render/uvicorn logs show the actual
        # database initialization error.
        log.error(
            "startup: database initialization FAILED — process will exit",
            extra={
                "db_url": _safe_db_url,
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )

        # Also print to stderr for environments where the structured
        # logger is not captured.
        print(
            f"\n[STARTUP FAILURE] Database initialization failed.\n"
            f"DB host: {_safe_db_url}\n"
            f"Error: {type(exc).__name__}: {exc}\n",
            file=sys.stderr,
        )

        traceback.print_exc(file=sys.stderr)

        # Re-raise so uvicorn exits with a non-zero status instead of
        # silently continuing with a broken database state.
        raise


def _redact_db_url(url: str) -> str:
    """Return the DB URL with the password replaced by ***."""
    try:
        from urllib.parse import urlparse, urlunparse

        parsed = urlparse(url)

        if parsed.password:
            netloc = parsed.netloc.replace(
                f":{parsed.password}@",
                ":***@",
            )

            return urlunparse(
                parsed._replace(netloc=netloc)
            )

        return url

    except Exception:
        return "<redacted>"
