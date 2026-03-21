import json
from contextlib import asynccontextmanager

import jwt
import motor.motor_asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import ChatRequest, EditChatRequest
from sse import sse_manager
from config import get_settings
from store import ChatStore
from service import ChatService

settings = get_settings()

# --- Globals ---
db_client = None
db = None
chat_store = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db, chat_store
    db_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    db = db_client["ChainTrust"]
    chat_store = ChatStore(db)  # Initialize Store
    yield
    await sse_manager.shutdown()
    db_client.close()


security = HTTPBearer()


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("id") is None:
            raise HTTPException(
                status_code=401, detail="Invalid token: user_id missing"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


app = FastAPI(title="ChainTrust AI Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


@app.post("/api/chat/session")
async def create_session(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("id")
    session_id = await chat_store.create_session(user_id)
    return {"session_id": session_id}


@app.get("/api/chat/sessions")
async def list_sessions(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("id")
    sessions = await chat_store.list_sessions(user_id)
    return sessions


@app.put("/api/chat/sessions/{session_id}")
async def rename_session(
    session_id: str, name: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("id")
    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    success = await chat_store.update_session(session_id, {"name": name})
    return {"success": success}


@app.delete("/api/chat/sessions/{session_id}")
async def delete_session(
    session_id: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("id")
    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    success = await chat_store.delete_session(session_id)
    return {"success": success}


@app.get("/api/chat/{session_id}/messages")
async def list_messages(
    session_id: str, payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("id")
    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await chat_store.list_messages(session_id)
    return messages


@app.get("/api/chat/{session_id}/stream")
async def subscribe_stream(
    session_id: str, payload: dict = Depends(get_current_user_payload)
):
    """
    SSE endpoint for real-time updates with auto-resume capability.
    """
    user_id = payload.get("id")
    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if session is already active in SSE manager
    if not sse_manager.is_active(session_id):
        # Auto-Resume Logic: Check if the latest message is still generating
        messages = await chat_store.list_messages(
            session_id, sort_order=-1
        )  # Fetch descending
        latest_msg = messages[0] if messages else None

        if latest_msg and latest_msg.get("status") == "generating":
            sse_manager.mark_active(session_id)
        else:
            # If not generating and not active, assume done
            return StreamingResponse(
                iter([f"data: {json.dumps({'event': 'done', 'data': {}})}\n\n"]),
                media_type="text/event-stream",
            )

    # Configure SSE headers to prevent proxy buffering (like Nginx)
    headers = {
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Type": "text/event-stream",
        "Content-Encoding": "none",
    }

    return StreamingResponse(
        sse_manager.subscribe(session_id),
        media_type="text/event-stream",
        headers=headers,
    )


async def run_chat_service(
    session_id: str, req_data: dict, assistant_message_id: str, user_id: str, role: str
):
    """Bridge to instantiate ChatService and run process_chat in background."""
    current_context = req_data.get("current_context")
    service = ChatService(
        user_id=user_id,
        chat_store=chat_store,
        role=role,
        current_context=current_context,
    )
    await service.process_chat(session_id, req_data, assistant_message_id)


@app.post("/api/chat/{session_id}/chat")
async def send_chat_message(
    session_id: str,
    req: ChatRequest,
    background_tasks: BackgroundTasks,
    payload: dict = Depends(get_current_user_payload),
):
    user_id = payload.get("id")
    role = payload.get("role", "customer")

    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    if sse_manager.is_active(session_id):
        raise HTTPException(
            status_code=429, detail="A message is already generating for this session."
        )

    # Store creates the User Message and the Assistant Placeholder automatically
    result = await chat_store.prepare_chat_messages(session_id, req.message)
    assistant_message_id = result["assistant_message"]["id"]

    background_tasks.add_task(
        run_chat_service,
        session_id,
        req.model_dump(),
        assistant_message_id,
        user_id,
        role,
    )

    return {"status": "processing", "message_id": assistant_message_id}


@app.put("/api/chat/{session_id}/messages/{message_id}")
async def edit_chat_message(
    session_id: str,
    message_id: str,
    req: EditChatRequest,
    background_tasks: BackgroundTasks,
    payload: dict = Depends(get_current_user_payload),
):
    """Edits a user message, prunes the downstream branch, and regenerates the response."""
    user_id = payload.get("id")
    role = payload.get("role", "customer")

    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    if sse_manager.is_active(session_id):
        raise HTTPException(
            status_code=429, detail="Wait for generation to finish before editing."
        )

    # Edit updates the user message, deletes orphans, and prepares the assistant reply state
    assist_msg = await chat_store.edit_user_message(message_id, req.message)

    if not assist_msg:
        raise HTTPException(
            status_code=400,
            detail="Could not edit message (ensure it is a valid user message ID).",
        )

    background_tasks.add_task(
        run_chat_service, session_id, req.model_dump(), assist_msg["id"], user_id, role
    )

    return {"status": "processing", "message_id": assist_msg["id"]}


@app.delete("/api/chat/{session_id}/messages/{message_id}")
async def delete_chat_message(
    session_id: str, message_id: str, payload: dict = Depends(get_current_user_payload)
):
    """Deletes a message and all subsequent messages in the conversation."""
    user_id = payload.get("id")
    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    if sse_manager.is_active(session_id):
        raise HTTPException(
            status_code=429, detail="Wait for generation to finish before deleting."
        )

    success = await chat_store.delete_message(message_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Message not found or failed to delete."
        )

    return {"status": "deleted"}


@app.post("/api/chat/{session_id}/retry/{message_id}")
async def retry_chat_message(
    session_id: str,
    message_id: str,
    background_tasks: BackgroundTasks,
    payload: dict = Depends(get_current_user_payload),
):
    """Retries a message generation by pruning from the target message and starting fresh."""
    user_id = payload.get("id")
    role = payload.get("role", "customer")

    session = await chat_store.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    if sse_manager.is_active(session_id):
        raise HTTPException(
            status_code=429, detail="Wait for generation to finish before retrying."
        )

    assist_msg = await chat_store.retry_message(message_id)

    if not assist_msg:
        raise HTTPException(
            status_code=404, detail="Message not found or failed to retry."
        )

    background_tasks.add_task(
        run_chat_service, session_id, {}, assist_msg["id"], user_id, role
    )

    return {"status": "processing", "message_id": assist_msg["id"]}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
