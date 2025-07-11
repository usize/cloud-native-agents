import os
import logging
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_ext.tools.mcp import StreamableHttpServerParams, StreamableHttpMcpToolAdapter
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_core.tools import FunctionTool
from tavily import AsyncTavilyClient
from dotenv import load_dotenv
from memory import conversation_memory

# Load environment variables from .env file
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

# Load configurations from environment variables
GITHUB_MCP_URL = os.getenv("GITHUB_MCP_URL")
GITHUB_PAT = os.getenv("GITHUB_PAT")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not GITHUB_MCP_URL:
    raise ValueError("GITHUB_MCP_URL environment variable not set.")
if not GITHUB_PAT:
    raise ValueError("GITHUB_PAT environment variable not set.")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set.")
if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY environment variable not set.")

# --- Helper Functions ---
async def setup_agents_and_tools(user_input_func=None):
    """Setup common agents and tools for both endpoints."""
    server_params = StreamableHttpServerParams(
        url=GITHUB_MCP_URL,
        headers={
            "Authorization": f"Bearer {GITHUB_PAT}",
            "Content-Type": "application/json"
        },
        timeout=10,
        sse_read_timeout=300,
    )

    model_client = OpenAIChatCompletionClient(
        model="gpt-4.1-nano-2025-04-14",
        api_key=OPENAI_API_KEY
    )

    # Get ChromaDB memory for agents
    chroma_memory = await conversation_memory.get_memory_for_agents()

    # --- Tool Definitions ---
    async def tavily_search_func(query: str, max_results: int = 5) -> dict:
        client = AsyncTavilyClient(api_key=TAVILY_API_KEY)
        result = await client.search(query=query, max_results=max_results, 
        include_answer=True)
        return result

    tavily_tool = FunctionTool(
        func=tavily_search_func,
        name="tavily_search",
        description="Perform a web search using Tavily and return summarized results."
    )

    async def get_tool_adapter(tool_name: str):
        """Helper function to get the tool adapter by name."""
        return await StreamableHttpMcpToolAdapter.from_server_params(server_params, 
        tool_name)

    tool_adapter_add_issue_comment = await get_tool_adapter("add_issue_comment")
    tool_adapter_get_issue = await get_tool_adapter("get_issue")

    # --- Agent Definitions with ChromaDB Memory ---
    issue_reader = AssistantAgent(
        name="issue_reader", 
        model_client=model_client, 
        tools=[tool_adapter_get_issue], 
        reflect_on_tool_use=True,
        memory=[chroma_memory],
        description="Extracts structured information from a GitHub issue.",
        system_message="You are a GitHub Issue Reader. Extract key problem details, error messages, user environment, and summarize the issue using the tool_adapter_get_issue tool. "
    )

    researcher = AssistantAgent(
        name="researcher", 
        model_client=model_client, 
        tools=[tavily_tool], 
        reflect_on_tool_use=True,
        memory=[chroma_memory],
        description="Researches related info to assist with resolving the issue.",
        system_message="You are a web researcher. Based on the issue summary, find top 3 related GitHub issues, documentation, and known solutions using the tavily_tool. "
    )

    reasoner = AssistantAgent(
        name="reasoner", 
        model_client=model_client,
        memory=[chroma_memory],
        description="Draft a github comment based on the issue and related research.",
        system_message="You are a technical expert. Given a GitHub issue and related research, suggest potential root causes and actionable next steps and format it as a github comment. "
    )

    commenter = AssistantAgent(
        name="commenter", 
        model_client=model_client, 
        tools=[tool_adapter_add_issue_comment], 
        reflect_on_tool_use=True,
        memory=[chroma_memory],
        description="Writes a GitHub comment.",
        system_message="You are a GitHub commenter. If ‘USER EDITED COMMENT:’ is present, post user edited comment as-is. Else, post the reasoner agent’s output as-is. Do not modify or paraphrase either option. After posting the comment, reply with 'TERMINATE'."
    )

    result = {
        "model_client": model_client,
        "issue_reader": issue_reader,
        "researcher": researcher,
        "reasoner": reasoner,
        "commenter": commenter
    }

    # Add UserProxyAgent if user_input_func is provided (for HITL functionality)
    if user_input_func:
        user_proxy = UserProxyAgent(
            name="user_proxy",
            input_func=user_input_func,
            description="A proxy for the user to review and edit the draft github comment from the reasoner agent. ",
        )
        result["user_proxy"] = user_proxy

    return result