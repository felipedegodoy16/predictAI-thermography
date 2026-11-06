import re
from dataclasses import asdict
from typing import Annotated
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.application.ports.password_hasher import PasswordHasher
from app.domain.repositories.account_repository import IAccountRepository
from app.presentation.http.dependencies import AuthenticatedUser, get_account_repository, get_current_user, get_password_hasher

router = APIRouter()


class AccountCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=2, max_length=160)
    admin_name: str = Field(min_length=2, max_length=120)
    admin_email: EmailStr
    admin_password: str = Field(min_length=12, max_length=128)


@router.get("")
async def list_accounts(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[IAccountRepository, Depends(get_account_repository)],
) -> list[dict]:
    _require_master(current_user)
    return [asdict(account) for account in await repository.list_accounts()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(
    payload: AccountCreate,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    repository: Annotated[IAccountRepository, Depends(get_account_repository)],
    hasher: Annotated[PasswordHasher, Depends(get_password_hasher)],
) -> dict:
    _require_master(current_user)
    slug = re.sub(r"[^a-z0-9]+", "-", payload.name.casefold()).strip("-")
    if not slug:
        slug = f"cliente-{uuid4().hex[:12]}"
    try:
        account, _ = await repository.create_with_admin(
            name=payload.name,
            slug=slug,
            admin_name=payload.admin_name,
            admin_email=str(payload.admin_email).casefold(),
            admin_password_hash=hasher.hash(payload.admin_password),
        )
    except asyncpg.UniqueViolationError as error:
        if getattr(error, "constraint_name", "") == "accounts_slug_key":
            raise HTTPException(status_code=409, detail="Já existe uma conta com esse nome.") from None
        raise HTTPException(status_code=409, detail="O email informado já está cadastrado.") from None
    return asdict(account)


def _require_master(user: AuthenticatedUser) -> None:
    if not user.is_master:
        raise HTTPException(status_code=403, detail="Apenas o administrador master pode gerenciar contas.")
