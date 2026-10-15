import { PERSONAS } from "./personas";
import { Level, Message, Module, Persona } from "./types";

const DIAGRAM_RULES = `If (and only if) a picture clarifies the point, include ONE diagram as a fenced \`\`\`mermaid block using flowchart TD or sequenceDiagram. Quote every node label like A["Label"], keep labels short, and use no other special syntax.`;

export function contributionPrompt(goal: string, level: Level, feedback: string, p: Persona): string {
  const fb = feedback ? `\nLEARNER FEEDBACK ON THE PREVIOUS ROADMAP: ${feedback}` : "";
  return `LEARNER WANTS TO LEARN (a goal or a topic): ${goal}\nLEVEL: ${level}${fb}\n\n${p.lens}\nPropose the 4 to 6 modules you would put in the roadmap, as a numbered list with one short line each on why it belongs there. Under 150 words.`;
}

export function mergePrompt(goal: string, level: Level, feedback: string, contributions: Record<string, string>): string {
  const props = Object.entries(contributions)
    .map(([id, text]) => `PROPOSAL FROM ${id.toUpperCase()} (${id}):\n${text}`)
    .join("\n\n");
  const fb = feedback ? `\n\nLEARNER FEEDBACK TO APPLY: ${feedback}` : "";
  return `LEARNER WANTS TO LEARN: ${goal}\nLEVEL: ${level}\n\n${props}${fb}`;
}

/** Keep the transcript small: drop diagram source and cap per-message length. */
export function compactTranscript(ms: Message[], keep = 14): string {
  return ms
    .slice(-keep)
    .map((m) => `${m.speaker.toUpperCase()}: ${m.text.replace(/```mermaid[\s\S]*?```/g, "[diagram]").slice(0, 1500)}`)
    .join("\n\n");
}

export function lessonPrompt(args: {
  persona: Persona;
  goal: string;
  level: Level;
  module: Module;
  outline: string[];
  transcript: Message[];
  message: string;
  opening: boolean;
  directive: string;
}): string {
  const { persona, goal, level, module, outline, transcript, message, opening, directive } = args;
  const road = outline.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const history = transcript.length ? `CONVERSATION SO FAR:\n${compactTranscript(transcript)}\n\n` : "";
  const ask = opening
    ? `This is the start of the module. Give your opening contribution to the lesson.`
    : `LEARNER JUST SAID: ${message}${directive ? `\n(They asked everyone to: ${directive})` : ""}\nAnswer that first. Do not repeat what was already said; build on or push back on a specific classmate.`;
  return `LEARNER GOAL: ${goal}\nLEVEL: ${level}\nROADMAP:\n${road}\n\nCURRENT MODULE: ${module.title}\nOBJECTIVE: ${module.objective}\nKEY CONCEPTS: ${module.concepts.join("; ")}\n\n${history}${ask}\n\nYOUR DEFAULT JOB IN THIS CLASS: ${persona.role}\nTeach the module's concepts through the discussion, one step at a time. Use markdown, under 200 words. ${DIAGRAM_RULES}`;
}

export function mindmapPrompt(goal: string, level: Level, module: Module): string {
  return `LEARNER GOAL: ${goal}\nLEVEL: ${level}\nMODULE: ${module.title}\nOBJECTIVE: ${module.objective}\nKEY CONCEPTS: ${module.concepts.join("; ")}`;
}

export function recapPrompt(goal: string, module: Module, transcript: Message[]): string {
  return `LEARNER GOAL: ${goal}\nMODULE: ${module.title}\nOBJECTIVE: ${module.objective}\n\nTRANSCRIPT:\n${compactTranscript(transcript, 30)}`;
}

/** Label each agent line with its model, so the teacher can attribute differences to Claude vs Gemini. */
export function diffPrompt(goal: string, module: Module, transcript: Message[]): string {
  const label = (id: string) => {
    const p = PERSONAS.find((x) => x.id === id);
    return p ? `${p.id.toUpperCase()} (${p.provider})` : id.toUpperCase();
  };
  const body = transcript
    .slice(-30)
    .map((m) => `${label(m.speaker)}: ${m.text.replace(/```mermaid[\s\S]*?```/g, "[diagram]").slice(0, 1500)}`)
    .join("\n\n");
  return `LEARNER GOAL: ${goal}\nMODULE: ${module.title}\nOBJECTIVE: ${module.objective}\n\nDISCUSSION:\n${body}`;
}

export function critiquePrompt(p: Persona, goal: string, level: Level, module: Module, explanation: string): string {
  return `LEARNER GOAL: ${goal}\nLEVEL: ${level}\nMODULE: ${module.title}\nOBJECTIVE: ${module.objective}\nKEY CONCEPTS: ${module.concepts.join("; ")}\n\nThe learner explained the module back to the class in their own words:\n\"\"\"\n${explanation}\n\"\"\"\n\nReview it from your perspective. ${p.review} Address the learner directly. Under 110 words, no headings.`;
}

export function teachbackPrompt(goal: string, level: Level, module: Module, explanation: string): string {
  return `LEARNER GOAL: ${goal}\nLEVEL: ${level}\nMODULE: ${module.title}\nOBJECTIVE: ${module.objective}\nKEY CONCEPTS (rate every one, using these exact names): ${module.concepts.join("; ")}\n\nLEARNER EXPLANATION:\n\"\"\"\n${explanation}\n\"\"\"`;
}

/** Make the rating list complete and in module order: match names loosely, default missing concepts to 0. */
export function alignConcepts(module: Module, rated: { concept: string; rating: number }[]): { concept: string; rating: number }[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return module.concepts.map((c) => ({ concept: c, rating: rated.find((r) => norm(r.concept) === norm(c))?.rating ?? 0 }));
}

export function cardsPrompt(goal: string, module: Module, transcript: Message[]): string {
  return `LEARNER GOAL: ${goal}\nMODULE: ${module.title}\nOBJECTIVE: ${module.objective}\nKEY CONCEPTS (use these exact names): ${module.concepts.join("; ")}\n\nDISCUSSION:\n${compactTranscript(transcript, 20)}`;
}

/** Map a model-written concept name onto the module's concept list; fall back to the first concept. */
export function matchConcept(module: Module, concept: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return module.concepts.find((c) => norm(c) === norm(concept)) ?? module.concepts[0] ?? module.title;
}
