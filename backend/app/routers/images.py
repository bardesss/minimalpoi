from pathlib import Path

from fastapi import APIRouter, UploadFile, status

from ..deps import CurrentUser
from ..enrich.images import save_bytes

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(file: UploadFile, _: CurrentUser) -> dict:
    suffix = Path(file.filename or "").suffix or ".bin"
    data = await file.read()
    return {"url": save_bytes(data, suffix)}
