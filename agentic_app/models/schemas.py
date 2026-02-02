"""Pydantic data models shared across agents and tools."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Research models
# ---------------------------------------------------------------------------

class ResearchFinding(BaseModel):
    """A single finding from a web research session."""

    title: str = Field(description="Short headline for this finding")
    source_url: str = Field(default="", description="URL where the data was found")
    summary: str = Field(description="Concise summary of the finding")
    key_data_points: list[str] = Field(
        default_factory=list,
        description="Bullet-point data extracted from the source",
    )
    relevance_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="How relevant this finding is to the query (0-1)",
    )


class ResearchResult(BaseModel):
    """Aggregated output produced by the Research Agent."""

    query: str = Field(description="The original research query")
    executive_summary: str = Field(description="High-level summary of all findings")
    findings: list[ResearchFinding] = Field(default_factory=list)
    search_queries_used: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


# ---------------------------------------------------------------------------
# Report models
# ---------------------------------------------------------------------------

class ReportSection(BaseModel):
    """One section inside a report."""

    heading: str
    content: str
    bullet_points: list[str] = Field(default_factory=list)


class ReportOutput(BaseModel):
    """Final report artefact produced by the Report Agent."""

    title: str
    subtitle: str = ""
    sections: list[ReportSection] = Field(default_factory=list)
    generated_files: list[str] = Field(
        default_factory=list,
        description="Paths to files generated (PPTX, HTML, Markdown)",
    )
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


# ---------------------------------------------------------------------------
# Agent messaging primitives
# ---------------------------------------------------------------------------

class ToolCall(BaseModel):
    """Represents a tool invocation requested by an agent."""

    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    """Result returned after executing a tool."""

    tool_name: str
    success: bool = True
    data: Any = None
    error: str | None = None


class AgentMessage(BaseModel):
    """A message exchanged in the agent loop."""

    role: str = Field(description="'user', 'assistant', or 'tool'")
    content: str = ""
    tool_calls: list[ToolCall] = Field(default_factory=list)
    tool_results: list[ToolResult] = Field(default_factory=list)
