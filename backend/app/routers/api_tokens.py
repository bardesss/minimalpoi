from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..apitokens import generate_api_token
from ..deps import CurrentUser, SessionDep
from ..models import ApiToken
from ..schemas import ApiTokenCreate, ApiTokenCreated, ApiTokenRead

router = APIRouter(prefix="/api/tokens", tags=["tokens"])


@router.get("", response_model=list[ApiTokenRead])
def list_tokens(session: SessionDep, user: CurrentUser) -> list[ApiToken]:
    return session.exec(
        select(ApiToken).where(ApiToken.user_id == user.id).order_by(ApiToken.created_at.desc())
    ).all()


@router.post("", response_model=ApiTokenCreated, status_code=status.HTTP_201_CREATED)
def create_token(body: ApiTokenCreate, session: SessionDep, user: CurrentUser) -> ApiTokenCreated:
    full, prefix, token_hash = generate_api_token()
    row = ApiToken(user_id=user.id, name=body.name, token_hash=token_hash,
                   prefix=prefix, token_version=user.token_version)
    session.add(row)
    session.commit()
    session.refresh(row)
    return ApiTokenCreated(id=row.id, name=row.name, prefix=row.prefix,
                           created_at=row.created_at, last_used_at=row.last_used_at, token=full)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_token(token_id: int, session: SessionDep, user: CurrentUser) -> Response:
    row = session.get(ApiToken, token_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
