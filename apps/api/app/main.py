from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, customers, payments, subscriptions, risk, copilot, opportunities, evaluation, audit, experiments, dashboard, search, simulation, policy, demo
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
def on_startup():
    # Schema changes go through Alembic only — no create_all.
    from alembic import command
    from alembic.config import Config
    from pathlib import Path

    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    cfg = Config(str(alembic_ini))
    command.upgrade(cfg, "head")
    log.info("api started; migrations applied to head")
