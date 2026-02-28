# ADAPTLEARN POC — CLAUDE.md

## Project
Adaptive learning platform for banking professionals.
5 agents: Master Agent, Scout, Content Creator, Assessment, Learning.
All inter-agent messages go through Context Bus (agent_messages table).
No agent imports another agent's code — shared types only from agents/shared/

## Tech Stack
Node.js 20 · TypeScript 5 strict · pnpm · Next.js 14 · Supabase · Zod · Vitest

## Critical Rules
1. All LLM output validated with Zod before use — throw if invalid
2. agent_messages is the ONLY inter-agent channel — no direct imports
3. Run tsc --noEmit before committing — no broken TypeScript
4. Unit test every pure function — mocked LLM calls are fine in unit tests
5. Git commit after every passing verification gate

## Models
claude-sonnet-4-6      ← Master Agent intent, Content Creator generation
claude-haiku-4-5-20251001 ← Flashcards, scoring, Scout extraction, connector text

## DB Tables (7 active)
topics · skill_map · content_items · assessment_results
user_progress · agent_messages · master_agent_log

## Agent Execution Model
Agents run as in-process functions called from Next.js API routes.
Master Agent is the entry point — API route calls Master, which dispatches via Context Bus.
Other agents are invoked in-process after dispatch.

## Authentication
Supabase Auth with email/password login.

## Search / Research
Scout Agent uses: Tavily API, Perplexity API, Claude API for synthesis.

## ── CURRENT SESSION CONTEXT ─────────────────────
Session: S1 — Monorepo setup + DB schema
Build:
  - pnpm workspace (apps/web, agents/*)
  - tsconfig.base.json with strict mode
  - .env.example with all required keys
  - Supabase migration 001–007 (7 POC tables)
  - agents/shared/types/index.ts (Zod schemas)
  - agents/shared/bus.ts (Context Bus client)
  - agents/shared/db.ts (Supabase client)
Do NOT:
  - Write any agent logic yet
  - Create UI components beyond placeholder
Done when:
  - pnpm install succeeds
  - tsc --noEmit passes
  - All 7 migration files verified
  - bus.ts exports: dispatchMessage, pollMessages, claimMessage, completeMessage, failMessage
