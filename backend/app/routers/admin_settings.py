from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SystemSetting, ActivityLog, Notification, Admin
from app.schemas import (
    SystemSettingOut,
    SystemSettingUpdate,
    ActivityLogOut,
    NotificationOut,
)
from app.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/settings",
    tags=["Admin Settings & System"],
)


@router.get("", response_model=List[SystemSettingOut])
def get_all_settings(
    category: Optional[str] = Query(None, description="Filter by category e.g. general, pricing, inventory"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(SystemSetting)
    if category:
        query = query.filter(SystemSetting.category == category)
    return query.order_by(SystemSetting.category.asc(), SystemSetting.id.asc()).all()


@router.put("", response_model=List[SystemSettingOut])
def update_settings(
    payload: SystemSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    for key, value in payload.settings.items():
        st = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
        if st:
            st.setting_value = str(value)
        else:
            st = SystemSetting(
                setting_key=key,
                setting_value=str(value),
                category="general",
                description=f"Configuration for {key}",
            )
            db.add(st)

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_SYSTEM_SETTINGS",
            entity_type="system_settings",
            entity_id="global",
            details={"updated_keys": list(payload.settings.keys())},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    return db.query(SystemSetting).order_by(SystemSetting.category.asc(), SystemSetting.id.asc()).all()


@router.get("/logs", response_model=dict)
def list_activity_logs(
    action_filter: Optional[str] = Query(None, alias="action"),
    entity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(ActivityLog).outerjoin(Admin, Admin.id == ActivityLog.admin_id)

    if action_filter:
        query = query.filter(ActivityLog.action.ilike(f"%{action_filter.strip()}%"))

    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)

    total = query.count()
    offset = (page - 1) * page_size
    logs = (
        query.order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    admin_ids = [l.admin_id for l in logs if l.admin_id]
    admins = db.query(Admin).filter(Admin.id.in_(admin_ids)).all() if admin_ids else []
    admin_map = {a.id: a.full_name for a in admins}

    items = [
        ActivityLogOut(
            id=log.id,
            admin_id=log.admin_id,
            admin_name=admin_map.get(log.admin_id, "System / Admin"),
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/notifications", response_model=List[NotificationOut])
def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
