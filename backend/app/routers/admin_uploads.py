import os
import uuid
import base64
import re
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from app.models import Admin
from app.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/uploads",
    tags=["Admin Media Uploads"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}


class ImageUploadPayload(BaseModel):
    image_data: str  # Can be base64 data URL ("data:image/png;base64,...") or raw base64 string
    filename: str = "upload.jpg"


@router.post("/image")
def upload_image(
    payload: ImageUploadPayload,
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        data_str = payload.image_data
        ext = ".jpg"

        # Check if base64 data URL
        if "," in data_str and "data:" in data_str:
            header, encoded = data_str.split(",", 1)
            if "image/png" in header:
                ext = ".png"
            elif "image/webp" in header:
                ext = ".webp"
            elif "image/gif" in header:
                ext = ".gif"
            elif "image/svg" in header:
                ext = ".svg"
            else:
                ext = ".jpg"
            file_bytes = base64.b64decode(encoded)
        else:
            # Fallback to payload filename extension if valid
            orig_ext = os.path.splitext(payload.filename)[1].lower()
            if orig_ext in ALLOWED_EXTENSIONS:
                ext = orig_ext
            file_bytes = base64.b64decode(data_str)

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # Return full accessible path
        return {
            "url": f"/static/uploads/{unique_filename}",
            "filename": unique_filename,
            "success": True,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process image upload: {str(e)}",
        )
