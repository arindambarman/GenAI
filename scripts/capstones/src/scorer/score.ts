import type {
  ConceptScore,
  ComputedConcept,
  ModuleAggregate,
  Progress,
} from "./schema.js";

/**
 * Pure scoring functions — no I/O. Easy to test.
 *
 * Core model:
 *   peak_score      = depth × (1 + 0.2 × min(evidence_count, 3))
 *   half_life_days  = 2^depth × 3            (depth 0=3d, 1=6d, 2=12d, 3=24d, 4=48d, 5=96d)
 *   decay_factor    = exp(-days_since_review / half_life_days)
 *   decayed_score   = peak_score × decay_factor
 *
 * Status:
 *   unstarted: depth === 0
 *   weak:      decayed_score < 2.0
 *   wobbly:    2.0 ≤ decayed_score < 3.5
 *   mastered:  decayed_score ≥ 3.5
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computePeakScore(depth: number, evidenceCount: number): number {
  return depth * (1 + 0.2 * Math.min(evidenceCount, 3));
}

export function halfLifeDays(depth: number): number {
  return Math.pow(2, depth) * 3;
}

export function daysSince(isoDate: string | null, now: Date = new Date()): number | null {
  if (!isoDate) return null;
  const then = new Date(isoDate);
  return (now.getTime() - then.getTime()) / MS_PER_DAY;
}

export function computeConcept(c: ConceptScore, now: Date = new Date()): ComputedConcept {
  const evidence_count = c.evidence.length;
  const peak_score = computePeakScore(c.depth, evidence_count);
  const half_life = halfLifeDays(c.depth);
  const days = daysSince(c.last_reviewed, now);
  const decay = days === null || c.depth === 0 ? 0 : Math.exp(-days / half_life);
  const decayed_score = peak_score * decay;

  let status: ComputedConcept["status"];
  if (c.depth === 0) status = "unstarted";
  else if (decayed_score < 2.0) status = "weak";
  else if (decayed_score < 3.5) status = "wobbly";
  else status = "mastered";

  return {
    ...c,
    peak_score: Math.round(peak_score * 100) / 100,
    decayed_score: Math.round(decayed_score * 100) / 100,
    days_since_review: days === null ? null : Math.round(days * 10) / 10,
    half_life_days: half_life,
    status,
  };
}

export function computeAll(p: Progress, now: Date = new Date()): ComputedConcept[] {
  return p.concepts.map((c) => computeConcept(c, now));
}

export function moduleAggregates(computed: ComputedConcept[]): ModuleAggregate[] {
  const byModule = new Map<string, ComputedConcept[]>();
  for (const c of computed) {
    if (!byModule.has(c.module)) byModule.set(c.module, []);
    byModule.get(c.module)!.push(c);
  }
  const out: ModuleAggregate[] = [];
  for (const [module, items] of byModule) {
    const totalImportance = items.reduce((a, c) => a + c.importance, 0);
    const weighted = items.reduce((a, c) => a + c.decayed_score * c.importance, 0) / totalImportance;
    const raw = items.reduce((a, c) => a + c.decayed_score, 0) / items.length;
    out.push({
      module,
      concept_count: items.length,
      unstarted: items.filter((c) => c.status === "unstarted").length,
      weak: items.filter((c) => c.status === "weak").length,
      wobbly: items.filter((c) => c.status === "wobbly").length,
      mastered: items.filter((c) => c.status === "mastered").length,
      weighted_score: Math.round(weighted * 100) / 100,
      raw_average: Math.round(raw * 100) / 100,
    });
  }
  // Sort by module number (M1, M2, ..., M13)
  out.sort((a, b) => {
    const na = Number(a.module.replace("M", ""));
    const nb = Number(b.module.replace("M", ""));
    return na - nb;
  });
  return out;
}

export function overallScore(aggregates: ModuleAggregate[]): {
  weighted: number;
  raw: number;
  mastered_pct: number;
  total_concepts: number;
} {
  const totalConcepts = aggregates.reduce((a, m) => a + m.concept_count, 0);
  const totalMastered = aggregates.reduce((a, m) => a + m.mastered, 0);
  const weighted = aggregates.reduce((a, m) => a + m.weighted_score * m.concept_count, 0) / totalConcepts;
  const raw = aggregates.reduce((a, m) => a + m.raw_average * m.concept_count, 0) / totalConcepts;
  return {
    weighted: Math.round(weighted * 100) / 100,
    raw: Math.round(raw * 100) / 100,
    mastered_pct: Math.round((totalMastered / totalConcepts) * 1000) / 10,
    total_concepts: totalConcepts,
  };
}

export interface ReviewRecommendation {
  concept: ComputedConcept;
  reason: "decay-overdue" | "weak-but-started" | "next-prereq" | "high-importance-unstarted";
  priority: number; // sortable; higher = more urgent
}

/**
 * Pick concepts to review. Heuristics:
 *   1. Mastered concepts whose decay has pushed them below the master threshold
 *   2. Wobbly concepts (could slip)
 *   3. Weak concepts (need work)
 *   4. High-importance unstarted concepts
 */
export function recommendReview(
  computed: ComputedConcept[],
  opts: { limit?: number } = {},
): ReviewRecommendation[] {
  const limit = opts.limit ?? 5;
  const recs: ReviewRecommendation[] = [];

  // 1. Mastered → degraded due to decay
  for (const c of computed) {
    if (c.status !== "unstarted" && c.depth >= 4 && c.decayed_score < 3.5) {
      recs.push({
        concept: c,
        reason: "decay-overdue",
        priority: 10 + c.importance * (c.depth - 3),
      });
    }
  }

  // 2. Wobbly concepts at risk
  for (const c of computed) {
    if (c.status === "wobbly") {
      recs.push({ concept: c, reason: "weak-but-started", priority: 6 + c.importance });
    }
  }

  // 3. Weak concepts
  for (const c of computed) {
    if (c.status === "weak") {
      recs.push({ concept: c, reason: "weak-but-started", priority: 4 + c.importance });
    }
  }

  // 4. High-importance unstarted
  for (const c of computed) {
    if (c.status === "unstarted" && c.importance >= 8) {
      recs.push({ concept: c, reason: "high-importance-unstarted", priority: c.importance });
    }
  }

  // Sort by priority desc, dedupe by concept_id (keep highest-priority entry)
  const seen = new Set<string>();
  recs.sort((a, b) => b.priority - a.priority);
  return recs.filter((r) => {
    if (seen.has(r.concept.concept_id)) return false;
    seen.add(r.concept.concept_id);
    return true;
  }).slice(0, limit);
}

/**
 * Categories aggregated (foundational / math / architecture / safety / etc.).
 */
export function categoryAggregates(
  computed: ComputedConcept[],
): Array<{ category: string; count: number; weighted_score: number; mastered: number }> {
  const byCat = new Map<string, ComputedConcept[]>();
  for (const c of computed) {
    if (!byCat.has(c.category)) byCat.set(c.category, []);
    byCat.get(c.category)!.push(c);
  }
  const out: Array<{ category: string; count: number; weighted_score: number; mastered: number }> = [];
  for (const [category, items] of byCat) {
    const totalImp = items.reduce((a, c) => a + c.importance, 0);
    const weighted = items.reduce((a, c) => a + c.decayed_score * c.importance, 0) / totalImp;
    out.push({
      category,
      count: items.length,
      weighted_score: Math.round(weighted * 100) / 100,
      mastered: items.filter((c) => c.status === "mastered").length,
    });
  }
  out.sort((a, b) => b.weighted_score - a.weighted_score);
  return out;
}
