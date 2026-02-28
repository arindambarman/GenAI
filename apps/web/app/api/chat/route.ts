import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleUserMessage } from "@adaptlearn/agent-master";
import { handleMessage as handleScoutMessage } from "@adaptlearn/agent-scout";
import { pollMessages } from "@adaptlearn/shared/bus";

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  userId: z.string().uuid("Valid user ID is required"),
});

/**
 * POST /api/chat
 *
 * Entry point for user messages. Routes to Master Agent for
 * intent classification and dispatch, then invokes the target
 * agent in-process so the user gets a complete response.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { message, userId } = ChatRequestSchema.parse(body);

    const result = await handleUserMessage({ userId, message });

    // Invoke the dispatched agent in-process (per execution model in CLAUDE.md)
    let agentResult: Record<string, unknown> | undefined;

    if (result.dispatchedTo === "scout" && result.agentMessageId) {
      try {
        // Poll for the pending message the Master just dispatched
        const pending = await pollMessages("scout", 1);
        const scoutMsg = pending.find((m) => m.id === result.agentMessageId);

        if (scoutMsg) {
          await handleScoutMessage(scoutMsg);

          // Retrieve the SkillMapReady response from the bus
          const replies = await pollMessages("master", 10);
          const skillMapReady = replies.find(
            (m) =>
              m.message_type === "SkillMapReady" &&
              m.from_agent === "scout" &&
              (m.payload.user_id as string) === userId
          );

          if (skillMapReady) {
            agentResult = skillMapReady.payload;
          }
        }
      } catch {
        // Scout failure is non-blocking — the dispatch message
        // is already marked as failed by handleMessage's own error handling.
      }
    }

    return NextResponse.json({
      intent: result.intent,
      topic: result.topic,
      confidence: result.confidence,
      dispatchedTo: result.dispatchedTo,
      response: result.response,
      agentResult,
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
