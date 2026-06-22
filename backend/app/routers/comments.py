from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import POI, Comment, Role, User
from ..schemas import CommentCreate, CommentRead

router = APIRouter(prefix="/api/pois", tags=["comments"])


def _to_read(session: SessionDep, comment: Comment) -> CommentRead:
    user = session.get(User, comment.user_id)
    return CommentRead(
        id=comment.id,
        poi_id=comment.poi_id,
        user_id=comment.user_id,
        username=user.username if user else "(deleted)",
        text=comment.text,
        created_at=comment.created_at,
    )


@router.get("/{poi_id}/comments", response_model=list[CommentRead])
def list_comments(poi_id: int, session: SessionDep, _: CurrentUser) -> list[CommentRead]:
    comments = session.exec(
        select(Comment).where(Comment.poi_id == poi_id).order_by(Comment.created_at)
    ).all()
    return [_to_read(session, c) for c in comments]


@router.post("/{poi_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    poi_id: int, body: CommentCreate, session: SessionDep, user: CurrentUser
) -> CommentRead:
    if not session.get(POI, poi_id):
        raise HTTPException(status_code=404, detail="Not found")
    comment = Comment(poi_id=poi_id, user_id=user.id, text=body.text)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return _to_read(session, comment)


@router.delete("/{poi_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    poi_id: int, comment_id: int, session: SessionDep, user: CurrentUser
) -> Response:
    comment = session.get(Comment, comment_id)
    if not comment or comment.poi_id != poi_id:
        raise HTTPException(status_code=404, detail="Not found")
    if comment.user_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not allowed")
    session.delete(comment)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
