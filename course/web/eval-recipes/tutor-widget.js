/* ============================================================================
 * tutor-widget.js — floating "Ask the Eval Tutor" bubble.
 *
 * Drop-in on any course page:
 *     <script src="tutor-widget.js" defer></script>
 *
 * Self-contained: it lazily injects lessons-data.js + tutor-engine.js if they
 * are not already on the page, ships its own scoped dark-glass CSS (so it does
 * not inherit / pollute the host theme), and reuses the shared window.ApexTutor
 * engine — same grounded retrieval, same self-eval, same trace emission as
 * tutor.html. Answers are written to localStorage "apex-tutor-traces" and the
 * per-answer "trace ↗" deep-links into trace-explorer.html.
 * ==========================================================================*/
(function () {
  "use strict";
  if (window.__apexTutorWidget) return;          // guard against double-include
  window.__apexTutorWidget = true;

  /* ---- resolve sibling scripts relative to THIS file ---------------------*/
  var here = (document.currentScript && document.currentScript.src) || "";
  var base = here ? here.slice(0, here.lastIndexOf("/") + 1) : "";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = base + src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureEngine() {
    var chain = Promise.resolve();
    if (!window.LESSONS) chain = chain.then(function () { return loadScript("lessons-data.js"); });
    if (!window.ApexTutor) chain = chain.then(function () { return loadScript("tutor-engine.js"); });
    return chain;
  }

  /* ---- scoped styles (everything lives under #apex-tw) --------------------*/
  var CSS = [
    "#apex-tw,#apex-tw *{box-sizing:border-box;}",
    "#apex-tw{--tw-bg:#0a0f1d;--tw-panel:rgba(15,21,38,0.97);--tw-panel2:rgba(20,28,48,0.7);",
    "--tw-border:rgba(120,150,210,0.18);--tw-border2:rgba(120,150,210,0.34);--tw-txt:#e6ecf7;",
    "--tw-muted:#8b9bc0;--tw-faint:#5d6b8e;--tw-accent:#38bdf8;--tw-good:#34d399;--tw-warn:#fbbf24;",
    "--tw-bad:#f87171;--tw-violet:#a78bfa;--tw-code:#0b1120;",
    "position:fixed;right:22px;bottom:22px;z-index:2147483000;",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}",
    /* launcher bubble */
    "#apex-tw .tw-fab{width:56px;height:56px;border-radius:50%;border:1px solid var(--tw-border2);cursor:pointer;",
    "background:linear-gradient(135deg,var(--tw-accent),var(--tw-violet));color:#06121f;font-size:24px;",
    "display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(5,7,15,.55);",
    "transition:transform .15s ease,box-shadow .15s ease;}",
    "#apex-tw .tw-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 14px 38px rgba(56,189,248,.4);}",
    "#apex-tw .tw-fab .tw-pulse{position:absolute;width:56px;height:56px;border-radius:50%;",
    "background:var(--tw-accent);opacity:.0;}",
    /* panel */
    "#apex-tw .tw-panel{position:absolute;right:0;bottom:70px;width:390px;max-width:calc(100vw - 36px);",
    "height:min(74vh,640px);background:var(--tw-panel);backdrop-filter:blur(14px);border:1px solid var(--tw-border2);",
    "border-radius:18px;box-shadow:0 24px 70px rgba(5,7,15,.7);display:none;flex-direction:column;overflow:hidden;color:var(--tw-txt);}",
    "#apex-tw.open .tw-panel{display:flex;animation:twup .18s ease;}",
    "@keyframes twup{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}",
    "#apex-tw .tw-head{display:flex;align-items:center;gap:9px;padding:13px 15px;border-bottom:1px solid var(--tw-border);}",
    "#apex-tw .tw-logo{width:28px;height:28px;border-radius:8px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;",
    "background:linear-gradient(135deg,var(--tw-accent),var(--tw-violet));color:#06121f;font-weight:800;font-size:12px;}",
    "#apex-tw .tw-ttl{font-weight:800;font-size:14px;line-height:1.1;}",
    "#apex-tw .tw-sub{font-size:10.5px;color:var(--tw-muted);letter-spacing:.04em;}",
    "#apex-tw .tw-head .tw-sp{flex:1;}",
    "#apex-tw .tw-full{font-size:11px;color:var(--tw-accent);text-decoration:none;font-weight:700;white-space:nowrap;}",
    "#apex-tw .tw-x{background:none;border:none;color:var(--tw-muted);font-size:20px;cursor:pointer;line-height:1;padding:2px 4px;}",
    "#apex-tw .tw-x:hover{color:var(--tw-txt);}",
    "#apex-tw .tw-body{flex:1;overflow-y:auto;padding:14px 15px;display:flex;flex-direction:column;gap:13px;}",
    "#apex-tw .tw-body::-webkit-scrollbar{width:8px;}#apex-tw .tw-body::-webkit-scrollbar-thumb{background:var(--tw-border2);border-radius:8px;}",
    /* chips */
    "#apex-tw .tw-chips{display:flex;gap:7px;flex-wrap:wrap;}",
    "#apex-tw .tw-chip{font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:999px;border:1px solid var(--tw-border2);",
    "background:var(--tw-panel2);color:var(--tw-muted);cursor:pointer;}",
    "#apex-tw .tw-chip:hover{color:var(--tw-accent);border-color:var(--tw-accent);}",
    /* messages */
    "#apex-tw .tw-msg{display:flex;gap:9px;}",
    "#apex-tw .tw-av{width:26px;height:26px;border-radius:8px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;",
    "font-size:10px;font-weight:800;}",
    "#apex-tw .tw-msg.user .tw-av{background:var(--tw-panel2);border:1px solid var(--tw-border2);color:var(--tw-accent);}",
    "#apex-tw .tw-msg.bot .tw-av{background:linear-gradient(135deg,var(--tw-accent),var(--tw-violet));color:#06121f;}",
    "#apex-tw .tw-bub{flex:1;border-radius:13px;padding:11px 13px;font-size:13px;line-height:1.55;border:1px solid var(--tw-border);}",
    "#apex-tw .tw-msg.user .tw-bub{background:var(--tw-panel2);max-width:82%;}",
    "#apex-tw .tw-msg.bot .tw-bub{background:rgba(20,28,48,0.5);}",
    /* answer internals (mirror tutor.html, compact) */
    "#apex-tw .tut-h{margin-bottom:6px;}#apex-tw .tut-h h3{margin:2px 0 0;font-size:15px;font-weight:800;}",
    "#apex-tw .tut-cat{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--tw-violet);font-weight:700;}",
    "#apex-tw .tut-sub{margin:4px 0 0;color:var(--tw-muted);font-size:12px;}",
    "#apex-tw .tut-body{font-size:12.5px;line-height:1.55;color:var(--tw-txt);}",
    "#apex-tw .tut-body p{margin:7px 0;}#apex-tw .tut-body ul,#apex-tw .tut-body ol{margin:7px 0;padding-left:18px;}",
    "#apex-tw .tut-body li{margin:3px 0;}",
    "#apex-tw .tut-body code{background:var(--tw-panel2);border:1px solid var(--tw-border);border-radius:5px;padding:1px 5px;font-size:11px;color:var(--tw-accent);}",
    "#apex-tw .tut-body b,#apex-tw .tut-body strong{color:var(--tw-txt);}#apex-tw .tut-body i,#apex-tw .tut-body em{color:var(--tw-muted);}",
    "#apex-tw .tut-body .eq{background:var(--tw-code);border:1px solid var(--tw-border);border-radius:8px;padding:8px 11px;margin:7px 0;",
    "font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--tw-txt);overflow-x:auto;}",
    "#apex-tw .tut-gate{margin:9px 0;background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(167,139,250,.07));",
    "border:1px solid var(--tw-border2);border-radius:9px;padding:9px 11px;font-size:12px;}",
    "#apex-tw .tut-gate-l{display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--tw-accent);font-weight:700;margin-bottom:2px;}",
    "#apex-tw .tut-code{background:var(--tw-code);border:1px solid var(--tw-border);border-radius:10px;padding:11px 13px;overflow-x:auto;",
    "font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5;margin:8px 0;}",
    "#apex-tw .tut-code code{color:var(--tw-txt);}",
    "#apex-tw .tut-steps{padding-left:18px;}#apex-tw .tut-steps li{margin:5px 0;font-size:12px;line-height:1.5;}",
    "#apex-tw .tut-steps code{background:var(--tw-panel2);border-radius:4px;padding:1px 5px;color:var(--tw-accent);}",
    "#apex-tw .tut-pit{list-style:none;padding:0;margin:5px 0;}",
    "#apex-tw .tut-pit li{background:var(--tw-panel2);border:1px solid var(--tw-border);border-radius:9px;padding:9px 11px;margin:6px 0;font-size:12px;line-height:1.5;}",
    "#apex-tw .tut-pit b{color:var(--tw-bad);}#apex-tw .tut-fix b{color:var(--tw-good);}",
    "#apex-tw .tut-more{margin:7px 0;}#apex-tw .tut-more summary{cursor:pointer;color:var(--tw-accent);font-size:12px;font-weight:700;}",
    "#apex-tw .tut-cmp{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:7px;}",
    "#apex-tw .tut-col{background:var(--tw-panel2);border:1px solid var(--tw-border);border-radius:9px;padding:9px 11px;}",
    "#apex-tw .tut-col h4{margin:0 0 5px;font-size:12.5px;color:var(--tw-accent);}",
    "#apex-tw .tut-ovw{list-style:none;padding:0;margin:5px 0;}",
    "#apex-tw .tut-ovw li{padding:7px 0;border-bottom:1px dashed var(--tw-border);font-size:12px;line-height:1.65;}",
    "#apex-tw .tut-count{font-size:10.5px;color:var(--tw-faint);font-weight:700;}",
    "#apex-tw .tut-llink{color:var(--tw-accent);text-decoration:none;font-weight:600;font-size:12px;}",
    "#apex-tw .tut-llink:hover{text-decoration:underline;}",
    /* citations + suggested + eval strip + trace link */
    "#apex-tw .tw-cite{margin-top:8px;font-size:11.5px;color:var(--tw-muted);}",
    "#apex-tw .tw-cite a{color:var(--tw-accent);text-decoration:none;font-weight:600;}",
    "#apex-tw .tw-sugg{margin-top:6px;font-size:11.5px;color:var(--tw-faint);}",
    "#apex-tw .tw-sugg a{color:var(--tw-muted);text-decoration:none;border-bottom:1px dotted var(--tw-border2);cursor:pointer;}",
    "#apex-tw .tw-sugg a:hover{color:var(--tw-accent);}",
    "#apex-tw .tw-strip{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:9px;border-top:1px dashed var(--tw-border);align-items:center;}",
    "#apex-tw .tw-strip .tw-el{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--tw-faint);font-weight:700;}",
    "#apex-tw .tw-stat{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid var(--tw-border);background:var(--tw-panel2);}",
    "#apex-tw .tw-stat.good{color:var(--tw-good);border-color:rgba(52,211,153,.35);}",
    "#apex-tw .tw-stat.warn{color:var(--tw-warn);border-color:rgba(251,191,36,.35);}",
    "#apex-tw .tw-stat b{color:var(--tw-txt);}",
    "#apex-tw .tw-trace{margin-left:auto;font-size:10.5px;color:var(--tw-violet);text-decoration:none;font-weight:700;}",
    "#apex-tw .tw-trace:hover{text-decoration:underline;}",
    /* composer */
    "#apex-tw .tw-foot{border-top:1px solid var(--tw-border);padding:11px 13px;display:flex;gap:8px;align-items:flex-end;}",
    "#apex-tw .tw-in{flex:1;resize:none;background:var(--tw-panel2);border:1px solid var(--tw-border2);border-radius:11px;",
    "color:var(--tw-txt);font-size:13px;font-family:inherit;padding:9px 11px;max-height:90px;line-height:1.4;}",
    "#apex-tw .tw-in:focus{outline:none;border-color:var(--tw-accent);}",
    "#apex-tw .tw-send{flex:0 0 auto;background:linear-gradient(135deg,var(--tw-accent),var(--tw-violet));color:#06121f;",
    "border:none;border-radius:11px;font-weight:800;font-size:13px;padding:9px 14px;cursor:pointer;}",
    "#apex-tw .tw-send:hover{filter:brightness(1.08);}"
  ].join("");

  function injectCSS() {
    var st = document.createElement("style");
    st.id = "apex-tw-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---- helpers -----------------------------------------------------------*/
  var QUICK = [
    "Explain ECE simply",
    "Threshold for schema conformance?",
    "Pitfalls of p95 latency",
    "List the metrics"
  ];
  function pct(x) { return Math.round(x * 100) + "%"; }
  function cls(ok) { return ok ? "good" : "warn"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function answerBlock(r) {
    var html = r.answer_html;
    if (r.citations && r.citations.length) {
      html += '<div class="tw-cite">Cited: ' + r.citations.map(function (c) {
        return '<a href="' + base + 'lesson.html#' + encodeURIComponent(c.metricId) + '" target="_blank" rel="noopener">' +
          esc(c.title || c.metricId) + " ↗</a>";
      }).join(" · ") + "</div>";
    }
    if (r.suggested && r.suggested.length) {
      html += '<div class="tw-sugg">Related: ' + r.suggested.map(function (id) {
        var le = (window.LESSONS && window.LESSONS[id]) || {};
        return '<a data-ask="' + esc(le.title || id).replace(/"/g, "&quot;") + '">' + esc(le.title || id) + "</a>";
      }).join(" · ") + "</div>";
    }
    var e = r.evals || {};
    var lat = (e.latency_ms != null ? e.latency_ms : 0);
    html += '<div class="tw-strip"><span class="tw-el">self-eval</span>' +
      '<span class="tw-stat ' + cls(e.citation_faithfulness >= 0.999) + '">faithfulness <b>' + pct(e.citation_faithfulness || 0) + "</b></span>" +
      '<span class="tw-stat ' + cls(e.schema_conformance >= 0.999) + '">schema <b>' + pct(e.schema_conformance || 0) + "</b></span>" +
      '<span class="tw-stat good">' + (r.in_scope ? "in-scope" : "refused ✓") + "</span>" +
      '<span class="tw-stat ' + cls(lat < 50) + '">' + lat.toFixed(1) + " ms</span>" +
      (r.trace ? '<a class="tw-trace" href="' + base + "trace-explorer.html#" + encodeURIComponent(r.trace.id) + '" target="_blank" rel="noopener">trace ↗</a>' : "") +
      "</div>";
    return html;
  }

  /* ---- DOM build ---------------------------------------------------------*/
  var root, body, input;

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  function addMsg(role, html) {
    var m = el("div", "tw-msg " + role);
    m.innerHTML = '<div class="tw-av">' + (role === "user" ? "You" : "AT") + '</div><div class="tw-bub">' + html + "</div>";
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }

  function submit() {
    var q = input.value.trim();
    if (!q) return;
    if (!(window.ApexTutor && window.ApexTutor.ready && window.ApexTutor.ready())) {
      addMsg("bot", '<p class="tut-body">Loading course content… one moment.</p>');
      return;
    }
    addMsg("user", esc(q));
    input.value = "";
    input.style.height = "auto";
    var r = window.ApexTutor.ask(q);
    var bot = addMsg("bot", answerBlock(r));
    [].forEach.call(bot.querySelectorAll("a[data-ask]"), function (a) {
      a.onclick = function (ev) { ev.preventDefault(); input.value = a.getAttribute("data-ask"); submit(); };
    });
  }

  function build() {
    root = el("div", null);
    root.id = "apex-tw";

    var fab = el("button", "tw-fab");
    fab.setAttribute("aria-label", "Ask the Eval Tutor");
    fab.innerHTML = "💬";
    fab.onclick = toggle;

    var panel = el("div", "tw-panel");

    var head = el("div", "tw-head");
    head.innerHTML =
      '<div class="tw-logo">AT</div>' +
      '<div><div class="tw-ttl">Eval Tutor</div><div class="tw-sub">grounded · cited · self-scored</div></div>' +
      '<div class="tw-sp"></div>' +
      '<a class="tw-full" href="' + base + 'tutor.html" target="_blank" rel="noopener">full page ↗</a>' +
      '<button class="tw-x" aria-label="Close">×</button>';

    body = el("div", "tw-body");

    var foot = el("div", "tw-foot");
    input = el("textarea", "tw-in");
    input.rows = 1;
    input.placeholder = "Ask about any of the 41 metrics…";
    input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(90, input.scrollHeight) + "px"; });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); submit(); }
    });
    var send = el("button", "tw-send", "Ask");
    send.onclick = submit;
    foot.appendChild(input);
    foot.appendChild(send);

    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(foot);
    root.appendChild(panel);
    root.appendChild(fab);
    document.body.appendChild(root);

    head.querySelector(".tw-x").onclick = toggle;

    // greeting + quick chips
    addMsg("bot",
      '<div class="tut-h"><h3>Hi — ask me anything</h3>' +
      '<p class="tut-sub">I answer only from the eval &amp; observability course (41 metrics), cite my sources, and refuse out-of-scope questions.</p></div>');
    var chips = el("div", "tw-chips");
    chips.innerHTML = QUICK.map(function (q) { return '<span class="tw-chip">' + esc(q) + "</span>"; }).join("");
    [].forEach.call(chips.querySelectorAll(".tw-chip"), function (c) {
      c.onclick = function () { input.value = c.textContent; submit(); };
    });
    body.appendChild(chips);
  }

  var engineKicked = false;
  function toggle() {
    var open = root.classList.toggle("open");
    if (open) {
      if (!engineKicked) { engineKicked = true; ensureEngine().catch(function () {}); }
      setTimeout(function () { input && input.focus(); }, 60);
    }
  }

  /* ---- init: build the (closed) widget; engine loads on first open -------*/
  function init() {
    injectCSS();
    build();              // creates #apex-tw root with hidden panel + fab
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
