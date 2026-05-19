import { z } from "zod";
import type { ToolRegistry } from "../shared/tool.js";
import { TechniqueSchema } from "./schema.js";

/**
 * The brainstorm agent's tools are different in shape from the other
 * capstones — instead of querying external data, the tools represent
 * structured "techniques" the agent can apply, plus scoring and ranking.
 */

const TECHNIQUE_GUIDES: Record<string, string> = {
  analogy:
    "Generate ideas by finding analogous problems in other domains. e.g., 'How does nature solve this?' or 'How does a different industry handle this?'",
  decomposition:
    "Break the problem into sub-problems and brainstorm solutions for each sub-problem. Then recombine into compound ideas.",
  inversion:
    "Ask the opposite question. Instead of 'how do we solve this?', ask 'how would we GUARANTEE failure?' — each guaranteed-failure becomes a thing to avoid, suggesting solutions.",
  recombination:
    "Take 2-3 existing partial solutions and combine them in new ways. e.g., 'What if we combined approach A's strength with approach B's interface?'",
  what_if:
    "Remove a key constraint and see what becomes possible. e.g., 'What if cost were no object?' or 'What if we had 100x the data?' Then ask: can we approximate that?",
  user_journey:
    "Walk through who is affected by the problem and how. For each persona, brainstorm ideas that specifically help them.",
  extreme_cases:
    "Imagine the problem at 10x scale (load, users, volume) and at 1/10x cost. Solutions for extreme cases often reveal what's essential.",
};

export const applyTechniqueTool = {
  name: "apply_technique",
  description:
    "Apply a specific brainstorming technique to generate candidate ideas. Returns guidance for the technique; the agent uses this guidance to generate ideas in its next thought.",
  inputSchema: z.object({
    technique: TechniqueSchema,
    topic: z.string(),
  }),
  handler: async (args: { technique: string; topic: string }): Promise<{ technique: string; guide: string; topic: string }> => {
    return {
      technique: args.technique,
      topic: args.topic,
      guide: TECHNIQUE_GUIDES[args.technique] ?? "Apply this technique to generate diverse ideas.",
    };
  },
} as const;

export const scoreIdeasTool = {
  name: "score_ideas",
  description:
    "Score a batch of ideas on four dimensions: novelty (0-10), feasibility (0-10), impact (0-10), cost (0-10, lower=cheaper). Use this after generating ideas to compare them objectively.",
  inputSchema: z.object({
    ideas: z.array(z.object({
      id: z.string(),
      novelty: z.number().min(0).max(10),
      feasibility: z.number().min(0).max(10),
      impact: z.number().min(0).max(10),
      cost: z.number().min(0).max(10),
    })),
  }),
  handler: async (args: { ideas: { id: string; novelty: number; feasibility: number; impact: number; cost: number }[] }): Promise<{
    ranked: { id: string; weighted_score: number; novelty: number; feasibility: number; impact: number; cost: number }[];
  }> => {
    // Composite score: weight impact and feasibility highest; cost as penalty
    const ranked = args.ideas
      .map((i) => ({
        ...i,
        weighted_score: 0.35 * i.impact + 0.30 * i.feasibility + 0.20 * i.novelty - 0.15 * i.cost,
      }))
      .sort((a, b) => b.weighted_score - a.weighted_score);
    return { ranked };
  },
} as const;

export const submitReportTool = {
  name: "submit_report",
  description:
    "Submit the final brainstorming report: all ideas with scores, top-3 selection with reasoning and next steps, plus an overall summary. Terminal.",
  inputSchema: z.object({
    topic: z.string(),
    ideas: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().min(20),
      technique: TechniqueSchema,
      scores: z.object({
        novelty: z.number().min(0).max(10),
        feasibility: z.number().min(0).max(10),
        impact: z.number().min(0).max(10),
        cost: z.number().min(0).max(10),
      }),
      notes: z.string(),
    })),
    top_three: z.array(z.object({
      id: z.string(),
      why_chosen: z.string(),
      next_steps: z.array(z.string()),
    })).length(3),
    summary: z.string().min(50),
  }),
  handler: async (args: unknown): Promise<{ submitted: true; payload: unknown }> => {
    return { submitted: true, payload: args };
  },
} as const;

export const brainstormTools: ToolRegistry = {
  apply_technique: applyTechniqueTool,
  score_ideas: scoreIdeasTool,
  submit_report: submitReportTool,
};
