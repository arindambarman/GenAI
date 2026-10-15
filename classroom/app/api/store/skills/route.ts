import { computeSkills, nextSteps } from "@/lib/skills";
import { skillInputs } from "@/lib/store";

export const runtime = "nodejs";

/** Per-concept mastery across every roadmap, plus what to work on next. */
export async function GET() {
  const { modules, events } = skillInputs();
  const skills = computeSkills(modules, events);
  return Response.json({ skills, focus: nextSteps(skills, Date.now()) });
}
