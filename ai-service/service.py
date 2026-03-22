import json
from datetime import datetime, timezone
from typing import Dict, Any

from loguru import logger
from sse import sse_manager
from agent import get_chain_trust_agent
from tools import Tools
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from config import get_settings


class ChatService:
    def __init__(
        self,
        user_id: str,
        chat_store: Any,
        role: str = "customer",
        current_context: dict = None,
    ):
        self.user_id = user_id
        self.role = role
        self.chat_store = chat_store
        ctx = current_context or {}
        self.current_route = ctx.get("route", "/")
        self.query_params = ctx.get("params", {})
        self.active_data = ctx.get("active_data")

        # Use the unified Tools class for context-aware tool management
        self.tools_instance = Tools(
            user_id=self.user_id,
            role=self.role,
            current_route=self.current_route,
            query_params=self.query_params,
        )
        self.agent = get_chain_trust_agent(
            role=role, tools=self.tools_instance.get_tools()
        )

    async def process_chat(
        self,
        session_id: str,
        req_context: dict,
        assistant_message_id: str,
    ):
        logger.info(
            f"\n[AGENT CONTEXT] Incoming from frontend (Session: {session_id}):\n{json.dumps(req_context, indent=2)}"
        )
        sse_manager.clear_buffer(session_id)
        sse_manager.mark_active(session_id)

        # Automatic Session Naming (only if name is default and NOT manually updated)
        session_data = await self.chat_store.get_session(session_id)
        if (
            session_data
            and not session_data.get("name_updated")
            and (
                session_data.get("name") == "New Conversation"
                or "..." in session_data.get("name", "")
            )
        ):
            first_msg = req_context.get("message")
            if first_msg:
                # Direct await to ensure naming finishes before 'done' event
                await self._auto_name_session(session_id, first_msg)

        try:
            messages = []

            # --- Robust Context Handling ---
            # Try to get fresh context from request body, fallback to initialization context
            ctx = req_context.get("context") or {}
            route = ctx.get("route") or self.current_route
            query_params = ctx.get("params") or self.query_params
            active_data = ctx.get("active_data") or self.active_data

            # Bind fresh context to the tools instance
            self.tools_instance.current_route = route
            self.tools_instance.query_params = query_params

            # Formulate context object for tool messages and situational context
            context_obj = {
                "route": route,
                "params": query_params,
                "active_data": active_data,
            }

            # Formulate the situational context block
            context_blocks = [f"<current_route>{route}</current_route>"]
            if query_params:
                context_blocks.append(
                    f"<active_filters>\n{json.dumps(query_params, indent=2)}\n</active_filters>"
                )
            if active_data:
                context_blocks.append(
                    f"<active_data_summary>\n{json.dumps(active_data, indent=2)}\n</active_data_summary>"
                )

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
            last_event_was_tool = False

            # We use the instance agent which is configured for this specific request/user
            async for event in self.agent.astream_events(
                {"messages": messages}, version="v2"
            ):
                event_type = event["event"]
                run_id = event.get("run_id")

                if event_type == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if isinstance(chunk.content, str) and chunk.content:
                        # Conditional newline injection
                        content_to_add = chunk.content
                        if last_event_was_tool:
                            last_event_was_tool = False
                            # Ensure at least one newline for separation from thoughts,
                            # and two newlines if we are appending to existing text for a markdown paragraph break.
                            if full_response and not full_response.endswith("\n\n"):
                                if full_response.endswith("\n") and not content_to_add.startswith("\n"):
                                    content_to_add = "\n" + content_to_add
                                elif not full_response.endswith("\n") and not content_to_add.startswith("\n"):
                                    content_to_add = "\n\n" + content_to_add

                        full_response += content_to_add
                        await sse_manager.broadcast(
                            session_id,
                            "token",
                            {
                                "content": content_to_add,
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
                    display_message = Tools.get_tool_message(
                        tool_name, tool_input, tense="present", context=context_obj
                    )

                    tool_event_buffers[run_id] = {
                        "start_time": datetime.now(timezone.utc),
                        "tool": tool_name,
                        "input": tool_input,
                        "message": display_message,
                    }

                    await sse_manager.broadcast(
                        session_id,
                        "tool_start",
                        {
                            "tool": tool_name,
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
                    display_message = Tools.get_tool_message(
                        tool_name, tool_input, tense="past", context=context_obj
                    )

                    thought_payload = {
                        "message": display_message,
                        "status": "completed",
                        "tool_call_id": run_id,
                    }
                    thoughts_buffer.append(
                        {
                            "tool": tool_name,
                            "status": "completed",
                            "execution_time_ms": execution_time_ms,
                            "tool_call_id": run_id,
                            "message": display_message,
                        }
                    )

                    last_event_was_tool = True

                    await sse_manager.broadcast(
                        session_id,
                        "tool_end",
                        {
                            **thought_payload,
                            "message_id": assistant_message_id,
                            "execution_time_ms": execution_time_ms,
                        },
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
            await sse_manager.broadcast(
                session_id,
                "error",
                {"message": str(e), "message_id": assistant_message_id},
            )
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

    async def _auto_name_session(self, session_id: str, message: str):
        """Asynchronously updates the session title using an LLM."""
        title = await self._generate_session_title(message)
        if title:
            await self.chat_store.update_session(
                session_id, {"name": title, "name_updated": True}
            )
            await sse_manager.broadcast(session_id, "name_updated", {"name": title})

    async def _generate_session_title(self, first_message: str) -> str:
        """Generates a concise (2-4 words) title using OpenRouter."""
        try:
            settings = get_settings()
            llm = ChatOpenAI(
                model="stepfun/step-3.5-flash:free",
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.1,
                max_tokens=15,
            )
            prompt = (
                "Only generate a very short, professional title (2-4 words) for a chat conversation starting with this message. "
                "Do not include any quotes, preamble, or punctuation. Output ONLY the title text.\n\n"
                f"User Message: {first_message}"
            )
            response = await llm.ainvoke(prompt)
            raw_content = response.content or ""
            title = raw_content.strip().strip('"').strip("'").strip(".")

            if not title:
                logger.warning(
                    f"LLM returned empty title for message. Raw: '{raw_content}'"
                )
                title = first_message[:40] + ("..." if len(first_message) > 40 else "")

            logger.info(f"Session title resolved to: {title}")
            return title[:50]
        except Exception as e:
            logger.error(f"Error generating session title: {e}")
            return first_message[:40] + "..."
