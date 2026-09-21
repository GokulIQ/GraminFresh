import csv
import io
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, desc, cast, Date
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import (
    Order,
    OrderItem,
    Customer,
    Product,
    Category,
    Admin,
)
from app.schemas import (
    ReportSalesSummaryOut,
    RevenueTrendPoint,
    TopSellingItem,
    TopCategoryStat,
)
from app.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/reports",
    tags=["Admin Reports & Analytics"],
)


@router.get("/sales", response_model=ReportSalesSummaryOut)
def get_sales_report(
    period: str = Query("30d", description="7d, 30d, 90d, this_month, all"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    today = date.today()

    if period == "7d":
        start_date = today - timedelta(days=6)
    elif period == "90d":
        start_date = today - timedelta(days=89)
    elif period == "this_month":
        start_date = date(today.year, today.month, 1)
    elif period == "all":
        start_date = date(2020, 1, 1)
    else:  # default 30d
        start_date = today - timedelta(days=29)

    dt_start = datetime.combine(start_date, datetime.min.time())

    # Total revenue & orders in period
    order_query = db.query(Order).filter(Order.created_at >= dt_start)
    delivered_orders_count = order_query.filter(Order.order_status == "Delivered").count()
    cancelled_orders_count = order_query.filter(Order.order_status == "Cancelled").count()

    active_orders = db.query(Order).filter(
        Order.created_at >= dt_start,
        Order.order_status != "Cancelled",
    )
    total_orders = active_orders.count()
    total_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.created_at >= dt_start, Order.order_status != "Cancelled")
        .scalar()
        or Decimal("0.00")
    )
    total_revenue = Decimal(str(total_revenue))
    avg_order_val = total_revenue / total_orders if total_orders > 0 else Decimal("0.00")

    # Sales by day
    trend_rows = (
        db.query(
            cast(Order.created_at, Date).label("order_date"),
            func.coalesce(func.sum(Order.total_amount), 0).label("daily_revenue"),
            func.count(Order.order_id).label("daily_orders"),
        )
        .filter(
            cast(Order.created_at, Date) >= start_date,
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

    days_delta = (today - start_date).days + 1
    # Cap days delta for 'all' to max 60 data points for readability
    if days_delta > 60:
        days_delta = 60
        start_date = today - timedelta(days=59)

    sales_by_day: List[RevenueTrendPoint] = []
    for i in range(days_delta):
        curr_d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        rev, ord_cnt = trend_dict.get(curr_d, (Decimal("0.00"), 0))
        sales_by_day.append(
            RevenueTrendPoint(
                date=curr_d,
                revenue=Decimal(str(rev)),
                orders_count=ord_cnt,
            )
        )

    # Top Products
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
        .filter(Order.created_at >= dt_start, Order.order_status != "Cancelled")
        .group_by(OrderItem.product_id, Product.product_name, Product.product_image, Category.category_name)
        .order_by(desc("units_sold"))
        .limit(10)
        .all()
    )

    top_products: List[TopSellingItem] = [
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

    # Top Categories
    top_cat_rows = (
        db.query(
            Category.id,
            Category.category_name,
            func.count(Product.id.distinct()).label("prod_count"),
            func.coalesce(func.sum(OrderItem.price * OrderItem.quantity), 0).label("cat_rev"),
        )
        .outerjoin(Product, Product.category_id == Category.id)
        .outerjoin(OrderItem, OrderItem.product_id == Product.id)
        .outerjoin(Order, (Order.order_id == OrderItem.order_id) & (Order.order_status != "Cancelled") & (Order.created_at >= dt_start))
        .group_by(Category.id, Category.category_name)
        .order_by(desc("cat_rev"))
        .all()
    )

    top_categories: List[TopCategoryStat] = [
        TopCategoryStat(
            category_id=row.id,
            category_name=row.category_name,
            products_count=int(row.prod_count),
            total_sales_amount=Decimal(str(row.cat_rev)),
        )
        for row in top_cat_rows
    ]

    return ReportSalesSummaryOut(
        period=period,
        total_revenue=total_revenue,
        total_orders=total_orders,
        average_order_value=round(avg_order_val, 2),
        delivered_orders_count=delivered_orders_count,
        cancelled_orders_count=cancelled_orders_count,
        sales_by_day=sales_by_day,
        top_products=top_products,
        top_categories=top_categories,
    )


@router.get("/export/orders.csv")
def export_orders_csv(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    orders = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
            joinedload(Order.delivery_partner),
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Order ID",
        "Date",
        "Customer Name",
        "Customer Phone",
        "Customer Email",
        "Delivery Village",
        "Delivery Address",
        "Total Amount (INR)",
        "Delivery Charge (INR)",
        "Payment Method",
        "Payment Status",
        "Order Status",
        "Assigned Delivery Partner",
    ])

    for o in orders:
        c_name = o.customer.full_name if o.customer else "Unknown"
        c_phone = o.customer.mobile_number if o.customer else ""
        c_email = o.customer.email if o.customer else ""
        v_name = o.delivery_address.village if o.delivery_address else (o.customer.village if o.customer else "")
        addr = o.delivery_address.address if o.delivery_address else ""
        dp_name = o.delivery_partner.full_name if o.delivery_partner else "Unassigned"

        writer.writerow([
            o.order_id,
            o.created_at.strftime("%Y-%m-%d %H:%M:%S") if o.created_at else "",
            c_name,
            c_phone,
            c_email,
            v_name,
            addr,
            str(o.total_amount),
            str(o.delivery_charge),
            o.payment_method,
            o.payment_status or "Pending",
            o.order_status,
            dp_name,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=graminfresh_orders_{date.today()}.csv"},
    )


@router.get("/export/products.csv")
def export_products_csv(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    products = (
        db.query(Product)
        .options(joinedload(Product.category))
        .order_by(Product.id.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Product ID",
        "SKU",
        "Product Name",
        "Category",
        "Price (INR)",
        "Discount Price (INR)",
        "Stock",
        "Unit",
        "Status",
        "Is Featured",
        "Is Popular",
    ])

    for p in products:
        c_name = p.category.category_name if p.category else "N/A"
        writer.writerow([
            p.id,
            p.sku or "",
            p.product_name,
            c_name,
            str(p.price),
            str(p.discount_price) if p.discount_price else "",
            p.stock,
            p.unit,
            p.status,
            "Yes" if p.is_featured else "No",
            "Yes" if p.is_popular else "No",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=graminfresh_products_{date.today()}.csv"},
    )


@router.get("/export/customers.csv")
def export_customers_csv(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    customers = db.query(Customer).order_by(Customer.created_at.desc()).all()
    cust_ids = [c.id for c in customers]

    spend_rows = (
        db.query(
            Order.customer_id,
            func.count(Order.order_id).label("ord_cnt"),
            func.coalesce(func.sum(Order.total_amount), 0).label("spend"),
        )
        .filter(Order.customer_id.in_(cust_ids), Order.order_status != "Cancelled")
        .group_by(Order.customer_id)
        .all()
    ) if cust_ids else []

    spend_map = {row.customer_id: (row.ord_cnt, row.spend) for row in spend_rows}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Customer ID",
        "Full Name",
        "Mobile Number",
        "Email",
        "Village",
        "Status",
        "Total Orders",
        "Total Spending (INR)",
        "Joined Date",
    ])

    for c in customers:
        cnt, spnd = spend_map.get(c.id, (0, Decimal("0.00")))
        writer.writerow([
            c.customer_id,
            c.full_name,
            c.mobile_number,
            c.email,
            c.village,
            c.status or "active",
            cnt,
            str(spnd),
            c.created_at.strftime("%Y-%m-%d") if c.created_at else "",
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=graminfresh_customers_{date.today()}.csv"},
    )
