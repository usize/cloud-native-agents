import asyncio
import os
import json
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any
import uuid
import logging
from datetime import datetime

# Autogen imports
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_ext.tools.mcp import StreamableHttpServerParams, StreamableHttpMcpToolAdapter
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.conditions import TextMentionTermination
from autogen_core.tools import FunctionTool
from tavily import AsyncTavilyClient
from dotenv import load_dotenv
from autogen_agentchat.ui import Console
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.base import TaskResult

# Load environment variables from .env file
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

def convert_datetime_to_string(obj):
    """Recursively convert datetime objects to ISO format strings"""
    if isinstance(obj, dict):
        return {key: convert_datetime_to_string(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_string(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

# --- FastAPI App Initialization ---
app = FastAPI(
    title="GitHub Issue Agent Team API",
    description="An API to trigger an agent team to analyze a GitHub issue and suggest next steps.",
)

# --- CORS Middleware Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],  # Allows all headers
)

# --- Pydantic Models for API ---
class IssueRequest(BaseModel):
    """Request model for the issue link."""
    issue_link: str

class IssueResponse(BaseModel):
    """Response model for the generated comment."""
    response: str | Dict[str, Any]

# --- Agent and Tool Configuration (Global Setup) ---
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

    # --- Tool Definitions ---
    async def tavily_search_func(query: str, max_results: int = 5) -> dict:
        client = AsyncTavilyClient(api_key=TAVILY_API_KEY)
        result = await client.search(query=query, max_results=max_results, include_answer=True)
        return result

    tavily_tool = FunctionTool(
        func=tavily_search_func,
        name="tavily_search",
        description="Perform a web search using Tavily and return summarized results."
    )

    async def get_tool_adapter(tool_name: str):
        """Helper function to get the tool adapter by name."""
        return await StreamableHttpMcpToolAdapter.from_server_params(server_params, tool_name)

    tool_adapter_add_issue_comment = await get_tool_adapter("add_issue_comment")
    tool_adapter_get_issue = await get_tool_adapter("get_issue")

    # --- Agent Definitions ---
    issue_reader = AssistantAgent(
        name="issue_reader", model_client=model_client, tools=[tool_adapter_get_issue], reflect_on_tool_use=True,
        description="Extracts structured information from a GitHub issue.",
        system_message="You are a GitHub Issue Reader. Extract key problem details, error messages, user environment, and summarize the issue using the tool_adapter_get_issue tool. "
    )

    researcher = AssistantAgent(
        name="researcher", model_client=model_client, tools=[tavily_tool], reflect_on_tool_use=True,
        description="Researches related info to assist with resolving the issue.",
        system_message="You are a web researcher. Based on the issue summary, find top 3 related GitHub issues, documentation, and known solutions using the tavily_tool. "
    )

    reasoner = AssistantAgent(
        name="reasoner", model_client=model_client, 
        description="Draft a github comment based on the issue and related research.",
        system_message="You are a technical expert. Given a GitHub issue and related research, suggest potential root causes and actionable next steps and format it as a github comment. "
    )

    commenter = AssistantAgent(
        name="commenter", model_client=model_client, tools=[tool_adapter_add_issue_comment], reflect_on_tool_use=True,
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

@app.post("/github_webhook")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    if payload.get("action") == "opened" and "issue" in payload:
        issue_url = payload["issue"]["html_url"]
        # Use background task so webhook returns quickly
        background_tasks.add_task(analyze_issue_with_comment, IssueRequest(issue_link=issue_url))
        return {"status": "accepted", "detail": f"Processing issue {issue_url}"}
    return {"status": "ignored", "reason": "Not an 'opened' issue event"}

# --- API Endpoints ---
@app.post("/issue_next_steps_with_comment", response_model=IssueResponse)
async def analyze_issue_with_comment(request: IssueRequest):
    """
    Accepts a GitHub issue URL, processes it with an agent team including commenter,
    and posts the suggested next steps as a comment to the GitHub issue.
    """
    print(f"Received request for issue with comment: {request.issue_link}")

    try:
        agents_and_tools = await setup_agents_and_tools()
        
        # Create team with commenter agent
        team = RoundRobinGroupChat([
            agents_and_tools["issue_reader"], 
            agents_and_tools["researcher"], 
            agents_and_tools["reasoner"], 
            agents_and_tools["commenter"]
        ], max_turns=4, termination_condition=TextMentionTermination("TERMINATE"))
        
        # --- Running the Agent Team ---
        task = f"Summarize and add next steps for this issue: {request.issue_link}"
        stream = team.run_stream(task=task)
        
        # Capture the final output from the stream
        final_output = None
        async for chunk in stream:
            # Each chunk contains information about the conversation
            if hasattr(chunk, 'content') and chunk.content:
                final_output = chunk.content
            elif hasattr(chunk, 'message') and chunk.message:
                final_output = chunk.message.get('content', '')
            elif isinstance(chunk, dict) and 'content' in chunk:
                final_output = chunk['content']
            elif isinstance(chunk, str):
                final_output = chunk
        
        await agents_and_tools["model_client"].close()
        
        # Return the actual final output if captured, otherwise a success message
        if final_output:
            return {"response": final_output}
        else:
            return {"response": "Comment generated and posted successfully. Check the issue for details."}

    except Exception as e:
        print(f"An error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/issue_next_steps_analysis", response_model=IssueResponse)
async def analyze_issue_without_comment(request: IssueRequest):
    """
    Accepts a GitHub issue URL, processes it with an agent team (excluding commenter),
    and returns the analysis and suggested next steps without posting to GitHub.
    """
    print(f"Received request for issue analysis only: {request.issue_link}")

    try:
        agents_and_tools = await setup_agents_and_tools()
        
        # Create team without commenter agent
        team = RoundRobinGroupChat([
            agents_and_tools["issue_reader"], 
            agents_and_tools["researcher"], 
            agents_and_tools["reasoner"]
        ], max_turns=3)
        
        # --- Running the Agent Team ---
        task = f"Analyze this issue and provide detailed next steps: {request.issue_link}"
        stream = team.run_stream(task=task)
        
        # Capture the final output from the stream
        final_output = None
        async for chunk in stream:
            # Each chunk contains information about the conversation
            if hasattr(chunk, 'content') and chunk.content:
                final_output = chunk.content
            elif hasattr(chunk, 'message') and chunk.message:
                final_output = chunk.message.get('content', '')
            elif isinstance(chunk, dict) and 'content' in chunk:
                final_output = chunk['content']
            elif isinstance(chunk, str):
                final_output = chunk
        
        await agents_and_tools["model_client"].close()
        
        # Return the actual final output if captured, otherwise a success message
        if final_output:
            return {"response": final_output}
        else:
            return {"response": "Analysis completed successfully. Check the console output for detailed results."}

    except Exception as e:
        print(f"An error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for HITL
@app.websocket("/ws/issue_next_steps_with_hitl_comment")
async def analyze_issue_with_hitl_comment(websocket: WebSocket):
    """
    WebSocket endpoint for Human-in-the-Loop GitHub issue analysis.
    User input is only requested when the user_proxy agent is called during the conversation.
    """
    print("WebSocket route connected")
    await websocket.accept()
    
    # Track WebSocket state
    websocket_closed = False
    
    async def _send_error_message(content: str):
        """Helper function to send error messages to the frontend."""
        try:
            await websocket.send_json({
                "type": "error",
                "content": content,
                "source": "system"
            })
        except:
            pass
    
    # User input function used by the team
    async def _user_input(prompt: str, cancellation_token=None) -> str:
        nonlocal websocket_closed
        
        if websocket_closed:
            logger.error("WebSocket connection is closed, cannot get user input")
            return "TERMINATE"  # Default to terminate if connection is closed
            
        try:
            # Send the prompt to the client
            await websocket.send_json({
                "type": "user_input_requested",
                "prompt": prompt,
                "source": "user_proxy"
            })
            
            # Wait for user response with timeout
            data = await asyncio.wait_for(websocket.receive_json(), timeout=300) # 300 seconds timeout
            message = TextMessage.model_validate(data)
            return message.content
            
        except asyncio.TimeoutError:
            logger.error("Timeout waiting for user input, defaulting to TERMINATE")
            websocket_closed = True
            await _send_error_message("Timeout waiting for user input. Connection closed.")
            return "TERMINATE"
        except Exception as e:
            logger.error(f"Error in _user_input: {str(e)}")
            websocket_closed = True
            await _send_error_message(f"Error getting user input: {str(e)}. Connection closed.")
            return "TERMINATE"

    try:
        # Get user message (GitHub issue URL)
        data = await websocket.receive_json()
        request = TextMessage.model_validate(data)
        
        logger.info(f"Received HITL request: {request.content}")

        # Setup agents and tools
        agents_and_tools = await setup_agents_and_tools(_user_input)
        
        # Create team with HITL functionality
        team = RoundRobinGroupChat([
            agents_and_tools["issue_reader"], 
            agents_and_tools["researcher"], 
            agents_and_tools["reasoner"],
            agents_and_tools["user_proxy"],
            agents_and_tools["commenter"]
        ], termination_condition=TextMentionTermination("TERMINATE"), max_turns=5)
        
        # Verify model client is still valid
        if not agents_and_tools["model_client"]:
            logger.error("Model client is not available")
            await _send_error_message("Model client is not available")
            return
        
        # Create task from the message
        task = f"You have a team of agents, use them to read a github issue: {request.content}, research related information, reason root causes and next steps as a github comment message, let human review it before posting. "
        
        # Stream the conversation
        stream = team.run_stream(task=task)
        try:
            async for message in stream:
                if isinstance(message, TaskResult):
                    continue
                
                # Check if WebSocket is still open before sending
                if websocket_closed:
                    logger.warning("WebSocket closed, stopping message stream")
                    break
                    
                try:
                    # Convert datetime objects to strings before sending
                    message_data = convert_datetime_to_string(message.model_dump())
                    await websocket.send_json(message_data)
                except Exception as e:
                    logger.error(f"Error sending message to WebSocket: {str(e)}")
                    websocket_closed = True
                    break
        except Exception as e:
            logger.error(f"Error in message stream: {str(e)}")
            await _send_error_message(f"Error in conversation: {str(e)}")
        finally:
            logger.info("Conversation stream completed")

    except WebSocketDisconnect:
        logger.info("HITL WebSocket client disconnected")
        websocket_closed = True
    except Exception as e:
        logger.error(f"HITL WebSocket error: {str(e)}")
        websocket_closed = True
        await _send_error_message(f"Error: {str(e)}")

# --- Legacy endpoint for backward compatibility ---
@app.post("/issue_next_steps", response_model=IssueResponse)
async def analyze_issue(request: IssueRequest):
    """
    Legacy endpoint that redirects to the with-comment version for backward compatibility.
    """
    return await analyze_issue_with_comment(request)
