"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

# --- LLM Provider ---
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")

# --- Agent behaviour ---
MAX_RESEARCH_ITERATIONS: int = int(os.getenv("MAX_RESEARCH_ITERATIONS", "5"))
MAX_SEARCH_RESULTS: int = int(os.getenv("MAX_SEARCH_RESULTS", "5"))
REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))

# --- Output ---
OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", os.path.join(os.path.dirname(__file__), "output"))
