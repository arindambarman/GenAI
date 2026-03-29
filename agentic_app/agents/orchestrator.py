"""Orchestrator – coordinates the Research Agent and Report Agent pipeline.

Flow:
    user query ──▶ ResearchAgent ──▶ ResearchResult
                                         │
                                         ▼
                                    ReportAgent ──▶ ReportOutput (PPTX / HTML / MD)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from agents.research_agent import ResearchAgent
from agents.report_agent import ReportAgent
from models.schemas import ResearchResult, ReportOutput

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    """Everything produced by a single orchestrated run."""

    query: str
    research: ResearchResult | None = None
    report: ReportOutput | None = None
    errors: list[str] = field(default_factory=list)

    @property
    def success(self) -> bool:
        return len(self.errors) == 0 and self.research is not None


class Orchestrator:
    """Runs the two-agent pipeline: Research → Report."""

    def __init__(self) -> None:
        self.research_agent = ResearchAgent()
        self.report_agent = ReportAgent()

    def run(self, query: str) -> PipelineResult:
        """Execute the full research-then-report pipeline for *query*."""
        result = PipelineResult(query=query)

        # ── Stage 1: Research ─────────────────────────────────────────
        logger.info("=" * 60)
        logger.info("STAGE 1 – Research Agent starting")
        logger.info("=" * 60)

        try:
            result.research = self.research_agent.research(query)
            logger.info(
                "Research complete – %d findings, %d sources",
                len(result.research.findings),
                len(result.research.sources),
            )
        except Exception as exc:
            msg = f"Research Agent failed: {exc}"
            logger.error(msg, exc_info=True)
            result.errors.append(msg)
            return result

        # ── Stage 2: Report ───────────────────────────────────────────
        logger.info("=" * 60)
        logger.info("STAGE 2 – Report Agent starting")
        logger.info("=" * 60)

        try:
            result.report = self.report_agent.create_report(result.research)
            logger.info(
                "Report complete – generated files: %s",
                result.report.generated_files,
            )
        except Exception as exc:
            msg = f"Report Agent failed: {exc}"
            logger.error(msg, exc_info=True)
            result.errors.append(msg)

        return result
