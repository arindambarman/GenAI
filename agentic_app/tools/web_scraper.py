"""Web scraper tool – fetches a URL and extracts readable text."""

from __future__ import annotations

import logging
import re

import requests
from bs4 import BeautifulSoup

import config

logger = logging.getLogger(__name__)

_UNWANTED_TAGS = {"script", "style", "nav", "footer", "header", "aside", "form"}
_MAX_TEXT_LENGTH = 12_000  # keep context window manageable


class WebScraperTool:
    """Fetches a web page and returns its main textual content."""

    name: str = "web_scrape"
    description: str = (
        "Fetch a web page by URL and extract its readable text content. "
        "Useful for diving deeper into a specific search result."
    )

    parameters_schema: dict = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "The full URL of the page to scrape.",
            },
        },
        "required": ["url"],
    }

    def run(self, url: str) -> dict:
        """Fetch *url* and return extracted text with metadata.

        Returns a dict with keys: url, title, text, error.
        """
        logger.info("Scraping URL: %s", url)
        try:
            resp = requests.get(
                url,
                timeout=config.REQUEST_TIMEOUT,
                headers={"User-Agent": "AgenticResearchBot/1.0"},
            )
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")

            # Remove tags that rarely contain useful prose.
            for tag in soup.find_all(_UNWANTED_TAGS):
                tag.decompose()

            title = soup.title.string.strip() if soup.title and soup.title.string else ""
            raw_text = soup.get_text(separator="\n", strip=True)

            # Collapse excessive whitespace.
            text = re.sub(r"\n{3,}", "\n\n", raw_text)

            if len(text) > _MAX_TEXT_LENGTH:
                text = text[:_MAX_TEXT_LENGTH] + "\n...[truncated]"

            logger.info("Scraped %d chars from %s", len(text), url)
            return {"url": url, "title": title, "text": text, "error": None}

        except Exception as exc:
            logger.error("Scrape failed for %s: %s", url, exc)
            return {"url": url, "title": "", "text": "", "error": str(exc)}
