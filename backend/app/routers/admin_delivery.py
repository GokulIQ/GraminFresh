from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import DeliveryPartner, DeliveryAssignment, Order, Admin, ActivityLog
from app.schemas import (
    DeliveryPartnerCreate,
    DeliveryPartnerUpdate,
    DeliveryPartnerOut,
    DeliveryAssignmentOut,
)
from app.security import get_current_admin, hash_password

router = APIRouter(
    prefix="/api/admin/delivery",
    tags=["Admin Delivery Management"],
)


@router.get("/partners", response_model=List[DeliveryPartnerOut])
def list_delivery_partners(
    search: Optional[str] = Query(None, description="Search by name, phone, partner_id"),
    status_filter: Optional[str] = Query(None, alias="status", description="active / inactive"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(DeliveryPartner)

    if search:
        kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                DeliveryPartner.full_name.ilike(kw),
                DeliveryPartner.phone.ilike(kw),
                DeliveryPartner.partner_id.ilike(kw),
            )
        )

    if status_filter:
        query = query.filter(DeliveryPartner.status == status_filter)

    partners = query.order_by(DeliveryPartner.id.asc()).all()

    # Recalculate real-time active order count for each partner
    for p in partners:
        active_cnt = (
            db.query(func.count(Order.order_id))
            .filter(
                Order.assigned_delivery_partner == p.id,
                Order.order_status.in_(["Confirmed", "Preparing", "Out for Delivery"]),
            )
            .scalar()
            or 0
        )
        p.active_orders_count = active_cnt

    return partners


@router.post("/partners", response_model=DeliveryPartnerOut, status_code=status.HTTP_201_CREATED)
def create_delivery_partner(
    payload: DeliveryPartnerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Check phone uniqueness
    existing = db.query(DeliveryPartner).filter(DeliveryPartner.phone == payload.phone).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A delivery partner with this phone number already exists",
        )

    if payload.email:
        existing_email = db.query(DeliveryPartner).filter(DeliveryPartner.email == payload.email.lower().strip()).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="A delivery partner with this email address already exists",
            )

    # Generate custom partner_id e.g. DP-004
    count = db.query(func.count(DeliveryPartner.id)).scalar() or 0
    generated_id = f"DP-{str(count + 1).zfill(3)}"

    partner = DeliveryPartner(
        partner_id=generated_id,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.lower().strip() if payload.email else None,
        password=hash_password(payload.password) if payload.password else None,
        vehicle_type=payload.vehicle_type.strip(),
        vehicle_number=payload.vehicle_number.strip() if payload.vehicle_number else None,
        current_location=payload.current_location.strip() if payload.current_location else "Main Hub",
        status=payload.status or "active",
        availability_status=payload.availability_status or "Available",
        active_orders_count=0,
    )
    db.add(partner)
    db.flush()

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="CREATE_DELIVERY_PARTNER",
            entity_type="delivery_partner",
            entity_id=partner.partner_id,
            details={"name": partner.full_name, "phone": partner.phone},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(partner)
    return partner


@router.get("/partners/{partner_id}", response_model=DeliveryPartnerOut)
def get_delivery_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    partner.active_orders_count = (
        db.query(func.count(Order.order_id))
        .filter(
            Order.assigned_delivery_partner == partner.id,
            Order.order_status.in_(["Confirmed", "Preparing", "Out for Delivery"]),
        )
        .scalar()
        or 0
    )
    return partner


@router.put("/partners/{partner_id}", response_model=DeliveryPartnerOut)
def update_delivery_partner(
    partner_id: int,
    payload: DeliveryPartnerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    if payload.full_name is not None:
        partner.full_name = payload.full_name.strip()

    if payload.phone is not None:
        p_clean = payload.phone.strip()
        existing = (
            db.query(DeliveryPartner)
            .filter(DeliveryPartner.phone == p_clean, DeliveryPartner.id != partner_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered to another partner")
        partner.phone = p_clean

    if payload.email is not None:
        e_clean = payload.email.lower().strip()
        existing = (
            db.query(DeliveryPartner)
            .filter(DeliveryPartner.email == e_clean, DeliveryPartner.id != partner_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered to another partner")
        partner.email = e_clean

    if payload.password is not None and len(payload.password.strip()) >= 6:
        partner.password = hash_password(payload.password.strip())

    if payload.vehicle_type is not None:
        partner.vehicle_type = payload.vehicle_type.strip()

    if payload.vehicle_number is not None:
        partner.vehicle_number = payload.vehicle_number.strip()

    if payload.current_location is not None:
        partner.current_location = payload.current_location.strip()

    if payload.status is not None:
        partner.status = payload.status

    if payload.availability_status is not None:
        partner.availability_status = payload.availability_status

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_DELIVERY_PARTNER",
            entity_type="delivery_partner",
            entity_id=partner.partner_id,
            details={"name": partner.full_name, "status": partner.status},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(partner)
    return partner


@router.patch("/partners/{partner_id}/status", response_model=DeliveryPartnerOut)
def toggle_partner_status(
    partner_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    partner.status = "inactive" if partner.status == "active" else "active"

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="TOGGLE_DELIVERY_PARTNER_STATUS",
            entity_type="delivery_partner",
            entity_id=partner.partner_id,
            details={"status": partner.status},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(partner)
    return partner


@router.get("/assignments", response_model=List[DeliveryAssignmentOut])
def list_delivery_assignments(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    assignments = (
        db.query(DeliveryAssignment)
        .options(joinedload(DeliveryAssignment.partner))
        .order_by(DeliveryAssignment.assigned_at.desc())
        .limit(limit)
        .all()
    )

    return [
        DeliveryAssignmentOut(
            id=a.id,
            order_id=a.order_id,
            partner_id=a.partner_id,
            partner_name=a.partner.full_name if a.partner else "Unknown",
            partner_phone=a.partner.phone if a.partner else "",
            status=a.status,
            assigned_at=a.assigned_at,
            delivered_at=a.delivered_at,
            notes=a.notes,
        )
        for a in assignments
    ]
