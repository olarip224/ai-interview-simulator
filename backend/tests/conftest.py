import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.ai.dependencies import get_ai_client, get_file_storage
from app.config import settings
from app.database.session import get_db
from app.main import create_app
from app.models.base import Base

# Derive test DB URL by appending _test to the DB name
_db_name = settings.DATABASE_URL.rstrip("/").rsplit("/", 1)[-1]
TEST_DATABASE_URL = settings.DATABASE_URL.rsplit("/", 1)[0] + f"/{_db_name}_test"


@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    e = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with e.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield e
    async with e.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await e.dispose()


@pytest_asyncio.fixture
async def db_session(engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


@pytest_asyncio.fixture
async def client(engine):
    app = create_app()
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    # Set up file storage mock
    mock_storage = MagicMock()
    mock_storage.save = AsyncMock(return_value="test.pdf")
    mock_storage.get_file_path = MagicMock(return_value=Path("/tmp/test.pdf"))
    mock_storage.delete = AsyncMock()

    # Set up AI client mock
    mock_ai = MagicMock()
    mock_ai.complete = AsyncMock(
        return_value='{"question_text":"Tell me about yourself","question_type":"behavioral","difficulty_level":3,"skills":["Python"],"experience":[],"education":[],"summary":"Test.","overall_score":8.0,"feedback_text":"Good answer","strengths":["Clear"],"weaknesses":["Detail"],"suggestions":["Elaborate"]}'
    )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_file_storage] = lambda: mock_storage
    app.dependency_overrides[get_ai_client] = lambda: mock_ai

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c

    app.dependency_overrides.pop(get_file_storage, None)
    app.dependency_overrides.pop(get_ai_client, None)

    async with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())
