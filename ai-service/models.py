from pydantic import BaseModel, Field, ConfigDict
from pydantic.functional_validators import BeforeValidator
from typing import Dict, Optional, Any
from typing_extensions import Annotated
from datetime import datetime

# Safely handle MongoDB ObjectIds in Pydantic v2
PyObjectId = Annotated[str, BeforeValidator(str)]

# --- API Schemas ---
class SessionCreate(BaseModel):
    user_id: str

class StreamRequest(BaseModel):
    session_id: str
    message: str
    current_page: Optional[str] = None
    product_context: Optional[Dict[str, Any]] = None

# --- Database Models ---
class MongoBaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class ChatSessionDB(MongoBaseModel):
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageDB(MongoBaseModel):
    session_id: str
    role: str 
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)