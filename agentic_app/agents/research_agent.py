"""Research Agent – performs market research over the internet.

The agent is given a research topic and autonomously:
1. Formulates search queries.
2. Searches the web for relevant sources.
3. Scrapes selected pages for deeper analysis.
4. Synthesises findings into a structured ``ResearchResult``.
"""

from __future__ import annotations

import json
import logging

from agents.base_agent import BaseAgent
from models.schemas import ResearchResult
from tools.web_search import WebSearchTool
from tools.web_scraper import WebScraperTool

logger = logging.getLogger(__name__)

RESEARCH_SYSTEM_PROMPT = """\
You are a Senior Market Research Analyst. Your job is to conduct thorough,
accurate market research on the topic provided by the user.

You have access to the following tools:
- **web_search**: Search the internet for information.
- **web_scrape**: Fetch and read the full text of a web page.

### Workflow
1. Break the research topic into 2-4 targeted search queries.
2. Use ``web_search`` to find relevant sources for each query.
3. Pick the most promising URLs and use ``web_scrape`` to extract detailed data.
4. Synthesise all findings into a final JSON response.

### Output format
When you have gathered enough information, respond with a **single JSON object**
(no markdown fences) matching this schema:

{
  "query": "<original topic>",
  "executive_summary": "<2-4 sentence summary>",
  "findings": [
    {
      "title": "<finding headline>",
      "source_url": "<url>",
      "summary": "<paragraph summary>",
      "key_data_points": ["point 1", "point 2"],
      "relevance_score": 0.0
    }
  ],
  "search_queries_used": ["query1", "query2"],
  "sources": ["url1", "url2"]
}

Be factual and cite your sources. Do NOT fabricate data.
"""


class ResearchAgent(BaseAgent):
    """Agent that researches a market topic using web search & scraping."""

    system_prompt = RESEARCH_SYSTEM_PROMPT

    def __init__(self) -> None:
        # Register tools BEFORE calling super().__init__
        search_tool = WebSearchTool()
        scraper_tool = WebScraperTool()
        self.tools = {
            search_tool.name: search_tool,
            scraper_tool.name: scraper_tool,
        }
        super().__init__()

    def research(self, topic: str) -> ResearchResult:
        """Run the full research loop for *topic* and return parsed results."""
        self.logger.info("Starting research on: %s", topic)
        raw = self.run(f"Conduct market research on the following topic:\n\n{topic}")
        return self.get_result(raw)

    def get_result(self, raw_response: str) -> ResearchResult:
        """Parse the LLM's JSON output into a ``ResearchResult``."""
        # Strip markdown code fences if present.
        text = raw_response.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            data = json.loads(text)
            return ResearchResult(**data)
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("Could not parse research JSON (%s). Wrapping raw text.", exc)
            return ResearchResult(
                query="unknown",
                executive_summary=raw_response[:500],
                findings=[],
                search_queries_used=[],
                sources=[],
            )
