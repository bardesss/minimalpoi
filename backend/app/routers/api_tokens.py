from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlmodel import select

from ..apitokens import generate_api_token
from ..deps import CookieUser, SessionDep
from ..models import ApiToken, User
from ..ratelimit import limiter, user_or_ip
from ..schemas import ApiTokenCreate, ApiTokenCreated, ApiTokenRead

router = APIRouter(prefix="/api/tokens", tags=["tokens"])

MAX_TOKENS_PER_USER = 10


@router.get("", response_model=list[ApiTokenRead])
def list_tokens(session: SessionDep, user: CookieUser) -> list[ApiToken]:
    return session.exec(
        select(ApiToken).where(ApiToken.user_id == user.id).order_by(ApiToken.created_at.desc())
    ).all()


@router.post("", response_model=ApiTokenCreated, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour", key_func=user_or_ip)
def create_token(
    request: Request, body: ApiTokenCreate, session: SessionDep, user: CookieUser
) -> ApiTokenCreated:
    # Lock the user row so two concurrent mints can't both pass the cap check
    # (Postgres; SQLite ignores FOR UPDATE and serialises writers itself).
    session.exec(select(User.id).where(User.id == user.id).with_for_update()).one()
    count = session.exec(
        select(func.count()).select_from(ApiToken).where(ApiToken.user_id == user.id)
    ).one()
    if count >= MAX_TOKENS_PER_USER:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Token limit reached")
    full, prefix, token_hash = generate_api_token()
    row = ApiToken(user_id=user.id, name=body.name, token_hash=token_hash,
                   prefix=prefix, token_version=user.token_version)
    session.add(row)
    session.commit()
    session.refresh(row)
    return ApiTokenCreated(id=row.id, name=row.name, prefix=row.prefix,
                           created_at=row.created_at, last_used_at=row.last_used_at, token=full)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_token(token_id: int, session: SessionDep, user: CookieUser) -> Response:
    row = session.get(ApiToken, token_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
