"""Base agent with an agentic tool-use loop backed by an LLM."""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import Any

import config

logger = logging.getLogger(__name__)


def _build_llm_client():
    """Return an LLM client + model name tuple based on configuration."""
    provider = config.LLM_PROVIDER.lower()
    if provider == "anthropic":
        import anthropic
        return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY), config.ANTHROPIC_MODEL, "anthropic"
    elif provider == "openai":
        import openai
        return openai.OpenAI(api_key=config.OPENAI_API_KEY), config.OPENAI_MODEL, "openai"
    else:
        raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")


class BaseAgent(ABC):
    """Abstract base for every agent.

    Subclasses must define:
        - ``system_prompt``  – the system-level instruction for the LLM.
        - ``tools``          – mapping of tool-name → callable tool instances.
    """

    system_prompt: str = ""
    tools: dict[str, Any] = {}

    def __init__(self) -> None:
        self.client, self.model, self.provider = _build_llm_client()
        self.messages: list[dict] = []
        self.logger = logging.getLogger(self.__class__.__name__)

    # ------------------------------------------------------------------
    # Tool-schema helpers (translate our tool objects → LLM tool specs)
    # ------------------------------------------------------------------

    def _tool_definitions_anthropic(self) -> list[dict]:
        defs = []
        for tool in self.tools.values():
            defs.append(
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.parameters_schema,
                }
            )
        return defs

    def _tool_definitions_openai(self) -> list[dict]:
        defs = []
        for tool in self.tools.values():
            defs.append(
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.parameters_schema,
                    },
                }
            )
        return defs

    # ------------------------------------------------------------------
    # Execute a single tool call
    # ------------------------------------------------------------------

    def _execute_tool(self, name: str, arguments: dict) -> str:
        """Run the named tool with *arguments* and return a JSON string."""
        tool = self.tools.get(name)
        if not tool:
            return json.dumps({"error": f"Unknown tool: {name}"})
        try:
            result = tool.run(**arguments)
            return json.dumps(result, default=str)
        except Exception as exc:
            self.logger.error("Tool %s raised: %s", name, exc)
            return json.dumps({"error": str(exc)})

    # ------------------------------------------------------------------
    # Agentic loop
    # ------------------------------------------------------------------

    def run(self, user_message: str, max_iterations: int | None = None) -> str:
        """Run the agent loop: send a message, handle tool calls, repeat.

        Returns the final assistant text response.
        """
        max_iter = max_iterations or config.MAX_RESEARCH_ITERATIONS
        self.messages = []

        if self.provider == "anthropic":
            return self._loop_anthropic(user_message, max_iter)
        else:
            return self._loop_openai(user_message, max_iter)

    # ------------------------------------------------------------------
    # Anthropic agentic loop
    # ------------------------------------------------------------------

    def _loop_anthropic(self, user_message: str, max_iter: int) -> str:
        self.messages.append({"role": "user", "content": user_message})
        tool_defs = self._tool_definitions_anthropic()

        for iteration in range(1, max_iter + 1):
            self.logger.info("Anthropic loop iteration %d/%d", iteration, max_iter)

            kwargs: dict[str, Any] = {
                "model": self.model,
                "max_tokens": 4096,
                "system": self.system_prompt,
                "messages": self.messages,
            }
            if tool_defs:
                kwargs["tools"] = tool_defs

            response = self.client.messages.create(**kwargs)

            # Collect assistant content blocks
            assistant_content = response.content
            self.messages.append({"role": "assistant", "content": assistant_content})

            # If the model didn't request any tool use, we're done.
            if response.stop_reason != "tool_use":
                # Return final text
                return self._extract_text_anthropic(assistant_content)

            # Process every tool_use block
            tool_results: list[dict] = []
            for block in assistant_content:
                if block.type == "tool_use":
                    self.logger.info("Tool call: %s(%s)", block.name, json.dumps(block.input)[:200])
                    output = self._execute_tool(block.name, block.input)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": output,
                        }
                    )

            self.messages.append({"role": "user", "content": tool_results})

        # Exhausted iterations – ask for a final summary.
        self.messages.append(
            {
                "role": "user",
                "content": "You have used all available iterations. Please provide your final answer now based on everything gathered so far.",
            }
        )
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=self.messages,
        )
        return self._extract_text_anthropic(response.content)

    @staticmethod
    def _extract_text_anthropic(content_blocks) -> str:
        parts: list[str] = []
        for block in content_blocks:
            if hasattr(block, "text"):
                parts.append(block.text)
        return "\n".join(parts)

    # ------------------------------------------------------------------
    # OpenAI agentic loop
    # ------------------------------------------------------------------

    def _loop_openai(self, user_message: str, max_iter: int) -> str:
        self.messages.append({"role": "system", "content": self.system_prompt})
        self.messages.append({"role": "user", "content": user_message})
        tool_defs = self._tool_definitions_openai()

        for iteration in range(1, max_iter + 1):
            self.logger.info("OpenAI loop iteration %d/%d", iteration, max_iter)

            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": self.messages,
            }
            if tool_defs:
                kwargs["tools"] = tool_defs

            response = self.client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            message = choice.message
            self.messages.append(message.model_dump())

            if not message.tool_calls:
                return message.content or ""

            for tc in message.tool_calls:
                fn = tc.function
                args = json.loads(fn.arguments) if fn.arguments else {}
                self.logger.info("Tool call: %s(%s)", fn.name, json.dumps(args)[:200])
                output = self._execute_tool(fn.name, args)
                self.messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": output,
                    }
                )

        # Final summary after max iterations.
        self.messages.append(
            {
                "role": "user",
                "content": "Provide your final answer now based on everything gathered so far.",
            }
        )
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
        )
        return response.choices[0].message.content or ""

    # ------------------------------------------------------------------
    @abstractmethod
    def get_result(self, raw_response: str) -> Any:
        """Parse the raw LLM text into a domain-specific result object."""
        ...
