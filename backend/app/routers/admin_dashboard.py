from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, desc, cast, Date
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import (
    Customer,
    Category,
    Product,
    Order,
    OrderItem,
    OrderStatusHistory,
    DeliveryPartner,
    Admin,
)
from app.schemas import (
    AdminDashboardKPI,
    AdminDashboardSummary,
    RevenueTrendPoint,
    LowStockAlert,
    TopSellingItem,
    AdminOrderOut,
    AdminCustomerOut,
    AdminOrderItemDetailOut,
    OrderStatusHistoryResponse,
    AddressResponse,
)
from app.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/dashboard",
    tags=["Admin Dashboard"],
)


@router.get("/summary", response_model=AdminDashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    today = date.today()
    start_of_today = datetime.combine(today, datetime.min.time())
    start_of_month = datetime(today.year, today.month, 1)

    # 1. Base Counts
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    total_categories = db.query(func.count(Category.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_orders = db.query(func.count(Order.order_id)).scalar() or 0

    # Order Status breakdowns
    pending_orders = (
        db.query(func.count(Order.order_id))
        .filter(Order.order_status.in_(["Pending", "Order Placed"]))
        .scalar()
        or 0
    )
    processing_orders = (
        db.query(func.count(Order.order_id))
        .filter(
            Order.order_status.in_(
                ["Confirmed", "Preparing", "Processing", "Out for Delivery"]
            )
        )
        .scalar()
        or 0
    )
    delivered_orders = (
        db.query(func.count(Order.order_id))
        .filter(Order.order_status == "Delivered")
        .scalar()
        or 0
    )
    cancelled_orders = (
        db.query(func.count(Order.order_id))
        .filter(Order.order_status == "Cancelled")
        .scalar()
        or 0
    )

    # Revenue metrics (excluding Cancelled)
    today_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(
            Order.created_at >= start_of_today,
            Order.order_status != "Cancelled",
        )
        .scalar()
        or Decimal("0.00")
    )

    monthly_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(
            Order.created_at >= start_of_month,
            Order.order_status != "Cancelled",
        )
        .scalar()
        or Decimal("0.00")
    )

    total_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.order_status != "Cancelled")
        .scalar()
        or Decimal("0.00")
    )

    # Low stock count (stock <= 10 and status == 'active')
    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(Product.stock <= 10, Product.status == "active")
        .scalar()
        or 0
    )

    kpis = AdminDashboardKPI(
        total_customers=total_customers,
        total_categories=total_categories,
        total_products=total_products,
        total_orders=total_orders,
        pending_orders=pending_orders,
        processing_orders=processing_orders,
        delivered_orders=delivered_orders,
        cancelled_orders=cancelled_orders,
        today_revenue=Decimal(str(today_revenue)),
        monthly_revenue=Decimal(str(monthly_revenue)),
        total_revenue=Decimal(str(total_revenue)),
        low_stock_products_count=low_stock_count,
    )

    # 2. Revenue Trend (last 7 days)
    seven_days_ago = today - timedelta(days=6)
    trend_rows = (
        db.query(
            cast(Order.created_at, Date).label("order_date"),
            func.coalesce(func.sum(Order.total_amount), 0).label("daily_revenue"),
            func.count(Order.order_id).label("daily_orders"),
        )
        .filter(
            cast(Order.created_at, Date) >= seven_days_ago,
            Order.order_status != "Cancelled",
        )
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date).asc())
        .all()
    )

    trend_dict = {
        row.order_date.strftime("%Y-%m-%d"): (row.daily_revenue, row.daily_orders)
        for row in trend_rows
    }

    revenue_chart: List[RevenueTrendPoint] = []
    for i in range(7):
        curr_d = (seven_days_ago + timedelta(days=i)).strftime("%Y-%m-%d")
        rev, ord_cnt = trend_dict.get(curr_d, (Decimal("0.00"), 0))
        revenue_chart.append(
            RevenueTrendPoint(
                date=curr_d,
                revenue=Decimal(str(rev)),
                orders_count=ord_cnt,
            )
        )

    # 3. Recent Orders (last 8)
    recent_order_records = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
            joinedload(Order.delivery_partner),
            selectinload(Order.items).joinedload(OrderItem.product),
            selectinload(Order.status_history),
        )
        .order_by(Order.created_at.desc())
        .limit(8)
        .all()
    )

    recent_orders: List[AdminOrderOut] = []
    for o in recent_order_records:
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

        recent_orders.append(
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

    # 4. Recent Customers (last 8)
    recent_cust_records = (
        db.query(Customer)
        .order_by(Customer.created_at.desc())
        .limit(8)
        .all()
    )

    cust_ids = [c.id for c in recent_cust_records]
    # Aggregate order counts & spending for these customers
    spend_stats = (
        db.query(
            Order.customer_id,
            func.count(Order.order_id).label("ord_cnt"),
            func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
        )
        .filter(Order.customer_id.in_(cust_ids), Order.order_status != "Cancelled")
        .group_by(Order.customer_id)
        .all()
    ) if cust_ids else []

    spend_map = {row.customer_id: (row.ord_cnt, row.spend) for row in spend_stats}

    recent_customers: List[AdminCustomerOut] = [
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
        for c in recent_cust_records
    ]

    # 5. Low Stock Alerts
    low_stock_items = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.stock <= 10, Product.status == "active")
        .order_by(Product.stock.asc())
        .limit(6)
        .all()
    )
    low_stock_alerts: List[LowStockAlert] = [
        LowStockAlert(
            id=p.id,
            product_name=p.product_name,
            category_name=p.category.category_name if p.category else "Uncategorized",
            stock=p.stock,
            unit=p.unit,
            price=p.price,
            product_image=p.product_image,
        )
        for p in low_stock_items
    ]

    # 6. Top Selling Products
    top_selling_rows = (
        db.query(
            OrderItem.product_id,
            Product.product_name,
            Product.product_image,
            Category.category_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.price * OrderItem.quantity).label("item_rev"),
        )
        .join(Order, Order.order_id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .outerjoin(Category, Category.id == Product.category_id)
        .filter(Order.order_status != "Cancelled")
        .group_by(OrderItem.product_id, Product.product_name, Product.product_image, Category.category_name)
        .order_by(desc("units_sold"))
        .limit(5)
        .all()
    )

    top_selling_products: List[TopSellingItem] = [
        TopSellingItem(
            product_id=row.product_id,
            product_name=row.product_name,
            category_name=row.category_name or "General",
            units_sold=int(row.units_sold),
            total_revenue=Decimal(str(row.item_rev)),
            product_image=row.product_image,
        )
        for row in top_selling_rows
    ]

    return AdminDashboardSummary(
        kpis=kpis,
        revenue_chart=revenue_chart,
        recent_orders=recent_orders,
        recent_customers=recent_customers,
        low_stock_alerts=low_stock_alerts,
        top_selling_products=top_selling_products,
    )
