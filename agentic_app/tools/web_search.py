"""Web search tool using DuckDuckGo (no API key required)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from duckduckgo_search import DDGS

import config

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str


class WebSearchTool:
    """Searches the web via DuckDuckGo and returns structured results."""

    name: str = "web_search"
    description: str = (
        "Search the internet for information on a given query. "
        "Returns a list of results with title, URL, and snippet."
    )

    # JSON-schema that the LLM sees so it can call this tool.
    parameters_schema: dict = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query to look up on the web.",
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results to return.",
                "default": 5,
            },
        },
        "required": ["query"],
    }

    def run(self, query: str, max_results: int | None = None) -> list[dict]:
        """Execute the web search and return results.

        Returns a list of dicts with keys: title, url, snippet.
        """
        max_results = max_results or config.MAX_SEARCH_RESULTS
        logger.info("Searching web for: %s (max_results=%d)", query, max_results)

        try:
            with DDGS() as ddgs:
                raw = list(ddgs.text(query, max_results=max_results))

            results: list[dict] = []
            for item in raw:
                results.append(
                    {
                        "title": item.get("title", ""),
                        "url": item.get("href", ""),
                        "snippet": item.get("body", ""),
                    }
                )
            logger.info("Found %d results for '%s'", len(results), query)
            return results

        except Exception as exc:
            logger.error("Web search failed for '%s': %s", query, exc)
            return [{"title": "Search error", "url": "", "snippet": str(exc)}]
