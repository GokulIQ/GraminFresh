from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload, joinedload

from app.database import get_db
from app.models import Customer, Order, OrderItem, CustomerAddress, Admin, ActivityLog
from app.schemas import (
    AdminCustomerOut,
    AdminCustomerDetailOut,
    AdminCustomerStatusUpdate,
    AddressResponse,
    OrderResponse,
    OrderItemResponse,
    OrderStatusHistoryResponse,
)
from app.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/customers",
    tags=["Admin Customer Management"],
)


@router.get("", response_model=dict)
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, mobile, email, customer_id, village"),
    status_filter: Optional[str] = Query(None, alias="status", description="active / disabled"),
    sort_by: str = Query("created_at", description="created_at, full_name, total_spending, orders_count"),
    sort_order: str = Query("desc", description="asc / desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(Customer)

    if search:
        kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.full_name.ilike(kw),
                Customer.mobile_number.ilike(kw),
                Customer.email.ilike(kw),
                Customer.customer_id.ilike(kw),
                Customer.village.ilike(kw),
            )
        )

    if status_filter:
        query = query.filter(Customer.status == status_filter)

    total = query.count()

    # Pagination
    offset = (page - 1) * page_size
    customers = query.order_by(
        Customer.created_at.desc() if sort_order == "desc" else Customer.created_at.asc()
    ).offset(offset).limit(page_size).all()

    cust_ids = [c.id for c in customers]

    # Aggregate orders count and spending per customer in 1 single query
    spend_map = {}
    if cust_ids:
        spend_rows = (
            db.query(
                Order.customer_id,
                func.count(Order.order_id).label("ord_cnt"),
                func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
            )
            .filter(Order.customer_id.in_(cust_ids), Order.order_status != "Cancelled")
            .group_by(Order.customer_id)
            .all()
        )
        spend_map = {row.customer_id: (row.ord_cnt, row.spend) for row in spend_rows}

    items = [
        AdminCustomerOut(
            id=c.id,
            customer_id=c.customer_id,
            full_name=c.full_name,
            mobile_number=c.mobile_number,
            email=c.email,
            village=c.village,
            status=c.status or "active",
            orders_count=spend_map.get(c.id, (0, Decimal("0.00")))[0],
            total_spending=Decimal(str(spend_map.get(c.id, (0, Decimal("0.00")))[1])),
            last_login=c.last_login,
            created_at=c.created_at,
        )
        for c in customers
    ]

    # Apply in-memory sort if by spending/orders
    if sort_by == "total_spending":
        items.sort(key=lambda x: x.total_spending, reverse=(sort_order == "desc"))
    elif sort_by == "orders_count":
        items.sort(key=lambda x: x.orders_count, reverse=(sort_order == "desc"))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/{customer_id}", response_model=AdminCustomerDetailOut)
def get_customer_detail(
    customer_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    cust = (
        db.query(Customer)
        .options(
            selectinload(Customer.addresses),
            selectinload(Customer.orders).selectinload(Order.items).joinedload(OrderItem.product),
            selectinload(Customer.orders).joinedload(Order.delivery_address),
            selectinload(Customer.orders).selectinload(Order.status_history),
        )
        .filter(Customer.id == customer_id)
        .first()
    )

    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Calculate spending
    spend_stats = (
        db.query(
            func.count(Order.order_id).label("ord_cnt"),
            func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
        )
        .filter(Order.customer_id == cust.id, Order.order_status != "Cancelled")
        .first()
    )
    orders_cnt = spend_stats.ord_cnt if spend_stats else 0
    total_spend = spend_stats.spend if spend_stats else Decimal("0.00")

    addresses_out = [
        AddressResponse.model_validate(addr) for addr in (cust.addresses or [])
    ]

    orders_out = [
        OrderResponse.model_validate(ord_rec) for ord_rec in (cust.orders or [])
    ]

    return AdminCustomerDetailOut(
        id=cust.id,
        customer_id=cust.customer_id,
        full_name=cust.full_name,
        mobile_number=cust.mobile_number,
        email=cust.email,
        village=cust.village,
        status=cust.status or "active",
        orders_count=orders_cnt,
        total_spending=Decimal(str(total_spend)),
        last_login=cust.last_login,
        created_at=cust.created_at,
        addresses=addresses_out,
        recent_orders=orders_out,
    )


@router.patch("/{customer_id}/status", response_model=AdminCustomerOut)
def update_customer_status(
    customer_id: int,
    payload: AdminCustomerStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payload.status not in ["active", "disabled"]:
        raise HTTPException(
            status_code=400, detail="Status must be 'active' or 'disabled'"
        )

    cust.status = payload.status

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_CUSTOMER_STATUS",
            entity_type="customer",
            entity_id=cust.customer_id,
            details={"new_status": payload.status, "customer_name": cust.full_name},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(cust)

    # Get metrics
    spend_stats = (
        db.query(
            func.count(Order.order_id).label("ord_cnt"),
            func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
        )
        .filter(Order.customer_id == cust.id, Order.order_status != "Cancelled")
        .first()
    )

    return AdminCustomerOut(
        id=cust.id,
        customer_id=cust.customer_id,
        full_name=cust.full_name,
        mobile_number=cust.mobile_number,
        email=cust.email,
        village=cust.village,
        status=cust.status,
        orders_count=spend_stats.ord_cnt if spend_stats else 0,
        total_spending=Decimal(str(spend_stats.spend)) if spend_stats else Decimal("0.00"),
        last_login=cust.last_login,
        created_at=cust.created_at,
    )
