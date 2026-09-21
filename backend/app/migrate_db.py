import sys
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.models import Admin, AdminRole, DeliveryPartner, SystemSetting
from app.security import hash_password

def run_migrations():
    print("Starting GraminFresh database migrations and extensions...")
    with engine.connect() as conn:
        # 1. Alter categories
        print("Ensuring categories table extensions...")
        try:
            conn.execute(text("ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("categories.updated_at:", e)
        try:
            conn.execute(text("ALTER TABLE categories ADD COLUMN created_by INT NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("categories.created_by:", e)

        # 2. Alter products
        print("Ensuring products table extensions...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("products.updated_at:", e)
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN updated_by INT NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("products.updated_by:", e)
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN discount_price DECIMAL(10, 2) NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("products.discount_price:", e)
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN sku VARCHAR(50) NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("products.sku:", e)
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN weight VARCHAR(50) NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("products.weight:", e)

        # 3. Alter orders
        print("Ensuring orders table extensions...")
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN assigned_delivery_partner INT NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("orders.assigned_delivery_partner:", e)
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending'"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("orders.payment_status:", e)
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN expected_delivery_date DATETIME NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("orders.expected_delivery_date:", e)

        # 4. Alter customers
        print("Ensuring customers table extensions...")
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("customers.status:", e)
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN last_login DATETIME NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("customers.last_login:", e)

        # 4.5. Alter delivery partners
        print("Ensuring delivery_partners table extensions...")
        try:
            conn.execute(text("ALTER TABLE delivery_partners ADD COLUMN email VARCHAR(120) NULL UNIQUE"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("delivery_partners.email:", e)
        try:
            conn.execute(text("ALTER TABLE delivery_partners ADD COLUMN password VARCHAR(255) NULL"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("delivery_partners.password:", e)
        try:
            conn.execute(text("ALTER TABLE delivery_partners ADD COLUMN availability_status VARCHAR(30) NOT NULL DEFAULT 'Available'"))
        except Exception as e:
            if "Duplicate column" not in str(e):
                print("delivery_partners.availability_status:", e)

        conn.commit()

    # 5. Create new admin tables
    print("Creating new admin tables if not exist...")
    Base.metadata.create_all(bind=engine)

    # 6. Seed initial Admin & Roles
    print("Seeding initial Admin Roles, Super Admin, Delivery Partners and System Settings...")
    db = SessionLocal()
    try:
        # Seed Roles
        roles_data = [
            ("super_admin", "Super Administrator", ["*"], "Full access to all system functions"),
            ("manager", "Store Manager", ["categories.*", "products.*", "orders.*", "customers.read", "reports.read"], "Manages catalog, orders and reports"),
            ("delivery_coordinator", "Delivery Coordinator", ["orders.read", "orders.update", "delivery.*"], "Manages delivery partners and assignments")
        ]
        for r_name, d_name, perms, desc in roles_data:
            existing_role = db.query(AdminRole).filter(AdminRole.role_name == r_name).first()
            if not existing_role:
                new_role = AdminRole(role_name=r_name, display_name=d_name, permissions=perms, description=desc)
                db.add(new_role)

        # Seed Super Admin
        admin_email = "admin@villagefarm.com"
        existing_admin = db.query(Admin).filter(Admin.email == admin_email).first()
        if not existing_admin:
            super_admin = Admin(
                admin_id="ADM-2026-001",
                full_name="GraminFresh Super Admin",
                email=admin_email,
                phone="9876543210",
                password=hash_password("Admin@123456"),
                role="super_admin",
                status="active"
            )
            db.add(super_admin)
            print(f"Created Super Admin: {admin_email} / Admin@123456")
        else:
            # Ensure password is valid bcrypt hash
            existing_admin.password = hash_password("Admin@123456")
            print("Super Admin already exists. Updated password to Admin@123456")

        # Also seed admin@graminfresh.com alias for convenience
        alias_email = "admin@graminfresh.com"
        existing_alias = db.query(Admin).filter(Admin.email == alias_email).first()
        if not existing_alias:
            alias_admin = Admin(
                admin_id="ADM-2026-002",
                full_name="GraminFresh Admin",
                email=alias_email,
                phone="9876543211",
                password=hash_password("Admin@123456"),
                role="super_admin",
                status="active"
            )
            db.add(alias_admin)
            print(f"Created Super Admin Alias: {alias_email} / Admin@123456")

        # Seed Delivery Partners if none exist or update them to have email/password
        existing_partners = db.query(DeliveryPartner).all()
        if len(existing_partners) == 0:
            partners = [
                DeliveryPartner(partner_id="DP-001", full_name="Ramesh Kumar", phone="9876500001", email="ramesh@villagefarm.com", password=hash_password("Partner@123456"), vehicle_type="Bike", vehicle_number="TN-38-AB-1234", status="active", availability_status="Available", current_location="Central Hub - Thondamuthur", active_orders_count=0),
                DeliveryPartner(partner_id="DP-002", full_name="Suresh Patel", phone="9876500002", email="suresh@villagefarm.com", password=hash_password("Partner@123456"), vehicle_type="Mini Van", vehicle_number="TN-38-CD-5678", status="active", availability_status="Available", current_location="East Route - Madampatti", active_orders_count=0),
                DeliveryPartner(partner_id="DP-003", full_name="Manoj Singh", phone="9876500003", email="manoj@villagefarm.com", password=hash_password("Partner@123456"), vehicle_type="Electric Scooter", vehicle_number="TN-38-EF-9012", status="active", availability_status="Available", current_location="North Route - Alandurai", active_orders_count=0),
            ]
            db.add_all(partners)
            print("Seeded sample delivery partners.")
        else:
            for p in existing_partners:
                updated = False
                if not p.email:
                    name_map = {
                        "DP-001": "ramesh@villagefarm.com",
                        "DP-002": "suresh@villagefarm.com",
                        "DP-003": "manoj@villagefarm.com"
                    }
                    p.email = name_map.get(p.partner_id, f"partner_{p.id}@villagefarm.com")
                    updated = True
                if not p.password:
                    p.password = hash_password("Partner@123456")
                    updated = True
                if not p.availability_status:
                    p.availability_status = "Available"
                    updated = True
                if updated:
                    db.add(p)
            print("Updated existing delivery partners with email/password/availability.")

        # Seed System Settings
        settings_defaults = [
            ("store_name", "GraminFresh", "general", "Platform Brand Name"),
            ("support_phone", "+91 98765 43210", "general", "Customer Support Helpline"),
            ("support_email", "support@graminfresh.com", "general", "Customer Support Email"),
            ("delivery_fee_standard", "30.00", "pricing", "Standard Delivery Fee (INR)"),
            ("free_delivery_threshold", "499.00", "pricing", "Minimum order amount for free delivery"),
            ("low_stock_threshold", "10", "inventory", "Threshold for low stock warnings"),
            ("auto_assign_delivery", "false", "delivery", "Automatically assign nearest delivery partner"),
            ("maintenance_mode", "false", "system", "Put store in maintenance mode")
        ]
        for k, v, cat, desc in settings_defaults:
            st = db.query(SystemSetting).filter(SystemSetting.setting_key == k).first()
            if not st:
                db.add(SystemSetting(setting_key=k, setting_value=v, category=cat, description=desc))

        db.commit()
        print("Database migration and seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print("Error during seeding:", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_migrations()
