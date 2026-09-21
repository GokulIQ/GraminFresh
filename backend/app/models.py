from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    TIMESTAMP,
    func,
    ForeignKey,
    Numeric,
    Text,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from app.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )
    customer_id = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name = Column(
        String(100),
        nullable=False,
    )
    mobile_number = Column(
        String(15),
        unique=True,
        nullable=False,
        index=True,
    )
    email = Column(
        String(120),
        nullable=False,
    )
    village = Column(
        String(100),
        nullable=False,
    )
    password = Column(
        String(255),
        nullable=False,
    )
    status = Column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )
    last_login = Column(
        DateTime,
        nullable=True,
    )
    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False,
    )
    
    # Relationships
    cart_items = relationship("Cart", back_populates="customer", cascade="all, delete-orphan")
    addresses = relationship("CustomerAddress", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")


class CustomerOTP(Base):
    __tablename__ = "customer_otps"
    __table_args__ = (
        Index("idx_otp_lookup", "mobile_number", "otp_code", "is_verified", "expires_at"),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )
    mobile_number = Column(
        String(15),
        nullable=False,
        index=True,
    )
    otp_code = Column(
        String(6),
        nullable=False,
    )
    expires_at = Column(
        DateTime,
        nullable=False,
    )
    is_verified = Column(
        Boolean,
        default=False,
        nullable=False,
    )
    attempts = Column(
        Integer,
        default=0,
        nullable=False,
    )
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("idx_categories_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(100), nullable=False, unique=True)
    category_image = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="active", index=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("idx_products_category_status", "category_id", "status"),
        Index("idx_products_featured_status", "is_featured", "status"),
        Index("idx_products_popular_status", "is_popular", "status"),
        Index("idx_products_name", "product_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False,
        index=True,
    )
    product_name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    product_image = Column(Text, nullable=True)
    images = Column(JSON, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    discount_price = Column(Numeric(10, 2), nullable=True)
    sku = Column(String(50), nullable=True)
    weight = Column(String(50), nullable=True)
    stock = Column(Integer, nullable=False, default=0)
    unit = Column(String(30), nullable=False)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    is_popular = Column(Boolean, nullable=False, default=False, index=True)
    freshness_info = Column(String(255), nullable=True)
    delivery_available = Column(Boolean, nullable=False, default=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    cart_items = relationship("Cart", back_populates="product", cascade="all, delete-orphan")


class Cart(Base):
    __tablename__ = "cart"
    __table_args__ = (
        Index("idx_cart_customer_product", "customer_id", "product_id", unique=True),
    )
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(
        Integer,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    customer = relationship("Customer", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"
    __table_args__ = (
        Index("idx_addresses_customer_default", "customer_id", "is_default"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    mobile_number = Column(String(15), nullable=False)
    address = Column(Text, nullable=False)
    village = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    landmark = Column(String(255), nullable=True)
    is_default = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="addresses")
    orders = relationship("Order", back_populates="delivery_address")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_customer_created", "customer_id", "created_at"),
        Index("idx_orders_status", "order_status"),
    )

    order_id = Column(String(50), primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    address_id = Column(Integer, ForeignKey("customer_addresses.id", ondelete="SET NULL"), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    delivery_charge = Column(Numeric(10, 2), nullable=False, default=0.00)
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(String(30), nullable=False, default="Pending", server_default="Pending")
    order_status = Column(String(50), nullable=False, default="Pending", index=True)
    assigned_delivery_partner = Column(Integer, ForeignKey("delivery_partners.id", ondelete="SET NULL"), nullable=True)
    expected_delivery_date = Column(DateTime, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    delivery_address = relationship("CustomerAddress", back_populates="orders")
    delivery_partner = relationship("DeliveryPartner", back_populates="assigned_orders")
    delivery_assignment = relationship("DeliveryAssignment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.updated_at.asc()", lazy="selectin")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        Index("idx_order_items_order", "order_id"),
        Index("idx_order_items_product", "product_id"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String(50), ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", lazy="joined")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    __table_args__ = (
        Index("idx_status_history_order_time", "order_id", "updated_at"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String(50), ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    notes = Column(String(255), nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    order = relationship("Order", back_populates="status_history")


# ============================================================================
# NEW ADMIN MODULE MODELS
# ============================================================================

class AdminRole(Base):
    __tablename__ = "admin_roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    permissions = Column(JSON, nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class Admin(Base):
    __tablename__ = "admins"
    __table_args__ = (
        Index("idx_admin_email", "email"),
        Index("idx_admin_role", "role"),
        Index("idx_admin_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    phone = Column(String(15), nullable=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="super_admin")
    status = Column(String(20), nullable=False, default="active")
    avatar = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sessions = relationship("AdminSession", back_populates="admin", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="admin")


class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"
    __table_args__ = (
        Index("idx_delivery_status", "status"),
        Index("idx_delivery_phone", "phone"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    partner_id = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=True)
    password = Column(String(255), nullable=True)
    vehicle_type = Column(String(50), nullable=False, default="Bike")
    vehicle_number = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, default="active")
    availability_status = Column(String(30), nullable=False, default="Available")
    current_location = Column(String(150), nullable=True)
    active_orders_count = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    assigned_orders = relationship("Order", back_populates="delivery_partner")
    assignments = relationship("DeliveryAssignment", back_populates="partner", cascade="all, delete-orphan")


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"
    __table_args__ = (
        Index("idx_assignment_order", "order_id"),
        Index("idx_assignment_partner", "partner_id"),
        Index("idx_assignment_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String(50), ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    partner_id = Column(Integer, ForeignKey("delivery_partners.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), nullable=False, default="Assigned")
    assigned_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    notes = Column(String(255), nullable=True)

    order = relationship("Order", back_populates="delivery_assignment")
    partner = relationship("DeliveryPartner", back_populates="assignments")


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("idx_activity_admin", "admin_id"),
        Index("idx_activity_created", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    admin = relationship("Admin", back_populates="activity_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, default="general")
    description = Column(String(255), nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notif_read", "is_read"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(30), nullable=False, default="info")
    is_read = Column(Boolean, nullable=False, default=False)
    target_role = Column(String(50), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    admin = relationship("Admin", back_populates="sessions")