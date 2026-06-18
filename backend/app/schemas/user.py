import uuid
from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    username: str
    is_active: bool
    is_verified: bool
    created_at: datetime
