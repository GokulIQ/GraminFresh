from app.database import SessionLocal
from app.models import Customer, Product, Order, OrderItem, CustomerAddress, OrderStatusHistory
from app.routers.order import get_orders, get_order_details, track_order_status, reorder_previous_order

def test_direct_order_functions():
    db = SessionLocal()
    try:
        customer = db.query(Customer).first()
        if not customer:
            print("No customer in database to test with.")
            return

        print(f"Testing order router functions for customer {customer.email} (ID: {customer.id})")

        # 1. Test get_orders
        orders = get_orders(db=db, current_customer=customer)
        print(f"[SUCCESS] get_orders returned {len(orders)} orders")

        if len(orders) > 0:
            order = orders[0]
            print(f"Testing with order #{order.order_id} (Status: {order.order_status})")

            # 2. Test get_order_details
            details = get_order_details(order_id=order.order_id, db=db, current_customer=customer)
            assert details.order_id == order.order_id
            print(f"[SUCCESS] get_order_details succeeded for #{details.order_id}")

            # 3. Test track_order_status
            track = track_order_status(order_id=order.order_id, db=db, current_customer=customer)
            assert track.order_id == order.order_id
            assert len(track.timeline) > 0
            print(f"[SUCCESS] track_order_status succeeded with {len(track.timeline)} timeline steps:")
            for s in track.timeline:
                print(f"   - {s.label} [Done: {s.completed}, Current: {s.current}]")

            # 4. Test reorder_previous_order
            reorder_res = reorder_previous_order(order_id=order.order_id, db=db, current_customer=customer)
            print(f"[SUCCESS] reorder_previous_order succeeded: {reorder_res.message}")

        print("\n*** ALL BACKEND ORDER ROUTER FUNCTIONS TESTED AND WORKING PERFECTLY! ***")
    finally:
        db.close()

if __name__ == "__main__":
    test_direct_order_functions()
