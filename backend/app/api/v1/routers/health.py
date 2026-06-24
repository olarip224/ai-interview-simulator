import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.redis import get_redis
from app.database.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    await redis.ping()
    return {"status": "ok", "db": "ok", "redis": "ok"}
