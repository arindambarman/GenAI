import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleUserMessage } from "@adaptlearn/agent-master";

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  userId: z.string().uuid("Valid user ID is required"),
});

/**
 * POST /api/chat
 *
 * Entry point for user messages. Routes to Master Agent for
 * intent classification and dispatch.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { message, userId } = ChatRequestSchema.parse(body);

    const result = await handleUserMessage({ userId, message });

    return NextResponse.json({
      intent: result.intent,
      topic: result.topic,
      confidence: result.confidence,
      dispatchedTo: result.dispatchedTo,
      response: result.response,
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
