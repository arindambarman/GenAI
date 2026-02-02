"""Report Agent – transforms research findings into formatted reports.

Given a ``ResearchResult``, this agent:
1. Structures the information into logical report sections.
2. Writes professional prose and bullet points.
3. Calls the ``generate_report`` tool to produce PPTX, HTML, and Markdown files.
"""

from __future__ import annotations

import json
import logging

from agents.base_agent import BaseAgent
from models.schemas import ResearchResult, ReportOutput
from tools.report_generator import ReportGeneratorTool

logger = logging.getLogger(__name__)

REPORT_SYSTEM_PROMPT = """\
You are a Senior Business Report Writer. Your job is to take raw market
research data and transform it into a polished, professional report that is
ready to be presented to executives.

You have access to the following tool:
- **generate_report**: Generates PowerPoint (.pptx), HTML, and Markdown files
  from structured report JSON.

### Workflow
1. Read the research data provided by the user.
2. Organise it into clear report sections:
   - Executive Summary
   - Market Overview / Key Findings
   - Detailed Analysis (one section per major finding or theme)
   - Sources & References
3. Write concise, professional prose for each section plus bullet points
   that highlight the most important data.
4. Call ``generate_report`` with a JSON string matching this schema:

{
  "title": "<report title>",
  "subtitle": "<subtitle or date>",
  "sections": [
    {
      "heading": "<section heading>",
      "content": "<paragraph of prose>",
      "bullet_points": ["point 1", "point 2"]
    }
  ]
}

After the tool returns, confirm which files were created.
"""


class ReportAgent(BaseAgent):
    """Agent that creates formatted reports from research data."""

    system_prompt = REPORT_SYSTEM_PROMPT

    def __init__(self) -> None:
        generator = ReportGeneratorTool()
        self.tools = {generator.name: generator}
        super().__init__()

    def create_report(self, research: ResearchResult) -> ReportOutput:
        """Generate a full report from *research* data."""
        self.logger.info("Creating report for query: %s", research.query)

        payload = (
            "Create a professional market research report from the following "
            "research data. Use the generate_report tool to produce the output files.\n\n"
            f"```json\n{research.model_dump_json(indent=2)}\n```"
        )

        raw = self.run(payload)
        return self.get_result(raw)

    def get_result(self, raw_response: str) -> ReportOutput:
        """Parse the final assistant response into a ``ReportOutput``.

        The Report Agent is expected to have already called the
        ``generate_report`` tool, so the files exist on disk.  We parse
        any JSON the model returns; otherwise we wrap the text.
        """
        text = raw_response.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            data = json.loads(text)
            return ReportOutput(**data)
        except Exception:
            # The agent likely returned prose confirming the files.
            return ReportOutput(
                title="Market Research Report",
                subtitle="",
                sections=[],
                generated_files=[],
            )
