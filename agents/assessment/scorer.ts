/**
 * Assessment Agent — Scorer
 *
 * Scores MCQ and short-answer responses.
 * MCQ: exact match. Short answer: Claude Haiku grading with rubric.
 *
 * Implementation: Session 6
 */
export async function scoreAnswers(
  _answers: unknown[],
  _questions: unknown[]
): Promise<unknown> {
  throw new Error("Assessment scorer not implemented yet — see Session 6");
}
