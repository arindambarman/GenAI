---
id: codeact-2024
title: "Executable Code Actions Elicit Better LLM Agents"
authors: ["Xingyao Wang", "Yangyi Chen", "Lifan Yuan", "Yizhe Zhang", "Yunzhu Li", "Hao Peng", "Heng Ji"]
year: 2024
venue: ICML 2024
tags: [agent, code-execution, tool-use, sandboxing]
---

# CodeAct: Executable Code Actions Elicit Better LLM Agents

## Abstract
We propose using executable Python code as the action space for LLM agents (CodeAct), replacing the typed-tool-call format used in ReAct and most production frameworks. This enables agents to compose multiple tool calls, use control flow, and perform data manipulation in a single action.

## Key contributions
1. Code as the unified action representation.
2. Compositional benefits: one code block can replace many sequential tool calls.
3. ~20% accuracy improvement over typed-tool-call baselines on multi-step benchmarks.
4. Demonstrates the value of pretrained code understanding for agent reasoning.

## Method
The agent emits Python code blocks instead of JSON tool calls. A sandboxed Python interpreter executes the code; output is fed back as the observation. The agent has access to a set of Python functions representing tools.

## Results
- M3ToolEval (multi-step agentic): CodeAct outperforms standard ReAct by 20%+
- Reduces total tool-call count by ~50% on tasks involving data manipulation.

## Limitations
- Requires sandboxing (security): without isolation, CodeAct is a remote code execution vector.
- Traces are harder to audit than typed tool calls.
- Failure modes shift from "wrong tool" to "wrong code logic" — different debugging skill set.

## Comparison to ReAct
ReAct: agent emits structured tool calls one at a time.
CodeAct: agent emits Python code that can call multiple tools, branch on results, and manipulate data — all in one model invocation.

## When to use
- **CodeAct wins**: tasks heavy in data manipulation across tool outputs (filtering, joining, aggregation).
- **ReAct wins**: tasks where each next step genuinely depends on the previous observation; tasks where audit-ability matters more than compositionality.

## Sandbox considerations
Production CodeAct requires hardened sandboxes (Docker, Firecracker, gVisor, E2B). Default-deny network egress is non-negotiable.
