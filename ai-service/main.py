from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic_settings import BaseSettings, SettingsConfigDict
from contextlib import asynccontextmanager
from bson import ObjectId
from bson.errors import InvalidId
import motor.motor_asyncio
import json
import uvicorn

from models import SessionCreate, StreamRequest, ChatSessionDB, ChatMessageDB
from agent import get_agent


# --- Configuration ---
class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = "dummy_key"
    MONGO_URI: str = "mongodb://localhost:27017"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

# --- Globals ---
db_client = None
db = None
agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db, agent
    # Startup
    db_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    db = db_client["chaintrust_ai"]
    agent = get_agent(settings.OPENROUTER_API_KEY)
    yield
    # Shutdown
    db_client.close()


app = FastAPI(title="ChainTrust AI Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Endpoints ---
@app.post("/api/chat/session")
async def create_session(req: SessionCreate):
    new_session = ChatSessionDB(user_id=req.user_id)
    result = await db.chat_sessions.insert_one(
        new_session.model_dump(by_alias=True, exclude_none=True)
    )
    return {"session_id": str(result.inserted_id)}


@app.post("/api/chat/stream")
async def stream_chat(req: StreamRequest):
    try:
        session = await db.chat_sessions.find_one({"_id": ObjectId(req.session_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = []

    # 1. Inject Persona and Dynamic Context safely
    context_parts = [
        "You are an AI Medical Assistant for the ChainTrust platform. Help users understand their scanned medications."
    ]

    if req.current_page:
        context_parts.append(f"User is currently on the '{req.current_page}' page.")
    if req.product_context:
        context_parts.append(
            f"User is looking at the following product: {json.dumps(req.product_context)}."
        )

    messages.append(("system", " ".join(context_parts)))
    # 2. Add History
    async for msg in db.chat_messages.find({"session_id": req.session_id}).sort(
        "_id", 1
    ):
        messages.append((msg["role"], msg["content"]))

    # 3. Add latest message and save to DB
    messages.append(("user", req.message))
    user_msg_db = ChatMessageDB(
        session_id=req.session_id, role="user", content=req.message
    )
    await db.chat_messages.insert_one(
        user_msg_db.model_dump(by_alias=True, exclude_none=True)
    )

    # 4. Stream Generator
    async def event_generator():
        full_ai_response = ""
        try:
            async for event in agent.astream_events(
                {"messages": messages}, version="v2"
            ):
                event_type = event["event"]

                if event_type == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if isinstance(chunk.content, str) and chunk.content:
                        full_ai_response += chunk.content
                        yield f"event: message\ndata: {json.dumps({'content': chunk.content})}\n\n"

                elif event_type == "on_tool_start":
                    yield f"event: tool_start\ndata: {json.dumps({'tool': event['name'], 'inputs': event['data'].get('input', {})})}\n\n"

                elif event_type == "on_tool_end":
                    yield f"event: tool_end\ndata: {json.dumps({'tool': event['name'], 'status': 'completed'})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

        finally:
            if full_ai_response:
                assistant_msg_db = ChatMessageDB(
                    session_id=req.session_id,
                    role="assistant",
                    content=full_ai_response,
                )
                await db.chat_messages.insert_one(
                    assistant_msg_db.model_dump(by_alias=True, exclude_none=True)
                )
            yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
