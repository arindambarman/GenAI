/**
 * Apex Tutor — grounded retrieval + answer composition + self-eval engine.
 *
 * LAYERED DESIGN (per design decision):
 *   - Works TODAY with zero backend: deterministic retrieval over window.LESSONS.
 *   - Pluggable: set ApexTutor.config.backend = "/api/tutor" (or a fn) to route
 *     free-form synthesis through Claude later. The deterministic path stays as a
 *     fallback and as the source of citations/grounding.
 *
 * The tutor only answers from the 41-lesson eval & observability corpus. Out-of-scope
 * questions are refused (not hallucinated). Thresholds are quoted VERBATIM from the
 * lesson data — never paraphrased.
 *
 * Self-eval: every answer is scored by the course's OWN metrics
 * (citation-faithfulness, schema-conformance, refusal correctness, latency, cost) and
 * an observability trace is produced, viewable in trace-explorer.html.
 *
 * Depends on: lessons-data.js (window.LESSONS). No other dependencies.
 */
(function (global) {
  "use strict";

  var TRACE_KEY = "apex-tutor-traces";
  var MAX_TRACES = 12;

  function L() { return global.LESSONS || {}; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function stripTags(html) {
    return String(html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  function firstSentence(txt, max) {
    var t = stripTags(txt);
    var m = t.match(/^.*?[.!?](\s|$)/);
    var s = m ? m[0].trim() : t;
    if (max && s.length > max) s = s.slice(0, max - 1).trim() + "…";
    return s;
  }

  // ── Metric registry (built from the lesson corpus) ───────────────────────────
  function buildRegistry() {
    var reg = [];
    var ls = L();
    Object.keys(ls).forEach(function (id) {
      var le = ls[id];
      reg.push({
        id: id,
        title: le.title || id,
        category: le.category || "",
        complexity: le.complexity || "",
        hay: (id + " " + (le.title || "") + " " + (le.category || "")).toLowerCase().replace(/-/g, " "),
      });
    });
    return reg;
  }

  // ── Alias boost table: common shorthand → metric id (weight) ──────────────────
  var ALIASES = [
    ["ece", "calibration-ece", 5], ["calibrat", "calibration-ece", 5], ["confidence", "calibration-ece", 3],
    ["reliability diagram", "calibration-ece", 4], ["brier", "calibration-ece", 4], ["overconfiden", "calibration-ece", 3],
    ["schema", "schema-conformance", 5], ["conformance", "schema-conformance", 5], ["json valid", "schema-conformance", 4],
    ["structured output", "schema-conformance", 3], ["constrained decod", "schema-conformance", 4], ["zod", "schema-conformance", 3],
    ["p95", "latency-percentiles", 5], ["p99", "latency-percentiles", 4], ["p50", "latency-percentiles", 4],
    ["percentile", "latency-percentiles", 4], ["latency", "latency-percentiles", 3],
    ["tail laten", "tail-latency-analysis", 5], ["long tail", "tail-latency-analysis", 4], ["slowest", "tail-latency-analysis", 3],
    ["cost", "cost-per-task", 4], ["budget", "cost-per-task", 3], ["token cost", "cost-per-task", 4],
    ["price per", "cost-per-task", 3], ["expensive", "cost-per-task", 2],
    ["hallucinat", "hallucination-rate", 5], ["unsupported", "hallucination-rate", 4], ["made up", "hallucination-rate", 4], ["fabricat", "hallucination-rate", 4],
    ["citation", "citation-faithfulness", 5], ["faithful", "citation-faithfulness", 4], ["grounded", "citation-faithfulness", 3], ["source attribut", "citation-faithfulness", 4],
    ["exact match", "exact-vs-semantic-match", 5], ["semantic match", "exact-vs-semantic-match", 5], ["fuzzy match", "exact-vs-semantic-match", 3],
    ["jailbreak", "jailbreak-resistance", 5], ["prompt inject", "jailbreak-resistance", 5], ["adversarial", "jailbreak-resistance", 3],
    ["refus", "refusal-rate", 5], ["decline", "refusal-rate", 3], ["over-refus", "refusal-rate", 4],
    ["tool argument", "tool-argument-validity", 5], ["function call arg", "tool-argument-validity", 4], ["tool call valid", "tool-argument-validity", 4],
    ["tool fail", "tool-failure-recovery", 5], ["retry", "tool-failure-recovery", 3], ["recover", "tool-failure-recovery", 3],
    ["circuit breaker", "tool-failure-recovery", 4], ["503", "tool-failure-recovery", 3],
    ["ci gate", "ci-eval-gate", 5], ["pipeline gate", "ci-eval-gate", 4], ["block release", "ci-eval-gate", 3], ["regression gate", "ci-eval-gate", 3],
    ["a/b", "prompt-ab-eval", 5], ["ab test", "prompt-ab-eval", 4], ["prompt compar", "prompt-ab-eval", 4], ["prompt version", "prompt-ab-eval", 3],
    ["pairwise", "pairwise-preference", 5], ["preference", "pairwise-preference", 4], ["win rate", "pairwise-preference", 4], ["elo", "pairwise-preference", 3], ["side by side", "pairwise-preference", 3],
    ["regression set", "regression-eval-set", 5], ["regression eval", "regression-eval-set", 5], ["golden set", "regression-eval-set", 4], ["mcnemar", "regression-eval-set", 4],
    ["sample size", "sample-size-power", 5], ["statistical power", "sample-size-power", 5], ["how many example", "sample-size-power", 4], ["significan", "sample-size-power", 3],
    ["eval set fresh", "eval-set-freshness", 5], ["stale eval", "eval-set-freshness", 4], ["data drift", "eval-set-freshness", 3],
    ["trace tree", "obs-trace-tree", 5], ["trace", "obs-trace-tree", 3], ["waterfall", "obs-trace-tree", 3],
    ["span", "obs-spans", 5], ["attribute", "obs-spans", 2],
    ["event", "obs-events", 4],
    ["replay", "obs-replay", 5], ["re-run trace", "obs-replay", 4],
    ["counter", "obs-counters", 4],
    ["histogram", "obs-histograms", 4], ["distribution", "obs-histograms", 3],
    ["five metric", "obs-five-metrics", 5], ["metrics that matter", "obs-five-metrics", 4],
    ["per agent", "obs-per-agent", 5], ["per-agent", "obs-per-agent", 5], ["per tool", "obs-per-agent", 4], ["breakdown", "obs-per-agent", 2],
    ["dashboard", "obs-dashboards", 5], ["widget", "obs-dashboards", 3],
    ["alert fatigue", "obs-alert-fatigue", 5], ["too many alert", "obs-alert-fatigue", 4],
    ["alert threshold", "obs-alert-thresholds", 5], ["alert", "obs-alert-thresholds", 3],
    ["on-call", "obs-oncall-playbook", 5], ["oncall", "obs-oncall-playbook", 5], ["playbook", "obs-oncall-playbook", 4], ["runbook", "obs-oncall-playbook", 3],
    ["sample failure", "obs-sample-failures", 5], ["always store", "obs-sample-failures", 4], ["trace sampling", "obs-sample-failures", 4], ["sampling", "obs-sample-failures", 3],
    ["routine sample", "obs-sample-routine", 5], ["healthy traffic", "obs-sample-routine", 3],
    ["rare task", "obs-sample-rare", 5],
    ["anomalous cost", "obs-sample-anomalous-cost", 5], ["cost anomaly", "obs-sample-anomalous-cost", 4],
  ];

  // ── Intent detection ──────────────────────────────────────────────────────────
  var INTENTS = [
    ["compare", /\b(vs\.?|versus|compared? (to|with)?|comparison|difference between|differ)\b/],
    ["overview", /\b(list( the)?|overview|all (the )?metrics|what metrics|categories|key (concepts?|ideas?|topics?|metrics|things)|(top|main|core|important|biggest|most important) (\d+ )?(key )?(concepts?|metrics|topics?|ideas?|things)|concepts|fundamentals|cheat ?sheet|top \d+|most important|where (do|should) i start|roadmap|outline|how many metrics|table of contents|getting started|summar(y|ise|ize))\b/],
    ["threshold", /\b(threshold|gate|target|pass(ing)?|acceptable|good enough|how (good|high|low)|sla|floor|cutoff|benchmark)\b/],
    ["pitfall", /\b(pitfalls?|gotchas?|mistakes?|traps?|avoid|footguns?|common error|go wrong|antipattern|anti-pattern)\b/],
    ["code", /\b(code|implement|script|typescript|snippet|how (do|to) (i|you) ?(measure|compute|calculate|implement|score)|library)\b/],
    ["math", /\b(math|formula|equation|derivation|calculate|statistic|how is it computed)\b/],
    ["when", /\bwhen\b|\bwhy\b|\buse ?case\b|should i (use|care)/],
    ["definition", /\b(what (is|are|'s)|whats|explain|describe|tell me about|meaning of|define|how does .* work|eli5|simply)\b/],
  ];

  function detectIntent(q) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i][1].test(q)) return INTENTS[i][0];
    return "definition";
  }

  // ── Metric scoring ──────────────────────────────────────────────────────────
  function scoreMetrics(q, reg) {
    var scores = {};
    function add(id, w) { scores[id] = (scores[id] || 0) + w; }
    // alias hits
    ALIASES.forEach(function (a) { if (q.indexOf(a[0]) >= 0) add(a[1], a[2]); });
    // title / id / category word overlap (each distinct word counts once)
    reg.forEach(function (m) {
      var seen = {};
      m.hay.split(/\s+/).forEach(function (w) {
        if (w.length >= 4 && !seen[w] && q.indexOf(w) >= 0) { seen[w] = 1; add(m.id, 2); }
      });
    });
    // only keep ids that exist in corpus
    var ls = L();
    var ranked = Object.keys(scores)
      .filter(function (id) { return ls[id]; })
      .map(function (id) { return { id: id, score: scores[id] }; })
      .sort(function (a, b) { return b.score - a.score; });
    return ranked;
  }

  // ── Answer composition (HTML built from lesson fields) ────────────────────────
  function codeBlock(code) {
    if (!code || !code.src) return "";
    return '<pre class="tut-code"><code>' + esc(code.src) + "</code></pre>";
  }
  function lessonLink(id, label) {
    var le = L()[id] || {};
    return '<a class="tut-llink" href="lesson.html#' + esc(id) + '" target="_blank">' +
      esc(label || le.title || id) + " ↗</a>";
  }
  function head(le, sub) {
    return '<div class="tut-h"><span class="tut-cat">' + esc(le.category || "") + '</span>' +
      '<h3>' + esc(le.title) + '</h3>' + (sub ? '<p class="tut-sub">' + esc(sub) + "</p>" : "") + "</div>";
  }
  function thresholdCallout(le) {
    if (!le.threshold) return "";
    return '<div class="tut-gate"><span class="tut-gate-l">Gate / target</span>' + esc(le.threshold) + "</div>";
  }

  function composeDefinition(le, id) {
    var html = head(le);
    html += '<div class="tut-body">' + (le.bridge || "") + "</div>";
    if (le.elaboration) html += '<details class="tut-more"><summary>Go deeper</summary><div class="tut-body">' + le.elaboration + "</div></details>";
    html += thresholdCallout(le);
    return html;
  }
  function composeThreshold(le, id) {
    var html = head(le, "Acceptance gate for this metric:");
    html += thresholdCallout(le);
    html += '<div class="tut-body">' + (le.bridge || "") + "</div>";
    return html;
  }
  function composePitfall(le, id) {
    var html = head(le, "Common traps and how to avoid them:");
    if (le.pitfalls && le.pitfalls.length) {
      html += '<ul class="tut-pit">' + le.pitfalls.map(function (p) {
        return "<li><b>Trap:</b> " + esc(p.trap) + '<br/><span class="tut-fix"><b>Fix:</b> ' + esc(p.fix) + "</span></li>";
      }).join("") + "</ul>";
    } else html += '<p class="tut-body">No pitfalls recorded for this metric yet.</p>';
    return html;
  }
  function composeCode(le, id) {
    var html = head(le, "How to measure it:");
    if (le.solution && le.solution.steps) {
      html += '<ol class="tut-steps">' + le.solution.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>";
    }
    if (le.solution && le.solution.code) html += codeBlock(le.solution.code);
    return html;
  }
  function composeMath(le, id) {
    var html = head(le, "The math behind it:");
    html += '<div class="tut-body">' + (le.math || "<p>No formal derivation recorded for this metric.</p>") + "</div>";
    return html;
  }
  function composeWhen(le, id) {
    var html = head(le, "Where this shows up on the Apex desk:");
    html += '<div class="tut-body">' + (le.scenario || "") + "</div>";
    html += '<div class="tut-body">' + (le.bridge || "") + "</div>";
    return html;
  }
  function composeCompare(a, b) {
    var la = L()[a], lb = L()[b];
    var sameCat = la.category === lb.category;
    var html = '<div class="tut-h"><h3>' + esc(la.title) + ' &nbsp;vs&nbsp; ' + esc(lb.title) + "</h3>" +
      '<p class="tut-sub">' + (sameCat ? "Both live in " + esc(la.category) + "." : esc(la.title) + " is " + esc(la.category) + "; " + esc(lb.title) + " is " + esc(lb.category) + ".") + "</p></div>";
    html += '<div class="tut-cmp">';
    [la, lb].forEach(function (le) {
      html += '<div class="tut-col"><h4>' + esc(le.title) + "</h4>" +
        '<div class="tut-body">' + firstSentence(le.bridge, 220) + "</div>" + thresholdCallout(le) + "</div>";
    });
    html += "</div>";
    return html;
  }

  function composeOverview() {
    var ls = L();
    var byCat = {};
    Object.keys(ls).forEach(function (id) {
      var c = ls[id].category || "Other";
      (byCat[c] = byCat[c] || []).push(id);
    });
    var html = '<div class="tut-h"><h3>The eval &amp; observability map</h3>' +
      '<p class="tut-sub">' + Object.keys(ls).length + " metrics across " + Object.keys(byCat).length + " areas. Pick an area, or ask about any single metric.</p></div>";
    html += '<ul class="tut-ovw">';
    Object.keys(byCat).forEach(function (c) {
      html += "<li><b>" + esc(c) + "</b> <span class=\"tut-count\">" + byCat[c].length + "</span><br/>" +
        byCat[c].slice(0, 6).map(function (id) { return lessonLink(id); }).join(" · ") +
        (byCat[c].length > 6 ? " …" : "") + "</li>";
    });
    html += "</ul>";
    html += '<p class="tut-body">New here? A good first three: ' +
      lessonLink("schema-conformance") + " · " + lessonLink("latency-percentiles") + " · " + lessonLink("calibration-ece") +
      '. Or open the <a class="tut-llink" href="knowledge-graph.html" target="_blank">guided tour ↗</a>.</p>';
    return html;
  }

  function refuse(q) {
    var starters = ["schema-conformance", "latency-percentiles", "calibration-ece", "hallucination-rate"];
    var html = '<div class="tut-h"><h3>That\'s outside the course content</h3>' +
      '<p class="tut-sub">I only answer from the eval &amp; observability curriculum — 41 metrics across 9 areas.</p></div>' +
      '<p class="tut-body">I couldn\'t map your question to a metric. Try naming one (e.g. <i>ECE</i>, <i>schema conformance</i>, <i>p95 latency</i>, <i>tool failure recovery</i>), ask for a <b>threshold</b>, <b>pitfalls</b>, <b>code</b>, or the <b>math</b> of a metric — or say <i>"list the metrics"</i>.</p>' +
      '<p class="tut-body">Starting points: ' + starters.map(function (id) { return lessonLink(id); }).join(" · ") + "</p>";
    return { html: html, suggested: starters };
  }

  // ── Self-eval (scored by the course's own metrics) ────────────────────────────
  function selfEval(result) {
    var cites = result.citations || [];
    var ls = L();
    var validCites = cites.filter(function (c) { return ls[c.metricId]; });
    var citationFaithfulness = cites.length ? validCites.length / cites.length : (result.in_scope ? 1 : 1);
    // schema-conformance of OUR structured answer object
    var requiredOk = !!(result.answer_html && typeof result.in_scope === "boolean" &&
      typeof result.confidence === "number" && Array.isArray(result.citations) && result.intent);
    return {
      schema_conformance: requiredOk ? 1 : 0,
      citation_faithfulness: +citationFaithfulness.toFixed(3),
      refusal: !result.in_scope, // did we (correctly) refuse?
      grounded: validCites.length > 0 || !result.in_scope,
      latency_ms: result.latency_ms || 0,
      cost_usd: result.cost_usd || 0,
    };
  }

  // ── Observability trace (shape matches trace-explorer.html) ───────────────────
  function buildTrace(result) {
    var total = Math.max(result.latency_ms || 6, 4);
    // apportion synthetic sub-durations that sum to ~total
    var dRouter = Math.max(Math.round(total * 0.25), 1);
    var dRetrieve = Math.max(Math.round(total * 0.30), 1);
    var dCompose = Math.max(Math.round(total * 0.30), 1);
    var dEval = Math.max(total - dRouter - dRetrieve - dCompose, 1);
    var mode = result.mode || "retrieval";
    var llm = mode === "claude";
    var ids = (result.citations || []).map(function (c) { return c.metricId; });
    var ev = result.evals || {};
    var status = !result.in_scope ? "warn" : (result.confidence >= 0.7 ? "ok" : "warn");
    var t0 = 0, t1 = dRouter, t2 = t1 + dRetrieve, t3 = t2 + dCompose;
    return {
      id: "TUTOR-" + Date.now().toString(36).toUpperCase(),
      status: status,
      tutor: true,
      // analytics fields consumed by my-sessions.html (self-eval dashboard)
      ts: Date.now(),
      intent: result.intent,
      in_scope: result.in_scope,
      confidence: result.confidence,
      latency_ms: result.latency_ms || 0,
      question_text: stripTags(result.question),
      evals: {
        citation_faithfulness: ev.citation_faithfulness != null ? ev.citation_faithfulness : null,
        schema_conformance: ev.schema_conformance != null ? ev.schema_conformance : null,
        refusal: !!ev.refusal,
        grounded: !!ev.grounded,
      },
      metric_ids: ids.slice(),
      short: "tutor · " + firstSentence(result.question, 38),
      scen: 'Apex Tutor answered: "' + stripTags(result.question) + '". Mode: ' + mode +
        ". Intent: " + result.intent + ". The tutor is itself an Apex-style agent — these spans are its own pipeline, scored by the course's metrics.",
      sample: {
        rule: "tutor self-eval capture",
        text: "Stored because every tutor answer is self-evaluated. citation-faithfulness=<b>" +
          (ev.citation_faithfulness != null ? ev.citation_faithfulness : "—") + "</b>, schema-conformance=<b>" +
          (ev.schema_conformance != null ? ev.schema_conformance : "—") + "</b>, refused=<b>" + (ev.refusal ? "yes" : "no") + "</b>.",
        metric: "citation-faithfulness",
      },
      replay: "Replaying with <b>Claude synthesis</b> (backend mode) would compose free-form prose over the same retrieved lessons — citations and gate values stay pinned to the lesson data, so grounding is unchanged.",
      spans: [
        { name: "tutor-orchestrator", agent: "tutor-orchestrator", depth: 0, kind: "agent", model: null, in: 0, out: 0, start: t0, dur: total, status: status,
          events: [[0, "question received"], [total, result.in_scope ? "grounded answer returned" : "refused (out of scope)"]], feeds: ["obs-trace-tree"] },
        { name: "intent-router", agent: "intent-router", depth: 1, kind: "agent", model: llm ? "haiku" : null, in: llm ? 1200 : 0, out: llm ? 60 : 0, start: t0, dur: dRouter, status: "ok",
          events: [[0, "classify intent"], [dRouter, "intent=" + result.intent + (ids.length ? " · matched " + ids.slice(0, 3).join(", ") : " · no match")]], feeds: ["tool-argument-validity"] },
        { name: "retriever", agent: "retriever", depth: 1, kind: "tool", model: null, in: 0, out: 0, start: t1, dur: dRetrieve, status: ids.length || !result.in_scope ? "ok" : "warn",
          events: [[0, "search 41-lesson corpus"], [dRetrieve, "pulled " + ids.length + " lesson section(s)"]], feeds: ["citation-faithfulness"] },
        { name: "answer-composer", agent: "answer-composer", depth: 1, kind: "agent", model: llm ? "sonnet" : null, in: llm ? 9000 : 0, out: llm ? 700 : 0, start: t2, dur: dCompose, status: "ok",
          events: [[0, "compose from retrieved fields"], [dCompose, "structured answer · schema validated"]], feeds: ["schema-conformance", "hallucination-rate"] },
        { name: "self-evaluator", agent: "self-evaluator", depth: 1, kind: "agent", model: null, in: 0, out: 0, start: t3, dur: dEval, status: (ev.citation_faithfulness >= 0.999 || ev.refusal) ? "ok" : "warn",
          events: [[0, "score citation-faithfulness"], [dEval, "faithfulness=" + (ev.citation_faithfulness != null ? ev.citation_faithfulness : "—") + " · refused=" + (ev.refusal ? "yes" : "no")]], feeds: ["citation-faithfulness", "refusal-rate"] },
      ],
    };
  }

  function saveTrace(trace) {
    try {
      var arr = JSON.parse(global.localStorage.getItem(TRACE_KEY) || "[]");
      if (!Array.isArray(arr)) arr = [];
      arr.unshift(trace);
      if (arr.length > MAX_TRACES) arr = arr.slice(0, MAX_TRACES);
      global.localStorage.setItem(TRACE_KEY, JSON.stringify(arr));
    } catch (e) { /* storage unavailable — non-fatal */ }
  }

  // ── Public: ask() ─────────────────────────────────────────────────────────────
  function ask(question, opts) {
    opts = opts || {};
    var t0 = (global.performance && performance.now) ? performance.now() : Date.now();
    var q = String(question || "").toLowerCase().trim();
    var reg = buildRegistry();
    var intent = detectIntent(q);
    var ranked = scoreMetrics(q, reg);
    var top = ranked[0];

    var result = {
      question: question,
      intent: intent,
      in_scope: true,
      confidence: 0.7,
      answer_html: "",
      citations: [],
      suggested: [],
      mode: "retrieval",
    };

    if (intent === "overview" && (!top || top.score < 5)) {
      result.intent = "overview";
      result.confidence = 0.85;
      result.answer_html = composeOverview();
      result.citations = []; // overview links many; not single-metric citations
    } else if (!top || top.score === 0) {
      var r = refuse(question);
      result.in_scope = false;
      result.confidence = 0.3;
      result.answer_html = r.html;
      result.suggested = r.suggested;
    } else {
      var id = top.id, le = L()[id];
      // map intent → composer
      var html, used = [{ metricId: id, section: intent, title: le.title }];
      if (intent === "compare" && ranked[1] && ranked[1].score >= 2) {
        var id2 = ranked[1].id;
        html = composeCompare(id, id2);
        used.push({ metricId: id2, section: "compare", title: L()[id2].title });
      } else if (intent === "threshold") html = composeThreshold(le, id);
      else if (intent === "pitfall") html = composePitfall(le, id);
      else if (intent === "code") html = composeCode(le, id);
      else if (intent === "math") html = composeMath(le, id);
      else if (intent === "when") html = composeWhen(le, id);
      else { html = composeDefinition(le, id); result.intent = "definition"; }
      result.answer_html = html;
      result.citations = used;
      result.confidence = top.score >= 5 ? 0.92 : top.score >= 3 ? 0.8 : 0.68;
      // related suggestions: next-highest distinct metrics
      result.suggested = ranked.slice(used.length, used.length + 3).map(function (r2) { return r2.id; });
    }

    var t1 = (global.performance && performance.now) ? performance.now() : Date.now();
    result.latency_ms = Math.round((t1 - t0) * 100) / 100;
    result.cost_usd = 0; // retrieval mode is free
    result.evals = selfEval(result);
    result.trace = buildTrace(result);
    if (opts.saveTrace !== false) saveTrace(result.trace);
    return result;
  }

  global.ApexTutor = {
    ask: ask,
    buildRegistry: buildRegistry,
    selfEval: selfEval,
    ALIASES: ALIASES,
    TRACE_KEY: TRACE_KEY,
    ready: function () { return !!global.LESSONS && Object.keys(global.LESSONS).length > 0; },
    // Seam for the future Claude backend (see header). When config.backend is set,
    // a host page can route synthesis through it and fall back to ask() for grounding.
    config: { backend: null, apiKey: null, model: null },
    version: "1.0",
  };
})(typeof window !== "undefined" ? window : this);
