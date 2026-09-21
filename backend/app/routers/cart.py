from typing import Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import Cart, Customer, Product
from app.schemas import (
    CartItemCreate,
    CartItemUpdate,
    CartItemResponse,
    CartResponse
)
from app.security import get_current_customer
from app.pricing import get_pack_price

router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"],
)

@router.post("/add", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    cart_item: CartItemCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Add a product to the cart"""
    
    # Check if product exists and is active
    product = db.query(Product).filter(
        Product.id == cart_item.product_id,
        Product.status == "active"
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or unavailable"
        )
    
    # Check stock availability
    if product.stock < cart_item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} units available"
        )
    
    # Check if item already exists in cart
    existing_item = db.query(Cart).filter(
        Cart.customer_id == current_customer.id,
        Cart.product_id == cart_item.product_id
    ).first()
    
    if existing_item:
        # Update quantity
        new_quantity = existing_item.quantity + cart_item.quantity
        if new_quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add more than {product.stock} units"
            )
        existing_item.quantity = new_quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    
    # Create new cart item
    new_cart_item = Cart(
        customer_id=current_customer.id,
        product_id=cart_item.product_id,
        quantity=cart_item.quantity
    )
    
    db.add(new_cart_item)
    db.commit()
    db.refresh(new_cart_item)
    
    return new_cart_item

@router.get("/items", response_model=CartResponse)
def get_cart_items(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Get all items in the cart"""
    
    cart_items = db.query(Cart).options(
        joinedload(Cart.product).joinedload(Product.category)
    ).filter(
        Cart.customer_id == current_customer.id
    ).all()
    
    if not cart_items:
        return CartResponse(
            items=[],
            total_items=0,
            subtotal=Decimal("0.00"),
            delivery_charge=Decimal("0.00"),
            grand_total=Decimal("0.00")
        )
    
    # Calculate totals
    subtotal = Decimal("0.00")
    total_items = 0
    

router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"],
)

@router.post("/add", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    cart_item: CartItemCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Add a product to the cart"""
    
    # Check if product exists and is active
    product = db.query(Product).filter(
        Product.id == cart_item.product_id,
        Product.status == "active"
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or unavailable"
        )
    
    # Check stock availability
    if product.stock < cart_item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} units available"
        )
    
    # Check if item already exists in cart
    existing_item = db.query(Cart).filter(
        Cart.customer_id == current_customer.id,
        Cart.product_id == cart_item.product_id
    ).first()
    
    if existing_item:
        # Update quantity
        new_quantity = existing_item.quantity + cart_item.quantity
        if new_quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add more than {product.stock} units"
            )
        existing_item.quantity = new_quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    
    # Create new cart item
    new_cart_item = Cart(
        customer_id=current_customer.id,
        product_id=cart_item.product_id,
        quantity=cart_item.quantity
    )
    
    db.add(new_cart_item)
    db.commit()
    db.refresh(new_cart_item)
    
    return new_cart_item

@router.get("/items", response_model=CartResponse)
def get_cart_items(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Get all items in the cart"""
    
    cart_items = db.query(Cart).options(
        joinedload(Cart.product).joinedload(Product.category)
    ).filter(
        Cart.customer_id == current_customer.id
    ).all()
    
    if not cart_items:
        return CartResponse(
            items=[],
            total_items=0,
            subtotal=Decimal("0.00"),
            delivery_charge=Decimal("0.00"),
            grand_total=Decimal("0.00")
        )
    
    # Calculate totals
    subtotal = Decimal("0.00")
    total_items = 0
    
    for item in cart_items:
        if item.product:
            item_price = get_pack_price(item.product.price, item.product.unit)
            subtotal += item_price * item.quantity
            total_items += item.quantity

    delivery_charge = Decimal("0.00")
    if subtotal < Decimal("500.00"):
        delivery_charge = Decimal("40.00")
    
    grand_total = subtotal + delivery_charge
    
    return CartResponse(
        items=cart_items,
        total_items=total_items,
        subtotal=subtotal,
        delivery_charge=delivery_charge,
        grand_total=grand_total
    )

@router.put("/update/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    update_data: CartItemUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Update quantity of a cart item"""
    
    cart_item = db.query(Cart).options(
        joinedload(Cart.product)
    ).filter(
        Cart.id == item_id,
        Cart.customer_id == current_customer.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    # Check stock availability using eager-loaded product
    if cart_item.product and cart_item.product.stock < update_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {cart_item.product.stock} units available"
        )
    
    cart_item.quantity = update_data.quantity
    db.commit()
    db.refresh(cart_item)
    
    return cart_item

@router.delete("/remove/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Remove an item from the cart"""
    
    cart_item = db.query(Cart).filter(
        Cart.id == item_id,
        Cart.customer_id == current_customer.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    db.delete(cart_item)
    db.commit()

@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Clear all items from the cart"""
    
    db.query(Cart).filter(
        Cart.customer_id == current_customer.id
    ).delete()
    db.commit()
