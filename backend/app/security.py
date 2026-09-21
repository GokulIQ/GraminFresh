import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Customer, Admin, AdminSession, DeliveryPartner

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/auth/login")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# Customer Token & Authentication (Untouched)
# ---------------------------------------------------------------------------

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def get_current_customer(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Customer:
    """
    Dependency used on protected customer routes. Decodes the JWT, verifies it,
    and loads the matching customer from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        customer_id: str | None = payload.get("sub")
        # Check token type is customer if present
        token_type: str | None = payload.get("type", "customer")
        if customer_id is None or token_type != "customer":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    customer = (
        db.query(Customer).filter(Customer.customer_id == customer_id).first()
    )
    if customer is None or customer.status == "disabled":
        raise credentials_exception
    return customer


# ---------------------------------------------------------------------------
# Admin Token & RBAC Authentication
# ---------------------------------------------------------------------------

def create_admin_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # 7-day token for admin
    to_encode.update({"exp": expire, "type": "admin"})
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def get_current_admin(
    token: str = Depends(admin_oauth2_scheme), db: Session = Depends(get_db)
) -> Admin:
    """
    Dependency for protected admin routes. Decodes JWT, validates admin scope,
    and loads the Admin record from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials. Please log in to the admin panel.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        admin_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if admin_id is None or token_type != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.admin_id == admin_id).first()
    if admin is None:
        raise credentials_exception
    if admin.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account is inactive or disabled. Contact system administrator.",
        )
    return admin


def require_admin_roles(allowed_roles: List[str]):
    """
    Role-based access control dependency factory.
    Example: Depends(require_admin_roles(["super_admin", "manager"]))
    """
    def role_checker(current_admin: Admin = Depends(get_current_admin)):
        if current_admin.role == "super_admin" or "*" in allowed_roles:
            return current_admin
        if current_admin.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}",
            )
        return current_admin
    return role_checker


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_delivery_partner(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> DeliveryPartner:
    """
    Dependency used on protected delivery partner routes. Decodes the JWT, verifies it,
    and loads the matching delivery partner from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        partner_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if partner_id is None or token_type != "delivery_partner":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    partner = db.query(DeliveryPartner).filter(DeliveryPartner.partner_id == partner_id).first()
    if partner is None:
        raise credentials_exception
    if partner.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your delivery partner account is inactive or disabled. Contact administrator.",
        )
    return partner
