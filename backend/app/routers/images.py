from fastapi import APIRouter, HTTPException, UploadFile, status

from ..deps import CurrentUser
from ..enrich.images import MAX_IMAGE_BYTES, UnsupportedImageError, process_image, save_bytes

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile, _: CurrentUser) -> dict:
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image too large (max 10 MB)",
        )
    try:
        webp = process_image(data)
    except UnsupportedImageError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported or invalid image (JPEG, PNG, or WebP only)",
        )
    return {"url": save_bytes(webp, ".webp")}
