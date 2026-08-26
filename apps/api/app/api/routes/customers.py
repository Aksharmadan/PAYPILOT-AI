from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.models.merchant import Merchant
from app.models.revenue import Customer
from app.schemas.revenue import CustomerOut, PaginatedCustomers
from app.services.segmentation import segment_for_customer

router = APIRouter(prefix="/customers", tags=["customers"])


def _customer_out(db: Session, customer: Customer) -> CustomerOut:
    data = CustomerOut.model_validate(customer).model_dump()
    data["segment"] = segment_for_customer(db, customer)
    return CustomerOut(**data)


@router.get("", response_model=PaginatedCustomers)
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    query = db.query(Customer)
    if search:
        like = f"%{search}%"
        query = query.filter((Customer.name.ilike(like)) | (Customer.email.ilike(like)))

    total = query.count()
    items = (
        query.order_by(Customer.lifetime_value.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return PaginatedCustomers(
        total=total,
        skip=skip,
        limit=limit,
        items=[_customer_out(db, c) for c in items],
    )


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    _: Merchant = Depends(get_current_merchant),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_out(db, customer)
