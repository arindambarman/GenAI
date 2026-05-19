# Research Agent (Capstone 2)

A research synthesis agent: given a research question, retrieves from a curated corpus, reads multiple sources, and produces a synthesis with verifiable citations.

## Architecture

| Component | Implements module reference |
|---|---|
| Agent loop | Lesson 4.1 (ReAct) |
| Tool schemas | Lesson 3.2 (strict tool use), 3.3 (constrained output) |
| Retrieval | Lesson 5.1 (corpus search) |
| Verification | Lesson 5.3 (citation faithfulness) |
| Submit-synthesis as terminator | Lesson 4.1 (model-driven termination) |
| Faithfulness audit | Lesson 5.3 (verification), Lesson 10.1 (safety) |

## Tools the agent has

- `search_corpus(query, k)` — keyword search over the corpus; returns top-k matches.
- `read_paper(id)` — full text of a paper.
- `verify_claim(claim, source_id, passage)` — deterministic check that the cited passage exists.
- `submit_synthesis({...})` — terminal call; returns the structured output.

## Run

```sh
# Default question (about agent paradigms)
pnpm --filter @adaptlearn/capstones research

# Custom question
pnpm --filter @adaptlearn/capstones research "What is the bitter lesson?"

# Without API key — runs in mock mode (canned responses)
ANTHROPIC_API_KEY="" pnpm --filter @adaptlearn/capstones research
```

## Output

The CLI prints:
1. The full agent trace (thoughts, tool calls, results)
2. The synthesis (prose + key findings + citations + confidence + caveats)
3. The faithfulness audit (independent verification of each citation)

## Corpus

`src/research-agent/corpus/` contains 6 papers about LLM-agent paradigms:
- ReAct (Yao et al. 2022)
- Reflexion (Shinn et al. 2023)
- Plan-and-Solve (Wang et al. 2023)
- CodeAct (Wang et al. 2024)
- The Bitter Lesson (Sutton 2019)
- Multiagent Debate (Du et al. 2023)

To extend: drop more `.md` files with frontmatter (`id`, `title`, `authors`, `year`, `venue`, `tags`) into `corpus/`.

## How faithfulness is enforced

Three layers:
1. **In-prompt rule**: system prompt says "every claim must be cited."
2. **Verify-claim tool**: agent self-checks each citation before submitting.
3. **Audit pass**: after the agent submits, an independent function re-checks every citation against the corpus.

The audit's faithfulness score is what you'd compare against the Capstone 2 target (≥ 80%).

## Mock mode

If `ANTHROPIC_API_KEY` is unset (or `CAPSTONE_MOCK=true`), the agent uses a canned response sequence in `mock.ts`. The architecture exercises end-to-end, but the synthesis is pre-scripted.
