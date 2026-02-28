import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * Entry point for user messages. Routes to Master Agent.
 * Implementation: Session 8
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { message: "Chat API not implemented yet — see Session 8" },
    { status: 501 }
  );
}
