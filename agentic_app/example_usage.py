#!/usr/bin/env python3
"""Example: programmatic usage of the Agentic Analysis & Reporting pipeline.

This script shows how to use the agents individually or via the orchestrator
from your own Python code.
"""

import os
import sys
import json
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)


def example_full_pipeline():
    """Run both agents end-to-end via the Orchestrator."""
    from agents.orchestrator import Orchestrator

    orchestrator = Orchestrator()
    result = orchestrator.run("Generative AI market trends in 2025")

    print("\n--- Pipeline Result ---")
    if result.research:
        print(f"Executive Summary: {result.research.executive_summary[:200]}...")
        print(f"Findings count  : {len(result.research.findings)}")
    if result.report and result.report.generated_files:
        print(f"Generated files : {result.report.generated_files}")
    if result.errors:
        print(f"Errors          : {result.errors}")


def example_research_only():
    """Run just the Research Agent."""
    from agents.research_agent import ResearchAgent

    agent = ResearchAgent()
    research = agent.research("Electric vehicle market share by manufacturer 2025")

    print("\n--- Research Result ---")
    print(json.dumps(research.model_dump(), indent=2, default=str))


def example_report_from_existing_data():
    """Feed pre-existing research data directly into the Report Agent."""
    from agents.report_agent import ReportAgent
    from models.schemas import ResearchResult, ResearchFinding

    # Build a ResearchResult manually (e.g. from a saved file).
    research = ResearchResult(
        query="Sample query",
        executive_summary="This is a sample executive summary for demonstration.",
        findings=[
            ResearchFinding(
                title="Finding 1",
                source_url="https://example.com",
                summary="Sample finding about market growth.",
                key_data_points=["Market grew 15% YoY", "$500B projected by 2027"],
                relevance_score=0.9,
            ),
            ResearchFinding(
                title="Finding 2",
                source_url="https://example.com/report",
                summary="Competition landscape is shifting.",
                key_data_points=["Top 3 players hold 60% share", "10 new entrants in 2024"],
                relevance_score=0.85,
            ),
        ],
        search_queries_used=["sample market query"],
        sources=["https://example.com", "https://example.com/report"],
    )

    agent = ReportAgent()
    report = agent.create_report(research)

    print("\n--- Report Result ---")
    print(f"Title          : {report.title}")
    print(f"Generated files: {report.generated_files}")


if __name__ == "__main__":
    print("Choose an example to run:")
    print("  1  Full pipeline (Research + Report)")
    print("  2  Research Agent only")
    print("  3  Report Agent with pre-built data")

    choice = input("\nEnter 1, 2, or 3: ").strip()
    if choice == "1":
        example_full_pipeline()
    elif choice == "2":
        example_research_only()
    elif choice == "3":
        example_report_from_existing_data()
    else:
        print("Invalid choice.")
