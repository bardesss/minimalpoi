from fastapi import APIRouter, HTTPException, Response, status
from sqlmodel import select

from ..deps import CurrentUser, SessionDep
from ..models import Category
from ..schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(session: SessionDep, _: CurrentUser) -> list[Category]:
    return session.exec(select(Category)).all()


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, session: SessionDep, user: CurrentUser) -> Category:
    cat = Category(
        name=body.name,
        color=body.color,
        icon=body.icon,
        created_by=user.id,
    )
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int, body: CategoryUpdate, session: SessionDep, _: CurrentUser
) -> Category:
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(cat, key, value)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, session: SessionDep, _: CurrentUser) -> Response:
    cat = session.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(cat)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
