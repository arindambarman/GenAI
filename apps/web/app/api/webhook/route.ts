import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webhook
 *
 * Agent result callbacks. Processes completed agent messages.
 * Implementation: Session 8
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { message: "Webhook API not implemented yet — see Session 8" },
    { status: 501 }
  );
}
