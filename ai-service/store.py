from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson.errors import InvalidId
from utils.json_helpers import serialize_datetime
from models import PyObjectId
from database import get_db
from tool_store import tool_store


class ChatStore:
    """Handles database operations and chat mutations for conversational sessions."""

    def __init__(self):
        """Initializes the ChatStore using the shared database instance."""
        self.db = get_db()

    def _serialize_doc(self, doc: dict) -> dict:
        """Helper to serialize MongoDB documents for JSON serialization."""
        if not doc:
            return None

        # Avoid modifying original doc if it has _id
        res = doc.copy()
        if "_id" in res:
            res["id"] = str(res["_id"])
            del res["_id"]

        for key, value in res.items():
            if isinstance(value, datetime):
                res[key] = serialize_datetime(value)
            elif isinstance(value, PyObjectId):
                res[key] = str(value)
            elif isinstance(value, list):
                # Handle nested lists
                res[key] = [
                    self._serialize_doc(item) if isinstance(item, dict) else item
                    for item in value
                ]
        return res

    def _create_assistant_placeholder_doc(
        self, session_id: str, parent_id: str, now: datetime
    ) -> Dict[str, Any]:
        """Creates a common assistant placeholder document structure."""
        return {
            "session_id": session_id,
            "role": "assistant",
            "parent_id": parent_id,
            "content": "",
            "status": "generating",
            "edited": False,
            "thoughts": [],
            "created_at": now,
            "updated_at": now,
        }

    async def create_session(self, user_id: str) -> str:
        """Creates a new chat session."""
        session = {
            "user_id": user_id,
            "name": "New Conversation",
            "name_updated": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await self.db.chat_sessions.insert_one(session)
        return str(result.inserted_id)

    async def create_session_with_messages(
        self, user_id: str, message: str
    ) -> Dict[str, Any]:
        """Atomic creation of a session and its first chat messages."""
        session_id = await self.create_session(user_id)
        # Use existing prepare_chat_messages logic
        result = await self.prepare_chat_messages(session_id, message)
        return {
            "session_id": session_id,
            "user_message": result["user_message"],
            "assistant_message": result["assistant_message"],
        }

    async def list_sessions(
        self, user_id: str, search: str = None, limit: int = 20, skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Lists chat sessions for a user with pagination, ordered by activity."""
        query = {"user_id": user_id}
        if search:
            query["name"] = {"$regex": search, "$options": "i"}

        cursor = (
            self.db.chat_sessions.find(query)
            .sort("updated_at", -1)
            .skip(skip)
            .limit(limit)
        )
        sessions = await cursor.to_list(length=limit)
        return [self._serialize_doc(s) for s in sessions]

    async def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Updates session metadata (e.g. name)."""
        updates["updated_at"] = datetime.now(timezone.utc)
        try:
            result = await self.db.chat_sessions.update_one(
                {"_id": PyObjectId(session_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except InvalidId:
            return False

    async def rename_session(self, session_id: str, name: str) -> bool:
        """Updates session name and marks it as manually updated."""
        return await self.update_session(
            session_id, {"name": name, "name_updated": True}
        )

    async def delete_session(self, session_id: str) -> bool:
        """Deletes a session and all its messages."""
        try:
            # Delete messages first
            await self.db.chat_messages.delete_many({"session_id": session_id})
            # Delete session
            result = await self.db.chat_sessions.delete_one(
                {"_id": PyObjectId(session_id)}
            )
            return result.deleted_count > 0
        except InvalidId:
            return False

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a chat session by ID."""
        try:
            doc = await self.db.chat_sessions.find_one({"_id": PyObjectId(session_id)})
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
                {"_id": PyObjectId(message_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except InvalidId:
            return False

    async def prepare_chat_messages(
        self, session_id: str, message: str
    ) -> Dict[str, Any]:
        """Sets up the user message and a placeholder assistant message linked via parent_id."""
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
        user_id = res_user.inserted_id

        # 2. Create and Insert Assistant Placeholder Linked to user_id
        assist_msg = self._create_assistant_placeholder_doc(
            session_id, str(user_id), now
        )
        res_assist = await self.db.chat_messages.insert_one(assist_msg)

        assist_msg["_id"] = res_assist.inserted_id
        user_msg["_id"] = user_id

        # Update Session Timestamp
        await self.db.chat_sessions.update_one(
            {"_id": PyObjectId(session_id)}, {"$set": {"updated_at": now}}
        )

        return {
            "user_message": self._serialize_doc(user_msg),
            "assistant_message": self._serialize_doc(assist_msg),
        }

    async def delete_message(self, message_id: str) -> bool:
        """Deletes a message and ALL chronologically subsequent messages in the session."""
        try:
            message = await self.db.chat_messages.find_one(
                {"_id": PyObjectId(message_id)}
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
                {"_id": PyObjectId(session_id)},
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
                {"_id": PyObjectId(message_id)}
            )
            if not message or message.get("role") != "user":
                return None

            session_id = message["session_id"]
            now = datetime.now(timezone.utc)

            # 1. Update the specific user message
            await self.db.chat_messages.update_one(
                {"_id": PyObjectId(message_id)},
                {
                    "$set": {
                        "content": new_content,
                        "updated_at": now,
                        "edited": True,
                    }
                },
            )

            # 2. Find the linked assistant response using parent_id
            target_assistant = await self.db.chat_messages.find_one(
                {
                    "session_id": session_id,
                    "parent_id": str(message_id),
                    "role": "assistant",
                }
            )

            # 3. Prune everything created after the target (exclusive if assistant, inclusive if orphaned)
            prune_base_time = (
                target_assistant["created_at"]
                if target_assistant
                else message["created_at"]
            )
            await self.db.chat_messages.delete_many(
                {
                    "session_id": session_id,
                    "created_at": {"$gt": prune_base_time},
                }
            )

            if target_assistant:
                # Reset existing assistant message to fresh generating state
                updates = {
                    "content": "",
                    "status": "generating",
                    "thoughts": [],
                    "updated_at": now,
                }
                await self.db.chat_messages.update_one(
                    {"_id": target_assistant["_id"]}, {"$set": updates}
                )
                target_assistant.update(updates)
            else:
                # Create a fresh assistant placeholder if none was found to reuse
                target_assistant = self._create_assistant_placeholder_doc(
                    session_id, str(message_id), now
                )
                res = await self.db.chat_messages.insert_one(target_assistant)
                target_assistant["_id"] = res.inserted_id

            # 4. Update session timestamp
            await self.db.chat_sessions.update_one(
                {"_id": PyObjectId(session_id)},
                {"$set": {"updated_at": now}},
            )

            return self._serialize_doc(target_assistant)
        except InvalidId:
            return None

    async def retry_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Handles retrying a message by clearing downstream content and reusing or creating an assistant placeholder."""
        try:
            message = await self.db.chat_messages.find_one(
                {"_id": PyObjectId(message_id)}
            )
            if not message:
                return None

            session_id = message["session_id"]
            created_at = message["created_at"]
            target_assistant = None

            if message["role"] == "user":
                # Find the linked assistant response using parent_id
                target_assistant = await self.db.chat_messages.find_one(
                    {
                        "session_id": session_id,
                        "parent_id": str(message_id),
                        "role": "assistant",
                    }
                )
            else:
                # Retrying an assistant message directly
                target_assistant = message

            # Prune everything created after the target (exclusive)
            prune_base_time = (
                target_assistant["created_at"] if target_assistant else created_at
            )
            await self.db.chat_messages.delete_many(
                {
                    "session_id": session_id,
                    "created_at": {"$gt": prune_base_time},
                }
            )

            now = datetime.now(timezone.utc)
            if target_assistant:
                # Reset existing assistant message to fresh generating state
                updates = {
                    "content": "",
                    "status": "generating",
                    "thoughts": [],
                    "updated_at": now,
                }
                await self.db.chat_messages.update_one(
                    {"_id": target_assistant["_id"]}, {"$set": updates}
                )
                target_assistant.update(updates)
            else:
                # Create a fresh assistant placeholder linked to the user message
                # Use message["parent_id"] if it exists to keep the link, or str(message["_id"]) if it is user
                parent_id = message.get("parent_id") or str(message["_id"])
                target_assistant = self._create_assistant_placeholder_doc(
                    session_id, parent_id, now
                )
                res = await self.db.chat_messages.insert_one(target_assistant)
                target_assistant["_id"] = res.inserted_id

            # Update session timestamp
            await self.db.chat_sessions.update_one(
                {"_id": PyObjectId(session_id)},
                {"$set": {"updated_at": now}},
            )

            return self._serialize_doc(target_assistant)
        except InvalidId:
            return None

    # --- View Data & Dashboard Aggregators ---

    async def get_view_data(
        self, route: str, user_id: str, role: str, params: dict = None
    ) -> str:
        """Centralized aggregator for view-specific data digests, delegating to tool_store."""
        return await tool_store.get_view_data(route, user_id, role, params)


chat_store = ChatStore()
