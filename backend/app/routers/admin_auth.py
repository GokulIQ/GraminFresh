from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Admin, AdminSession, ActivityLog
from app.schemas import (
    AdminLogin,
    AdminToken,
    AdminOut,
    AdminProfileUpdate,
    AdminPasswordChange,
    ActivityLogOut,
)
from app.security import (
    verify_password,
    hash_password,
    create_admin_access_token,
    get_current_admin,
    hash_token,
)

router = APIRouter(
    prefix="/api/admin/auth",
    tags=["Admin Authentication"],
)


@router.post("/login", response_model=AdminToken)
def admin_login(
    login_data: AdminLogin,
    request: Request,
    db: Session = Depends(get_db),
):
    admin = (
        db.query(Admin)
        .filter(Admin.email == login_data.email.lower().strip())
        .first()
    )

    if not admin or not verify_password(login_data.password, admin.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if admin.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account is disabled. Please contact the administrator.",
        )

    # Generate JWT
    access_token = create_admin_access_token(
        data={"sub": admin.admin_id, "role": admin.role, "email": admin.email}
    )

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Record Admin Session
    session_entry = AdminSession(
        admin_id=admin.id,
        token_hash=hash_token(access_token),
        ip_address=client_ip,
        user_agent=user_agent[:250],
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(session_entry)

    # Log Activity
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

    return AdminToken(
        access_token=access_token,
        token_type="bearer",
        admin=admin,
    )


@router.get("/me", response_model=AdminOut)
def get_current_admin_profile(
    current_admin: Admin = Depends(get_current_admin),
):
    return current_admin


@router.put("/profile", response_model=AdminOut)
def update_admin_profile(
    payload: AdminProfileUpdate,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    current_admin.full_name = payload.full_name.strip()
    if payload.phone is not None:
        current_admin.phone = payload.phone.strip()
    if payload.avatar is not None:
        current_admin.avatar = payload.avatar

    # Audit log
    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_PROFILE",
            entity_type="admin",
            entity_id=current_admin.admin_id,
            details={"full_name": current_admin.full_name},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(current_admin)
    return current_admin


@router.put("/change-password")
def change_admin_password(
    payload: AdminPasswordChange,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_admin.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match",
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long",
        )

    current_admin.password = hash_password(payload.new_password)

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="CHANGE_PASSWORD",
            entity_type="admin",
            entity_id=current_admin.admin_id,
            details={"status": "password_changed"},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/logout")
def admin_logout(
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Log Activity
    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="LOGOUT",
            entity_type="admin",
            entity_id=current_admin.admin_id,
            details={"status": "logged_out"},
            ip_address=request.client.host if request.client else None,
        )
    )
    db.commit()
    return {"message": "Logged out successfully"}


@router.get("/activity", response_model=list[ActivityLogOut])
def get_my_recent_activity(
    limit: int = 20,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.admin_id == current_admin.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        ActivityLogOut(
            id=log.id,
            admin_id=log.admin_id,
            admin_name=current_admin.full_name,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
