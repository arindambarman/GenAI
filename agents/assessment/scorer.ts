import Anthropic from "@anthropic-ai/sdk";
import {
  LLMAssessmentScoringSchema,
  type LLMAssessmentScoring,
  type Question,
  type AnswerRecord,
  type Outcome,
  type Recommendation,
} from "@adaptlearn/shared/types";
import { parseJsonFromLLM } from "@adaptlearn/shared/llm-json";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  anthropicClient = new Anthropic();
  return anthropicClient;
}

/**
 * Score MCQ answers by exact match against correct answers.
 * Returns an array of AnswerRecords and the raw score (0-1).
 */
export function scoreMCQ(
  userAnswers: string[],
  questions: Question[]
): { answers: AnswerRecord[]; score: number } {
  const answers: AnswerRecord[] = userAnswers.map((userAnswer, i) => ({
    question_index: i,
    user_answer: userAnswer,
    correct: i < questions.length && userAnswer === questions[i].answer,
  }));

  const correctCount = answers.filter((a) => a.correct).length;
  const score = questions.length > 0 ? correctCount / questions.length : 0;

  return { answers, score };
}

/**
 * Determine outcome from score.
 */
export function determineOutcome(score: number): Outcome {
  if (score >= 0.8) return "PASS";
  if (score >= 0.5) return "PARTIAL";
  return "FAIL";
}

/**
 * Determine recommendation from outcome.
 */
export function determineRecommendation(outcome: Outcome): Recommendation {
  switch (outcome) {
    case "PASS":
      return "advance";
    case "PARTIAL":
      return "needs_review";
    case "FAIL":
      return "needs_remediation";
  }
}

const GAP_ANALYSIS_PROMPT = `You are the Assessment Agent for AdaptLearn, an adaptive learning platform for banking professionals.

Given a quiz result (questions, user answers, and score), identify knowledge gaps.

Respond with valid JSON only — no markdown, no extra text:
{
  "score": <0.0 to 1.0>,
  "outcome": "<PASS|PARTIAL|FAIL>",
  "gaps": ["<gap1>", "<gap2>", ...],
  "recommendation": "<advance|needs_remediation|needs_review>",
  "feedback": "<brief personalized feedback>"
}`;

/**
 * Use Claude Haiku to analyze knowledge gaps from quiz results.
 * All LLM output is validated with Zod before use.
 */
export async function analyzeGaps(
  questions: Question[],
  answers: AnswerRecord[],
  score: number,
  topic: string
): Promise<LLMAssessmentScoring> {
  const client = getAnthropicClient();

  const quizSummary = questions.map((q, i) => {
    const answer = answers[i];
    return `Q${i + 1}: ${q.q}\nCorrect: ${q.answer}\nUser: ${answer?.user_answer ?? "(no answer)"}\nResult: ${answer?.correct ? "✓" : "✗"}`;
  }).join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: GAP_ANALYSIS_PROMPT,
    messages: [
      {
        role: "user",
        content: `Topic: ${topic}\nScore: ${score}\n\nQuiz Results:\n${quizSummary}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude gap analysis");
  }

  const parsed: unknown = parseJsonFromLLM(textBlock.text);
  return LLMAssessmentScoringSchema.parse(parsed);
}

/**
 * Full scoring pipeline: score MCQs → determine outcome → analyze gaps via Claude.
 */
export async function scoreAnswers(
  userAnswers: string[],
  questions: Question[],
  topic: string
): Promise<{
  answers: AnswerRecord[];
  score: number;
  outcome: Outcome;
  recommendation: Recommendation;
  gaps: string[];
  feedback: string | undefined;
}> {
  const { answers, score } = scoreMCQ(userAnswers, questions);
  const outcome = determineOutcome(score);
  const recommendation = determineRecommendation(outcome);

  // Use Claude for gap analysis on non-perfect scores
  if (outcome !== "PASS") {
    const analysis = await analyzeGaps(questions, answers, score, topic);
    return {
      answers,
      score,
      outcome,
      recommendation: analysis.recommendation,
      gaps: analysis.gaps,
      feedback: analysis.feedback,
    };
  }

  return {
    answers,
    score,
    outcome,
    recommendation,
    gaps: [],
    feedback: undefined,
  };
}

/**
 * Overridable for testing.
 */
export function _setAnthropicClient(client: Anthropic | null): void {
  anthropicClient = client;
}
