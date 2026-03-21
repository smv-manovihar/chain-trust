import json
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import motor.motor_asyncio
import uvicorn
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from models import SessionCreate, ChatRequest, EditChatRequest
from agent import get_chain_trust_agent
from sse import sse_manager
from config import get_settings
from store import ChatStore

settings = get_settings()

# --- Globals ---
db_client = None
db = None
agent = None
chat_store = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db, agent, chat_store
    db_client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
    db = db_client["ChainTrust"]
    agent = get_chain_trust_agent()
    chat_store = ChatStore(db)  # Initialize Store
    yield
    await sse_manager.shutdown()
    db_client.close()


app = FastAPI(title="ChainTrust AI Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatService:
    @staticmethod
    async def process_chat(
        session_id: str,
        req_context: dict,  # Passed as dict for easier extraction across different request models
        assistant_message_id: str,
    ):
        sse_manager.clear_buffer(session_id)
        await sse_manager.broadcast(
            session_id, "chat_start", {"message_id": assistant_message_id}
        )
        sse_manager.mark_active(session_id)

        try:
            messages = []
            context_parts = [
                "You are an AI Medical Assistant for the ChainTrust platform. Help users understand their scanned medications."
            ]
            if req_context.get("current_page"):
                context_parts.append(
                    f"User is currently on the '{req_context['current_page']}' page."
                )
            if req_context.get("product_context"):
                context_parts.append(
                    f"User is looking at the following product: {json.dumps(req_context['product_context'])}."
                )

            messages.append(SystemMessage(content=" ".join(context_parts)))

            # Fetch history exclusively via the Store
            history = await chat_store.list_messages(session_id, sort_order=1)
            for msg in history:
                if msg["id"] == assistant_message_id:
                    continue  # Skip the placeholder being generated
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant" and msg.get("content"):
                    messages.append(AIMessage(content=msg["content"]))

            # Note: Current user message is already stored in history, so we don't manually append it here.

            def handle_token(state, data):
                state["content"] += data.get("content", "")

            def handle_tool_start(state, data):
                pass

            def handle_tool_end(state, data):
                state["thoughts"].append(data)

            sse_manager.register_accumulator(
                identifier=session_id,
                initial_state={
                    "content": "",
                    "thoughts": [],
                    "message_id": assistant_message_id,
                    "status": "generating",
                },
                event_handlers={
                    "token": handle_token,
                    "tool_start": handle_tool_start,
                    "tool_end": handle_tool_end,
                },
            )

            full_response = ""
            thoughts_buffer = []
            tool_event_buffers: Dict[str, Dict[str, Any]] = {}

            async for event in agent.astream_events(
                {"messages": messages}, version="v2"
            ):
                event_type = event["event"]
                run_id = event.get("run_id")

                if event_type == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if isinstance(chunk.content, str) and chunk.content:
                        full_response += chunk.content
                        await sse_manager.broadcast(
                            session_id,
                            "token",
                            {
                                "content": chunk.content,
                                "message_id": assistant_message_id,
                            },
                            save_to_buffer=True,
                        )

                elif event_type == "on_tool_start":
                    if event["name"] == "_Exception":
                        continue

                    tool_name = event["name"]
                    tool_input = event["data"].get("input", {})

                    tool_event_buffers[run_id] = {
                        "start_time": datetime.now(timezone.utc),
                        "tool": tool_name,
                        "input": tool_input,
                    }

                    await sse_manager.broadcast(
                        session_id,
                        "tool_start",
                        {
                            "tool": tool_name,
                            "input": tool_input,
                            "status": "running",
                            "tool_call_id": run_id,
                            "message_id": assistant_message_id,
                        },
                    )

                elif event_type == "on_tool_end":
                    if event["name"] == "_Exception":
                        continue

                    tool_name = event["name"]
                    tool_output = event["data"].get("output")

                    end_time = datetime.now(timezone.utc)
                    execution_time_ms = 0
                    if run_id in tool_event_buffers:
                        start_time = tool_event_buffers[run_id]["start_time"]
                        execution_time_ms = int(
                            (end_time - start_time).total_seconds() * 1000
                        )
                        del tool_event_buffers[run_id]

                    thought_payload = {
                        "tool": tool_name,
                        "result": tool_output,
                        "status": "completed",
                        "execution_time_ms": execution_time_ms,
                        "tool_call_id": run_id,
                    }
                    thoughts_buffer.append(thought_payload)
                    await sse_manager.broadcast(
                        session_id,
                        "tool_end",
                        {**thought_payload, "message_id": assistant_message_id},
                    )

            # Save Output to DB using Store
            await chat_store.update_message(
                assistant_message_id,
                {
                    "content": full_response,
                    "thoughts": thoughts_buffer,
                    "status": "completed",
                },
            )
            await sse_manager.broadcast(
                session_id, "chat_done", {"message_id": assistant_message_id}
            )

        except Exception as e:
            await sse_manager.broadcast(session_id, "error", {"message": str(e)})
            await chat_store.update_message(
                assistant_message_id,
                {"status": "error", "content": "Error generating response."},
            )
        finally:
            sse_manager.clear_accumulator(session_id)
            sse_manager.mark_inactive(session_id)


# --- Endpoints ---


@app.post("/api/chat/session")
async def create_session(req: SessionCreate):
    session_id = await chat_store.create_session(req.user_id)
    return {"session_id": session_id}


@app.get("/api/chat/{session_id}/stream")
async def subscribe_stream(session_id: str):
    """
    SSE endpoint for real-time updates with auto-resume capability.
    """
    session = await chat_store.get_session(session_id)
    if not session:
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


@app.post("/api/chat/{session_id}/chat")
async def send_chat_message(
    session_id: str, req: ChatRequest, background_tasks: BackgroundTasks
):
    session = await chat_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if sse_manager.is_active(session_id):
        raise HTTPException(
            status_code=429, detail="A message is already generating for this session."
        )

    # Store creates the User Message and the Assistant Placeholder automatically
    result = await chat_store.prepare_chat_messages(session_id, req.message)
    assistant_message_id = result["assistant_message"]["id"]

    background_tasks.add_task(
        ChatService.process_chat, session_id, req.model_dump(), assistant_message_id
    )

    return {"status": "processing", "message_id": assistant_message_id}


@app.put("/api/chat/{session_id}/messages/{message_id}")
async def edit_chat_message(
    session_id: str,
    message_id: str,
    req: EditChatRequest,
    background_tasks: BackgroundTasks,
):
    """Edits a user message, prunes the downstream branch, and regenerates the response."""
    session = await chat_store.get_session(session_id)
    if not session:
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
        ChatService.process_chat, session_id, req.model_dump(), assist_msg["id"]
    )

    return {"status": "processing", "message_id": assist_msg["id"]}


@app.delete("/api/chat/{session_id}/messages/{message_id}")
async def delete_chat_message(session_id: str, message_id: str):
    """Deletes a message and all subsequent messages in the conversation."""
    session = await chat_store.get_session(session_id)
    if not session:
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

    # Clear SSE history buffer just in case active clients hold old data
    sse_manager.clear_buffer(session_id)
    await sse_manager.broadcast(
        session_id, "messages_deleted", {"deleted_from_message_id": message_id}
    )

    return {"status": "deleted"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
