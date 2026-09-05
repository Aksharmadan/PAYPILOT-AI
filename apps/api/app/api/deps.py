from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.merchant import Merchant

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_merchant(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Merchant:
    email = decode_access_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    merchant = db.query(Merchant).filter(Merchant.email == email).first()
    if not merchant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Merchant not found")
    return merchant
