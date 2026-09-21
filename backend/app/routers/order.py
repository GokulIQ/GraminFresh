import datetime
import random
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from app.database import get_db
from app.models import Customer, Order, OrderItem, Cart, Product, CustomerAddress, OrderStatusHistory
from app.schemas import (
    OrderCreate, 
    OrderResponse, 
    OrderCancelRequest, 
    OrderTrackResponse, 
    OrderTrackTimelineStep,
    ReorderResponse,
    ReorderItemSummary
)
from app.security import get_current_customer
from app.pricing import calculate_cart_totals

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

def generate_order_id():
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    random_str = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
    return f"VFD-{date_str}-{random_str}"

STANDARD_STAGES = [
    ("Order Placed", "Order Placed"),
    ("Confirmed", "Order Confirmed"),
    ("Preparing", "Preparing Items"),
    ("Out for Delivery", "Out for Delivery"),
    ("Delivered", "Delivered")
]

def map_status_to_stage(order_status: str) -> str:
    normalized = (order_status or "").strip().lower()
    if normalized in ["pending", "order placed"]:
        return "Order Placed"
    if normalized == "confirmed":
        return "Confirmed"
    if normalized in ["preparing", "processing"]:
        return "Preparing"
    if normalized in ["out for delivery", "out_for_delivery", "shipping"]:
        return "Out for Delivery"
    if normalized == "delivered":
        return "Delivered"
    if normalized == "cancelled":
        return "Cancelled"
    return "Order Placed"


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    # Verify address belongs to customer
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == order_data.address_id,
        CustomerAddress.customer_id == current_customer.id
    ).first()
    
    if not address:
        raise HTTPException(status_code=400, detail="Invalid delivery address")

    # Get cart items
    cart_items = db.query(Cart).filter(Cart.customer_id == current_customer.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate totals
    subtotal, delivery_charge, grand_total = calculate_cart_totals(cart_items)

    # Batch query products to eliminate N+1 queries during checkout
    product_ids = [item.product_id for item in cart_items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}

    # Create Order
    new_order = Order(
        order_id=generate_order_id(),
        customer_id=current_customer.id,
        address_id=address.id,
        total_amount=grand_total,
        delivery_charge=delivery_charge,
        payment_method=order_data.payment_method,
        order_status="Pending"
    )
    db.add(new_order)
    db.flush()

    # Create Order Items and update stock in memory
    for item in cart_items:
        product = product_map.get(item.product_id)
        if not product or product.stock < item.quantity:
            db.rollback()
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {product.product_name if product else 'unknown product'}"
            )
        
        # Deduct stock
        product.stock -= item.quantity
        
        order_item = OrderItem(
            order_id=new_order.order_id,
            product_id=product.id,
            quantity=item.quantity,
            price=product.price  
        )
        db.add(order_item)
    
    # Add initial status to history
    initial_history = OrderStatusHistory(
        order_id=new_order.order_id,
        status="Order Placed",
        notes="Order placed successfully and is pending confirmation."
    )
    db.add(initial_history)

    # Clear cart
    db.query(Cart).filter(Cart.customer_id == current_customer.id).delete()
    
    db.commit()
    db.refresh(new_order)
    return new_order


@router.get("/", response_model=list[OrderResponse])
def get_orders(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    orders = db.query(Order).options(
        selectinload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.delivery_address),
        selectinload(Order.status_history)
    ).filter(
        Order.customer_id == current_customer.id
    ).order_by(Order.created_at.desc()).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_details(
    order_id: str,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    order = db.query(Order).options(
        selectinload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        joinedload(Order.delivery_address),
        selectinload(Order.status_history)
    ).filter(
        Order.order_id == order_id,
        Order.customer_id == current_customer.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    return order


@router.get("/{order_id}/track", response_model=OrderTrackResponse)
def track_order_status(
    order_id: str,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    order = db.query(Order).options(
        joinedload(Order.status_history)
    ).filter(
        Order.order_id == order_id,
        Order.customer_id == current_customer.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    current_stage = map_status_to_stage(order.order_status)
    history_map = {}
    for h in order.status_history:
        history_map[map_status_to_stage(h.status)] = h

    timeline: list[OrderTrackTimelineStep] = []

    if current_stage == "Cancelled":
        # Handle cancelled order timeline
        cancel_hist = history_map.get("Cancelled")
        placed_hist = history_map.get("Order Placed")
        
        timeline.append(OrderTrackTimelineStep(
            status="Order Placed",
            label="Order Placed",
            completed=True,
            current=False,
            timestamp=placed_hist.updated_at if placed_hist else order.created_at,
            notes="Order placed by customer"
        ))
        timeline.append(OrderTrackTimelineStep(
            status="Cancelled",
            label="Order Cancelled",
            completed=True,
            current=True,
            timestamp=cancel_hist.updated_at if cancel_hist else order.updated_at,
            notes=cancel_hist.notes if cancel_hist else "Order cancelled"
        ))
    else:
        stage_keys = [s[0] for s in STANDARD_STAGES]
        try:
            current_index = stage_keys.index(current_stage)
        except ValueError:
            current_index = 0

        for idx, (stage_key, stage_label) in enumerate(STANDARD_STAGES):
            hist_item = history_map.get(stage_key)
            is_completed = idx <= current_index
            is_current = idx == current_index
            
            ts = hist_item.updated_at if hist_item else (order.created_at if idx == 0 else None)
            notes = hist_item.notes if hist_item else None

            timeline.append(OrderTrackTimelineStep(
                status=stage_key,
                label=stage_label,
                completed=is_completed,
                current=is_current,
                timestamp=ts,
                notes=notes
            ))

    return OrderTrackResponse(
        order_id=order.order_id,
        order_status=order.order_status,
        created_at=order.created_at,
        expected_delivery_date=order.expected_delivery_date,
        timeline=timeline,
        history=order.status_history
    )


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: str,
    cancel_req: OrderCancelRequest | None = None,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    order = db.query(Order).options(
        joinedload(Order.items),
        joinedload(Order.status_history)
    ).filter(
        Order.order_id == order_id,
        Order.customer_id == current_customer.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if order can be cancelled: only allowed when Pending / Order Placed (before confirmation)
    normalized_status = order.order_status.strip().lower()
    if normalized_status not in ["pending", "order placed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be cancelled in '{order.order_status}' status. Only orders awaiting confirmation can be cancelled."
        )

    # Batch restore product inventory stock in 1 single query
    product_ids = [item.product_id for item in order.items]
    if product_ids:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        product_map = {p.id: p for p in products}
        for item in order.items:
            product = product_map.get(item.product_id)
            if product:
                product.stock += item.quantity

    # Update order status
    order.order_status = "Cancelled"
    
    reason = cancel_req.reason if (cancel_req and cancel_req.reason) else "Cancelled by customer"
    
    # Log to history
    history_entry = OrderStatusHistory(
        order_id=order.order_id,
        status="Cancelled",
        notes=reason
    )
    db.add(history_entry)

    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/reorder", response_model=ReorderResponse)
def reorder_previous_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(
        Order.order_id == order_id,
        Order.customer_id == current_customer.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    product_ids = [item.product_id for item in order.items]
    if not product_ids:
        return ReorderResponse(
            message="No products found to reorder",
            items_added=0,
            items=[]
        )

    # Batch query products & customer cart items in 2 queries total
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}

    cart_items = db.query(Cart).filter(
        Cart.customer_id == current_customer.id,
        Cart.product_id.in_(product_ids)
    ).all()
    cart_map = {c.product_id: c for c in cart_items}

    items_summary: list[ReorderItemSummary] = []
    items_added_count = 0

    for item in order.items:
        product = product_map.get(item.product_id)
        if not product or product.status != "active":
            items_summary.append(ReorderItemSummary(
                product_id=item.product_id,
                product_name=item.product.product_name if item.product else f"Product #{item.product_id}",
                quantity=item.quantity,
                price=item.price,
                added=False,
                reason="Product no longer available"
            ))
            continue

        if product.stock <= 0:
            items_summary.append(ReorderItemSummary(
                product_id=product.id,
                product_name=product.product_name,
                quantity=item.quantity,
                price=product.price,
                added=False,
                reason="Out of stock"
            ))
            continue

        # Determine quantity to add (bounded by available stock)
        qty_to_add = min(item.quantity, product.stock)
        existing_cart_item = cart_map.get(product.id)

        if existing_cart_item:
            new_qty = min(existing_cart_item.quantity + qty_to_add, product.stock)
            existing_cart_item.quantity = new_qty
        else:
            new_cart = Cart(
                customer_id=current_customer.id,
                product_id=product.id,
                quantity=qty_to_add
            )
            db.add(new_cart)
            cart_map[product.id] = new_cart

        items_added_count += 1
        items_summary.append(ReorderItemSummary(
            product_id=product.id,
            product_name=product.product_name,
            quantity=qty_to_add,
            price=product.price,
            added=True,
            reason=None
        ))

    db.commit()

    return ReorderResponse(
        message=f"{items_added_count} product(s) added to cart successfully",
        items_added=items_added_count,
        items=items_summary
    )


@router.delete("/{order_id}")
def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.customer_id == current_customer.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    db.delete(order)
    db.commit()
    
    return {"message": "Order deleted successfully"}
