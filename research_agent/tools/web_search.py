"""Web search tool using DuckDuckGo."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from duckduckgo_search import DDGS

from research_agent.config import MAX_SEARCH_RESULTS

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str


@dataclass
class WebSearchTool:
    """Searches the web via DuckDuckGo and returns structured results."""

    max_results: int = MAX_SEARCH_RESULTS
    _results: list[SearchResult] = field(default_factory=list, init=False)

    def search(self, query: str) -> list[SearchResult]:
        """Run a web search and return a list of SearchResult objects."""
        logger.info("Web search: %s", query)
        self._results = []
        try:
            with DDGS() as ddgs:
                raw = ddgs.text(query, max_results=self.max_results)
                for item in raw:
                    self._results.append(
                        SearchResult(
                            title=item.get("title", ""),
                            url=item.get("href", ""),
                            snippet=item.get("body", ""),
                        )
                    )
        except Exception as exc:
            logger.error("Web search failed: %s", exc)

        logger.info("Found %d web results", len(self._results))
        return self._results

    def search_news(self, query: str) -> list[SearchResult]:
        """Search recent news articles."""
        logger.info("News search: %s", query)
        self._results = []
        try:
            with DDGS() as ddgs:
                raw = ddgs.news(query, max_results=self.max_results)
                for item in raw:
                    self._results.append(
                        SearchResult(
                            title=item.get("title", ""),
                            url=item.get("url", ""),
                            snippet=item.get("body", ""),
                        )
                    )
        except Exception as exc:
            logger.error("News search failed: %s", exc)

        logger.info("Found %d news results", len(self._results))
        return self._results
