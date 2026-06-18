from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile

from app.ai.client import AIClient
from app.ai.dependencies import get_ai_client, get_file_storage
from app.database.session import _AsyncSessionLocal
from app.dependencies import DB, CurrentUser
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeDetailResponse, ResumeResponse
from app.services.resume_service import ResumeService
from app.utils.file_handler import FileStorage

router = APIRouter(tags=["resumes"])
logger = logging.getLogger(__name__)


async def _run_analysis(
    resume_id: uuid.UUID,
    file_storage: FileStorage,
    ai_client: AIClient,
) -> None:
    async with _AsyncSessionLocal() as session:
        try:
            repo = ResumeRepository(session)
            resume = await repo.get(resume_id)
            if resume is None:
                return
            await ResumeService(session, file_storage, ai_client).analyze(resume)
            await session.commit()
        except Exception:
            logger.exception("Background resume analysis failed for %s", resume_id)


@router.post("", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ResumeResponse:
    svc = ResumeService(session, file_storage, ai_client)
    resume = await svc.upload(current_user.id, file)
    background_tasks.add_task(_run_analysis, resume.id, file_storage, ai_client)
    return ResumeResponse.model_validate(resume)


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> list[ResumeResponse]:
    resumes = await ResumeService(session, file_storage, ai_client).list_for_user(current_user.id)
    return [ResumeResponse.model_validate(r) for r in resumes]


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ResumeDetailResponse:
    resume = await ResumeService(session, file_storage, ai_client).get_by_id(resume_id, current_user.id)
    return ResumeDetailResponse.model_validate(resume)


@router.post("/{resume_id}/analyze", response_model=ResumeDetailResponse)
async def reanalyze_resume(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ResumeDetailResponse:
    svc = ResumeService(session, file_storage, ai_client)
    resume = await svc.get_by_id(resume_id, current_user.id)
    resume = await svc.analyze(resume)
    return ResumeDetailResponse.model_validate(resume)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> None:
    await ResumeService(session, file_storage, ai_client).delete(resume_id, current_user.id)
