from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from bson.errors import InvalidId
from utils.json_helpers import serialize_datetime


class ChatStore:
    """Handles database operations and chat mutations for conversational sessions."""

    def __init__(self, db):
        """Initializes the ChatStore with a database connection."""
        self.db = db

    def _serialize_doc(self, doc: dict) -> dict:
        """Helper to serialize MongoDB documents for JSON serialization."""
        if not doc:
            return None
        doc["id"] = str(doc["_id"])
        del doc["_id"]

        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = serialize_datetime(value)
            elif isinstance(value, list):
                # Handle nested lists (e.g., thoughts)
                for item in value:
                    if isinstance(item, dict):
                        for k, v in item.items():
                            if isinstance(v, datetime):
                                item[k] = serialize_datetime(v)
        return doc

    async def create_session(self, user_id: str) -> str:
        """Creates a new chat session."""
        session = {
            "user_id": user_id,
            "name": "New Conversation",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await self.db.chat_sessions.insert_one(session)
        return str(result.inserted_id)

    async def list_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Lists all chat sessions for a user, ordered by most recent activity."""
        cursor = self.db.chat_sessions.find({"user_id": user_id}).sort(
            "updated_at", -1
        )
        sessions = await cursor.to_list(length=100)
        return [self._serialize_doc(s) for s in sessions]

    async def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Updates session metadata (e.g. name)."""
        updates["updated_at"] = datetime.now(timezone.utc)
        try:
            result = await self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except InvalidId:
            return False

    async def delete_session(self, session_id: str) -> bool:
        """Deletes a session and all its messages."""
        try:
            # Delete messages first
            await self.db.chat_messages.delete_many({"session_id": session_id})
            # Delete session
            result = await self.db.chat_sessions.delete_one({"_id": ObjectId(session_id)})
            return result.deleted_count > 0
        except InvalidId:
            return False

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a chat session by ID."""
        try:
            doc = await self.db.chat_sessions.find_one({"_id": ObjectId(session_id)})
            return self._serialize_doc(doc)
        except InvalidId:
            return None

    async def list_messages(
        self, session_id: str, sort_order: int = 1
    ) -> List[Dict[str, Any]]:
        """Retrieves all messages for a session, ordered chronologically."""
        cursor = self.db.chat_messages.find({"session_id": session_id}).sort(
            "created_at", sort_order
        )
        messages = await cursor.to_list(length=None)
        return [self._serialize_doc(msg) for msg in messages]

    async def update_message(self, message_id: str, updates: Dict[str, Any]) -> bool:
        """Updates metadata/content on an existing message."""
        updates["updated_at"] = datetime.now(timezone.utc)
        try:
            result = await self.db.chat_messages.update_one(
                {"_id": ObjectId(message_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except InvalidId:
            return False

    async def prepare_chat_messages(
        self, session_id: str, message: str
    ) -> Dict[str, Any]:
        """Sets up the user message and a placeholder assistant message prior to generation."""
        now = datetime.now(timezone.utc)

        # 1. Insert User Message
        user_msg = {
            "session_id": session_id,
            "role": "user",
            "content": message,
            "status": "completed",
            "edited": False,
            "thoughts": [],
            "created_at": now,
            "updated_at": now,
        }
        res_user = await self.db.chat_messages.insert_one(user_msg)
        user_msg["_id"] = res_user.inserted_id

        # 2. Insert Assistant Placeholder Message
        assist_msg = {
            "session_id": session_id,
            "role": "assistant",
            "content": "",
            "status": "generating",
            "edited": False,
            "thoughts": [],
            "created_at": now,
            "updated_at": now,
        }
        res_assist = await self.db.chat_messages.insert_one(assist_msg)
        assist_msg["_id"] = res_assist.inserted_id

        # Update Session Timestamp and potentially Name (Auto-Naming)
        session = await self.db.chat_sessions.find_one({"_id": ObjectId(session_id)})
        session_name = session.get("name", "New Conversation")
        
        # If it's the first message and still has default name, rename it
        if session_name == "New Conversation":
            # Simple heuristic: first 40 chars of message
            new_name = message[:40] + ("..." if len(message) > 40 else "")
            await self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)}, 
                {"$set": {"updated_at": now, "name": new_name}}
            )
        else:
            await self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)}, {"$set": {"updated_at": now}}
            )

        return {
            "user_message": self._serialize_doc(user_msg),
            "assistant_message": self._serialize_doc(assist_msg),
        }

    async def delete_message(self, message_id: str) -> bool:
        """Deletes a message and ALL chronologically subsequent messages in the session."""
        try:
            message = await self.db.chat_messages.find_one(
                {"_id": ObjectId(message_id)}
            )
            if not message:
                return False

            session_id = message["session_id"]
            created_at = message["created_at"]

            # Delete this message and all messages created after it
            result = await self.db.chat_messages.delete_many(
                {"session_id": session_id, "created_at": {"$gte": created_at}}
            )

            # Update session timestamp
            await self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"updated_at": datetime.now(timezone.utc)}},
            )

            return result.deleted_count > 0
        except InvalidId:
            return False

    async def edit_user_message(
        self, message_id: str, new_content: str
    ) -> Optional[Dict[str, Any]]:
        """Edits a user message, prunes downstream messages, and resets the assistant response."""
        try:
            message = await self.db.chat_messages.find_one(
                {"_id": ObjectId(message_id)}
            )
            if not message or message.get("role") != "user":
                return None

            session_id = message["session_id"]
            created_at = message["created_at"]

            # Update the specific user message
            await self.db.chat_messages.update_one(
                {"_id": ObjectId(message_id)},
                {
                    "$set": {
                        "content": new_content,
                        "updated_at": datetime.now(timezone.utc),
                        "edited": True,
                    }
                },
            )

            # Find the immediate assistant response created after this user message
            assistant_msg = await self.db.chat_messages.find_one(
                {
                    "session_id": session_id,
                    "created_at": {"$gt": created_at},
                    "role": "assistant",
                },
                sort=[("created_at", 1)],
            )

            if assistant_msg:
                assistant_created_at = assistant_msg["created_at"]

                # Delete any messages after the target assistant response
                await self.db.chat_messages.delete_many(
                    {
                        "session_id": session_id,
                        "created_at": {"$gt": assistant_created_at},
                    }
                )

                # Reset the assistant message to a generating state
                updates = {
                    "content": "",
                    "status": "generating",
                    "thoughts": [],
                    "updated_at": datetime.now(timezone.utc),
                }
                await self.db.chat_messages.update_one(
                    {"_id": assistant_msg["_id"]},
                    {"$set": updates},
                )
                assistant_msg.update(updates)

            else:
                # If no assistant response existed, create a new one to start generating
                assist_msg_doc = {
                    "session_id": session_id,
                    "role": "assistant",
                    "content": "",
                    "status": "generating",
                    "edited": False,
                    "thoughts": [],
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
                res_assist = await self.db.chat_messages.insert_one(assist_msg_doc)
                assist_msg_doc["_id"] = res_assist.inserted_id
                assistant_msg = assist_msg_doc

            # Update session timestamp
            await self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"updated_at": datetime.now(timezone.utc)}},
            )

            return self._serialize_doc(assistant_msg)
        except InvalidId:
            return None

    async def retry_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Handles retrying a message by clearing downstream content and creating a new assistant placeholder."""
        try:
            message = await self.db.chat_messages.find_one({"_id": ObjectId(message_id)})
            if not message:
                return None

            session_id = message["session_id"]
            created_at = message["created_at"]

            if message["role"] == "user":
                # If retrying a user message, delete all subsequent messages
                await self.db.chat_messages.delete_many(
                    {"session_id": session_id, "created_at": {"$gt": created_at}}
                )
            else:
                # If retrying an assistant message, delete it and all subsequent messages
                await self.db.chat_messages.delete_many(
                    {"session_id": session_id, "created_at": {"$gte": created_at}}
                )

            # Create a fresh assistant placeholder
            now = datetime.now(timezone.utc)
            assist_msg_doc = {
                "session_id": session_id,
                "role": "assistant",
                "content": "",
                "status": "generating",
                "edited": False,
                "thoughts": [],
                "created_at": now,
                "updated_at": now,
            }
            res_assist = await self.db.chat_messages.insert_one(assist_msg_doc)
            assist_msg_doc["_id"] = res_assist.inserted_id

            # Update session timestamp
            await self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"updated_at": now}},
            )

            return self._serialize_doc(assist_msg_doc)
        except InvalidId:
            return None
