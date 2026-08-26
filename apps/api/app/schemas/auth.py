import uuid

from pydantic import BaseModel, EmailStr


class MerchantCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class MerchantLogin(BaseModel):
    email: EmailStr
    password: str


class MerchantOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
