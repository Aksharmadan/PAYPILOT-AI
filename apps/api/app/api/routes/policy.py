from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.policy import MerchantPolicy
from app.schemas.revenue import PolicyIn, PolicyOut

router = APIRouter(prefix="/policy", tags=["policy"])


@router.get("", response_model=PolicyOut)
def get_policy(
    db: Session = Depends(get_db),
    current: Merchant = Depends(get_current_merchant),
):
    policy = db.query(MerchantPolicy).filter(MerchantPolicy.merchant_id == current.id).first()
    if not policy:
        policy = MerchantPolicy(merchant_id=current.id)
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


@router.post("", response_model=PolicyOut)
def update_policy(
    payload: PolicyIn,
    db: Session = Depends(get_db),
    current: Merchant = Depends(get_current_merchant),
):
    policy = db.query(MerchantPolicy).filter(MerchantPolicy.merchant_id == current.id).first()
    if not policy:
        policy = MerchantPolicy(merchant_id=current.id)
        db.add(policy)
    
    policy.max_retry_count = payload.max_retry_count
    policy.retry_cooldown_hours = payload.retry_cooldown_hours
    policy.auto_amount_limit = payload.auto_amount_limit
    policy.approval_amount_limit = payload.approval_amount_limit
    policy.contact_limit_per_customer = payload.contact_limit_per_customer
    policy.min_confidence_for_auto = payload.min_confidence_for_auto
    
    db.commit()
    db.refresh(policy)
    return policy
