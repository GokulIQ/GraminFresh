from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from jose import jwt, JWTError
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import DeliveryPartner, DeliveryAssignment, Order, OrderStatusHistory, Admin, Customer, ActivityLog
from app.schemas import (
    DeliveryPartnerCreate,
    DeliveryPartnerUpdate,
    DeliveryPartnerOut,
    DeliveryAssignmentOut,
    DeliveryPartnerLogin,
    DeliveryPartnerToken,
    DeliveryStatusUpdate
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_admin,
    get_current_delivery_partner,
    oauth2_scheme
)
from app.config import settings

router = APIRouter(
    prefix="/api",
    tags=["Delivery Partner Management"],
)


# Helper to build detailed DeliveryAssignmentOut response
def build_assignment_response(assignment: DeliveryAssignment, db: Session) -> DeliveryAssignmentOut:
    # Fetch details from Order and Customer
    order = db.query(Order).filter(Order.order_id == assignment.order_id).first()
    customer_name = None
    customer_phone = None
    delivery_address = None
    total_amount = None
    payment_method = None
    order_status = None

    if order:
        order_status = order.order_status
        total_amount = order.total_amount
        payment_method = order.payment_method
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer:
            customer_name = customer.full_name
            customer_phone = customer.mobile_number
        
        # Address fallback to Customer village if address record is missing
        if order.delivery_address:
            addr = order.delivery_address
            delivery_address = f"{addr.full_name}, {addr.address}, {addr.village}, {addr.district}, {addr.state} - {addr.pincode}"
        elif customer:
            delivery_address = f"{customer.full_name}, {customer.village}"

    return DeliveryAssignmentOut(
        id=assignment.id,
        order_id=assignment.order_id,
        partner_id=assignment.partner_id,
        partner_name=assignment.partner.full_name if assignment.partner else "Unknown",
        partner_phone=assignment.partner.phone if assignment.partner else "",
        status=assignment.status,
        assigned_at=assignment.assigned_at,
        delivered_at=assignment.delivered_at,
        notes=assignment.notes,
        customer_name=customer_name,
        customer_phone=customer_phone,
        delivery_address=delivery_address,
        total_amount=total_amount,
        payment_method=payment_method,
        order_status=order_status,
        expected_delivery_date=order.expected_delivery_date if order else None
    )


# ---------------------------------------------------------------------------
# DELIVERY PARTNER PORTAL ENDPOINTS
# ---------------------------------------------------------------------------

@router.post("/delivery/login", response_model=DeliveryPartnerToken)
def delivery_login(payload: DeliveryPartnerLogin, db: Session = Depends(get_db)):
    # Lookup by phone or email
    partner = db.query(DeliveryPartner).filter(
        or_(
            DeliveryPartner.email == payload.username.lower().strip(),
            DeliveryPartner.phone == payload.username.strip()
        )
    ).first()

    if not partner or not partner.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, partner.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if partner.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your delivery partner account is inactive or disabled. Contact system administrator.",
        )

    access_token = create_access_token(
        data={"sub": partner.partner_id, "type": "delivery_partner"}
    )

    return DeliveryPartnerToken(
        access_token=access_token,
        token_type="bearer",
        partner=partner
    )


@router.get("/delivery/profile", response_model=DeliveryPartnerOut)
def get_delivery_profile(current_partner: DeliveryPartner = Depends(get_current_delivery_partner)):
    return current_partner


@router.put("/delivery/profile", response_model=DeliveryPartnerOut)
def update_delivery_profile(
    payload: DeliveryPartnerUpdate,
    db: Session = Depends(get_db),
    current_partner: DeliveryPartner = Depends(get_current_delivery_partner)
):
    if payload.full_name is not None:
        current_partner.full_name = payload.full_name.strip()
    
    if payload.phone is not None:
        p_clean = payload.phone.strip()
        existing = db.query(DeliveryPartner).filter(
            DeliveryPartner.phone == p_clean, 
            DeliveryPartner.id != current_partner.id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Phone number already registered to another partner")
        current_partner.phone = p_clean
        
    if payload.email is not None:
        e_clean = payload.email.lower().strip()
        existing = db.query(DeliveryPartner).filter(
            DeliveryPartner.email == e_clean, 
            DeliveryPartner.id != current_partner.id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email address already registered to another partner")
        current_partner.email = e_clean

    if payload.password is not None and len(payload.password.strip()) >= 6:
        current_partner.password = hash_password(payload.password.strip())

    if payload.vehicle_type is not None:
        current_partner.vehicle_type = payload.vehicle_type.strip()
        
    if payload.vehicle_number is not None:
        current_partner.vehicle_number = payload.vehicle_number.strip()

    if payload.current_location is not None:
        current_partner.current_location = payload.current_location.strip()
        
    if payload.availability_status is not None:
        current_partner.availability_status = payload.availability_status

    db.commit()
    db.refresh(current_partner)
    return current_partner


@router.get("/delivery/dashboard/stats")
def get_delivery_stats(
    db: Session = Depends(get_db),
    current_partner: DeliveryPartner = Depends(get_current_delivery_partner)
):
    today = datetime.utcnow().date()
    
    # Total assignments today
    today_count = db.query(func.count(DeliveryAssignment.id)).filter(
        DeliveryAssignment.partner_id == current_partner.id,
        func.date(DeliveryAssignment.assigned_at) == today
    ).scalar() or 0

    # Pending deliveries (assigned, accepted, picked up, out for delivery)
    pending_count = db.query(func.count(DeliveryAssignment.id)).filter(
        DeliveryAssignment.partner_id == current_partner.id,
        DeliveryAssignment.status.in_(["Assigned", "Accepted", "Picked Up", "Out for Delivery"])
    ).scalar() or 0

    # Completed deliveries (delivered)
    completed_count = db.query(func.count(DeliveryAssignment.id)).filter(
        DeliveryAssignment.partner_id == current_partner.id,
        DeliveryAssignment.status == "Delivered"
    ).scalar() or 0

    return {
        "today_deliveries": today_count,
        "pending_deliveries": pending_count,
        "completed_deliveries": completed_count,
        "active_trips": pending_count
    }


@router.get("/delivery/assignments", response_model=List[DeliveryAssignmentOut])
def get_partner_assignments(
    db: Session = Depends(get_db),
    current_partner: DeliveryPartner = Depends(get_current_delivery_partner)
):
    # Only list active assignments (not completed / cancelled)
    assignments = db.query(DeliveryAssignment).filter(
        DeliveryAssignment.partner_id == current_partner.id,
        DeliveryAssignment.status.in_(["Assigned", "Accepted", "Picked Up", "Out for Delivery"])
    ).order_by(DeliveryAssignment.assigned_at.desc()).all()

    return [build_assignment_response(a, db) for a in assignments]


@router.get("/delivery/history", response_model=List[DeliveryAssignmentOut])
def get_partner_delivery_history(
    db: Session = Depends(get_db),
    current_partner: DeliveryPartner = Depends(get_current_delivery_partner)
):
    assignments = db.query(DeliveryAssignment).filter(
        DeliveryAssignment.partner_id == current_partner.id,
        DeliveryAssignment.status == "Delivered"
    ).order_by(DeliveryAssignment.delivered_at.desc()).all()

    return [build_assignment_response(a, db) for a in assignments]


@router.patch("/delivery-assignments/{assignment_id}/status", response_model=DeliveryAssignmentOut)
def update_delivery_assignment_status(
    assignment_id: int,
    payload: DeliveryStatusUpdate,
    db: Session = Depends(get_db),
    current_partner: DeliveryPartner = Depends(get_current_delivery_partner)
):
    assignment = db.query(DeliveryAssignment).filter(
        DeliveryAssignment.id == assignment_id,
        DeliveryAssignment.partner_id == current_partner.id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Delivery assignment not found")

    new_status = payload.status
    current_status = assignment.status

    # Validate state transition
    allowed_transitions = {
        "Assigned": ["Accepted"],
        "Accepted": ["Picked Up"],
        "Picked Up": ["Out for Delivery"],
        "Out for Delivery": ["Delivered"]
    }

    if current_status not in allowed_transitions:
        raise HTTPException(
            status_code=400, 
            detail=f"No transitions allowed from '{current_status}' status."
        )

    if new_status not in allowed_transitions[current_status]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition. From '{current_status}' you can only go to {allowed_transitions[current_status]}."
        )

    # Apply update
    assignment.status = new_status
    if payload.notes:
        assignment.notes = payload.notes

    # Synchronize with Order model
    order = db.query(Order).filter(Order.order_id == assignment.order_id).first()
    if order:
        if new_status == "Out for Delivery":
            order.order_status = "Out for Delivery"
        elif new_status == "Delivered":
            order.order_status = "Delivered"
            order.payment_status = "Paid"  # Automatic COD payment completion
            assignment.delivered_at = datetime.utcnow()
            
        # Add to order history
        hist = OrderStatusHistory(
            order_id=order.order_id,
            status=new_status,
            notes=f"Delivery updated to '{new_status}' by rider {current_partner.full_name}. " + (payload.notes or "")
        )
        db.add(hist)

    # Recalculate partner active count
    current_partner.active_orders_count = db.query(func.count(Order.order_id)).filter(
        Order.assigned_delivery_partner == current_partner.id,
        Order.order_status.in_(["Confirmed", "Preparing", "Out for Delivery"])
    ).scalar() or 0

    db.commit()
    db.refresh(assignment)
    db.refresh(current_partner)
    return build_assignment_response(assignment, db)


# ---------------------------------------------------------------------------
# ADMIN OPERATIONS (ALIASED AS EXACT PATHS REQUESTED BY THE SPECIFICATION)
# ---------------------------------------------------------------------------

@router.get("/delivery-partners", response_model=List[DeliveryPartnerOut])
def admin_list_partners(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    query = db.query(DeliveryPartner)
    if search:
        kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                DeliveryPartner.full_name.ilike(kw),
                DeliveryPartner.phone.ilike(kw),
                DeliveryPartner.email.ilike(kw),
                DeliveryPartner.partner_id.ilike(kw),
            )
        )
    if status_filter:
        query = query.filter(DeliveryPartner.status == status_filter)

    partners = query.order_by(DeliveryPartner.id.asc()).all()

    # Dynamic active orders recalculation
    for p in partners:
        p.active_orders_count = db.query(func.count(Order.order_id)).filter(
            Order.assigned_delivery_partner == p.id,
            Order.order_status.in_(["Confirmed", "Preparing", "Out for Delivery"])
        ).scalar() or 0

    return partners


@router.post("/delivery-partners", response_model=DeliveryPartnerOut, status_code=status.HTTP_201_CREATED)
def admin_create_partner(
    payload: DeliveryPartnerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    # Verify uniqueness
    existing_phone = db.query(DeliveryPartner).filter(DeliveryPartner.phone == payload.phone.strip()).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="A delivery partner with this phone number already exists")

    existing_email = db.query(DeliveryPartner).filter(DeliveryPartner.email == payload.email.lower().strip()).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="A delivery partner with this email address already exists")

    # Generate custom partner ID (e.g. DP-004)
    count = db.query(func.count(DeliveryPartner.id)).scalar() or 0
    generated_id = f"DP-{str(count + 1).zfill(3)}"

    partner = DeliveryPartner(
        partner_id=generated_id,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.lower().strip(),
        password=hash_password(payload.password),
        vehicle_type=payload.vehicle_type.strip(),
        vehicle_number=payload.vehicle_number.strip() if payload.vehicle_number else None,
        current_location=payload.current_location.strip() if payload.current_location else "Main Hub",
        status=payload.status or "active",
        availability_status=payload.availability_status or "Available",
        active_orders_count=0
    )
    db.add(partner)
    db.flush()

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="CREATE_DELIVERY_PARTNER",
            entity_type="delivery_partner",
            entity_id=partner.partner_id,
            details={"name": partner.full_name, "email": partner.email},
            ip_address=request.client.host if request.client else None
        )
    )
    db.commit()
    db.refresh(partner)
    return partner


@router.get("/delivery-partners/{partner_id}", response_model=DeliveryPartnerOut)
def admin_get_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    partner.active_orders_count = db.query(func.count(Order.order_id)).filter(
        Order.assigned_delivery_partner == partner.id,
        Order.order_status.in_(["Confirmed", "Preparing", "Out for Delivery"])
    ).scalar() or 0

    return partner


@router.put("/delivery-partners/{partner_id}", response_model=DeliveryPartnerOut)
def admin_update_partner(
    partner_id: int,
    payload: DeliveryPartnerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    if payload.full_name is not None:
        partner.full_name = payload.full_name.strip()

    if payload.phone is not None:
        p_clean = payload.phone.strip()
        existing = db.query(DeliveryPartner).filter(
            DeliveryPartner.phone == p_clean, 
            DeliveryPartner.id != partner_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered to another partner")
        partner.phone = p_clean

    if payload.email is not None:
        e_clean = payload.email.lower().strip()
        existing = db.query(DeliveryPartner).filter(
            DeliveryPartner.email == e_clean, 
            DeliveryPartner.id != partner_id
        ).first()
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
            ip_address=request.client.host if request.client else None
        )
    )
    db.commit()
    db.refresh(partner)
    return partner


@router.patch("/delivery-partners/{partner_id}/status", response_model=DeliveryPartnerOut)
def admin_toggle_partner_status(
    partner_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
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
            ip_address=request.client.host if request.client else None
        )
    )
    db.commit()
    db.refresh(partner)
    return partner


@router.post("/delivery-assignments", response_model=DeliveryAssignmentOut)
def admin_assign_order(
    payload: dict, # Contain order_id and delivery_partner_id
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    order_id = payload.get("order_id")
    partner_id = payload.get("delivery_partner_id")

    if not order_id or not partner_id:
        raise HTTPException(status_code=400, detail="order_id and delivery_partner_id are required")

    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.order_status in ["Delivered", "Cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot assign a delivered or cancelled order.")

    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Delivery partner not found")

    if partner.status != "active":
        raise HTTPException(status_code=400, detail="Cannot assign to a disabled delivery partner.")

    # Record or update Assignment
    assignment = db.query(DeliveryAssignment).filter(DeliveryAssignment.order_id == order.order_id).first()
    if assignment:
        assignment.partner_id = partner.id
        assignment.status = "Assigned"
    else:
        assignment = DeliveryAssignment(
            order_id=order.order_id,
            partner_id=partner.id,
            status="Assigned"
        )
        db.add(assignment)

    order.assigned_delivery_partner = partner.id

    # Automatically set order status to Confirmed/Preparing if not already progressed
    if order.order_status == "Pending":
        order.order_status = "Confirmed"

    db.commit()
    db.refresh(assignment)
    return build_assignment_response(assignment, db)


@router.get("/delivery-assignments", response_model=List[DeliveryAssignmentOut])
def admin_get_assignments(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    assignments = db.query(DeliveryAssignment).order_by(DeliveryAssignment.assigned_at.desc()).all()
    return [build_assignment_response(a, db) for a in assignments]


@router.get("/delivery-partners/{partner_id}/orders", response_model=List[DeliveryAssignmentOut])
def get_partner_orders(
    partner_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # Determine caller role & permissions
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        token_type = payload.get("type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if token_type == "delivery_partner":
        partner = db.query(DeliveryPartner).filter(DeliveryPartner.partner_id == sub).first()
        if not partner or partner.id != partner_id:
            raise HTTPException(status_code=403, detail="Access denied. You cannot view another partner's orders.")
    elif token_type != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    assignments = db.query(DeliveryAssignment).filter(
        DeliveryAssignment.partner_id == partner_id
    ).order_by(DeliveryAssignment.assigned_at.desc()).all()

    return [build_assignment_response(a, db) for a in assignments]
