import types
from typing import Union, get_args, get_origin

from fastapi import HTTPException
from sqlmodel import SQLModel


def _admits_none(annotation: object) -> bool:
    if annotation is None or annotation is type(None):
        return True
    if get_origin(annotation) in (Union, types.UnionType):
        return any(_admits_none(a) for a in get_args(annotation))
    return False


def required_fields(model: type[SQLModel]) -> frozenset[str]:
    """Names of the model's fields whose annotation does not admit None."""
    return frozenset(
        name for name, info in model.model_fields.items() if not _admits_none(info.annotation)
    )


def apply_patch(obj: SQLModel, data: dict, *, non_nullable: set[str] | frozenset[str]) -> None:
    """setattr every key of a PATCH payload; explicit null on a non-nullable field is a 422."""
    for key in data:
        if key in non_nullable and data[key] is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
    for key, value in data.items():
        setattr(obj, key, value)
