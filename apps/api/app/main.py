import os
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

    Fresh database:
      - Create the SQLAlchemy schema.
      - Stamp Alembic at head.

    Existing database:
      - Run normal Alembic migrations.

    Optional demo bootstrap:
      - When SEED_DEMO_DATA=true and the database has no customers,
        generate the production demo dataset and refresh opportunities.
    """

    from alembic import command
    from alembic.config import Config
    from pathlib import Path

    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"

    _safe_db_url = _redact_db_url(settings.database_url_resolved)

    log.info(
        "startup: running database initialization",
        extra={"db_url": _safe_db_url},
    )

    cfg = Config(str(alembic_ini))

    try:
        from sqlalchemy import inspect, func

        from app.core.database import Base, engine, SessionLocal

        # Import all model modules so every SQLAlchemy model is registered
        # before Base.metadata.create_all() runs.
        from app.models import (
            audit,
            experiment,
            merchant,
            policy,
            revenue,
        )

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

            Base.metadata.create_all(bind=engine)

            log.info(
                "startup: base schema created successfully"
            )

            command.stamp(cfg, "head")

            log.info(
                "startup: fresh database stamped at Alembic head"
            )

        else:
            command.upgrade(cfg, "head")

            log.info(
                "startup: migrations applied to head"
            )

        # ---------------------------------------------------------
        # PRODUCTION DEMO DATA BOOTSTRAP
        # ---------------------------------------------------------

        if os.getenv("SEED_DEMO_DATA", "").lower() == "true":
            from app.models.revenue import Customer
            from app.seed_data import run as run_seed
            from app.services.opportunity_engine import refresh_opportunities

            seed_db = SessionLocal()

            try:
                customer_count = (
                    seed_db.query(func.count(Customer.id)).scalar() or 0
                )

                if customer_count == 0:
                    log.info(
                        "startup: empty database detected — "
                        "starting demo data seed"
                    )

                    # 500 gives us a rich demo without making deployment
                    # unnecessarily slow.
                    run_seed(
                        n_customers=500,
                        wipe=False,
                    )

                    log.info(
                        "startup: demo data generated successfully"
                    )

                    # Convert failed payments, abandoned checkouts and
                    # past-due subscriptions into recovery opportunities.
                    changed = refresh_opportunities(seed_db)

                    log.info(
                        "startup: recovery opportunities refreshed",
                        extra={"opportunities_changed": changed},
                    )

                    log.info(
                        "startup: DEMO DATA BOOTSTRAP COMPLETE"
                    )

                else:
                    log.info(
                        "startup: demo data already exists — "
                        "skipping seed",
                        extra={"customer_count": customer_count},
                    )

            finally:
                seed_db.close()

    except Exception as exc:  # noqa: BLE001
        log.error(
            "startup: database initialization FAILED — process will exit",
            extra={
                "db_url": _safe_db_url,
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )

        print(
            f"\n[STARTUP FAILURE] Database initialization failed.\n"
            f"DB host: {_safe_db_url}\n"
            f"Error: {type(exc).__name__}: {exc}\n",
            file=sys.stderr,
        )

        traceback.print_exc(file=sys.stderr)

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
