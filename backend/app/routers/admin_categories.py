from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, Product, Admin, ActivityLog
from app.schemas import (
    AdminCategoryCreate,
    AdminCategoryUpdate,
    AdminCategoryOut,
)
from app.security import get_current_admin
from app.routers.catalog import clear_catalog_cache

router = APIRouter(
    prefix="/api/admin/categories",
    tags=["Admin Category Management"],
)


@router.get("", response_model=dict)
def list_categories(
    search: Optional[str] = Query(None, description="Search by category name"),
    status_filter: Optional[str] = Query(None, alias="status", description="active / inactive"),
    sort_by: str = Query("category_name", description="category_name, created_at, product_count"),
    sort_order: str = Query("asc", description="asc / desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    query = (
        db.query(
            Category,
            func.count(Product.id).label("product_count"),
        )
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id)
    )

    if search:
        kw = f"%{search.strip()}%"
        query = query.filter(Category.category_name.ilike(kw))

    if status_filter:
        query = query.filter(Category.status == status_filter)

    # Sorting
    if sort_by == "product_count":
        order_col = func.count(Product.id)
    elif sort_by == "created_at":
        order_col = Category.created_at
    else:
        order_col = Category.category_name

    if sort_order.lower() == "desc":
        query = query.order_by(order_col.desc())
    else:
        query = query.order_by(order_col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    items = [
        AdminCategoryOut(
            id=cat.id,
            category_name=cat.category_name,
            category_image=cat.category_image,
            status=cat.status,
            product_count=p_cnt,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
        )
        for cat, p_cnt in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/{category_id}", response_model=AdminCategoryOut)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    row = (
        db.query(Category, func.count(Product.id).label("product_count"))
        .outerjoin(Product, Product.category_id == Category.id)
        .filter(Category.id == category_id)
        .group_by(Category.id)
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    cat, p_cnt = row
    return AdminCategoryOut(
        id=cat.id,
        category_name=cat.category_name,
        category_image=cat.category_image,
        status=cat.status,
        product_count=p_cnt,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


@router.post("", response_model=AdminCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: AdminCategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    name_clean = payload.category_name.strip()
    existing = (
        db.query(Category)
        .filter(func.lower(Category.category_name) == name_clean.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category with this name already exists",
        )

    new_cat = Category(
        category_name=name_clean,
        category_image=payload.category_image.strip(),
        status=payload.status or "active",
        created_by=current_admin.id,
    )
    db.add(new_cat)
    db.flush()

    # Log Activity
    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="CREATE_CATEGORY",
            entity_type="category",
            entity_id=str(new_cat.id),
            details={"name": new_cat.category_name},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(new_cat)
    clear_catalog_cache()

    return AdminCategoryOut(
        id=new_cat.id,
        category_name=new_cat.category_name,
        category_image=new_cat.category_image,
        status=new_cat.status,
        product_count=0,
        created_at=new_cat.created_at,
        updated_at=new_cat.updated_at,
    )


@router.put("/{category_id}", response_model=AdminCategoryOut)
def update_category(
    category_id: int,
    payload: AdminCategoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if payload.category_name is not None:
        name_clean = payload.category_name.strip()
        existing = (
            db.query(Category)
            .filter(
                func.lower(Category.category_name) == name_clean.lower(),
                Category.id != category_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another category with this name already exists",
            )
        cat.category_name = name_clean

    if payload.category_image is not None:
        cat.category_image = payload.category_image.strip()

    if payload.status is not None:
        cat.status = payload.status

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="UPDATE_CATEGORY",
            entity_type="category",
            entity_id=str(cat.id),
            details={"name": cat.category_name, "status": cat.status},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(cat)
    clear_catalog_cache()

    p_cnt = db.query(func.count(Product.id)).filter(Product.category_id == cat.id).scalar() or 0

    return AdminCategoryOut(
        id=cat.id,
        category_name=cat.category_name,
        category_image=cat.category_image,
        status=cat.status,
        product_count=p_cnt,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


@router.patch("/{category_id}/status", response_model=AdminCategoryOut)
def toggle_category_status(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    new_status = "inactive" if cat.status == "active" else "active"
    cat.status = new_status

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="TOGGLE_CATEGORY_STATUS",
            entity_type="category",
            entity_id=str(cat.id),
            details={"new_status": new_status},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    db.refresh(cat)
    clear_catalog_cache()

    p_cnt = db.query(func.count(Product.id)).filter(Product.category_id == cat.id).scalar() or 0

    return AdminCategoryOut(
        id=cat.id,
        category_name=cat.category_name,
        category_image=cat.category_image,
        status=cat.status,
        product_count=p_cnt,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    products_count = (
        db.query(func.count(Product.id))
        .filter(Product.category_id == category_id)
        .scalar()
        or 0
    )
    if products_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {products_count} active product(s). Move or delete the products first, or disable the category.",
        )

    db.delete(cat)

    db.add(
        ActivityLog(
            admin_id=current_admin.id,
            action="DELETE_CATEGORY",
            entity_type="category",
            entity_id=str(category_id),
            details={"name": cat.category_name},
            ip_address=request.client.host if request.client else None,
        )
    )

    db.commit()
    clear_catalog_cache()
    return {"message": f"Category '{cat.category_name}' deleted successfully"}
