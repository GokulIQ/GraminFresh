from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import (
    Order,
    OrderItem,
    OrderStatusHistory,
    DeliveryPartner,
    DeliveryAssignment,
    Customer,
    CustomerAddress,
    Product,
    Admin,
    ActivityLog,
)
from app.schemas import (
    AdminOrderOut,
    AdminOrderItemDetailOut,
    AdminOrderStatusUpdate,
    AdminOrderPaymentUpdate,
    AdminOrderAssignDelivery,
    AdminInvoiceOut,
    OrderStatusHistoryResponse,
    AddressResponse,
)
from app.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/orders",
    tags=["Admin Order Management"],
)


@router.get("", response_model=dict)
def list_orders(
    search: Optional[str] = Query(None, description="Search by Order ID, customer name, phone"),
    order_status: Optional[str] = Query(None, description="Filter by status (e.g., Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled)"),
    status: Optional[str] = Query(None, description="Alias for order_status"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status (e.g., Pending, Paid, Failed)"),
    partner_id: Optional[int] = Query(None, description="Filter by assigned delivery partner"),
    date_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
    sort_by: str = Query("created_at", description="created_at, total_amount"),
    sort_order: str = Query("desc", description="asc / desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
            joinedload(Order.delivery_partner),
            selectinload(Order.items).joinedload(OrderItem.product),
            selectinload(Order.status_history),
        )
    )

    if search:
        kw = f"%{search.strip()}%"
        query = query.join(Order.customer).filter(
            or_(
                Order.order_id.ilike(kw),
                Customer.full_name.ilike(kw),
                Customer.mobile_number.ilike(kw),
                Customer.email.ilike(kw),
            )
        )

    effective_status = order_status or status
    if effective_status and effective_status.strip().lower() != "all":
        st_clean = effective_status.strip()
        st_lower = st_clean.lower()
        if st_lower == "pending":
            query = query.filter(Order.order_status.in_(["Pending", "Order Placed"]))
        elif st_lower == "processing":
            query = query.filter(Order.order_status.in_(["Confirmed", "Preparing", "Processing"]))
        else:
            query = query.filter(Order.order_status.ilike(st_clean))

    if payment_status and payment_status.strip().lower() != "all":
        query = query.filter(Order.payment_status.ilike(payment_status.strip()))

    if partner_id:
        query = query.filter(Order.assigned_delivery_partner == partner_id)

    if date_from:
        try:
            d_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Order.created_at >= d_from)
        except ValueError:
            pass

    if date_to:
        try:
            d_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(Order.created_at <= d_to)
        except ValueError:
            pass

    total = query.count()

    # Sort
    sort_col = Order.created_at if sort_by == "created_at" else Order.total_amount
    if sort_order.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    offset = (page - 1) * page_size
    orders = query.offset(offset).limit(page_size).all()

    items: List[AdminOrderOut] = []
    for o in orders:
        items_out = [
            AdminOrderItemDetailOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.product_name if item.product else f"Product #{item.product_id}",
                product_image=item.product.product_image if item.product else None,
                unit=item.product.unit if item.product else "unit",
                quantity=item.quantity,
                price=item.price,
                total=item.price * item.quantity,
            )
            for item in o.items
        ]

        items.append(
            AdminOrderOut(
                order_id=o.order_id,
                customer_id=o.customer_id,
                customer_name=o.customer.full_name if o.customer else "Unknown",
                customer_mobile=o.customer.mobile_number if o.customer else "",
                customer_email=o.customer.email if o.customer else "",
                customer_village=o.customer.village if o.customer else "",
                address_id=o.address_id,
                total_amount=o.total_amount,
                delivery_charge=o.delivery_charge,
                grand_total=o.total_amount,
                payment_method=o.payment_method,
                payment_status=o.payment_status or "Pending",
                order_status=o.order_status,
                assigned_delivery_partner=o.assigned_delivery_partner,
                delivery_partner_name=o.delivery_partner.full_name if o.delivery_partner else None,
                delivery_partner_phone=o.delivery_partner.phone if o.delivery_partner else None,
                expected_delivery_date=o.expected_delivery_date,
                created_at=o.created_at,
                updated_at=o.updated_at,
                delivery_address=AddressResponse.model_validate(o.delivery_address) if o.delivery_address else None,
                items=items_out,
                status_history=[
                    OrderStatusHistoryResponse.model_validate(h)
                    for h in o.status_history
                ],
            )
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/{order_id}", response_model=AdminOrderOut)
def get_order_details(
    order_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
            joinedload(Order.delivery_partner),
            selectinload(Order.items).joinedload(OrderItem.product),
            selectinload(Order.status_history),
        )
        .filter(Order.order_id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items_out = [
        AdminOrderItemDetailOut(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.product_name if item.product else f"Product #{item.product_id}",
            product_image=item.product.product_image if item.product else None,
            unit=item.product.unit if item.product else "unit",
            quantity=item.quantity,
            price=item.price,
            total=item.price * item.quantity,
        )
        for item in order.items
    ]

    return AdminOrderOut(
        order_id=order.order_id,
        customer_id=order.customer_id,
        customer_name=order.customer.full_name if order.customer else "Unknown",
        customer_mobile=order.customer.mobile_number if order.customer else "",
        customer_email=order.customer.email if order.customer else "",
        customer_village=order.customer.village if order.customer else "",
        address_id=order.address_id,
        total_amount=order.total_amount,
        delivery_charge=order.delivery_charge,
        grand_total=order.total_amount,
        payment_method=order.payment_method,
        payment_status=order.payment_status or "Pending",
        order_status=order.order_status,
        assigned_delivery_partner=order.assigned_delivery_partner,
        delivery_partner_name=order.delivery_partner.full_name if order.delivery_partner else None,
        delivery_partner_phone=order.delivery_partner.phone if order.delivery_partner else None,
        expected_delivery_date=order.expected_delivery_date,
        created_at=order.created_at,
        updated_at=order.updated_at,
        delivery_address=AddressResponse.model_validate(order.delivery_address) if order.delivery_address else None,
        items=items_out,
        status_history=[
            OrderStatusHistoryResponse.model_validate(h)
            for h in order.status_history
        ],
    )


@router.patch("/{order_id}/status", response_model=AdminOrderOut)
def update_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
            joinedload(Order.delivery_partner),
            selectinload(Order.items).joinedload(OrderItem.product),
            selectinload(Order.status_history),
        )
        .filter(Order.order_id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.order_status
    new_status = payload.order_status.strip()

    # If status transitioned to Cancelled from non-cancelled, restore inventory
    if new_status.lower() == "cancelled" and old_status.lower() != "cancelled":
        product_ids = [item.product_id for item in order.items]
        if product_ids:
            products = db.query(Product).filter(Product.id.in_(product_ids)).all()
            p_map = {p.id: p for p in products}
            for item in order.items:
                p = p_map.get(item.product_id)
                if p:
                    p.stock += item.quantity

    order.order_status = new_status

    # If delivered, update payment to Paid if COD
    if new_status.lower() == "delivered" and order.payment_status != "Paid":
        order.payment_status = "Paid"

    # Add to status history
    history_entry = OrderStatusHistory(
        order_id=order.order_id,
        status=new_status,
        notes=payload.notes or f"Status updated to {new_status} by Admin",
    )
    db.add(history_entry)

    # Activity Log
    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_ORDER_STATUS",
            entity_type="order",
            entity_id=order.order_id,
            details={"old_status": old_status, "new_status": new_status, "notes": payload.notes},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(order)

    return get_order_details(order_id=order.order_id, db=db, current_admin=current_admin)


@router.patch("/{order_id}/payment", response_model=AdminOrderOut)
def update_order_payment(
    order_id: str,
    payload: AdminOrderPaymentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = payload.payment_status

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_ORDER_PAYMENT",
            entity_type="order",
            entity_id=order.order_id,
            details={"payment_status": payload.payment_status},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    return get_order_details(order_id=order.order_id, db=db, current_admin=current_admin)


@router.patch("/{order_id}/assign-delivery", response_model=AdminOrderOut)
def assign_delivery_partner(
    order_id: str,
    payload: AdminOrderAssignDelivery,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    partner = db.query(DeliveryPartner).filter(DeliveryPartner.id == payload.partner_id).first()
    if not partner:
        raise HTTPException(status_code=400, detail="Delivery partner not found")

    order.assigned_delivery_partner = partner.id
    if payload.expected_delivery_date:
        order.expected_delivery_date = payload.expected_delivery_date

    # Automatically progress status to 'Out for Delivery' if currently confirmed or preparing
    if order.order_status in ["Pending", "Order Placed", "Confirmed", "Preparing", "Processing"]:
        order.order_status = "Out for Delivery"
        hist = OrderStatusHistory(
            order_id=order.order_id,
            status="Out for Delivery",
            notes=f"Assigned to {partner.full_name} ({partner.phone}). " + (payload.notes or ""),
        )
        db.add(hist)

    # Record or update DeliveryAssignment
    assignment = (
        db.query(DeliveryAssignment)
        .filter(DeliveryAssignment.order_id == order.order_id)
        .first()
    )
    if assignment:
        assignment.partner_id = partner.id
        assignment.status = "Assigned"
        assignment.notes = payload.notes
    else:
        assignment = DeliveryAssignment(
            order_id=order.order_id,
            partner_id=partner.id,
            status="Assigned",
            notes=payload.notes,
        )
        db.add(assignment)

    # Increment partner active orders count
    partner.active_orders_count = (
        db.query(func.count(Order.order_id))
        .filter(
            Order.assigned_delivery_partner == partner.id,
            Order.order_status.in_(["Confirmed", "Preparing", "Out for Delivery"]),
        )
        .scalar()
        or 0
    ) + 1

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="ASSIGN_DELIVERY_PARTNER",
            entity_type="order",
            entity_id=order.order_id,
            details={"partner_id": partner.id, "partner_name": partner.full_name},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    return get_order_details(order_id=order.order_id, db=db, current_admin=current_admin)


@router.get("/{order_id}/invoice", response_model=AdminInvoiceOut)
def get_order_invoice(
    order_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
            joinedload(Order.delivery_partner),
            selectinload(Order.items).joinedload(OrderItem.product),
        )
        .filter(Order.order_id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items_out = [
        AdminOrderItemDetailOut(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.product_name if item.product else f"Product #{item.product_id}",
            product_image=item.product.product_image if item.product else None,
            unit=item.product.unit if item.product else "unit",
            quantity=item.quantity,
            price=item.price,
            total=item.price * item.quantity,
        )
        for item in order.items
    ]

    subtotal = sum((it.price * it.quantity for it in order.items), Decimal("0.00"))
    addr = order.delivery_address

    return AdminInvoiceOut(
        invoice_number=f"INV-{order.order_id}",
        store_name="GraminFresh",
        store_address="GraminFresh Agro Complex, Alandurai Road, Coimbatore - 641109",
        store_phone="+91 98765 43210",
        store_email="support@graminfresh.com",
        order_id=order.order_id,
        order_date=order.created_at,
        customer_name=order.customer.full_name if order.customer else "Valued Customer",
        customer_mobile=order.customer.mobile_number if order.customer else "",
        customer_email=order.customer.email if order.customer else "",
        delivery_address=addr.address if addr else (order.customer.village if order.customer else "N/A"),
        delivery_village=addr.village if addr else (order.customer.village if order.customer else "N/A"),
        delivery_district=addr.district if addr else "Coimbatore",
        delivery_pincode=addr.pincode if addr else "641109",
        payment_method=order.payment_method,
        payment_status=order.payment_status or "Pending",
        order_status=order.order_status,
        delivery_partner_name=order.delivery_partner.full_name if order.delivery_partner else None,
        items=items_out,
        subtotal=subtotal,
        delivery_charge=order.delivery_charge,
        grand_total=order.total_amount,
    )
