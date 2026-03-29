# Agentic Analysis & Reporting Application

A two-agent system that automates market research and report generation.

```
User Query ──▶ Research Agent ──▶ Report Agent ──▶ PPTX / HTML / Markdown
```

## Architecture

### Research Agent
- Searches the internet using DuckDuckGo (no API key required)
- Scrapes web pages for detailed information
- Synthesises findings into a structured `ResearchResult`
- Uses an **agentic tool-use loop**: the LLM decides which tools to call and when to stop

### Report Agent
- Takes the research output and structures it into report sections
- Writes professional executive summaries and bullet points
- Calls the `generate_report` tool to produce three output formats:
  - **PowerPoint (.pptx)** – presentation-ready slides
  - **HTML** – styled, self-contained web page
  - **Markdown** – portable plain-text report

### Orchestrator
Coordinates the two agents in a pipeline: Research → Report.

## Project Structure

```
agentic_app/
├── main.py                  # CLI entry point
├── example_usage.py         # Programmatic usage examples
├── config.py                # Environment-based configuration
├── requirements.txt         # Python dependencies
├── .env.example             # Template for environment variables
├── agents/
│   ├── base_agent.py        # Agentic loop with tool-use (Anthropic + OpenAI)
│   ├── research_agent.py    # Web research agent
│   ├── report_agent.py      # Report formatting agent
│   └── orchestrator.py      # Two-stage pipeline coordinator
├── tools/
│   ├── web_search.py        # DuckDuckGo search tool
│   ├── web_scraper.py       # HTML page scraper
│   └── report_generator.py  # PPTX / HTML / Markdown generator
├── models/
│   └── schemas.py           # Pydantic data models
└── output/                  # Generated report files land here
```

## Setup

```bash
cd agentic_app

# Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your LLM provider
cp .env.example .env
# Edit .env and add your API key
```

### Supported LLM Providers

| Provider   | Env Variable         | Default Model              |
|------------|----------------------|----------------------------|
| Anthropic  | `ANTHROPIC_API_KEY`  | `claude-sonnet-4-20250514`|
| OpenAI     | `OPENAI_API_KEY`     | `gpt-4o`                   |

Set `LLM_PROVIDER=anthropic` or `LLM_PROVIDER=openai` in your `.env`.

## Usage

### CLI

```bash
# Interactive – prompts for a topic
python main.py

# Direct – pass the topic as an argument
python main.py "AI trends in healthcare 2025"

# Verbose logging
python main.py --verbose "Electric vehicle market analysis"
```

### Programmatic

```python
from agents.orchestrator import Orchestrator

orchestrator = Orchestrator()
result = orchestrator.run("Generative AI market trends 2025")

# Access research findings
print(result.research.executive_summary)
for f in result.research.findings:
    print(f.title, f.source_url)

# Access generated files
print(result.report.generated_files)
```

See `example_usage.py` for more patterns including running agents individually.

## Configuration

All settings can be overridden via environment variables (or `.env` file):

| Variable                   | Default   | Description                         |
|----------------------------|-----------|-------------------------------------|
| `LLM_PROVIDER`            | anthropic | `anthropic` or `openai`             |
| `ANTHROPIC_API_KEY`       | —         | Your Anthropic API key              |
| `OPENAI_API_KEY`          | —         | Your OpenAI API key                 |
| `MAX_RESEARCH_ITERATIONS` | 5         | Max tool-use loops for Research Agent |
| `MAX_SEARCH_RESULTS`      | 5         | Results per web search call         |
| `REQUEST_TIMEOUT`         | 30        | HTTP timeout in seconds             |
| `OUTPUT_DIR`              | output    | Directory for generated files       |

## How the Agentic Loop Works

Each agent runs an autonomous **tool-use loop**:

1. The LLM receives a system prompt describing its role and available tools.
2. The user message (research topic or research data) is sent.
3. If the LLM responds with tool calls, the tools are executed and results fed back.
4. Steps 2-3 repeat until the LLM produces a final text response (no more tool calls) or the iteration limit is reached.

This is a true agentic pattern – the LLM decides **which** tools to call, **what arguments** to pass, and **when** it has enough information to stop.
