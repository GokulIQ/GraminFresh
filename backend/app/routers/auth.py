import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Customer, CustomerOTP, Admin, AdminSession, ActivityLog, DeliveryPartner
from app.schemas import (
    CustomerLogin,
    CustomerOut,
    CustomerRegister,
    CustomerUpdate,
    RegisterResponse,
    SendOTPRequest,
    SendOTPResponse,
    Token,
    VerifyOTPRequest,
    VerifyOTPResponse,
    UnifiedLogin,
)
from app.security import (
    create_access_token,
    create_admin_access_token,
    get_current_customer,
    hash_password,
    verify_password,
    hash_token,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Customer Authentication"],
)


def generate_next_customer_id(db: Session) -> str:
  
    last_customer = (
        db.query(Customer)
        .filter(Customer.customer_id.like("CUS%"))
        .order_by(Customer.id.desc())
        .first()
    )

    if last_customer:
        try:
            last_number = int(
                last_customer.customer_id.replace("CUS", "")
            )
        except ValueError:
            last_number = 0
    else:
        last_number = 0

    return f"CUS{last_number + 1:03d}"


def build_customer_response(customer: Customer) -> CustomerOut:
    return CustomerOut.model_validate(customer)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_customer(
    payload: CustomerRegister,
    db: Session = Depends(get_db),
):
    existing_customer = (
        db.query(Customer)
        .filter(Customer.mobile_number == payload.mobile_number)
        .first()
    )

    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This mobile number is already registered. "
                "Please log in instead."
            ),
        )

    new_customer = Customer(
        customer_id=generate_next_customer_id(db),
        full_name=payload.full_name,
        mobile_number=payload.mobile_number,
        email=payload.email,
        village=payload.village,
        password=hash_password(payload.password),
    )

    db.add(new_customer)

    try:
        db.commit()
        db.refresh(new_customer)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This mobile number is already registered. "
                "Please log in instead."
            ),
        )

    return RegisterResponse(
        message="Registration successful",
        customer_id=new_customer.customer_id,
    )


@router.post(
    "/login",
    response_model=Token,
)
def login_customer(
    payload: CustomerLogin,
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.mobile_number == payload.mobile_number)
        .first()
    )

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid mobile number or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if customer is None:
        raise invalid_credentials

    if not verify_password(
        payload.password,
        customer.password,
    ):
        raise invalid_credentials

    access_token = create_access_token(
        data={"sub": customer.customer_id}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        customer=build_customer_response(customer),
    )


@router.post(
    "/unified-login",
)
def unified_login(
    payload: UnifiedLogin,
    request: Request,
    db: Session = Depends(get_db),
):
    identifier = payload.identifier.lower().strip()
    
    # 1. Check Admin
    admin = db.query(Admin).filter(Admin.email == identifier).first()
    if admin and verify_password(payload.password, admin.password):
        if admin.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your admin account is disabled. Please contact the administrator.",
            )
        
        access_token = create_admin_access_token(
            data={"sub": admin.admin_id, "role": admin.role, "email": admin.email}
        )
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        session_entry = AdminSession(
            admin_id=admin.id,
            token_hash=hash_token(access_token),
            ip_address=client_ip,
            user_agent=user_agent[:250],
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7),
        )
        db.add(session_entry)

        log_entry = ActivityLog(
            admin_id=admin.id,
            action="LOGIN",
            entity_type="admin",
            entity_id=admin.admin_id,
            details={"ip": client_ip, "agent": user_agent[:100]},
            ip_address=client_ip,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(admin)

        return {
            "role": "admin",
            "access_token": access_token,
            "admin": admin
        }

    # 2. Check Delivery Partner
    delivery_partner = db.query(DeliveryPartner).filter(
        or_(
            DeliveryPartner.email == identifier,
            DeliveryPartner.phone == payload.identifier.strip()
        )
    ).first()
    
    if delivery_partner and delivery_partner.password and verify_password(payload.password, delivery_partner.password):
        if delivery_partner.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your delivery partner account is inactive or disabled. Contact system administrator.",
            )
        
        access_token = create_access_token(
            data={"sub": delivery_partner.partner_id, "type": "delivery_partner"}
        )

        return {
            "role": "delivery",
            "access_token": access_token,
            "partner": delivery_partner
        }

    # 3. Check Customer
    customer = db.query(Customer).filter(
        or_(
            Customer.email == identifier,
            Customer.mobile_number == payload.identifier.strip()
        )
    ).first()

    if customer and verify_password(payload.password, customer.password):
        access_token = create_access_token(
            data={"sub": customer.customer_id}
        )
        
        return {
            "role": "customer",
            "access_token": access_token,
            "customer": build_customer_response(customer)
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post(
    "/send-otp",
    response_model=SendOTPResponse,
)
def send_otp(
    payload: SendOTPRequest,
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.mobile_number == payload.mobile_number)
        .first()
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No customer account was found with this mobile number."
            ),
        )

    db.query(CustomerOTP).filter(
        CustomerOTP.mobile_number == payload.mobile_number,
        CustomerOTP.is_verified.is_(False),
    ).delete(synchronize_session=False)

    otp_code = f"{secrets.randbelow(1_000_000):06d}"

    expires_at = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(minutes=5)
    )

    new_otp = CustomerOTP(
        mobile_number=payload.mobile_number,
        otp_code=otp_code,
        expires_at=expires_at,
        is_verified=False,
        attempts=0,
    )

    db.add(new_otp)

    try:
        db.commit()
        db.refresh(new_otp)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate OTP. Please try again.",
        )

    print(
        f"Development OTP for {payload.mobile_number}: {otp_code}"
    )

    return SendOTPResponse(
        message="OTP generated successfully",
        expires_in_minutes=5,
        development_otp=otp_code,
    )


@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
)
def verify_otp(
    payload: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    customer = (
        db.query(Customer)
        .filter(Customer.mobile_number == payload.mobile_number)
        .first()
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer account not found.",
        )

    otp_record = (
        db.query(CustomerOTP)
        .filter(
            CustomerOTP.mobile_number == payload.mobile_number,
            CustomerOTP.is_verified.is_(False),
        )
        .order_by(CustomerOTP.created_at.desc())
        .first()
    )

    if otp_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found. Please request a new OTP.",
        )

    current_time = datetime.now(timezone.utc).replace(tzinfo=None)

    if current_time > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP.",
        )

    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Too many invalid OTP attempts. "
                "Please request a new OTP."
            ),
        )

    if not secrets.compare_digest(
        otp_record.otp_code,
        payload.otp,
    ):
        otp_record.attempts += 1
        db.commit()

        remaining_attempts = max(
            0,
            5 - otp_record.attempts,
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid OTP. "
                f"{remaining_attempts} attempt(s) remaining."
            ),
        )

    otp_record.is_verified = True
    db.commit()

    access_token = create_access_token(
        data={"sub": customer.customer_id}
    )

    return VerifyOTPResponse(
        message="OTP verified successfully",
        access_token=access_token,
        token_type="bearer",
        customer=build_customer_response(customer),
    )


@router.get(
    "/profile",
    response_model=CustomerOut,
)
def get_profile(
    current_customer: Customer = Depends(get_current_customer),
):
    return build_customer_response(current_customer)


@router.put(
    "/profile",
    response_model=CustomerOut,
)
def update_profile(
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    current_customer.full_name = payload.full_name
    current_customer.email = payload.email
    current_customer.village = payload.village

    try:
        db.commit()
        db.refresh(current_customer)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )

    return build_customer_response(current_customer)