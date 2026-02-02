"""Configuration for the research agent."""

import os
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
KNOWLEDGE_BASE_DIR = PROJECT_ROOT  # markdown docs live at repo root
REPORTS_DIR = PROJECT_ROOT / "research_reports"

# Web search settings
MAX_SEARCH_RESULTS = 8
REQUEST_TIMEOUT = 15  # seconds
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Document search settings
SUPPORTED_DOC_EXTENSIONS = {".md", ".txt", ".json", ".csv"}

# Report settings
REPORT_FORMAT = "markdown"  # markdown | text

# LLM settings (optional - for AI-powered summarisation)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
