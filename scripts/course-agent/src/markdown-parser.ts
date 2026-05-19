import { ParsedLessonSchema, type ParsedLesson, type Section } from "./schema.js";

const LESSON_HEADING = /^# Lesson (\d+\.\d+)\s+[—-]\s+(.+)$/m;
const SECTION_HEADING = /^## §(\d)\s+·\s+(.+)$/gm;

export function extractLesson(markdown: string, lessonId: string): ParsedLesson {
  const lessonStart = markdown.search(new RegExp(`^# Lesson ${escapeRe(lessonId)}\\b`, "m"));
  if (lessonStart === -1) {
    throw new Error(`Lesson ${lessonId} not found in markdown`);
  }

  const afterStart = markdown.slice(lessonStart);
  const nextLessonOrModule = afterStart.slice(1).search(/^# (?:Lesson|Module)\b/m);
  const nextEndMarker = afterStart.search(/^\*End of/m);
  const sliceEnd =
    [nextLessonOrModule === -1 ? Infinity : nextLessonOrModule + 1, nextEndMarker === -1 ? Infinity : nextEndMarker]
      .filter((n) => Number.isFinite(n))
      .reduce((a, b) => Math.min(a, b), Infinity);

  const lessonBlock = Number.isFinite(sliceEnd) ? afterStart.slice(0, sliceEnd as number) : afterStart;

  const titleMatch = lessonBlock.match(LESSON_HEADING);
  if (!titleMatch) throw new Error(`Could not parse lesson heading for ${lessonId}`);
  const title = titleMatch[2].trim();

  const sections = splitSections(lessonBlock);
  const intro = extractIntro(lessonBlock, sections);

  return ParsedLessonSchema.parse({
    id: lessonId,
    title,
    ...(intro && { intro }),
    sections,
  });
}

function splitSections(block: string): Section[] {
  const matches: { index: number; number: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SECTION_HEADING.source, "gm");
  while ((m = re.exec(block)) !== null) {
    matches.push({ index: m.index, number: Number(m[1]), title: m[2].trim() });
  }
  if (matches.length === 0) return [];

  const out: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : block.length;
    const fullSection = block.slice(start, end);
    const body = fullSection.replace(/^## §\d\s+·\s+.+\n+/, "").trim();
    out.push({ number: matches[i].number, title: matches[i].title, body });
  }
  return out;
}

function extractIntro(block: string, sections: Section[]): string | undefined {
  if (sections.length === 0) return undefined;
  const firstSectionIdx = block.search(SECTION_HEADING);
  if (firstSectionIdx === -1) return undefined;
  const titleEnd = block.indexOf("\n", block.search(LESSON_HEADING));
  if (titleEnd === -1 || titleEnd > firstSectionIdx) return undefined;
  const intro = block.slice(titleEnd + 1, firstSectionIdx).trim();
  return intro.length > 0 ? intro : undefined;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
