from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from tools import tools_list


def get_agent(api_key: str, model_name: str = "google/gemini-2.5-flash"):
    # 1. Initialize the Chat Model
    model = ChatOpenAI(
        model=model_name,
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

    # 2. Create the agent using the modern, simplified API
    # This object natively supports .stream() and .astream_events()
    agent = create_agent(model=model, tools=tools_list)

    return agent
