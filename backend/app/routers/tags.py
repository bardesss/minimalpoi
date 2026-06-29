from fastapi import APIRouter, HTTPException
from sqlmodel import select

from ..deps import AdminUser, CurrentUser, SessionDep
from ..models import POI
from ..schemas import TagInfo, TagRename
from ..tags import remove_from, rename_in, tag_counts

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagInfo])
def list_tags(session: SessionDep, _: CurrentUser) -> list[dict]:
    return tag_counts(session.exec(select(POI)).all())


# Rename/delete rewrite tags across every POI (global, unowned) — admin only.
@router.patch("/rename", response_model=list[TagInfo])
def rename_tag(body: TagRename, session: SessionDep, _: AdminUser) -> list[dict]:
    new = body.new.strip()
    if not new:
        raise HTTPException(status_code=400, detail="New tag must not be empty")
    affected = 0
    for p in session.exec(select(POI)).all():
        if body.old in (p.tags or []):
            p.tags = rename_in(p.tags, body.old, new)
            session.add(p)
            affected += 1
    if affected == 0:
        raise HTTPException(status_code=404, detail="Tag not found")
    session.commit()
    return tag_counts(session.exec(select(POI)).all())


@router.delete("/{tag}", response_model=list[TagInfo])
def delete_tag(tag: str, session: SessionDep, _: AdminUser) -> list[dict]:
    for p in session.exec(select(POI)).all():
        if tag in (p.tags or []):
            p.tags = remove_from(p.tags, tag)
            session.add(p)
    session.commit()
    return tag_counts(session.exec(select(POI)).all())
