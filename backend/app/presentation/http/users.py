from typing import Annotated
from uuid import UUID

import asyncpg
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
    get_account_scope,
    require_permissions,
)
from app.presentation.schemas.users import (
    UserCreate,
    UserOptionResponse,
    UserResponse,
    ThermalEmailSettings,
    UserUpdate,
)

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
    current_user: Annotated[AuthenticatedUser, Depends(require_permissions("users:write"))],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> UserResponse:
    if current_user.is_master and account_id is None:
        raise HTTPException(status_code=422, detail="Selecione uma conta para cadastrar o usuário.")
    user = await use_case.execute(
        name=payload.name,
        email=str(payload.email),
        password=payload.password,
        role=payload.role,
        account_id=account_id,
    )
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        account_id=user.account_id,
        account_name=user.account_name,
    )


@router.get(
    "",
    response_model=list[UserResponse],
    summary="List users",
)
async def list_users(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    _: Annotated[AuthenticatedUser, Depends(require_permissions("users:read"))],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
) -> list[UserResponse]:
    normalized_search = search.strip() if search and search.strip() else None
    users = await repository.list_users(
        limit=limit,
        offset=offset,
        query=normalized_search,
        account_id=account_id,
    )
    return [
        UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            account_id=user.account_id,
            account_name=user.account_name,
        )
        for user in users
    ]


@router.get(
    "/options",
    response_model=list[UserOptionResponse],
    summary="List users for service order assignment",
)
async def list_user_options(
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    _: Annotated[AuthenticatedUser, Depends(get_current_user)],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> list[UserOptionResponse]:
    users = await repository.list_user_options(account_id=account_id)
    return [UserOptionResponse(id=user.id, name=user.name, email=user.email) for user in users]


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
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
) -> UserResponse:
    is_admin = "users:write" in current_user.permissions
    if user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this user.",
        )
    if payload.role is not None and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators may change a user's type.")
    if payload.role is not None:
        target = await repository.get_by_id(user_id)
        if target is not None and target.role == "master_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The platform master role cannot be changed here.")
    if not payload.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide at least one profile field to update.",
        )

    user = await use_case.execute(
        user_id=user_id,
        name=payload.name,
        email=str(payload.email) if payload.email is not None else None,
        role=payload.role,
        account_id=account_id,
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
        role=user.role,
        created_at=user.created_at,
        account_id=user.account_id,
        account_name=user.account_name,
    )


@router.get("/me", response_model=UserResponse, summary="Get current user")
async def get_my_user(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
) -> UserResponse:
    user = await repository.get_by_id(current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserResponse(id=user.id, name=user.name, email=user.email, role=user.role, created_at=user.created_at, account_id=user.account_id, account_name=user.account_name)


@router.get(
    "/me/notification-settings",
    response_model=ThermalEmailSettings,
    summary="Get the current user's thermal email settings",
)
async def get_my_notification_settings(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
) -> ThermalEmailSettings:
    settings = await repository.get_thermal_email_settings(user_id=current_user.id)
    if settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return ThermalEmailSettings(**settings)


@router.patch(
    "/me/notification-settings",
    response_model=ThermalEmailSettings,
    summary="Update the current user's thermal email settings",
)
async def update_my_notification_settings(
    payload: ThermalEmailSettings,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
) -> ThermalEmailSettings:
    settings = await repository.update_thermal_email_settings(
        user_id=current_user.id,
        email_on_thermal_alert=payload.email_on_thermal_alert,
        email_on_thermal_alarm=payload.email_on_thermal_alarm,
    )
    if settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return ThermalEmailSettings(**settings)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a user")
async def delete_user(
    user_id: UUID,
    current_user: Annotated[AuthenticatedUser, Depends(require_permissions("users:write"))],
    repository: Annotated[IUserRepository, Depends(get_user_repository)],
    account_id: Annotated[UUID | None, Depends(get_account_scope)],
) -> None:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account.")
    try:
        deleted = await repository.delete(user_id=user_id, account_id=account_id)
    except asyncpg.ForeignKeyViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user is linked to service orders and cannot be deleted.",
        ) from None
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
