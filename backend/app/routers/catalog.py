import time
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, contains_eager

from app.database import get_db
from app.models import Category, Product
from app.schemas import CategoryResponse, ProductResponse

router = APIRouter(
    prefix="/api/catalog",
    tags=["Catalog"],
)

# In-memory thread-safe micro-cache for read-heavy catalog endpoints (< 1ms responses)
_CATALOG_CACHE: dict[str, tuple[float, Any]] = {}

def get_cached_catalog(key: str, ttl: float = 30.0) -> Optional[Any]:
    entry = _CATALOG_CACHE.get(key)
    if entry:
        timestamp, data = entry
        if time.monotonic() - timestamp < ttl:
            return data
    return None

def set_cached_catalog(key: str, data: Any):
    _CATALOG_CACHE[key] = (time.monotonic(), data)

def clear_catalog_cache():
    _CATALOG_CACHE.clear()


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
)
def get_categories(db: Session = Depends(get_db)):
    cache_key = "categories_all"
    cached = get_cached_catalog(cache_key, ttl=60.0)
    if cached is not None:
        return cached

    rows = (
        db.query(
            Category,
            func.count(Product.id).label("product_count"),
        )
        .outerjoin(
            Product,
            (Product.category_id == Category.id)
            & (Product.status == "active"),
        )
        .filter(Category.status == "active")
        .group_by(Category.id)
        .order_by(Category.category_name.asc())
        .all()
    )

    result = [
        {
            "id": category.id,
            "category_name": category.category_name,
            "category_image": category.category_image,
            "status": category.status,
            "product_count": product_count,
        }
        for category, product_count in rows
    ]
    set_cached_catalog(cache_key, result)
    return result


@router.get(
    "/categories/{category_id}/products",
    response_model=list[ProductResponse],
)
def get_products_by_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    cache_key = f"category_products_{category_id}"
    cached = get_cached_catalog(cache_key, ttl=30.0)
    if cached is not None:
        return cached

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.status == "active",
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    products = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.category_id == category_id,
            Product.status == "active",
        )
        .order_by(Product.product_name.asc())
        .all()
    )
    set_cached_catalog(cache_key, products)
    return products


@router.get(
    "/products/featured",
    response_model=list[ProductResponse],
)
def get_featured_products(db: Session = Depends(get_db)):
    cache_key = "products_featured"
    cached = get_cached_catalog(cache_key, ttl=30.0)
    if cached is not None:
        return cached

    products = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.is_featured.is_(True),
            Product.status == "active",
        )
        .order_by(Product.id.desc())
        .limit(10)
        .all()
    )
    set_cached_catalog(cache_key, products)
    return products


@router.get(
    "/products/popular",
    response_model=list[ProductResponse],
)
def get_popular_products(db: Session = Depends(get_db)):
    cache_key = "products_popular"
    cached = get_cached_catalog(cache_key, ttl=30.0)
    if cached is not None:
        return cached

    products = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.is_popular.is_(True),
            Product.status == "active",
        )
        .order_by(Product.id.desc())
        .limit(10)
        .all()
    )
    set_cached_catalog(cache_key, products)
    return products


@router.get(
    "/products",
    response_model=list[ProductResponse],
)
def search_products(
    search: Optional[str] = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Product)
        .join(Product.category)
        .options(contains_eager(Product.category))
        .filter(
            Product.status == "active",
            Category.status == "active",
        )
    )

    if search:
        keyword = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.product_name.ilike(keyword),
                Category.category_name.ilike(keyword),
            )
        )

    return query.order_by(Product.product_name.asc()).limit(limit).all()


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
)
def get_product_details(
    product_id: int,
    db: Session = Depends(get_db),
):
    cache_key = f"product_detail_{product_id}"
    cached = get_cached_catalog(cache_key, ttl=30.0)
    if cached is not None:
        return cached

    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.id == product_id,
            Product.status == "active",
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    set_cached_catalog(cache_key, product)
    return product