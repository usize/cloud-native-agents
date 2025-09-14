#!/usr/bin/env python3
"""
A2A "status update" bot.
- Serves an A2A-compliant HTTP server using a2a-sdk's built-in server wrapper.
- Reads a plaintext knowledge base (one line per status/event) and answers questions about it.

Run:
  uv pip install "a2a-sdk[http-server]"
  uv run python server.py --kb ./status.txt --host 0.0.0.0 --port 10000

Test with A2A Inspector (recommended) or GET the agent card:
  curl -s http://localhost:10000/.well-known/agent.json | jq

Notes:
- This keeps everything in-process and depends only on a2a-sdk + FastAPI.
- The SDK handles JSON-RPC routing. You implement AgentExecutor.execute().
"""
from __future__ import annotations
import argparse
import os
import re
from pathlib import Path
from typing import Iterable, List, Tuple

# Import A2A SDK components from their specific modules
from a2a.types import AgentCard, AgentSkill, AgentCapabilities
from a2a.server.apps import A2AFastAPIApplication
from a2a.server.request_handlers.default_request_handler import DefaultRequestHandler
from a2a.server.agent_execution import AgentExecutor
from a2a.server.agent_execution.context import RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import InMemoryTaskStore
from a2a.utils import new_agent_text_message


class StatusKB:
    def __init__(self, text: str):
        # Store lines with simple normalization
        self.lines: List[str] = [ln.strip() for ln in text.splitlines() if ln.strip()]

    @classmethod
    def from_file(cls, path: Path) -> "StatusKB":
        return cls(path.read_text(encoding="utf-8"))


class StatusAgent:
    def __init__(self, kb: StatusKB):
        self.kb = kb

    async def answer(self, question: str) -> str:
        return f"you asked: {question}"


class StatusAgentExecutor(AgentExecutor):
    """Bridges A2A protocol <-> StatusAgent business logic.

    The SDK passes a RequestContext and an EventQueue. We extract the user's
    text question from the context, query the KB, then enqueue a single
    agent Message as a response.
    """

    def __init__(self, agent: StatusAgent):
        self.agent = agent

    # The SDK calls this for message/send and message/stream
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        user_text = context.get_user_input()
        result = await self.agent.answer(user_text)
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise Exception(f"cancel not supported, args: {context} event_queue: {event_queue}")


# ------------------------------
# Boot
# ------------------------------

def build_agent_card(base_url: str) -> AgentCard:
    return AgentCard(
        name="status-update-bot",
        description="Answers questions from a KnowledgeBase consisting of team/contributor status updates.",
        version="0.1.0",
        url=base_url,
        capabilities=AgentCapabilities(),  # use default empty capabilities
        default_input_modes=["text/plain"],
        default_output_modes=["text/plain"],
        skills=[
            AgentSkill(
                id="status-query",
                name="Query status log",
                description="Find status lines relevant to a user question.",
                input_modes=["text/plain"],
                output_modes=["text/plain"],
                tags=["query", "status"],
            )
        ],
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kb", required=True, type=Path, help="Path to status text file")
    ap.add_argument("--host", default=os.getenv("HOST", "0.0.0.0"))
    ap.add_argument("--port", type=int, default=int(os.getenv("PORT", "10000")))
    ap.add_argument("--base-url", default=os.getenv("BASE_URL", "http://localhost:10000"))
    args = ap.parse_args()

    kb = StatusKB.from_file(args.kb)
    agent = StatusAgent(kb)
    executor = StatusAgentExecutor(agent)

    # Wire A2A server
    task_store = InMemoryTaskStore()
    http_handler = DefaultRequestHandler(agent_executor=executor, task_store=task_store)
    card = build_agent_card(args.base_url)
    app = A2AFastAPIApplication(agent_card=card, http_handler=http_handler)

    print(f"Serving A2A Status Bot on {args.host}:{args.port}")
    print("Agent card at /.well-known/agent.json")

    import uvicorn
    fastapi_app = app.build()
    uvicorn.run(fastapi_app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
