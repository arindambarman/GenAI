#!/usr/bin/env python3
"""Agentic Analysis & Reporting Application.

CLI entry point that orchestrates the Research Agent and Report Agent.

Usage
-----
    # Interactive mode (prompts for a topic)
    python main.py

    # Direct mode
    python main.py "AI trends in healthcare 2025"

    # With verbose logging
    python main.py --verbose "Electric vehicle market analysis"
"""

from __future__ import annotations

import argparse
import logging
import sys
import os

# Ensure the package root is on sys.path so internal imports work when
# running as ``python main.py`` from within the agentic_app directory.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

from agents.orchestrator import Orchestrator

console = Console()


def _setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
        datefmt="%H:%M:%S",
    )
    # Quieten noisy third-party loggers.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def _print_banner() -> None:
    console.print(
        Panel(
            "[bold blue]Agentic Analysis & Reporting Application[/]\n"
            "[dim]Research Agent  ──▶  Report Agent  ──▶  PPTX / HTML / Markdown[/]",
            border_style="blue",
            expand=False,
        )
    )


def _print_results(result) -> None:
    """Pretty-print the pipeline result to the console."""
    if result.errors:
        for err in result.errors:
            console.print(f"[bold red]Error:[/] {err}")
        return

    # Research summary
    if result.research:
        console.print("\n")
        console.print(Panel("[bold green]Research Complete[/]", expand=False))
        console.print(Markdown(f"**Query:** {result.research.query}"))
        console.print(Markdown(f"**Summary:** {result.research.executive_summary}"))
        console.print(f"[dim]Findings: {len(result.research.findings)} | "
                       f"Sources: {len(result.research.sources)}[/]")

    # Report summary
    if result.report:
        console.print("\n")
        console.print(Panel("[bold green]Report Generated[/]", expand=False))
        if result.report.generated_files:
            console.print("[bold]Generated files:[/]")
            for f in result.report.generated_files:
                console.print(f"  - {f}")
        else:
            console.print("[dim]No output files recorded (check output/ directory).[/]")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Agentic Analysis & Reporting pipeline."
    )
    parser.add_argument(
        "topic",
        nargs="?",
        default=None,
        help="Market research topic to analyse.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose / debug logging.",
    )
    args = parser.parse_args()

    _setup_logging(args.verbose)
    _print_banner()

    topic = args.topic
    if not topic:
        topic = console.input("[bold cyan]Enter your research topic:[/] ").strip()
    if not topic:
        console.print("[red]No topic provided. Exiting.[/]")
        sys.exit(1)

    console.print(f"\n[bold]Researching:[/] {topic}\n")

    orchestrator = Orchestrator()
    result = orchestrator.run(topic)
    _print_results(result)


if __name__ == "__main__":
    main()
