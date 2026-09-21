from decimal import Decimal


FULL_UNIT_LIQUIDS = {"ltr", "liter", "litre", "l"}


def get_pack_price(price: object, unit: str | None) -> Decimal:
    """Return the price of one customer pack (500 g or 500 ml)."""
    amount = Decimal(str(price or 0))
    normalized_unit = (unit or "").strip().lower()
    if normalized_unit == "kg" or normalized_unit in FULL_UNIT_LIQUIDS:
        return amount / Decimal("2")
    return amount


def calculate_cart_totals(cart_items: list) -> tuple[Decimal, Decimal, Decimal]:
    """Calculate subtotal, delivery charge, and grand total for a list of cart items."""
    subtotal = Decimal("0.00")
    
    for item in cart_items:
        if hasattr(item, "product") and item.product:
            item_price = get_pack_price(item.product.price, item.product.unit)
            subtotal += item_price * item.quantity
            
    delivery_charge = Decimal("0.00")
    if subtotal > 0 and subtotal < Decimal("500.00"):
        delivery_charge = Decimal("40.00")
        
    grand_total = subtotal + delivery_charge
    return subtotal, delivery_charge, grand_total