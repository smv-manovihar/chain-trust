import json
from datetime import datetime, timezone
from typing import Dict, Any

from sse import sse_manager
from agent import get_chain_trust_agent
from tools import Tools
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class ChatService:
    def __init__(self, user_id: str, chat_store: Any, role: str = "customer", current_context: dict = None):
        self.user_id = user_id
        self.role = role
        self.chat_store = chat_store
        ctx = current_context or {}
        self.current_route = ctx.get("route", "/")
        self.query_params = ctx.get("params", {})

        # Use the unified Tools class for context-aware tool management
        self.tools_instance = Tools(
            user_id=self.user_id,
            role=self.role,
            current_route=self.current_route,
            query_params=self.query_params
        )
        self.agent = get_chain_trust_agent(role=role, tools=self.tools_instance.get_tools())


    async def process_chat(
        self,
        session_id: str,
        req_context: dict,
        assistant_message_id: str,
    ):
        sse_manager.clear_buffer(session_id)
        sse_manager.mark_active(session_id)

        try:
            messages = []
            
            # --- Robust Context Handling ---
            current_context = req_context or {}
            route = current_context.get("route", "/")
            query_params = current_context.get("params", {})
            active_data = current_context.get("active_data")

            # Bind fresh context to the tools instance
            self.tools_instance.current_route = route
            self.tools_instance.query_params = query_params
            
            # Formulate the situational context block
            context_blocks = [f"<current_route>{route}</current_route>"]
            if query_params:
                context_blocks.append(f"<active_filters>\n{json.dumps(query_params, indent=2)}\n</active_filters>")
            if active_data:
                context_blocks.append(f"<active_data_summary>\n{json.dumps(active_data, indent=2)}\n</active_data_summary>")

            ui_context_msg = (
                "### SESSION SITUATIONAL CONTEXT ###\n"
                "The following block describes the user's current environment. "
                "Use this to ground your responses. If you need more detail, use the provided tools.\n"
                "<ui_context>\n" + "\n".join(context_blocks) + "\n</ui_context>"
            )
            messages.append(SystemMessage(content=ui_context_msg))

            # Fetch history exclusively via the Store
            history = await self.chat_store.list_messages(session_id, sort_order=1)
            for msg in history:
                if msg["id"] == assistant_message_id:
                    continue  # Skip the placeholder being generated
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant" and msg.get("content"):
                    messages.append(AIMessage(content=msg["content"]))

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

            # We use the instance agent which is configured for this specific request/user
            async for event in self.agent.astream_events(
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
                    
                    # Generate dynamic message
                    display_message = Tools.get_tool_message(tool_name, tool_input, tense="present")

                    tool_event_buffers[run_id] = {
                        "start_time": datetime.now(timezone.utc),
                        "tool": tool_name,
                        "input": tool_input,
                        "message": display_message
                    }

                    await sse_manager.broadcast(
                        session_id,
                        "tool_start",
                        {
                            "message": display_message,
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
                    
                    # Robust recursive serialization helper
                    def make_serializable(obj):
                        if hasattr(obj, "content"):
                            return str(obj.content)
                        if isinstance(obj, dict):
                            return {k: make_serializable(v) for k, v in obj.items()}
                        if isinstance(obj, list):
                            return [make_serializable(i) for i in obj]
                        if isinstance(obj, (str, int, float, bool, type(None))):
                            return obj
                        return str(obj)

                    tool_output = make_serializable(tool_output)
                    tool_input = {}

                    end_time = datetime.now(timezone.utc)
                    execution_time_ms = 0
                    if run_id in tool_event_buffers:
                        start_time = tool_event_buffers[run_id]["start_time"]
                        tool_input = tool_event_buffers[run_id].get("input", {})
                        execution_time_ms = int(
                            (end_time - start_time).total_seconds() * 1000
                        )
                        del tool_event_buffers[run_id]

                    # Generate past tense message
                    display_message = Tools.get_tool_message(tool_name, tool_input, tense="past")

                    thought_payload = {
                        "message": display_message,
                        "status": "completed",
                        "tool_call_id": run_id,
                    }
                    thoughts_buffer.append({
                        "tool": tool_name,
                        "status": "completed",
                        "execution_time_ms": execution_time_ms,
                        "tool_call_id": run_id,
                        "message": display_message
                    })
                    await sse_manager.broadcast(
                        session_id,
                        "tool_end",
                        {**thought_payload, "message_id": assistant_message_id},
                    )

            # Save Output to DB using Store
            await self.chat_store.update_message(
                assistant_message_id,
                {
                    "content": full_response,
                    "thoughts": thoughts_buffer,
                    "status": "completed",
                },
            )

        except Exception as e:
            await sse_manager.broadcast(session_id, "error", {"message": str(e), "message_id": assistant_message_id})
            await self.chat_store.update_message(
                assistant_message_id,
                {"status": "error", "content": f"Error: {str(e)}"},
            )
        finally:
            await sse_manager.broadcast(
                session_id, "done", {"message_id": assistant_message_id}
            )
            sse_manager.clear_accumulator(session_id)
            sse_manager.mark_inactive(session_id)
