#!/usr/bin/env python3
"""MCP Server for the Agentic Analysis & Reporting Application.

This server exposes three tools to Claude Desktop:
  1. web_search  – search the internet via DuckDuckGo
  2. web_scrape  – fetch and extract text from a web page
  3. generate_report – produce PPTX, HTML, and Markdown report files

Claude Desktop becomes the "agent brain" — no API key required.

Usage (standalone test):
    python mcp_server.py

Claude Desktop config (see README for full instructions):
    Add this server to claude_desktop_config.json
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys

# Ensure package root is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server.fastmcp import FastMCP

# --- Internal imports (reuse existing tool implementations) -----------------
from tools.web_search import WebSearchTool
from tools.web_scraper import WebScraperTool
from tools.report_generator import ReportGeneratorTool

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("mcp_server")

# ---------------------------------------------------------------------------
# Create the MCP server
# ---------------------------------------------------------------------------

mcp = FastMCP("Agentic Analysis & Reporting")

# Instantiate the tool classes once
_search = WebSearchTool()
_scraper = WebScraperTool()
_reporter = ReportGeneratorTool()


# ---------------------------------------------------------------------------
# Tool 1: Web Search
# ---------------------------------------------------------------------------

@mcp.tool()
def web_search(query: str, max_results: int = 5) -> str:
    """Search the internet for information using DuckDuckGo.

    Args:
        query: The search query to look up on the web.
        max_results: Maximum number of results to return (default 5).

    Returns:
        JSON array of results, each with title, url, and snippet.
    """
    results = _search.run(query=query, max_results=max_results)
    return json.dumps(results, indent=2, default=str)


# ---------------------------------------------------------------------------
# Tool 2: Web Scrape
# ---------------------------------------------------------------------------

@mcp.tool()
def web_scrape(url: str) -> str:
    """Fetch a web page and extract its readable text content.

    Useful for diving deeper into a specific search result to get
    the full article or report text.

    Args:
        url: The full URL of the page to fetch.

    Returns:
        JSON object with url, title, text, and error fields.
    """
    result = _scraper.run(url=url)
    return json.dumps(result, indent=2, default=str)


# ---------------------------------------------------------------------------
# Tool 3: Generate Report
# ---------------------------------------------------------------------------

@mcp.tool()
def generate_report(report_json: str) -> str:
    """Generate PowerPoint, HTML, and Markdown report files.

    Takes structured report data and produces three output files
    in the output/ directory.

    Args:
        report_json: A JSON string with this structure:
            {
              "title": "Report Title",
              "subtitle": "Optional subtitle",
              "sections": [
                {
                  "heading": "Section Heading",
                  "content": "Paragraph of prose for this section.",
                  "bullet_points": ["Key point 1", "Key point 2"]
                }
              ]
            }

    Returns:
        JSON object with list of generated file paths and any error.
    """
    result = _reporter.run(report_json=report_json)
    return json.dumps(result, indent=2, default=str)


# ---------------------------------------------------------------------------
# Prompt: full research-then-report workflow
# ---------------------------------------------------------------------------

@mcp.prompt()
def market_research(topic: str) -> str:
    """Run a full market research and report generation workflow.

    Args:
        topic: The market research topic to investigate.
    """
    return f"""You are a market research analyst with access to web search,
web scraping, and report generation tools. Complete these steps:

**STEP 1 — Research**
1. Break the topic into 2-4 targeted search queries.
2. Use the `web_search` tool for each query.
3. Pick the 2-3 most relevant URLs and use `web_scrape` to get detailed data.
4. Take note of all key findings, data points, and sources.

**STEP 2 — Report**
5. Organise your findings into report sections:
   - Executive Summary
   - Market Overview / Key Findings
   - Detailed Analysis (one section per major theme)
   - Sources & References
6. Call `generate_report` with a JSON string containing:
   - title, subtitle, and sections (each with heading, content, bullet_points)

**STEP 3 — Confirm**
7. Tell me which files were generated and give a brief summary.

---
**Topic to research:** {topic}
"""


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
