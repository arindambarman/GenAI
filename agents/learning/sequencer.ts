import { getSupabaseClient } from "@adaptlearn/shared/db";
import type { Depth, ProgressStatus } from "@adaptlearn/shared/types";

export interface LearningRecommendation {
  nextContentItemId: string | null;
  nextSkill: string | null;
  nextDepth: Depth;
  currentStatus: ProgressStatus;
  message: string;
}

/**
 * Determine the next depth level for a user based on their current progress.
 */
export function getNextDepth(currentDepth: Depth): Depth {
  switch (currentDepth) {
    case "beginner":
      return "intermediate";
    case "intermediate":
      return "advanced";
    case "advanced":
      return "advanced"; // already at max
  }
}

/**
 * Select the next content item for a user based on their progress and available content.
 *
 * Logic:
 * 1. Load user progress for the given topic
 * 2. Find skills that are not_started or needs_remediation
 * 3. Find the next available content item at the appropriate depth
 * 4. Return a recommendation
 */
export async function selectNextContent(
  userId: string,
  topicId: string
): Promise<LearningRecommendation> {
  const db = getSupabaseClient();

  // Load user progress for this topic
  const { data: progressRows } = await db
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .order("updated_at", { ascending: false });

  const progress = progressRows ?? [];

  // Find skills needing attention (needs_remediation first, then not_started)
  const needsRemediation = progress.filter(
    (p) => p.status === "needs_remediation"
  );
  const notStarted = progress.filter((p) => p.status === "not_started");
  const inProgress = progress.filter((p) => p.status === "in_progress");

  // Priority: remediation > in_progress > not_started
  const targetProgress = needsRemediation[0] ?? inProgress[0] ?? notStarted[0];

  if (targetProgress) {
    const depth = targetProgress.status === "needs_remediation"
      ? targetProgress.current_depth
      : targetProgress.current_depth;

    // Find content at this skill and depth
    const { data: contentItem } = await db
      .from("content_items")
      .select("id, skill, depth")
      .eq("topic_id", topicId)
      .eq("skill", targetProgress.skill)
      .eq("depth", depth)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (contentItem) {
      return {
        nextContentItemId: contentItem.id,
        nextSkill: targetProgress.skill,
        nextDepth: depth as Depth,
        currentStatus: targetProgress.status as ProgressStatus,
        message: targetProgress.status === "needs_remediation"
          ? `Let's review "${targetProgress.skill}" — you had some gaps last time.`
          : `Continue with "${targetProgress.skill}" at ${depth} level.`,
      };
    }
  }

  // If no progress exists, find any content for this topic at beginner level
  const { data: beginnerContent } = await db
    .from("content_items")
    .select("id, skill, depth")
    .eq("topic_id", topicId)
    .eq("depth", "beginner")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (beginnerContent) {
    return {
      nextContentItemId: beginnerContent.id,
      nextSkill: beginnerContent.skill,
      nextDepth: "beginner",
      currentStatus: "not_started",
      message: `Start learning "${beginnerContent.skill}" from the basics.`,
    };
  }

  return {
    nextContentItemId: null,
    nextSkill: null,
    nextDepth: "beginner",
    currentStatus: "not_started",
    message: "No content available for this topic yet. Try researching it first.",
  };
}

/**
 * Update user progress after completing or failing an assessment.
 */
export async function updateProgress(
  userId: string,
  topicId: string,
  skill: string,
  status: ProgressStatus,
  depth: Depth,
  score: number | null,
  contentItemId: string | null
): Promise<void> {
  const db = getSupabaseClient();

  await db
    .from("user_progress")
    .upsert(
      {
        user_id: userId,
        topic_id: topicId,
        skill,
        status,
        current_depth: depth,
        last_score: score,
        last_content_item_id: contentItemId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_id,skill" }
    );
}
