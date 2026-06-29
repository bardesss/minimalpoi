import zipfile

from fastapi import APIRouter, HTTPException, Response, UploadFile

from .. import backup as backup_service
from ..deps import AdminUser, SessionDep

router = APIRouter(prefix="/api", tags=["backup"])


@router.get("/backup")
def download_backup(session: SessionDep, _: AdminUser) -> Response:
    raw = backup_service.build_backup_archive(session)
    return Response(
        content=raw,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="minimalpoi-backup.zip"'},
    )


@router.post("/restore")
async def restore_backup(file: UploadFile, session: SessionDep, _: AdminUser) -> dict:
    if not backup_service.is_empty(session):
        raise HTTPException(
            status_code=409,
            detail="Database is not empty — restore is only allowed into a fresh instance.",
        )
    raw = await file.read()
    try:
        summary = backup_service.restore_from_archive(session, raw)
    except (ValueError, KeyError, zipfile.BadZipFile, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid or unsupported backup file.") from exc
    return {"restored": summary}
