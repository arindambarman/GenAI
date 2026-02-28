import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pollMessages } from "@adaptlearn/shared/bus";
import type { AgentName } from "@adaptlearn/shared/types";

const PollRequestSchema = z.object({
  agent: z.enum(["master", "scout", "content_creator", "assessment", "learning", "chat_ui"]),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

/**
 * POST /api/webhook
 *
 * Polls for completed agent messages.
 * Used by the frontend to check for agent results.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { agent, limit } = PollRequestSchema.parse(body);

    const messages = await pollMessages(agent as AgentName, limit);

    return NextResponse.json({
      messages,
      count: messages.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.errors },
        { status: 400 }
      );
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
