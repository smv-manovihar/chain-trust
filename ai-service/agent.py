import os
from typing import Any, Dict, List

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import Runnable
from langchain_openai import ChatOpenAI

from config import get_settings
from prompts import CUSTOMER_SYSTEM_PROMPT, MANUFACTURER_SYSTEM_PROMPT

DEFAULT_OPENROUTER_MODEL = "stepfun/step-3.5-flash:free"
BASE_URL = "https://openrouter.ai/api/v1"


class Agent:
    def __init__(
        self,
        agent_name: str,
        system_prompt: str = "You are a helpful assistant.",
        agent_description: str = None,
        model_name: str = None,
        temperature: float = 0.3,
        max_tokens: int = None,
        request_timeout: int = None,
        tools: List[Any] = None,
        verbose: bool = False,
    ):
        """
        Initializes the agent strictly using `create_agent` optimized exclusively for OpenRouter.
        """
        self.agent_name = agent_name
        self.system_prompt = system_prompt
        self.agent_description = agent_description
        self.verbose = verbose
        self.memory: List[BaseMessage] = []

        settings = get_settings()

        # Resolve OpenRouter API Key
        api_key = (
            settings.OPENROUTER_API_KEY
            or os.getenv("OPENROUTER_API_KEY")
            or settings.LLM_API_KEY
            or os.getenv("LLM_API_KEY")
        )

        if not api_key:
            raise ValueError("OpenRouter API Key is missing. Set OPENROUTER_API_KEY.")

        self.llm = ChatOpenAI(
            temperature=temperature,
            model=model_name or DEFAULT_OPENROUTER_MODEL,
            api_key=api_key,
            base_url=BASE_URL,
            max_tokens=max_tokens,
            timeout=request_timeout,
        )

        # Initialize the single create_agent runnable
        self.runnable: Runnable = create_agent(
            model=self.llm,
            tools=tools or [],
            system_prompt=self.system_prompt,
            debug=self.verbose,
        )

    def _prepare_input(
        self, input_text: str, chat_history: List[BaseMessage] = None
    ) -> Dict[str, List[BaseMessage]]:
        """
        Prepares the list of messages for the agent.
        """
        messages = [SystemMessage(content=self.system_prompt)]

        if chat_history:
            messages.extend(chat_history)
        elif self.memory:
            messages.extend(self.memory)

        messages.append(HumanMessage(content=input_text))

        return {"messages": messages}

    async def astream_events(self, input_payload: Dict[str, Any], version: str = "v2"):
        """
        Streams execution events from the underlying agent asynchronously.
        """
        # Support both 'messages' format (from ChatService) and 'input' format
        if "messages" in input_payload:
            runnable_input = {"messages": input_payload["messages"]}
        else:
            input_text = input_payload.get("input", "")
            chat_history = input_payload.get("chat_history", [])
            runnable_input = self._prepare_input(input_text, chat_history)

        async for event in self.runnable.astream_events(
            runnable_input, version=version
        ):
            yield event

    def run(self, task: str, save_history: bool = False) -> str:
        """
        Synchronously executes the agent's logic.
        """
        if save_history:
            self.memory.append(HumanMessage(content=task))

        runnable_input = self._prepare_input(task)
        response = self.runnable.invoke(runnable_input)

        output_text = self._extract_output_text(response)

        if save_history:
            self.memory.append(AIMessage(content=output_text))

        return output_text

    async def arun(self, task: str, save_history: bool = False) -> str:
        """
        Asynchronously executes the agent's logic.
        """
        if save_history:
            self.memory.append(HumanMessage(content=task))

        runnable_input = self._prepare_input(task)
        response = await self.runnable.ainvoke(runnable_input)

        output_text = self._extract_output_text(response)

        if save_history:
            self.memory.append(AIMessage(content=output_text))

        return output_text

    def _extract_output_text(self, response: Any) -> str:
        """Helper to extract text from the agent response object."""
        if (
            isinstance(response, dict)
            and "messages" in response
            and isinstance(response["messages"], list)
        ):
            last_msg = response["messages"][-1]
            return last_msg.content if hasattr(last_msg, "content") else str(last_msg)
        elif hasattr(response, "content"):
            return response.content
        return str(response)

    def add_message(self, role: str, content: str):
        """Manually adds a message to the agent's internal memory."""
        if role == "user":
            self.memory.append(HumanMessage(content=content))
        elif role == "system":
            self.memory.append(SystemMessage(content=content))
        elif role == "assistant":
            self.memory.append(AIMessage(content=content))

    def ingest_data(self, data: Dict[str, Any], role: str = "user"):
        """Formats and ingests structured data or documents into the context."""
        if isinstance(data, dict):
            name = data.get("name", "Document")
            text = data.get("content") or str(data)
            content = f'<document name="{name}">\n{text}\n</document>'
        else:
            content = f"<data>\n{str(data)}\n</data>"

        self.add_message(role, content)

    def clear_memory(self):
        """Resets and clears the internal memory of the agent."""
        self.memory = []


def get_chain_trust_agent(
    role: str = "customer",
    tools: List[Any] = None,
    model_name: str = DEFAULT_OPENROUTER_MODEL,
):
    """
    Factory function to create and return a configured Agent instance based on user role.
    """
    if role == "manufacturer":
        prompt = MANUFACTURER_SYSTEM_PROMPT
    else:
        prompt = CUSTOMER_SYSTEM_PROMPT

    return Agent(
        agent_name="ChainTrust_AI",
        system_prompt=prompt,
        model_name=model_name,
        tools=tools or [],
    )
