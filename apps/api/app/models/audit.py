"""Audit decisions for recovery approve/reject (who, what, when, outcome)."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AuditDecision(Base):
    __tablename__ = "audit_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_email = Column(String, nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("recovery_opportunities.id"), nullable=False, index=True)
    decision = Column(String, nullable=False)  # approve | reject
    outcome = Column(String, nullable=True)
    payload = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
