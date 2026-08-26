import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class ExperimentStatus(str, enum.Enum):
    draft = "draft"
    running = "running"
    completed = "completed"


class ExperimentGroup(str, enum.Enum):
    control = "control"
    treatment = "treatment"


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    # Assumption: population_filter is one of failed_payments | abandoned_checkouts | past_due_subscriptions | all
    population_filter = Column(String, nullable=False, default="failed_payments")
    split_ratio = Column(Float, nullable=False, default=0.5)  # fraction in treatment
    status = Column(Enum(ExperimentStatus), nullable=False, default=ExperimentStatus.draft)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)


class ExperimentAssignment(Base):
    __tablename__ = "experiment_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("experiments.id"), nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("recovery_opportunities.id"), nullable=True, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    entity_type = Column(String, nullable=False)  # payment | checkout | subscription
    group = Column(Enum(ExperimentGroup), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
