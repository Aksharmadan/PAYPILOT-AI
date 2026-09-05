import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class MerchantPolicy(Base):
    __tablename__ = "merchant_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False, unique=True, index=True)
    
    max_retry_count = Column(Integer, nullable=False, default=3)
    retry_cooldown_hours = Column(Integer, nullable=False, default=12)
    auto_amount_limit = Column(Float, nullable=False, default=5000.0)
    approval_amount_limit = Column(Float, nullable=False, default=25000.0)
    contact_limit_per_customer = Column(Integer, nullable=False, default=3)
    min_confidence_for_auto = Column(Float, nullable=False, default=0.7)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    merchant = relationship("Merchant", back_populates="policy")
