import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, Field


def validate_mobile_number(value: str) -> str:
    value = value.strip()

    if not re.fullmatch(r"[6-9]\d{9}", value):
        raise ValueError(
            "Enter a valid 10-digit mobile number starting with 6-9"
        )

    return value


# ---------------------------------------------------------------------------
# Existing Customer Authentication & Profile Schemas (Untouched)
# ---------------------------------------------------------------------------

class CustomerRegister(BaseModel):
    full_name: str
    mobile_number: str
    email: EmailStr
    village: str
    password: str
    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required")
        return value

    @field_validator("village")
    @classmethod
    def village_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Village / Location is required")
        return value

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_valid(cls, value: str) -> str:
        return validate_mobile_number(value)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError(
                "Password must be at least 6 characters long"
            )
        return value

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        password = info.data.get("password")
        if password is not None and value != password:
            raise ValueError(
                "Password and Confirm Password do not match"
            )
        return value


class CustomerLogin(BaseModel):
    mobile_number: str
    password: str

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_valid(cls, value: str) -> str:
        return validate_mobile_number(value)

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Password is required")
        return value


class UnifiedLogin(BaseModel):
    identifier: str
    password: str

    @field_validator("identifier")
    @classmethod
    def identifier_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Email or Mobile Number is required")
        return value

    @field_validator("password")
    @classmethod
    def password_not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Password is required")
        return value


class SendOTPRequest(BaseModel):
    mobile_number: str

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_valid(cls, value: str) -> str:
        return validate_mobile_number(value)


class VerifyOTPRequest(BaseModel):
    mobile_number: str
    otp: str

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_valid(cls, value: str) -> str:
        return validate_mobile_number(value)

    @field_validator("otp")
    @classmethod
    def otp_valid(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"\d{6}", value):
            raise ValueError("OTP must contain exactly 6 digits")
        return value


class CustomerUpdate(BaseModel):
    full_name: str
    email: EmailStr
    village: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name is required")
        return value

    @field_validator("village")
    @classmethod
    def village_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Village / Location is required")
        return value


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    customer_id: str
    full_name: str
    mobile_number: str
    email: EmailStr
    village: str
    status: Optional[str] = "active"
    last_login: Optional[datetime] = None
    created_at: datetime | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerOut


class RegisterResponse(BaseModel):
    message: str
    customer_id: str


class SendOTPResponse(BaseModel):
    message: str
    expires_in_minutes: int
    development_otp: str | None = None


class VerifyOTPResponse(Token):
    message: str


class CategorySummary(BaseModel):
    id: int
    category_name: str
    category_image: str

    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(CategorySummary):
    status: str
    product_count: int = 0
    updated_at: Optional[datetime] = None


class ProductResponse(BaseModel):
    id: int
    category_id: int
    product_name: str
    description: str | None = None
    product_image: str | None = None
    images: list[str] | None = []
    price: Decimal
    discount_price: Optional[Decimal] = None
    sku: Optional[str] = None
    weight: Optional[str] = None
    stock: int
    unit: str
    is_featured: bool
    is_popular: bool
    freshness_info: str | None = None 
    delivery_available: bool = True
    status: str
    category: CategorySummary | None = None

    model_config = ConfigDict(from_attributes=True)    


class CartItemBase(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, description="Quantity must be at least 1")


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, description="Quantity must be at least 1")


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductResponse
    
    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    total_items: int
    subtotal: Decimal
    delivery_charge: Decimal = Decimal("0.00")
    grand_total: Decimal
    
    model_config = ConfigDict(from_attributes=True)


class AddressBase(BaseModel):
    full_name: str
    mobile_number: str
    address: str
    village: str
    district: str
    state: str
    pincode: str
    landmark: str | None = None

    @field_validator("mobile_number")
    @classmethod
    def mobile_number_valid(cls, value: str) -> str:
        return validate_mobile_number(value)


class AddressCreate(AddressBase):
    is_default: bool = False


class AddressUpdate(AddressBase):
    is_default: bool = False


class AddressResponse(AddressBase):
    id: int
    customer_id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistoryResponse(BaseModel):
    id: int
    order_id: str
    status: str
    notes: str | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: Decimal
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    address_id: int
    payment_method: str


class OrderCancelRequest(BaseModel):
    reason: str | None = "Cancelled by customer"


class OrderTrackTimelineStep(BaseModel):
    status: str
    label: str
    completed: bool
    current: bool
    timestamp: datetime | None = None
    notes: str | None = None


class OrderTrackResponse(BaseModel):
    order_id: str
    order_status: str
    created_at: datetime
    expected_delivery_date: Optional[datetime] = None
    timeline: list[OrderTrackTimelineStep]
    history: list[OrderStatusHistoryResponse]


class ReorderItemSummary(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    price: Decimal
    added: bool
    reason: str | None = None


class ReorderResponse(BaseModel):
    message: str
    items_added: int
    items: list[ReorderItemSummary]


class OrderResponse(BaseModel):
    order_id: str
    customer_id: int
    address_id: int | None
    total_amount: Decimal
    delivery_charge: Decimal
    payment_method: str
    payment_status: Optional[str] = "Pending"
    order_status: str
    assigned_delivery_partner: Optional[int] = None
    expected_delivery_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    delivery_address: AddressResponse | None = None
    items: list[OrderItemResponse] = []
    status_history: list[OrderStatusHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# ADMIN MODULE SCHEMAS
# ===========================================================================

# ---------------------------------------------------------------------------
# Admin Auth & Profile
# ---------------------------------------------------------------------------

class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    id: int
    admin_id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    status: str
    avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class AdminProfileUpdate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    avatar: Optional[str] = None


class AdminPasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        password = info.data.get("new_password")
        if password is not None and value != password:
            raise ValueError("New password and confirm password do not match")
        return value


# ---------------------------------------------------------------------------
# Admin Category Management
# ---------------------------------------------------------------------------

class AdminCategoryCreate(BaseModel):
    category_name: str = Field(..., min_length=2, max_length=100)
    category_image: str = Field(..., min_length=2)
    status: str = "active"


class AdminCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=2, max_length=100)
    category_image: Optional[str] = None
    status: Optional[str] = None


class AdminCategoryOut(BaseModel):
    id: int
    category_name: str
    category_image: str
    status: str
    product_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Admin Product Management
# ---------------------------------------------------------------------------

class AdminProductCreate(BaseModel):
    category_id: int
    product_name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    product_image: Optional[str] = None
    images: List[str] = Field(default_factory=list, max_length=3)
    price: Decimal = Field(..., gt=0)
    discount_price: Optional[Decimal] = None
    sku: Optional[str] = None
    weight: Optional[str] = None
    stock: int = Field(0, ge=0)
    unit: str = Field("0.5 Kg", min_length=1, max_length=30)
    is_featured: bool = False
    is_popular: bool = False
    freshness_info: Optional[str] = None
    delivery_available: bool = True
    status: str = "active"


class AdminProductUpdate(BaseModel):
    category_id: Optional[int] = None
    product_name: Optional[str] = None
    description: Optional[str] = None
    product_image: Optional[str] = None
    images: Optional[List[str]] = Field(default=None, max_length=3)
    price: Optional[Decimal] = None
    discount_price: Optional[Decimal] = None
    sku: Optional[str] = None
    weight: Optional[str] = None
    stock: Optional[int] = None
    unit: Optional[str] = None
    is_featured: Optional[bool] = None
    is_popular: Optional[bool] = None
    freshness_info: Optional[str] = None
    delivery_available: Optional[bool] = None
    status: Optional[str] = None


class AdminProductBulkStockUpdate(BaseModel):
    updates: List[Dict[str, Any]]  # [{"id": 1, "stock": 50}, ...]


class AdminProductBulkStatusUpdate(BaseModel):
    product_ids: List[int]
    status: str  # "active", "inactive", "out_of_stock"


class AdminProductOut(BaseModel):
    id: int
    category_id: int
    product_name: str
    description: Optional[str] = None
    product_image: Optional[str] = None
    images: Optional[List[str]] = []
    price: Decimal
    discount_price: Optional[Decimal] = None
    sku: Optional[str] = None
    weight: Optional[str] = None
    stock: int
    unit: str
    is_featured: bool
    is_popular: bool
    freshness_info: Optional[str] = None
    delivery_available: bool
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category: Optional[CategorySummary] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Admin Customer Management
# ---------------------------------------------------------------------------

class AdminCustomerStatusUpdate(BaseModel):
    status: str  # "active" or "disabled"


class AdminCustomerOut(BaseModel):
    id: int
    customer_id: str
    full_name: str
    mobile_number: str
    email: EmailStr
    village: str
    status: str
    orders_count: int = 0
    total_spending: Decimal = Decimal("0.00")
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminCustomerDetailOut(AdminCustomerOut):
    addresses: List[AddressResponse] = []
    recent_orders: List[OrderResponse] = []


# ---------------------------------------------------------------------------
# Admin Order Management & Invoice
# ---------------------------------------------------------------------------

class AdminOrderStatusUpdate(BaseModel):
    order_status: str
    notes: Optional[str] = None


class AdminOrderPaymentUpdate(BaseModel):
    payment_status: str  # "Pending", "Paid", "Failed", "Refunded"


class AdminOrderAssignDelivery(BaseModel):
    partner_id: int
    notes: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None


class AdminOrderItemDetailOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_image: Optional[str] = None
    unit: str
    quantity: int
    price: Decimal
    total: Decimal


class AdminOrderOut(BaseModel):
    order_id: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    customer_email: Optional[str] = None
    customer_village: Optional[str] = None
    address_id: Optional[int] = None
    total_amount: Decimal
    delivery_charge: Decimal
    grand_total: Decimal
    payment_method: str
    payment_status: str
    order_status: str
    assigned_delivery_partner: Optional[int] = None
    delivery_partner_name: Optional[str] = None
    delivery_partner_phone: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    delivery_address: Optional[AddressResponse] = None
    items: List[AdminOrderItemDetailOut] = []
    status_history: List[OrderStatusHistoryResponse] = []


class AdminInvoiceOut(BaseModel):
    invoice_number: str
    store_name: str = "GraminFresh"
    store_address: str = "GraminFresh Agri Hub, Coimbatore - 641109"
    store_phone: str = "+91 98765 43210"
    store_email: str = "support@graminfresh.com"
    order_id: str
    order_date: datetime
    customer_name: str
    customer_mobile: str
    customer_email: str
    delivery_address: str
    delivery_village: str
    delivery_district: str
    delivery_pincode: str
    payment_method: str
    payment_status: str
    order_status: str
    delivery_partner_name: Optional[str] = None
    items: List[AdminOrderItemDetailOut]
    subtotal: Decimal
    delivery_charge: Decimal
    grand_total: Decimal


# ---------------------------------------------------------------------------
# Admin Delivery Partner Management
# ---------------------------------------------------------------------------

class DeliveryPartnerCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    vehicle_type: str = "Bike"
    vehicle_number: Optional[str] = None
    current_location: Optional[str] = None
    status: str = "active"
    availability_status: str = "Available"

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, value: str) -> str:
        return validate_mobile_number(value)


class DeliveryPartnerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    current_location: Optional[str] = None
    status: Optional[str] = None
    availability_status: Optional[str] = None


class DeliveryPartnerOut(BaseModel):
    id: int
    partner_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: str
    vehicle_number: Optional[str] = None
    status: str
    availability_status: str
    current_location: Optional[str] = None
    active_orders_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeliveryAssignmentOut(BaseModel):
    id: int
    order_id: str
    partner_id: int
    partner_name: str
    partner_phone: str
    status: str
    assigned_at: datetime
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    # Embedded Order details for easy front-end display
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    total_amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    order_status: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None

class DeliveryPartnerLogin(BaseModel):
    username: str  # Can be email or phone
    password: str


class DeliveryPartnerToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    partner: DeliveryPartnerOut


class DeliveryStatusUpdate(BaseModel):
    status: str  # Assigned, Accepted, Picked Up, Out for Delivery, Delivered
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Admin Dashboard & Analytics Schemas
# ---------------------------------------------------------------------------

class AdminDashboardKPI(BaseModel):
    total_customers: int
    total_categories: int
    total_products: int
    total_orders: int
    pending_orders: int
    processing_orders: int
    delivered_orders: int
    cancelled_orders: int
    today_revenue: Decimal
    monthly_revenue: Decimal
    total_revenue: Decimal
    low_stock_products_count: int


class RevenueTrendPoint(BaseModel):
    date: str
    revenue: Decimal
    orders_count: int


class TopSellingItem(BaseModel):
    product_id: int
    product_name: str
    category_name: str
    units_sold: int
    total_revenue: Decimal
    product_image: Optional[str] = None


class TopCategoryStat(BaseModel):
    category_id: int
    category_name: str
    products_count: int
    total_sales_amount: Decimal


class LowStockAlert(BaseModel):
    id: int
    product_name: str
    category_name: str
    stock: int
    unit: str
    price: Decimal
    product_image: Optional[str] = None


class AdminDashboardSummary(BaseModel):
    kpis: AdminDashboardKPI
    revenue_chart: List[RevenueTrendPoint]
    recent_orders: List[AdminOrderOut]
    recent_customers: List[AdminCustomerOut]
    low_stock_alerts: List[LowStockAlert]
    top_selling_products: List[TopSellingItem]


# ---------------------------------------------------------------------------
# Admin Reports & System Settings
# ---------------------------------------------------------------------------

class ReportSalesSummaryOut(BaseModel):
    period: str
    total_revenue: Decimal
    total_orders: int
    average_order_value: Decimal
    delivered_orders_count: int
    cancelled_orders_count: int
    sales_by_day: List[RevenueTrendPoint]
    top_products: List[TopSellingItem]
    top_categories: List[TopCategoryStat]


class SystemSettingOut(BaseModel):
    id: int
    setting_key: str
    setting_value: str
    category: str
    description: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemSettingUpdate(BaseModel):
    settings: Dict[str, str]  # {"store_name": "GraminFresh", "delivery_fee_standard": "25.00"}


class ActivityLogOut(BaseModel):
    id: int
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    target_role: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
