import json
import re
from datetime import datetime, timezone
from typing import Dict, Any

from loguru import logger
from sse import sse_manager
from agent import get_chain_trust_agent
from tools import Tools
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from config import get_settings
from store import chat_store as store


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
        sse_manager.clear_buffer(session_id)
        sse_manager.mark_active(session_id)

        # 1. Extract context early so it can be used for session naming
        ctx = req_context.get("context") or {}
        route = ctx.get("route") or self.current_route
        query_params = ctx.get("params") or self.query_params
        active_data = ctx.get("active_data") or self.active_data

        context_obj = {
            "route": route,
            "params": query_params,
            "active_data": active_data,
        }

        # 2. Fetch history early
        history = await self.chat_store.list_messages(session_id, sort_order=1)

        # 3. Automatic Session Naming
        session_data = await self.chat_store.get_session(session_id)
        current_name = session_data.get("name") if session_data else ""

        if (
            session_data
            and not session_data.get("name_updated")
            and (
                not current_name
                or current_name == "New Conversation"
                or "..." in current_name
            )
        ):
            first_msg = req_context.get("message")
            if not first_msg:
                user_msgs = [
                    m["content"]
                    for m in history
                    if m.get("role") == "user" and m.get("content")
                ]
                if user_msgs:
                    first_msg = user_msgs[0]

            if first_msg:
                await self._auto_name_session(session_id, first_msg, context_obj)

        try:
            messages = []

            # Bind fresh context to the tools instance
            self.tools_instance.current_route = route
            self.tools_instance.query_params = query_params

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

            # Build message history (already fetched above)
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
                    display_message = await self.tools_instance.get_tool_message(
                        tool_name, tool_input, tense="present", context=context_obj
                    )

                    tool_event_buffers[run_id] = {
                        "start_time": datetime.now(timezone.utc),
                        "tool": tool_name,
                        "input": tool_input,
                        "message": display_message,
                    }

                    # Shift existing content to a "thinking" thought if present
                    if full_response.strip():
                        thinking_thought = {
                            "tool": "thinking",
                            "status": "thinking",
                            "message": full_response.strip(),
                            "execution_time_ms": 0,
                            "tool_call_id": f"thought_{run_id}",
                        }
                        thoughts_buffer.append(thinking_thought)

                        # Broadcast shift to frontend for state synchronization
                        await sse_manager.broadcast(
                            session_id,
                            "shift_to_thought",
                            {
                                "content": full_response.strip(),
                                "message_id": assistant_message_id,
                            },
                        )

                        # Clear current response as it's now part of history/thoughts
                        full_response = ""

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
                    display_message = await self.tools_instance.get_tool_message(
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

    async def _auto_name_session(
        self, session_id: str, message: str, context: dict = None
    ):
        """Asynchronously updates the session title using an LLM with optional page context."""
        title = await self._generate_session_title(message, context)
        if title:
            await self.chat_store.update_session(
                session_id, {"name": title, "name_updated": True}
            )
            await sse_manager.broadcast(session_id, "name_updated", {"name": title})

    async def _generate_session_title(
        self, first_message: str, context: dict = None
    ) -> str:
        """Generates a concise (2-4 words) title using OpenRouter.

        For non-/agent routes, fetches real view data via get_view_data to provide
        rich context (e.g. batch names, product info) for better titles.
        """
        try:
            settings = get_settings()
            llm = ChatOpenAI(
                model="openrouter/free",
                api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.7,
                max_tokens=50,
            )

            # Build context string for the prompt
            context_str = ""
            if context:
                route = context.get("route", "/")
                normalized_route = "/" + route.strip("/")

                context_str = "\n\n### Application Context ###\n"
                context_str += f"- Current Route: {normalized_route}\n"

                if context.get("params"):
                    context_str += (
                        f"- Active Filters: {json.dumps(context['params'])}\n"
                    )

                # For non-/agent routes, fetch real view data for richer naming
                if not normalized_route.startswith("/agent"):
                    try:
                        view_data = await store.get_view_data(
                            route=normalized_route,
                            user_id=self.user_id,
                            role=self.role,
                            params=context.get("params"),
                        )
                        if view_data and not view_data.startswith("Error"):
                            # Truncate to avoid burning tokens
                            context_str += (
                                f"- Page Data Summary: {view_data[:400]}...\n"
                            )
                    except Exception as e:
                        logger.debug(f"Could not fetch view data for naming: {e}")

                if context.get("active_data"):
                    data_str = json.dumps(context["active_data"])
                    context_str += f"- Active Data Summary: {data_str[:300]}...\n"

            system_prompt = (
                "You are a professional assistant that generates very concise chat session titles. "
                "STRICT RULES:\n"
                "1. Output ONLY the raw title text (2 to 4 words total).\n"
                "2. No quotes, no preamble ('Title:'), no trailing punctuation.\n"
                "3. Describe exactly what the user is looking at or doing.\n"
                "4. Use specific names (Product IDs, Batches) if available in context.\n"
                "5. Example: 'Batch PRD-102 Analysis', 'Prescription OCR Read', 'Medicine Cabinet Search'."
            )

            user_data = f"User Message: {first_message}\n\n{context_str}"

            try:
                response = await llm.ainvoke(
                    [
                        SystemMessage(content=system_prompt),
                        HumanMessage(content=user_data),
                    ]
                )
            except Exception as e:
                # If primary model is rate limited (429), try a fallback Gemini model
                if "429" in str(e) or "rate" in str(e).lower():
                    logger.warning(
                        f"Title primary model rate limited, trying fallback: {e}"
                    )
                    fallback_llm = ChatOpenAI(
                        model="openrouter/free",
                        api_key=settings.OPENROUTER_API_KEY,
                        base_url="https://openrouter.ai/api/v1",
                        temperature=0.7,
                        max_tokens=50,
                    )
                    response = await fallback_llm.ainvoke(
                        [
                            SystemMessage(content=system_prompt),
                            HumanMessage(content=user_data),
                        ]
                    )
                else:
                    raise e

            raw_content = response.content or ""
            # Clean up common LLM prefixes
            title = raw_content.strip().strip('"').strip("'").strip(".")
            title = re.sub(
                r"^(Title|Session|Topic|Name):\s*", "", title, flags=re.IGNORECASE
            )

            if not title:
                logger.warning(
                    f"LLM returned empty title for message. Raw: '{raw_content}'"
                )
                title = first_message[:40] + ("..." if len(first_message) > 40 else "")

            return title[:50]
        except Exception as e:
            logger.error(f"Error generating session title: {e}")
            return first_message[:40] + "..."
