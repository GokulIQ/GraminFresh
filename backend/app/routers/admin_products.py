from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.database import get_db
from app.models import Product, Category, Admin, ActivityLog
from app.schemas import (
    AdminProductCreate,
    AdminProductUpdate,
    AdminProductOut,
    AdminProductBulkStockUpdate,
    AdminProductBulkStatusUpdate,
    CategorySummary,
)
from app.security import get_current_admin
from app.routers.catalog import clear_catalog_cache

router = APIRouter(
    prefix="/api/admin/products",
    tags=["Admin Product Management"],
)


def prepare_product_images(main_image: str | None, images: list[str] | None) -> list[str]:
    """Keep a product's gallery ordered, unique, and capped at three images."""
    gallery: list[str] = []
    for image in [main_image, *(images or [])]:
        if image and image not in gallery:
            gallery.append(image)
    return gallery[:3]


@router.get("", response_model=dict)
def list_products(
    search: Optional[str] = Query(None, description="Search by product name, SKU or description"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="active, inactive, out_of_stock"),
    is_featured: Optional[bool] = Query(None, description="Filter featured items"),
    is_popular: Optional[bool] = Query(None, description="Filter popular items"),
    low_stock: Optional[bool] = Query(None, description="Filter items with stock <= 10"),
    sort_by: str = Query("created_at", description="created_at, product_name, price, stock"),
    sort_order: str = Query("desc", description="asc / desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = db.query(Product).options(joinedload(Product.category))

    if search:
        kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.product_name.ilike(kw),
                Product.sku.ilike(kw),
                Product.description.ilike(kw),
            )
        )

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if status_filter:
        query = query.filter(Product.status == status_filter)

    if is_featured is not None:
        query = query.filter(Product.is_featured == is_featured)

    if is_popular is not None:
        query = query.filter(Product.is_popular == is_popular)

    if low_stock:
        query = query.filter(Product.stock <= 10)

    # Sorting
    sort_col_map = {
        "product_name": Product.product_name,
        "price": Product.price,
        "stock": Product.stock,
        "created_at": Product.created_at,
        "updated_at": Product.updated_at,
    }
    sort_attr = sort_col_map.get(sort_by, Product.created_at)

    if sort_order.lower() == "asc":
        query = query.order_by(sort_attr.asc())
    else:
        query = query.order_by(sort_attr.desc())

    total = query.count()
    offset = (page - 1) * page_size
    products = query.offset(offset).limit(page_size).all()

    items = [
        AdminProductOut(
            id=p.id,
            category_id=p.category_id,
            product_name=p.product_name,
            description=p.description,
            product_image=p.product_image,
            images=p.images or [],
            price=p.price,
            discount_price=p.discount_price,
            sku=p.sku,
            weight=p.weight,
            stock=p.stock,
            unit=p.unit,
            is_featured=p.is_featured,
            is_popular=p.is_popular,
            freshness_info=p.freshness_info,
            delivery_available=p.delivery_available,
            status=p.status,
            created_at=p.created_at,
            updated_at=p.updated_at,
            category=CategorySummary(
                id=p.category.id,
                category_name=p.category.category_name,
                category_image=p.category.category_image,
            ) if p.category else None,
        )
        for p in products
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/{product_id}", response_model=AdminProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return AdminProductOut(
        id=product.id,
        category_id=product.category_id,
        product_name=product.product_name,
        description=product.description,
        product_image=product.product_image,
        images=product.images or [],
        price=product.price,
        discount_price=product.discount_price,
        sku=product.sku,
        weight=product.weight,
        stock=product.stock,
        unit=product.unit,
        is_featured=product.is_featured,
        is_popular=product.is_popular,
        freshness_info=product.freshness_info,
        delivery_available=product.delivery_available,
        status=product.status,
        created_at=product.created_at,
        updated_at=product.updated_at,
        category=CategorySummary(
            id=product.category.id,
            category_name=product.category.category_name,
            category_image=product.category.category_image,
        ) if product.category else None,
    )


@router.post("", response_model=AdminProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: AdminProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Verify category exists
    cat = db.query(Category).filter(Category.id == payload.category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected category does not exist",
        )

    images_list = prepare_product_images(payload.product_image, payload.images)
    main_image = images_list[0] if images_list else None

    new_prod = Product(
        category_id=payload.category_id,
        product_name=payload.product_name.strip(),
        description=payload.description.strip() if payload.description else None,
        product_image=main_image,
        images=images_list,
        price=payload.price,
        discount_price=payload.discount_price,
        sku=payload.sku.strip() if payload.sku else f"GF-{payload.category_id}-{int(payload.price * 10)}",
        weight=payload.weight.strip() if payload.weight else None,
        stock=payload.stock,
        unit=payload.unit.strip(),
        is_featured=payload.is_featured,
        is_popular=payload.is_popular,
        freshness_info=payload.freshness_info.strip() if payload.freshness_info else "100% Farm Fresh",
        delivery_available=payload.delivery_available,
        status=payload.status or "active",
        updated_by=current_admin.id,
    )
    db.add(new_prod)
    db.flush()

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="CREATE_PRODUCT",
            entity_type="product",
            entity_id=str(new_prod.id),
            details={"name": new_prod.product_name, "price": str(new_prod.price), "stock": new_prod.stock},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(new_prod)
    clear_catalog_cache()

    return AdminProductOut(
        id=new_prod.id,
        category_id=new_prod.category_id,
        product_name=new_prod.product_name,
        description=new_prod.description,
        product_image=new_prod.product_image,
        images=new_prod.images or [],
        price=new_prod.price,
        discount_price=new_prod.discount_price,
        sku=new_prod.sku,
        weight=new_prod.weight,
        stock=new_prod.stock,
        unit=new_prod.unit,
        is_featured=new_prod.is_featured,
        is_popular=new_prod.is_popular,
        freshness_info=new_prod.freshness_info,
        delivery_available=new_prod.delivery_available,
        status=new_prod.status,
        created_at=new_prod.created_at,
        updated_at=new_prod.updated_at,
        category=CategorySummary(
            id=cat.id,
            category_name=cat.category_name,
            category_image=cat.category_image,
        ),
    )


@router.put("/{product_id}", response_model=AdminProductOut)
def update_product(
    product_id: int,
    payload: AdminProductUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    prod = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if payload.category_id is not None:
        cat = db.query(Category).filter(Category.id == payload.category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid category ID")
        prod.category_id = payload.category_id

    if payload.product_name is not None:
        prod.product_name = payload.product_name.strip()

    if payload.description is not None:
        prod.description = payload.description.strip()

    if payload.images is not None:
        images_list = prepare_product_images(payload.product_image, payload.images)
        prod.images = images_list
        prod.product_image = images_list[0] if images_list else None
    elif payload.product_image is not None:
        images_list = prepare_product_images(payload.product_image, prod.images)
        prod.images = images_list
        prod.product_image = images_list[0]

    if payload.price is not None:
        prod.price = payload.price

    if payload.discount_price is not None:
        prod.discount_price = payload.discount_price

    if payload.sku is not None:
        prod.sku = payload.sku.strip()

    if payload.weight is not None:
        prod.weight = payload.weight.strip()

    if payload.stock is not None:
        prod.stock = payload.stock

    if payload.unit is not None:
        prod.unit = payload.unit.strip()

    if payload.is_featured is not None:
        prod.is_featured = payload.is_featured

    if payload.is_popular is not None:
        prod.is_popular = payload.is_popular

    if payload.freshness_info is not None:
        prod.freshness_info = payload.freshness_info.strip()

    if payload.delivery_available is not None:
        prod.delivery_available = payload.delivery_available

    if payload.status is not None:
        prod.status = payload.status

    prod.updated_by = current_admin.id

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_PRODUCT",
            entity_type="product",
            entity_id=str(prod.id),
            details={"name": prod.product_name, "stock": prod.stock, "price": str(prod.price)},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(prod)
    clear_catalog_cache()

    return AdminProductOut(
        id=prod.id,
        category_id=prod.category_id,
        product_name=prod.product_name,
        description=prod.description,
        product_image=prod.product_image,
        images=prod.images or [],
        price=prod.price,
        discount_price=prod.discount_price,
        sku=prod.sku,
        weight=prod.weight,
        stock=prod.stock,
        unit=prod.unit,
        is_featured=prod.is_featured,
        is_popular=prod.is_popular,
        freshness_info=prod.freshness_info,
        delivery_available=prod.delivery_available,
        status=prod.status,
        created_at=prod.created_at,
        updated_at=prod.updated_at,
        category=CategorySummary(
            id=prod.category.id,
            category_name=prod.category.category_name,
            category_image=prod.category.category_image,
        ) if prod.category else None,
    )


@router.patch("/{product_id}/stock", response_model=AdminProductOut)
def quick_update_stock(
    product_id: int,
    stock: int = Query(..., ge=0),
    request: Request = None,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    prod = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    old_stock = prod.stock
    prod.stock = stock
    prod.updated_by = current_admin.id

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_PRODUCT_STOCK",
            entity_type="product",
            entity_id=str(prod.id),
            details={"old_stock": old_stock, "new_stock": stock},
            ip_address=request.client.host if request and request.client else None,
        )
    )

    db.commit()
    db.refresh(prod)
    clear_catalog_cache()

    return AdminProductOut(
        id=prod.id,
        category_id=prod.category_id,
        product_name=prod.product_name,
        description=prod.description,
        product_image=prod.product_image,
        images=prod.images or [],
        price=prod.price,
        discount_price=prod.discount_price,
        sku=prod.sku,
        weight=prod.weight,
        stock=prod.stock,
        unit=prod.unit,
        is_featured=prod.is_featured,
        is_popular=prod.is_popular,
        freshness_info=prod.freshness_info,
        delivery_available=prod.delivery_available,
        status=prod.status,
        created_at=prod.created_at,
        updated_at=prod.updated_at,
        category=CategorySummary(
            id=prod.category.id,
            category_name=prod.category.category_name,
            category_image=prod.category.category_image,
        ) if prod.category else None,
    )


@router.patch("/{product_id}/status", response_model=AdminProductOut)
def toggle_product_status(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    prod = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    new_status = "inactive" if prod.status == "active" else "active"
    prod.status = new_status
    prod.updated_by = current_admin.id

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="TOGGLE_PRODUCT_STATUS",
            entity_type="product",
            entity_id=str(prod.id),
            details={"new_status": new_status},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(prod)
    clear_catalog_cache()

    return AdminProductOut(
        id=prod.id,
        category_id=prod.category_id,
        product_name=prod.product_name,
        description=prod.description,
        product_image=prod.product_image,
        images=prod.images or [],
        price=prod.price,
        discount_price=prod.discount_price,
        sku=prod.sku,
        weight=prod.weight,
        stock=prod.stock,
        unit=prod.unit,
        is_featured=prod.is_featured,
        is_popular=prod.is_popular,
        freshness_info=prod.freshness_info,
        delivery_available=prod.delivery_available,
        status=prod.status,
        created_at=prod.created_at,
        updated_at=prod.updated_at,
        category=CategorySummary(
            id=prod.category.id,
            category_name=prod.category.category_name,
            category_image=prod.category.category_image,
        ) if prod.category else None,
    )


@router.post("/bulk/stock")
def bulk_update_stock(
    payload: AdminProductBulkStockUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    updated_count = 0
    for item in payload.updates:
        p_id = item.get("id")
        p_stock = item.get("stock")
        if p_id is not None and p_stock is not None:
            prod = db.query(Product).filter(Product.id == p_id).first()
            if prod:
                prod.stock = int(p_stock)
                prod.updated_by = current_admin.id
                updated_count += 1

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="BULK_STOCK_UPDATE",
            entity_type="product",
            entity_id="bulk",
            details={"updated_count": updated_count},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    clear_catalog_cache()
    return {"message": f"Successfully updated stock for {updated_count} product(s)"}


@router.post("/bulk/status")
def bulk_update_status(
    payload: AdminProductBulkStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    updated_count = (
        db.query(Product)
        .filter(Product.id.in_(payload.product_ids))
        .update(
            {"status": payload.status, "updated_by": current_admin.id},
            synchronize_session=False,
        )
    )

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="BULK_STATUS_UPDATE",
            entity_type="product",
            entity_id="bulk",
            details={"new_status": payload.status, "count": updated_count},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    clear_catalog_cache()
    return {"message": f"Successfully updated status for {updated_count} product(s) to '{payload.status}'"}


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Product not found"
        )

    name = prod.product_name

    try:
        db.delete(prod)
        
        db.add(
            ActivityLog(
                admin_id=current_admin.id,
                action="DELETE_PRODUCT",
                entity_type="product",
                entity_id=str(product_id),
                details={"name": name},
                ip_address=request.client.host if request and request.client else None,
            )
        )

        db.commit()
        clear_catalog_cache()
        return {"message": f"Product '{name}' deleted successfully"}

    except IntegrityError:
        # Roll back the failed transaction to keep the DB session clean
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot delete '{name}' because it is linked to existing orders, cart items, or records. "
                "Set its status to 'inactive' instead."
            ),
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete product: {str(e)}",
        )

    db.commit()
    clear_catalog_cache()
    return {"message": f"Product '{name}' deleted successfully"}
