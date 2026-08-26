from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_merchant
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.merchant import Merchant
from app.schemas.auth import MerchantCreate, MerchantOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MerchantOut)
def register(payload: MerchantCreate, db: Session = Depends(get_db)):
    existing = db.query(Merchant).filter(Merchant.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    merchant = Merchant(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    return merchant


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.email == form_data.username).first()
    if not merchant or not verify_password(form_data.password, merchant.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token(subject=merchant.email)
    return Token(access_token=token)


@router.get("/me", response_model=MerchantOut)
def me(current: Merchant = Depends(get_current_merchant)):
    return current
