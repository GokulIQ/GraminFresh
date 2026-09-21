from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Customer, CustomerAddress
from app.schemas import AddressCreate, AddressUpdate, AddressResponse
from app.security import get_current_customer

router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"]
)

@router.post("/", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def add_address(
    address: AddressCreate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    # If this is the first address, make it default
    existing_addresses = db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == current_customer.id
    ).count()

    is_default = address.is_default or existing_addresses == 0

    if is_default and existing_addresses > 0:
        # Reset other default addresses
        db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == current_customer.id
        ).update({"is_default": False})

    new_address = CustomerAddress(
        customer_id=current_customer.id,
        full_name=address.full_name,
        mobile_number=address.mobile_number,
        address=address.address,
        village=address.village,
        district=address.district,
        state=address.state,
        pincode=address.pincode,
        landmark=address.landmark,
        is_default=is_default
    )
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    return new_address

@router.get("/", response_model=list[AddressResponse])
def get_addresses(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    addresses = db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == current_customer.id
    ).order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc()).all()
    return addresses

@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int,
    address_update: AddressUpdate,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.customer_id == current_customer.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    if address_update.is_default and not address.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == current_customer.id
        ).update({"is_default": False})

    for key, value in address_update.model_dump().items():
        setattr(address, key, value)

    db.commit()
    db.refresh(address)
    return address

@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.customer_id == current_customer.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = address.is_default
    db.delete(address)
    db.commit()

    if was_default:
        # Set another address as default if available
        next_address = db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == current_customer.id
        ).first()
        if next_address:
            next_address.is_default = True
            db.commit()

@router.put("/{address_id}/default", response_model=AddressResponse)
def set_default_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == address_id,
        CustomerAddress.customer_id == current_customer.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Reset others
    db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == current_customer.id
    ).update({"is_default": False})

    address.is_default = True
    db.commit()
    db.refresh(address)
    return address
