"""Core research agent that orchestrates tools to conduct research."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

from research_agent.report import ResearchReport
from research_agent.tools.doc_search import DocMatch, DocSearchTool
from research_agent.tools.summarizer import SummarizerTool
from research_agent.tools.web_search import SearchResult, WebSearchTool

logger = logging.getLogger(__name__)


@dataclass
class ResearchAgent:
    """Autonomous research agent that searches the web and local documents,
    then produces a structured report."""

    web_search: WebSearchTool = field(default_factory=WebSearchTool)
    doc_search: DocSearchTool = field(default_factory=DocSearchTool)
    summarizer: SummarizerTool = field(default_factory=SummarizerTool)

    def research(self, query: str, include_web: bool = True) -> ResearchReport:
        """Run a full research pipeline for the given query.

        Steps:
        1. Search local knowledge base documents
        2. Search the web (if enabled)
        3. Collect and deduplicate findings
        4. Summarise results
        5. Generate a structured report
        """
        report = ResearchReport(query=query)
        print(f"\n{'='*60}")
        print(f"  Research Agent - Investigating: {query}")
        print(f"{'='*60}\n")

        # --- Step 1: Local document search ---
        print("[1/4] Searching local knowledge base...")
        doc_results = self.doc_search.search(query)
        if doc_results:
            doc_section = self._format_doc_results(doc_results)
            report.add_section("Local Knowledge Base Findings", doc_section)
            print(f"      Found relevant content in {len(doc_results)} document(s)")
        else:
            report.add_section(
                "Local Knowledge Base Findings",
                "No matching documents found in the local knowledge base.",
            )
            print("      No local matches found")

        # --- Step 2: Web search ---
        web_results: list[SearchResult] = []
        news_results: list[SearchResult] = []
        if include_web:
            print("[2/4] Searching the web...")
            web_results = self.web_search.search(query)
            print(f"      Found {len(web_results)} web result(s)")

            print("[3/4] Searching news sources...")
            news_results = self.web_search.search_news(query)
            print(f"      Found {len(news_results)} news result(s)")
        else:
            print("[2/4] Web search skipped (offline mode)")
            print("[3/4] News search skipped (offline mode)")

        if web_results:
            web_section = self._format_web_results(web_results)
            report.add_section("Web Research Findings", web_section)

        if news_results:
            news_section = self._format_web_results(news_results)
            report.add_section("Recent News", news_section)

        # --- Step 3: Synthesis ---
        print("[4/4] Synthesising findings...")
        synthesis = self._synthesise(query, doc_results, web_results, news_results)
        report.add_section("Synthesis & Key Takeaways", synthesis)

        print(f"\n{'='*60}")
        print("  Research complete!")
        print(f"{'='*60}\n")

        return report

    # ------------------------------------------------------------------
    # Formatting helpers
    # ------------------------------------------------------------------

    def _format_doc_results(self, results: list[DocMatch]) -> str:
        lines: list[str] = []
        for match in results:
            lines.append(f"### {match.file} (relevance: {match.score})")
            lines.append("")
            for excerpt in match.excerpts:
                lines.append(f"> {excerpt}")
                lines.append("")
        return "\n".join(lines)

    def _format_web_results(self, results: list[SearchResult]) -> str:
        lines: list[str] = []
        for idx, res in enumerate(results, 1):
            lines.append(f"### {idx}. {res.title}")
            lines.append(f"**Source:** {res.url}")
            lines.append("")
            lines.append(res.snippet)
            lines.append("")
        return "\n".join(lines)

    def _synthesise(
        self,
        query: str,
        doc_results: list[DocMatch],
        web_results: list[SearchResult],
        news_results: list[SearchResult],
    ) -> str:
        """Produce a synthesis section from all gathered sources."""
        all_text_parts: list[str] = []

        for match in doc_results:
            all_text_parts.extend(match.excerpts)

        for res in web_results:
            all_text_parts.append(res.snippet)

        for res in news_results:
            all_text_parts.append(res.snippet)

        if not all_text_parts:
            return (
                f"No information was found for the query **\"{query}\"**. "
                "Consider refining the query or broadening the search terms."
            )

        combined = " ".join(all_text_parts)
        key_points = self.summarizer.extract_key_points(combined, num_points=6)

        lines = [
            f"Based on the research conducted for **\"{query}\"**, "
            f"here are the key takeaways:\n",
        ]
        for i, point in enumerate(key_points, 1):
            # Truncate very long sentences
            if len(point) > 300:
                point = point[:297] + "..."
            lines.append(f"{i}. {point}")

        lines.append("")
        lines.append(f"**Sources consulted:** {len(doc_results)} local document(s), "
                      f"{len(web_results)} web result(s), {len(news_results)} news article(s)")

        return "\n".join(lines)
