import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseClient } from "@adaptlearn/shared/db";

const SkillsRequestSchema = z.object({
  topicId: z.string().uuid("Valid topic ID is required"),
});

/**
 * POST /api/skills
 *
 * Retrieve the most recent skill map for a topic.
 * Used by the frontend to display scout research results.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const { topicId } = SkillsRequestSchema.parse(body);

    const db = getSupabaseClient();

    const { data, error } = await db
      .from("skill_map")
      .select("id, topic_id, skills, source_summary, generated_at")
      .eq("topic_id", topicId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "No skill map found for this topic" },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch skill map: ${error.message}`);
    }

    return NextResponse.json({
      skillMap: data,
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
