from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.application.use_cases.users.create_user import CreateUser
from app.presentation.http.dependencies import get_create_user_use_case
from app.presentation.schemas.users import UserCreate, UserResponse

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
