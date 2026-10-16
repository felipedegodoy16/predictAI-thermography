from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.use_cases.users.create_user import CreateUser
from app.application.use_cases.users.update_user import UpdateUser
from app.domain.repositories.user_repository import IUserRepository
from app.presentation.http.dependencies import (
    AuthenticatedUser,
    get_create_user_use_case,
    get_current_user,
    get_update_user_use_case,
    get_user_repository,
    require_permissions,
)
from app.presentation.schemas.users import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user",
)
async def create_user(
    payload: UserCreate,
    use_case: Annotated[CreateUser, Depends(get_create_user_use_case)],
) -> UserResponse:
    user = await use_case.execute(
        name=payload.name,
        email=str(payload.email),
        password=payload.password,
    )
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at,
    )


@router.get(
    "",
    response_model=list[UserResponse],
    summary="List users",
)
async def list_users(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    _: Annotated[AuthenticatedUser, Depends(require_permissions("users:read"))],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
) -> list[UserResponse]:
    normalized_search = search.strip() if search and search.strip() else None
    users = await repository.list_users(
        limit=limit,
        offset=offset,
        query=normalized_search,
    )
    return [
        UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            created_at=user.created_at,
        )
        for user in users
    ]


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user profile",
)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    use_case: Annotated[UpdateUser, Depends(get_update_user_use_case)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserResponse:
    if user_id != current_user.id and "users:write" not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this user.",
        )
    if not payload.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one profile field to update.",
        )

    user = await use_case.execute(
        user_id=user_id,
        name=payload.name,
        email=str(payload.email) if payload.email is not None else None,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at,
    )
