import type { CallLLMInput, LLMResponse, MockHandler } from "../shared/llm.js";

/**
 * Mock handler for the knowledge agent. Detects the mode from the
 * system prompt and runs the appropriate canned sequence.
 */
export const knowledgeMockHandler: MockHandler = async (input: CallLLMInput): Promise<LLMResponse> => {
  const turn = input.messages.filter((m) => m.role === "assistant").length;
  const mode = detectMode(input.system);

  if (mode === "query") return queryMock(turn);
  if (mode === "organize") return organizeMock(turn);
  if (mode === "add") return addMock(turn);
  return endTurnResponse("[MOCK] unknown mode");
};

function detectMode(system: string): "query" | "organize" | "add" {
  if (system.includes("Mission for organize")) return "organize";
  if (system.includes("Mission for add")) return "add";
  return "query";
}

function queryMock(turn: number): LLMResponse {
  switch (turn) {
    case 0:
      return toolCallResponse("query_kb", { query: "attention transformer", k: 3 });
    case 1:
      return toolCallResponse("read_note", { id: "attention" });
    case 2:
      return toolCallResponse("read_note", { id: "transformer" });
    case 3:
      return toolCallResponse("submit_answer", {
        answer:
          "[MOCK ANSWER] The attention mechanism is the core component of the Transformer architecture. Attention computes a weighted sum of value vectors, with weights derived from softmax(QK^T / √d_k) [attention]. The Transformer (Vaswani et al. 2017) stacks self-attention layers with feed-forward layers, replacing recurrence with parallelisable attention [transformer]. This combination enables long-range dependencies (O(1) path between positions) and benefits from scaling [transformer].",
        citations: [
          {
            note_id: "attention",
            note_title: "Attention Mechanism",
            passage: "Attention(Q, K, V) = softmax(QK^T / √d_k) V",
            supports: "Attention computes weighted sum via softmax over scaled dot-products",
          },
          {
            note_id: "transformer",
            note_title: "Transformer Architecture",
            passage:
              "The architecture replaces recurrence and convolution with self-attention as the primary mechanism",
            supports: "Transformer replaces recurrence with self-attention",
          },
        ],
        confidence: 0.9,
        related_notes: ["embedding", "rag"],
        gaps: ["Positional encoding details not in KB", "Flash attention implementation not in KB"],
      });
    default:
      return endTurnResponse("[MOCK] end");
  }
}

function organizeMock(turn: number): LLMResponse {
  switch (turn) {
    case 0:
      return toolCallResponse("list_all_notes", {});
    case 1:
      return toolCallResponse("submit_organization", {
        total_notes: 6,
        clusters: [
          {
            theme: "Architecture primitives",
            note_ids: ["attention", "transformer", "embedding"],
            summary: "Foundational neural-network building blocks for modern LLMs.",
          },
          {
            theme: "Training and alignment",
            note_ids: ["rlhf", "policy-gradient"],
            summary: "Methods for aligning LLMs to human preferences.",
          },
          {
            theme: "Application patterns",
            note_ids: ["rag"],
            summary: "Architectural patterns layered on top of trained LLMs.",
          },
        ],
        orphans: [],
        suggested_links: [
          {
            from: "rlhf",
            to: "policy-gradient",
            reason: "RLHF uses policy gradient (PPO) for stage 3 optimisation",
          },
          {
            from: "rag",
            to: "embedding",
            reason: "RAG retrieval uses embeddings as the primary similarity signal",
          },
        ],
        gaps: [
          "DPO (Direct Preference Optimization) — referenced but no dedicated note",
          "Positional encoding — referenced in transformer note but no dedicated explanation",
          "Vector database internals (HNSW, IVF) — useful adjacent to RAG and embedding notes",
        ],
      });
    default:
      return endTurnResponse("[MOCK] end");
  }
}

function addMock(turn: number): LLMResponse {
  switch (turn) {
    case 0:
      return toolCallResponse("query_kb", { query: "DPO direct preference optimization", k: 3 });
    case 1:
      return toolCallResponse("add_note", {
        id: "dpo",
        title: "DPO (Direct Preference Optimization)",
        tags: ["training", "alignment", "preferences"],
        related: ["rlhf", "policy-gradient"],
        body:
          "DPO (Rafailov et al. 2023) is a closed-form alternative to RLHF. Instead of training a reward model and then using PPO to optimise against it, DPO directly optimises the policy on preference pairs using a simple cross-entropy-like loss derived from the KL-constrained RL objective.\n\n## Why it matters\n- Eliminates the reward model (one fewer model to train and maintain)\n- More stable training than PPO\n- Comparable or better quality on most benchmarks\n- Simpler infrastructure → faster iteration\n\n## Limitations\n- Requires preference pairs, not free-form labels\n- Less control over the optimisation than PPO\n- Cannot easily incorporate online feedback\n\n## Practical use\nDPO has largely replaced PPO-RLHF in many open-source fine-tuning pipelines. Most preference fine-tuning of open models (Llama, Mistral) uses DPO.",
      });
    case 2:
      return toolCallResponse("link_notes", { from_id: "dpo", to_id: "rlhf" });
    case 3:
      return toolCallResponse("link_notes", { from_id: "dpo", to_id: "policy-gradient" });
    case 4:
      return toolCallResponse("submit_answer", {
        answer:
          "[MOCK] Created 1 note (dpo) and added 2 bidirectional links (dpo ↔ rlhf, dpo ↔ policy-gradient).",
        citations: [],
        confidence: 1,
        related_notes: ["dpo"],
        gaps: [],
      });
    default:
      return endTurnResponse("[MOCK] end");
  }
}

function toolCallResponse(toolName: string, toolArgs: unknown): LLMResponse {
  return {
    content: [
      { type: "text", text: `[MOCK] ${toolName}` },
      { type: "tool_use", id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: toolName, input: toolArgs },
    ],
    stopReason: "tool_use",
    usage: { inputTokens: 100, outputTokens: 50 },
    cost: 0,
  };
}

function endTurnResponse(text: string): LLMResponse {
  return {
    content: [{ type: "text", text }],
    stopReason: "end_turn",
    usage: { inputTokens: 50, outputTokens: 20 },
    cost: 0,
  };
}
