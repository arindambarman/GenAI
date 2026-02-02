#!/usr/bin/env python3
"""
Research Agent - CLI Entry Point

Run a research agent that searches local documents and the web,
then produces a structured Markdown report.

Usage:
    python run_research.py "your research query"
    python run_research.py --offline "your research query"
    python run_research.py --interactive
"""

from __future__ import annotations

import argparse
import logging
import sys

from research_agent.agent import ResearchAgent


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.WARNING
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def run_single_query(agent: ResearchAgent, query: str, include_web: bool, save: bool) -> None:
    """Execute a single research query and display/save the report."""
    report = agent.research(query, include_web=include_web)
    markdown = report.to_markdown()
    print(markdown)

    if save:
        path = report.save()
        print(f"\nReport saved to: {path}")


def run_interactive(agent: ResearchAgent, include_web: bool, save: bool) -> None:
    """Run the agent in interactive mode, accepting queries in a loop."""
    print("\n" + "=" * 60)
    print("  Research Agent - Interactive Mode")
    print("  Type a research query, or 'quit' to exit.")
    print("=" * 60 + "\n")

    while True:
        try:
            query = input("Research query> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not query:
            continue
        if query.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        run_single_query(agent, query, include_web, save)
        print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Research Agent - Search, analyse, and report on any topic.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  python run_research.py "knowledge management systems"
  python run_research.py --offline "document retrieval pipeline"
  python run_research.py --interactive
  python run_research.py --save "AI research trends"
        """,
    )
    parser.add_argument(
        "query",
        nargs="?",
        help="Research query to investigate",
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Run in interactive mode (continuous query loop)",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Only search local documents (skip web search)",
    )
    parser.add_argument(
        "--save", "-s",
        action="store_true",
        help="Save the report to research_reports/ directory",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose/debug logging",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    if not args.query and not args.interactive:
        parser.print_help()
        sys.exit(1)

    agent = ResearchAgent()
    include_web = not args.offline

    if args.interactive:
        run_interactive(agent, include_web, args.save)
    else:
        run_single_query(agent, args.query, include_web, args.save)


if __name__ == "__main__":
    main()
