from bson import ObjectId as BsonObjectId
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from pydantic import GetJsonSchemaHandler, BaseModel, Field
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


# Custom ObjectId wrapper that bridges MongoDB's BSON ObjectId with Pydantic v2 validation and serialization.
class PyObjectId(BsonObjectId):
    """
    Custom ObjectId type for Pydantic v2
    Compatible with MongoDB ObjectId
    """

    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: Any,
    ) -> core_schema.CoreSchema:
        """
        Defines the Pydantic v2 core schema for ObjectId validation and serialization.
        Args:
            - _source_type (Any): The source type being validated.
            - _handler (Any): The schema handler.
        Returns:
            - core_schema.CoreSchema: Union schema supporting ObjectId instance checking and string conversion.
        """
        return core_schema.union_schema(
            [
                # Check if it's an instance of ObjectId first
                core_schema.is_instance_schema(BsonObjectId),
                # If not, validate as a string and convert to ObjectId
                core_schema.no_info_plain_validator_function(cls.validate),
            ],
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v: Any) -> BsonObjectId:
        """
        Validates and converts input to a BSON ObjectId.
        Args:
            - v (Any): The value to validate (string or ObjectId instance).
        Returns:
            - BsonObjectId: The validated ObjectId instance.
        """
        # Direct pass-through for existing ObjectId instances
        if isinstance(v, BsonObjectId):
            return v

        # Validate and convert string representations
        if isinstance(v, str):
            if BsonObjectId.is_valid(v):
                return BsonObjectId(v)
            raise ValueError(f"Invalid ObjectId: {v}")

        raise ValueError(
            f"ObjectId must be a string or ObjectId instance, not {type(v)}"
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        """
        Generates the JSON schema representation for API documentation.
        Args:
            - _core_schema (core_schema.CoreSchema): The core schema object.
            - handler (GetJsonSchemaHandler): The JSON schema handler.
        Returns:
            - JsonSchemaValue: JSON schema definition with type, pattern, and examples.
        """
        return {
            "type": "string",
            "pattern": "^[a-f0-9]{24}$",
            "examples": ["507f1f77bcf86cd799439011"],
        }


class SessionCreate(BaseModel):
    user_id: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class EditChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatSessionDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    name: str = "New Conversation"
    name_updated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {BsonObjectId: str},
    }


class ChatMessageDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    session_id: str
    role: str
    content: str
    thoughts: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    parent_id: Optional[str] = None  # Link to parent user message for paired generations
    status: str = "completed"  # generating, completed, error
    edited: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {BsonObjectId: str},
    }


class RetryChatRequest(BaseModel):
    context: Optional[Dict[str, Any]] = None
