/**
 * Scenario knowledge base: real-world problems + architectural solutions.
 * Each scenario cross-references concept_ids from concepts-seed.ts.
 */

export type Industry =
  | "banking" | "biotech" | "ecommerce"
  | "healthcare" | "legal" | "publicsector";

export type Archetype =
  | "agentic-rag" | "multi-agent" | "safety-critical"
  | "cost-optimization" | "multi-modal" | "long-horizon"
  | "batch-processing" | "tool-heavy" | "compliance" | "eval-driven";

export type Complexity = "starter" | "intermediate" | "advanced";

export interface Tradeoff { ruledOut: string; reason: string; }

export interface Scenario {
  id: string;
  title: string;
  industry: Industry;
  persona: string;
  archetype: Archetype;
  complexity: Complexity;
  situation: string;
  problem: string;
  approach: string[];
  conceptsApplied: string[];
  diagram: string;
  tradeoffs: Tradeoff[];
  evalCriteria: string;
  rollout: string;
  readNext: string[];   // lesson IDs like "5.4"
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  banking:      "Banking",
  biotech:      "Biotech / Research",
  ecommerce:    "E-commerce",
  healthcare:   "Healthcare",
  legal:        "Legal",
  publicsector: "Public Sector",
};

export const INDUSTRY_COLORS: Record<Industry, { bg: string; border: string; text: string }> = {
  banking:      { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  biotech:      { bg: "#dcfce7", border: "#16a34a", text: "#14532d" },
  ecommerce:    { bg: "#fef3c7", border: "#b45309", text: "#78350f" },
  healthcare:   { bg: "#fee2e2", border: "#b91c1c", text: "#7f1d1d" },
  legal:        { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
  publicsector: { bg: "#e0f2fe", border: "#0284c7", text: "#075985" },
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  "agentic-rag":       "Agentic RAG",
  "multi-agent":       "Multi-agent",
  "safety-critical":   "Safety-critical",
  "cost-optimization": "Cost optimization",
  "multi-modal":       "Multi-modal",
  "long-horizon":      "Long-horizon planning",
  "batch-processing":  "Batch processing",
  "tool-heavy":        "Tool-heavy",
  "compliance":        "Compliance / audit",
  "eval-driven":       "Eval-driven",
};

export const SCENARIOS: Scenario[] = [
  // ─── BANKING (HSBC) ──────────────────────────────────────────────
  {
    id: "hsbc-kyc-doc-review",
    title: "KYC document review at scale",
    industry: "banking",
    persona: "HSBC Mid-Office",
    archetype: "multi-modal",
    complexity: "intermediate",
    situation: "HSBC's mid-office processes 8,000 corporate KYC packages per month. Each package contains 30–80 PDFs (incorporation docs, UBO statements, sanctions screening). Analysts spend 40 minutes per package extracting and verifying fields against a 120-item checklist. Compliance failure rate is 6%, attracting regulatory attention.",
    problem: "Cut analyst time per package by 70% while keeping false-clear rate under 0.5% (regulator hard limit). Every decision must be auditable to SR 11-7 model risk standards.",
    approach: [
      "Use Claude's native PDF blocks (no OCR pre-step) so the model sees tables and stamps in context.",
      "Apply the Citations API to every extracted field so each value links back to a page+character range in source PDFs.",
      "Run Extended Thinking on the 12 highest-risk fields (UBO chain, sanctions match, jurisdiction); skip for routine fields to control cost.",
      "Use prompt caching on the 8-page checklist policy prompt (reused across all packages, saves ~85% on input cost).",
      "Route routine packages to Haiku, escalate complex ones to Sonnet via a tier-routing classifier.",
      "Log every decision to an append-only audit table (input hash, model version, prompt hash, output, analyst override) for SR 11-7 evidence.",
      "Human reviews every flagged item + a 5% random sample of approved ones; this becomes the regression eval set.",
    ],
    conceptsApplied: [
      "vision-pdf-native", "citations-api", "extended-thinking",
      "cache-control", "model-tier-routing", "audit-trail",
      "regression-eval", "calibration-ece",
    ],
    diagram: `graph LR
  PDF[KYC Package<br/>30-80 PDFs] --> CLS{Tier<br/>Classifier}
  CLS -->|routine 70%| HAIKU[Haiku<br/>+ cached policy<br/>+ citations]
  CLS -->|complex 30%| SONNET[Sonnet<br/>+ extended thinking<br/>+ citations]
  HAIKU --> AUDIT[(Audit Log<br/>SR 11-7)]
  SONNET --> AUDIT
  AUDIT --> REVIEW[Analyst<br/>flagged + 5% sample]
  REVIEW --> EVAL[Regression<br/>Eval Set]`,
    tradeoffs: [
      { ruledOut: "Pre-OCR with Textract then send text to Claude", reason: "Loses layout/table fidelity; stamps and signatures missed. Native PDF blocks score 14 points higher on internal eval." },
      { ruledOut: "Single Opus model for everything", reason: "5x cost with only 2-point quality lift on routine packages; tier routing captures most of the benefit." },
      { ruledOut: "Full autonomous approval", reason: "Regulator requires human-in-the-loop for first 12 months; design accordingly rather than retrofit." },
    ],
    evalCriteria: "Per-field accuracy ≥ 98% (sample of 500 packages, dual analyst grading) · False-clear rate ≤ 0.5% · Citation faithfulness ≥ 95% · Average wall-clock per package ≤ 12 min.",
    rollout: "Shadow mode (1 month, no impact on workflow) → Assist mode (analyst sees suggestions, 2 months) → Auto-approve routine + flag complex (6 months, with quarterly model risk review) → Re-baseline annually.",
    readNext: ["14.4", "14.2", "10.4", "8.1"],
  },
  {
    id: "hsbc-aml-investigation",
    title: "AML investigation co-pilot",
    industry: "banking",
    persona: "HSBC Financial Crime",
    archetype: "multi-agent",
    complexity: "advanced",
    situation: "AML investigators receive 600 transaction-monitoring alerts per day. Each alert requires pulling customer history, related parties, news sentiment, and prior SARs — 35 minutes of manual data assembly per alert. Backlog hits 2 weeks during peaks. Most alerts (82%) close as no-action.",
    problem: "Reduce time-to-first-decision per alert by 60% without missing any genuine money-laundering pattern. Investigators must remain final decision-makers (regulator non-negotiable).",
    approach: [
      "Orchestrator-Worker pattern: a planning agent decomposes each alert into sub-investigations (customer profile, related-party network, news/sanctions check, transaction pattern analysis).",
      "Each sub-investigation is a specialist worker with its own tool registry and scope-limited capability tokens (read-only access to specific tables).",
      "Hybrid retrieval (BM25 + dense embeddings + cross-encoder rerank) over the 4-year SAR corpus to find similar past cases.",
      "Specialists return typed handoff schemas; orchestrator synthesizes a structured 'investigation brief' instead of a freeform report.",
      "Privilege separation via CaMeL: the synthesis agent cannot call tools directly — only assemble outputs from specialists. Prevents prompt injection from external news.",
      "Every tool call logged with capability-token + input/output hash for audit replay.",
    ],
    conceptsApplied: [
      "orchestrator-worker", "specialist-supervisor", "handoff-schema",
      "tool-registry", "capability-token", "camel", "hybrid-retrieval",
      "prompt-injection", "audit-trail",
    ],
    diagram: `graph TB
  ALERT[TM Alert] --> PLAN[Planner Agent]
  PLAN -->|decomposed| ORCH[Orchestrator]
  ORCH -->|cap token A| W1[Customer<br/>Profile Worker]
  ORCH -->|cap token B| W2[Network<br/>Analysis Worker]
  ORCH -->|cap token C| W3[News + Sanctions<br/>Worker]
  ORCH -->|cap token D| W4[Pattern Match<br/>Worker - RAG over SARs]
  W1 --> SYNTH[Synthesis Agent<br/>CaMeL - no tools]
  W2 --> SYNTH
  W3 --> SYNTH
  W4 --> SYNTH
  SYNTH --> BRIEF[Structured<br/>Investigation Brief]
  BRIEF --> INV[Human Investigator]`,
    tradeoffs: [
      { ruledOut: "Single mega-agent with all tools", reason: "Prompt injection in news/email content could exfiltrate customer data. CaMeL separation is the only safe pattern." },
      { ruledOut: "Pre-compute everything overnight in batch", reason: "Alerts age fast; freshness matters more than the 50% batch discount." },
      { ruledOut: "Auto-close low-risk alerts", reason: "Regulator wants final human sign-off on every alert. Goal is decision support, not deflection." },
    ],
    evalCriteria: "Time-to-first-decision p50 ≤ 14 min (vs 35 min baseline) · 100% recall on adversarial red-team set (no genuine cases missed) · Zero successful prompt-injection in penetration test · Investigator override rate ≤ 8%.",
    rollout: "Build red-team injection set first (4 weeks) → Shadow mode with parallel runs (6 weeks) → Assist mode with investigator opt-in (3 months) → Default-on with rollback flag (12 months).",
    readNext: ["6.1", "6.3", "7.4", "10.2", "10.4"],
  },

  // ─── BIOTECH (Helix) ─────────────────────────────────────────────
  {
    id: "helix-literature-synthesis",
    title: "Literature synthesis with verifiable citations",
    industry: "biotech",
    persona: "Helix Research",
    archetype: "agentic-rag",
    complexity: "intermediate",
    situation: "Helix researchers spend 2–3 days assembling literature reviews for each new target. Sources span PubMed, internal lab notebooks, conference proceedings, and patent filings. Current LLM tools hallucinate ~12% of citations — unusable for any decision that goes into a grant or IND filing.",
    problem: "Produce a 5-page synthesis on demand for any target, with every claim citing a real source at page/paragraph granularity. Hallucination rate must drop below 1%.",
    approach: [
      "Agentic RAG: model decides what to retrieve, performs 3–5 hops, reformulates queries between hops based on what it learned.",
      "Hybrid retrieval (dense + BM25 + cross-encoder rerank) over a curated corpus of 380K papers + 14K internal notebooks.",
      "Synthesis pass uses Claude's Citations API on document blocks, so every claim links back to a specific page+character range.",
      "A separate eval agent (Sonnet) scores citation faithfulness on every output before delivery; outputs below 95% trigger re-retrieval.",
      "Memory compaction: per-target retrieval transcripts are summarized into a per-target knowledge object that the agent can re-read in future runs without re-retrieving.",
      "Researcher rates each synthesis on a 5-point scale; ratings + flagged citations feed back into the regression eval and the reranker training set.",
    ],
    conceptsApplied: [
      "agentic-rag", "hybrid-retrieval", "citations-api", "citation-faithfulness",
      "vision-pdf-native", "llm-judge", "memory-compaction", "regression-eval",
    ],
    diagram: `graph LR
  Q[Research<br/>Question] --> AGENT[Agentic RAG<br/>3-5 hops]
  AGENT <--> RET[Hybrid Retriever<br/>BM25 + dense + rerank]
  RET --> CORPUS[(380K papers<br/>14K notebooks)]
  AGENT --> SYNTH[Synthesis<br/>Citations API]
  SYNTH --> JUDGE[Eval Agent<br/>citation faithfulness]
  JUDGE -->|95% pass| DELIVER[5-page review]
  JUDGE -->|<95% fail| AGENT
  DELIVER --> MEMORY[(Per-target<br/>knowledge object)]`,
    tradeoffs: [
      { ruledOut: "Single-shot RAG (one retrieval, one generation)", reason: "Multi-hop questions fail 40% of the time; agentic RAG resolves them at 3x cost — worth it for this use case." },
      { ruledOut: "Pre-extracted citation text only (no native PDF)", reason: "Figures and table footnotes are where the load-bearing claims live; need native PDF to see them." },
      { ruledOut: "Human-rated faithfulness only", reason: "Too slow for daily use; LLM-judge with periodic human calibration (every 200 outputs) is the right cost trade." },
    ],
    evalCriteria: "Citation faithfulness ≥ 99% (LLM-judge, calibrated quarterly against human raters) · Researcher satisfaction ≥ 4.2/5 · Average turnaround ≤ 8 min for warm-cached targets, ≤ 30 min for cold.",
    rollout: "Pilot with 5 researchers on archived (already-done) reviews → compare side-by-side → expand to live targets with sign-off requirement → drop sign-off once citation faithfulness stays ≥ 99% for 60 days.",
    readNext: ["5.4", "5.5", "14.4", "8.3"],
  },
  {
    id: "helix-adverse-events-batch",
    title: "Adverse event classification at trial scale",
    industry: "biotech",
    persona: "Helix Clinical Ops",
    archetype: "batch-processing",
    complexity: "starter",
    situation: "A Phase 3 trial generates 1,400 adverse event narratives per week, each requiring MedDRA term coding + severity grading + relatedness assessment. Current process: 3 clinical coders, 18 min per AE, frequent inter-coder disagreement, $440K annual cost.",
    problem: "Auto-classify 80% of AEs with coder-level accuracy, surface the 20% complex cases for human review, cut cost by 60%, and produce an audit trail acceptable to the trial monitor.",
    approach: [
      "Batch API: submit each day's AEs as a single batch (1,400 requests), pay 50% of per-request price, results back within 24h. Acceptable since regulatory submission cadence is weekly.",
      "Each request includes the AE narrative + MedDRA hierarchy snippet + prior similar AEs (retrieved offline by ID matching) all under a single cached prompt prefix.",
      "Haiku for the base classification (fast, cheap, high recall); the 20% with low confidence are re-routed through Sonnet with Extended Thinking enabled.",
      "Structured output enforced via JSON Schema (MedDRA code, severity 1–5, relatedness 1–5, rationale).",
      "Coder reviews the 20% Sonnet output + a 10% audit sample of Haiku output; agreement scores feed weekly regression eval.",
    ],
    conceptsApplied: [
      "batch-api", "cache-control", "model-tier-routing",
      "strict-tool-use", "extended-thinking", "regression-eval", "audit-trail",
    ],
    diagram: `graph TB
  AES[1,400 AE<br/>narratives/week] --> BATCH[Batch API<br/>Haiku · cached prompt]
  BATCH -->|conf >= 0.85<br/>80%| AUTO[Auto-code]
  BATCH -->|conf < 0.85<br/>20%| ESC[Sonnet<br/>+ extended thinking]
  ESC --> CODER[Human Coder]
  AUTO -->|10% sample| AUDIT[Audit Sample]
  AUDIT --> WEEKLY[Weekly Eval Report]
  CODER --> WEEKLY`,
    tradeoffs: [
      { ruledOut: "Real-time (non-batch) processing", reason: "Coding doesn't block any downstream activity; 24h SLA fine. Saves $264K/year." },
      { ruledOut: "Fine-tuning a small model on past coded AEs", reason: "Coverage of new MedDRA terms requires retrains; prompt + cache + tier-routing achieves 96% of the quality at 0 ML-ops overhead." },
      { ruledOut: "Single coder per AE (current workflow)", reason: "Already proven unreliable on borderline cases; dual-review on the escalation path matches gold-standard pattern." },
    ],
    evalCriteria: "Auto-code accuracy ≥ 95% (vs dual-coder consensus on 200-case eval) · Escalation precision ≥ 70% (most escalations actually needed) · Cost per AE ≤ $0.18 (vs $5.40 baseline) · Zero misclassified Grade-4/5 events.",
    rollout: "Process backlog of 5,000 historical AEs and compare to existing codes (4 weeks) → parallel coding on live trial (6 weeks) → switch primary, coder reviews only escalations + sample (ongoing).",
    readNext: ["14.5", "14.3", "8.1"],
  },

  // ─── E-COMMERCE (Acme) ───────────────────────────────────────────
  {
    id: "acme-tier1-deflection",
    title: "Tier-1 support deflection with cost guardrails",
    industry: "ecommerce",
    persona: "Acme Customer Care",
    archetype: "cost-optimization",
    complexity: "starter",
    situation: "Acme handles 240K customer tickets per month. 70% are Tier-1 (order status, returns, password resets). Current chatbot deflects 18% but customers escalate frequently due to bad answers. Each agent-handled ticket costs $4.80; each successful self-serve costs $0.06.",
    problem: "Push deflection to 55% without making CSAT drop more than 3 points. Total API spend must stay under $0.04 per ticket on the average.",
    approach: [
      "7-block prompt structure with the company policy + brand voice cached at the top (saves ~90% on input cost across all tickets).",
      "Haiku as the default; a confidence classifier escalates ~15% of tickets to Sonnet when intent is unclear or the policy is ambiguous.",
      "Tool use: order_lookup, return_eligibility, password_reset — narrow, scoped tools with strict JSON schemas. No freeform 'search the help center' tool.",
      "Three-tier caching: prompt cache (policy) + semantic cache (recurring phrasings of common questions hit a frozen answer) + model cache (memoize order_lookup results for 5 min).",
      "Hard fallback: if the agent loops more than 3 turns without resolution, hand off to a human with the full transcript pre-summarized.",
      "Regression eval set of 500 representative tickets graded weekly; deflection rate and CSAT proxy tracked in CI.",
    ],
    conceptsApplied: [
      "seven-block-prompt", "cache-control", "prompt-cache-prod",
      "model-tier-routing", "strict-tool-use", "tool-registry",
      "regression-eval", "calibration-ece", "runbooks",
    ],
    diagram: `graph TB
  TICKET[Ticket] --> CACHE{Semantic<br/>cache hit?}
  CACHE -->|yes 30%| FROZEN[Frozen answer]
  CACHE -->|no| CLF{Confidence<br/>classifier}
  CLF -->|high 85%| HAIKU[Haiku<br/>+ cached policy<br/>+ tools]
  CLF -->|low 15%| SONNET[Sonnet<br/>+ cached policy<br/>+ tools]
  HAIKU --> RESOLVE{Resolved?}
  SONNET --> RESOLVE
  RESOLVE -->|yes 55%| DONE[Customer<br/>self-serve]
  RESOLVE -->|>3 turns or fail| HANDOFF[Human + summary]`,
    tradeoffs: [
      { ruledOut: "GPT-class model with built-in browsing", reason: "Latency too high (8s p50 vs 2s with Haiku + tools); customers abandon at 4s." },
      { ruledOut: "Hand-coded decision tree for top 50 intents", reason: "Maintenance burden every product launch; LLM with cached prompt achieves higher coverage without code changes." },
      { ruledOut: "Defer all 'maybe' cases to humans", reason: "Doesn't move deflection enough; need the Sonnet escalation tier to push past 40%." },
    ],
    evalCriteria: "Deflection ≥ 55% (rolling 7-day) · CSAT drop ≤ 3 points vs baseline · API cost ≤ $0.04/ticket · Handoff transcript usable: agent saves ≥ 6 min vs cold ticket.",
    rollout: "Replay 30 days of past tickets to estimate deflection (1 week) → 5% live traffic A/B (4 weeks) → 50% A/B (4 weeks) → full rollout with weekly eval review.",
    readNext: ["3.5", "9.3", "14.2", "14.3"],
  },
  {
    id: "acme-catalog-enrichment",
    title: "Product catalog enrichment from images",
    industry: "ecommerce",
    persona: "Acme Merchandising",
    archetype: "multi-modal",
    complexity: "intermediate",
    situation: "Acme onboards 12,000 new SKUs per week from 800+ sellers. Each SKU needs: standardized title, 5-attribute structured spec, 3-bullet description, and category mapping. Current ops team handles 4,500/week; the remainder ship with minimal metadata and rank poorly in search.",
    problem: "Auto-enrich 100% of new SKUs from supplier-provided images + raw text within 4h of upload, hitting parity with human-curated SKUs on click-through rate (CTR).",
    approach: [
      "Vision blocks: pass up to 5 product images + raw supplier text to Sonnet in one request.",
      "Structured output via JSON Schema with category-conditional fields (sports & outdoors has different attributes than home & kitchen).",
      "Cached category schema + brand voice prompt as the prefix; cuts input cost ~80% across the day's batch.",
      "Batch API for the daily enrichment run — 4h SLA is fine since SKUs are scheduled to go live the next morning.",
      "Quality check: a second pass (Haiku) compares the enriched fields against the original images and flags mismatches for human review.",
      "Weekly regression eval: compare CTR on auto-enriched SKUs vs human-curated; tune prompts if gap > 5%.",
    ],
    conceptsApplied: [
      "vision-pdf-native", "strict-tool-use", "cache-control",
      "batch-api", "llm-judge", "regression-eval", "model-tier-routing",
    ],
    diagram: `graph LR
  SKU[New SKU<br/>images + text] --> BATCH[Batch API<br/>Sonnet + vision<br/>cached schema]
  BATCH --> JSON[Structured<br/>JSON output]
  JSON --> CHECK[Haiku<br/>image-text match check]
  CHECK -->|pass 90%| LIVE[Live catalog]
  CHECK -->|flag 10%| HUMAN[Merchandiser review]
  LIVE --> CTR[CTR tracking]
  CTR --> EVAL[Weekly eval vs<br/>human-curated baseline]`,
    tradeoffs: [
      { ruledOut: "Real-time enrichment on upload", reason: "Sellers upload in spikes; batch saves 50% and the 4h SLA is invisible to sellers." },
      { ruledOut: "Single-pass with no quality check", reason: "10% flag rate justifies the second-pass cost; without it, supplier complaints triple." },
      { ruledOut: "Haiku-only", reason: "Vision quality on Haiku misses product-attribute nuances (fabric, finish); Sonnet is worth the bump." },
    ],
    evalCriteria: "100% of new SKUs enriched within 4h · Attribute accuracy ≥ 92% (human spot-check, 200 SKUs/week) · CTR on auto-enriched SKUs within 5% of human-curated · Seller complaints ≤ current baseline.",
    rollout: "Backfill 50K archived SKUs and compare to existing data (2 weeks) → parallel on 10% of new (4 weeks) → full traffic with merchandiser review on flags (ongoing).",
    readNext: ["14.4", "14.5", "8.3"],
  },

  // ─── HEALTHCARE ──────────────────────────────────────────────────
  {
    id: "healthcare-discharge-summary",
    title: "Discharge summary drafting (safety-critical)",
    industry: "healthcare",
    persona: "Regional hospital network",
    archetype: "safety-critical",
    complexity: "advanced",
    situation: "Hospitalists spend 45 minutes per patient drafting discharge summaries by stitching together notes, labs, and medication lists. Quality is uneven, follow-up instructions get lost, and 30-day readmission rates are sensitive to discharge clarity. Burnout is the top staffing risk.",
    problem: "Produce a draft discharge summary in 90 seconds that the hospitalist edits in ≤ 8 minutes. Zero tolerance for hallucinated medications, dosages, or follow-up dates.",
    approach: [
      "Privilege separation (CaMeL pattern): a planner agent assembles the input bundle from EHR tools; the drafting agent has NO direct EHR access — it only writes from the structured bundle.",
      "Strict tool use over the EHR with capability tokens scoped to the specific patient encounter only.",
      "Native PDF + Citations API for radiology reports and external referrals so every quoted figure links to its source.",
      "Extended Thinking enabled for the medication reconciliation step (the highest-risk section).",
      "A separate verification agent re-checks every medication and dosage against the structured bundle; mismatches block the draft from being returned.",
      "Hospitalist edits in-place; the diff is captured as eval signal and fed back to the regression set.",
      "Append-only audit log with model version, prompt hash, source data hash — sufficient for HIPAA disclosure and malpractice defense.",
    ],
    conceptsApplied: [
      "camel", "capability-token", "strict-tool-use",
      "vision-pdf-native", "citations-api", "extended-thinking",
      "regression-eval", "calibration-ece", "audit-trail",
    ],
    diagram: `graph TB
  ENC[Patient<br/>encounter] --> PLAN[Planner Agent<br/>cap token: this encounter only]
  PLAN -->|EHR tools| BUNDLE[Structured<br/>bundle]
  BUNDLE --> DRAFT[Drafting Agent<br/>CaMeL · no EHR access]
  DRAFT --> VERIFY[Verification Agent<br/>med + dosage check]
  VERIFY -->|mismatch| BLOCK[Block · alert]
  VERIFY -->|clean| DRAFT2[Draft summary]
  DRAFT2 --> HOSP[Hospitalist edits]
  HOSP --> SIGNED[Signed summary]
  HOSP --> EVAL[Diff -> eval set]
  SIGNED --> AUDIT[(Audit log<br/>HIPAA)]`,
    tradeoffs: [
      { ruledOut: "Single agent with EHR access", reason: "Prompt injection in pasted external notes is a realistic vector; CaMeL is the only safe pattern for safety-critical." },
      { ruledOut: "Auto-sign without hospitalist review", reason: "Legal and patient-safety non-starter; the goal is time savings, not autonomy." },
      { ruledOut: "Skip the verification agent", reason: "One missed medication is one too many; the 2nd-agent cost is trivial compared to harm risk." },
    ],
    evalCriteria: "Hospitalist edit time ≤ 8 min p75 (vs 45 min baseline) · Zero medication hallucinations in 1000-case eval · Citation faithfulness ≥ 99% · 30-day readmission rate non-inferior to baseline at 6 months.",
    rollout: "Read-only shadow mode (drafts generated but invisible to hospitalists, 3 months) → side-by-side comparison (3 months) → hospitalist opts in (12 months) → default-on with opt-out (ongoing).",
    readNext: ["10.2", "10.4", "14.3", "14.4"],
  },
  {
    id: "healthcare-radiology-second-read",
    title: "Radiology second-read assistant",
    industry: "healthcare",
    persona: "Imaging center",
    archetype: "multi-modal",
    complexity: "advanced",
    situation: "Radiologists read 80–120 studies/day. Subtle findings (small pulmonary nodules, early stroke signs) get missed at rates of 3–5% on the second-to-last read of a shift. Liability and patient harm concentrate in this fatigue window.",
    problem: "Provide a second-read assistant that flags candidate findings on every study, with low enough false-positive rate that radiologists actually attend to flags rather than ignoring them.",
    approach: [
      "Vision blocks on Sonnet for each DICOM-derived image series (key slices selected by a small classifier pre-step).",
      "Extended Thinking enabled — radiologists value visible reasoning chains they can audit.",
      "Cached prompt: the structured reporting template + the study protocol + the patient's prior comparison findings. Same template applies to thousands of studies/day.",
      "Output is a structured candidate-findings list with location (image+coords), confidence (1–5), and rationale — NOT a freeform report.",
      "Radiologist reviews flags inline in the PACS UI; accept/reject feeds back to the eval set.",
      "Quarterly calibration: compare flag rate against ground-truth follow-up outcomes (biopsies, clinical resolution) to ensure neither over- nor under-calling.",
    ],
    conceptsApplied: [
      "vision-pdf-native", "extended-thinking", "cache-control",
      "strict-tool-use", "regression-eval", "calibration-ece", "audit-trail",
    ],
    diagram: `graph LR
  STUDY[DICOM study] --> SLICE[Key-slice<br/>classifier]
  SLICE --> CLAUDE[Sonnet vision<br/>+ extended thinking<br/>+ cached template]
  CLAUDE --> FINDINGS[Structured<br/>candidate findings]
  FINDINGS --> PACS[PACS UI<br/>radiologist review]
  PACS --> ACCEPT{Accept?}
  ACCEPT -->|yes| REPORT[Final report]
  ACCEPT -->|no| EVAL[Eval set]
  REPORT --> OUTCOME[6-mo outcome tracking]
  OUTCOME --> CAL[Quarterly calibration]`,
    tradeoffs: [
      { ruledOut: "Replace radiologist primary read", reason: "Regulatory non-starter; positioning matters — assistive only." },
      { ruledOut: "Freeform report generation", reason: "Hard to integrate into PACS workflow; structured findings are reviewable in seconds." },
      { ruledOut: "No extended thinking", reason: "Radiologists need to see the reasoning to trust the flag; opacity destroys adoption." },
    ],
    evalCriteria: "Sensitivity on a held-out 500-study set ≥ 94% · False-positive rate ≤ 1.5 flags/study (radiologist patience threshold) · Calibration ECE ≤ 0.05 · 6-month outcome agreement with ground truth ≥ 92%.",
    rollout: "Retrospective on 5K archived studies with known outcomes → live shadow mode (3 months) → opt-in second-read with attribution (6 months) → default on for fatigue window only (per radiologist preference).",
    readNext: ["14.4", "14.3", "8.2", "10.4"],
  },

  // ─── LEGAL ───────────────────────────────────────────────────────
  {
    id: "legal-contract-clause-extraction",
    title: "Contract clause extraction with citations",
    industry: "legal",
    persona: "Mid-size law firm",
    archetype: "multi-modal",
    complexity: "intermediate",
    situation: "M&A due diligence requires extracting 40+ clause types (change-of-control, IP assignment, indemnity caps, etc.) from 300–800 contracts per deal. Junior associates spend 60h per deal at $200/h, with 8% miss rate on subtle clauses.",
    problem: "Extract all required clauses with citations to page+paragraph, hit 98% recall on a curated test set of 50 contracts, and produce a deal-ready summary table in 4 hours instead of 60.",
    approach: [
      "Native PDF blocks (most contracts are scanned or have OCR issues; native PDF preserves layout).",
      "One Claude call per contract with the clause taxonomy + extraction schema cached at the prompt prefix.",
      "Citations API generates page+character refs for every extracted clause — these become hyperlinks in the deal report.",
      "Batch API for cold processing (overnight): 50% cheaper, 6h SLA fits the deal timeline.",
      "A second-pass verification agent (Haiku) re-reads each extraction against the cited span; mismatches go to associate review.",
      "Regression eval: a frozen set of 50 contracts with known clause annotations, run on every prompt change.",
      "Audit log captures source hash, model version, prompt version — admissible as work-product evidence.",
    ],
    conceptsApplied: [
      "vision-pdf-native", "citations-api", "cache-control",
      "batch-api", "llm-judge", "regression-eval", "audit-trail",
    ],
    diagram: `graph TB
  DEAL[300-800 contracts] --> BATCH[Batch API<br/>Sonnet + native PDF<br/>cached taxonomy]
  BATCH --> EXTRACT[Clause extractions<br/>with citations]
  EXTRACT --> VERIFY[Haiku verification<br/>citation re-read]
  VERIFY -->|pass 92%| TABLE[Deal summary<br/>table]
  VERIFY -->|flag 8%| ASSOC[Associate review]
  ASSOC --> TABLE
  TABLE --> EVAL[Weekly eval vs<br/>50-contract frozen set]`,
    tradeoffs: [
      { ruledOut: "Real-time (interactive) extraction", reason: "Deal timelines accept overnight processing; batch saves 50%." },
      { ruledOut: "OCR pre-step", reason: "Layout matters for clause boundary detection; native PDF wins by 11 points on the eval set." },
      { ruledOut: "Single-pass without verification", reason: "8% flag rate is the cost of confidence; without it, partners audit every clause and the time savings evaporate." },
    ],
    evalCriteria: "Recall ≥ 98% on the 50-contract eval (curated by partners) · Precision ≥ 95% · Citation faithfulness 100% (regulator/court-ready) · Deal turnaround 4h vs 60h baseline.",
    rollout: "Replay 3 historical deals with known outcomes (4 weeks) → live on next deal with partner sign-off on table (6 weeks) → default-on with associate review on flags only (ongoing).",
    readNext: ["14.4", "14.5", "8.1"],
  },

  // ─── PUBLIC SECTOR ───────────────────────────────────────────────
  {
    id: "public-citizen-faq",
    title: "Citizen FAQ co-pilot (high-volume, low-cost)",
    industry: "publicsector",
    persona: "City services portal",
    archetype: "cost-optimization",
    complexity: "starter",
    situation: "A city portal handles 1.8M FAQ queries/year on garbage collection, permits, benefits eligibility, etc. Current system is keyword search with 31% deflection; remainder go to a 20-person call center. Budget pressure is intense — any solution must come in under $25K/year API cost.",
    problem: "Push deflection to 60% with answers that cite the official source policy, on a hard API budget of $0.014 per query (≈$25K/year).",
    approach: [
      "7-block prompt with the entire small-corpus FAQ + recent policy updates cached at the prefix (city policy corpus is ~80K tokens — caches well).",
      "Haiku as the only model — no escalation tier. Cost is the binding constraint.",
      "Citations API: every answer links back to the official policy page; this is the trust signal that lets the city stand behind the answer.",
      "Semantic cache: ~40% of queries are textual variants of the top 200 questions; cache hits return frozen answers at $0 LLM cost.",
      "If the model's confidence is low or the question is out-of-scope, return a 'this question needs a human' card with the call center number — never invent.",
      "Weekly regression eval on 100 representative queries graded by city staff.",
    ],
    conceptsApplied: [
      "seven-block-prompt", "cache-control", "prompt-cache-prod",
      "citations-api", "model-tier-routing", "regression-eval", "calibration-ece",
    ],
    diagram: `graph LR
  Q[Citizen query] --> SEM{Semantic<br/>cache hit?}
  SEM -->|yes 40%| FROZEN[Frozen answer<br/>$0]
  SEM -->|no| HAIKU[Haiku<br/>+ cached policy corpus<br/>+ citations]
  HAIKU --> CONF{Confident<br/>+ in-scope?}
  CONF -->|yes 60%| ANSWER[Answer + citation]
  CONF -->|no 40%| HANDOFF[Call center<br/>handoff card]
  ANSWER --> EVAL[Weekly eval<br/>100 queries graded]`,
    tradeoffs: [
      { ruledOut: "Sonnet escalation tier", reason: "Cost ceiling forbids it; Haiku + caching + handoff for unsure cases hits the deflection target close enough." },
      { ruledOut: "Full agentic RAG", reason: "Overkill for a small static corpus; cached corpus + single-pass beats RAG on both latency and cost." },
      { ruledOut: "Open answer style without citations", reason: "Public-sector trust requires source attribution; non-negotiable." },
    ],
    evalCriteria: "Deflection ≥ 60% measured by no-call follow-through · API cost ≤ $0.014/query · Citation faithfulness 100% · Quarterly staff-graded accuracy ≥ 95%.",
    rollout: "Backfill against 6 months of past queries with known resolutions (4 weeks) → 10% live traffic A/B (8 weeks) → full rollout with prominent 'still need help?' link (ongoing).",
    readNext: ["3.5", "14.2", "9.3"],
  },
];
