from fastapi import APIRouter, HTTPException, Request, UploadFile, status
from starlette.concurrency import run_in_threadpool

from ..deps import CurrentUser
from ..enrich.images import MAX_IMAGE_BYTES, UnsupportedImageError, process_image, save_bytes
from ..ratelimit import UPLOAD_LIMIT, limiter, user_or_ip
from ..schemas import ImageUploadResult

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ImageUploadResult)
@limiter.limit(UPLOAD_LIMIT, key_func=user_or_ip)
async def upload_image(request: Request, file: UploadFile, _: CurrentUser) -> dict:
    # Read at most one byte past the limit so an oversized upload is rejected
    # without ever buffering the whole (potentially multi-GB) body in memory.
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image too large (max 10 MB)",
        )
    try:
        webp = await run_in_threadpool(process_image, data)
    except UnsupportedImageError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported or invalid image (JPEG, PNG, or WebP only)",
        )
    return {"url": await run_in_threadpool(save_bytes, webp, ".webp")}
