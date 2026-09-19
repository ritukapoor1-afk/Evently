// Evently – planner engine
// Generic step flow, vision parsing, and plan renderer. The engine knows nothing
// about any specific event type — every questionnaire and plan builder lives in
// events.js, which is loaded before this file.
// Everything lives in memory — no backend, no persistence — demo content only.

/* ---------- State ---------- */
let eventType = null;    // the active EVENT_TYPES entry
let questionList = [];   // its questions, in order
let currentStep = 0;
const answers = {};      // question.key -> string | number | string[]

/* ---------- DOM refs ---------- */
const $ = (id) => document.getElementById(id);
const stepTotalEl = $("stepTotal");
const stepCurrentEl = $("stepCurrent");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const questionLabel = $("questionLabel");
const questionTitle = $("questionTitle");
const questionHint = $("questionHint");
const questionInput = $("questionInput");
const progressBar = $("progressFill");
const progressPercentEl = $("progressPercent");
const plannerSection = $("planner");
const homeSection = $("home");
const planSection = $("plan");
const plannerHeading = $("plannerHeading");
const plannerSub = $("plannerSub");

/* ============================================================
   Vision parsing — pulls concrete signals out of the free text
   ============================================================ */
const VISION_VOCAB = {
  cuisines: ["indian", "italian", "mexican", "chinese", "thai", "japanese", "sushi", "korean",
    "greek", "french", "spanish", "mediterranean", "barbecue", "bbq", "pizza", "tacos", "pasta",
    "curry", "seafood", "biryani", "tandoori", "vegan", "vegetarian", "halal", "kosher",
    "gluten-free", "cake", "chocolate", "dessert", "cocktails", "champagne", "wine", "tea", "coffee"],
  vibes: ["elegant", "fun", "relaxed", "classy", "casual", "romantic", "intimate", "lively",
    "energetic", "cozy", "glamorous", "rustic", "modern", "tropical", "bohemian", "whimsical",
    "vintage", "festive", "joyful", "warm", "sophisticated", "playful", "laid-back", "formal"],
  settings: ["outdoor", "outdoors", "garden", "backyard", "beach", "rooftop", "terrace", "patio",
    "indoor", "ballroom", "barn", "vineyard", "lake", "park", "lounge", "poolside", "courtyard",
    "marquee", "tent"],
  activities: ["music", "dancing", "karaoke", "dj", "live band", "band", "games", "photography",
    "photos", "speeches", "toasts", "slideshow", "fireworks", "bonfire", "photo booth",
    "performances", "trivia", "dance floor"],
  moments: ["surprise", "first dance", "cake cutting", "candle", "ceremony", "grand entrance",
    "send-off", "blessing", "montage", "toast", "speech", "vows", "gift"],
  needs: ["kids", "children", "wheelchair", "accessible", "accessibility", "elderly", "pets",
    "baby", "allergies", "allergy", "parking", "shuttle", "quiet", "sober", "no alcohol",
    "gluten", "vegan", "vegetarian"],
  colors: ["pastel", "sage", "blush", "pink", "blue", "green", "gold", "white", "cream",
    "navy", "burgundy", "terracotta", "lavender", "peach", "yellow"]
};

function detectSignals(text) {
  const t = " " + String(text || "").toLowerCase() + " ";
  const found = {};
  Object.keys(VISION_VOCAB).forEach(group => {
    found[group] = VISION_VOCAB[group].filter(word => t.indexOf(word) > -1);
  });
  return found;
}

/* Drop overlaps, keeping the most specific phrasing ("dancing" over "dance"). */
function uniqueSignals(list) {
  const byLength = [...new Set(list)].sort((a, b) => b.length - a.length);
  const kept = [];
  byLength.forEach(word => {
    if (!kept.some(k => k.indexOf(word) > -1)) kept.push(word);
  });
  return kept;
}

/* ============================================================
   Planner flow
   ============================================================ */
function startEvent(key) {
  const def = EVENT_TYPES[key];
  if (!def) return;

  eventType = def;
  questionList = def.questions;
  Object.keys(answers).forEach(k => delete answers[k]);
  currentStep = 0;

  homeSection.classList.add("hidden");
  planSection.classList.add("hidden");
  plannerSection.classList.remove("hidden");

  if (plannerHeading) plannerHeading.textContent = `Let's plan your ${def.label.toLowerCase()}`;
  if (plannerSub) plannerSub.textContent = "Answer these questions and we'll create a personalized plan for you.";

  stepTotalEl.textContent = questionList.length;
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStep() {
  const q = questionList[currentStep];
  const isVision = q.type === "vision";

  questionTitle.textContent = q.label;
  questionHint.textContent = q.hint;
  questionInput.innerHTML = "";

  if (questionLabel) {
    questionLabel.innerHTML = isVision
      ? 'Final step <span id="qNum" hidden>' + (currentStep + 1) + '</span>'
      : 'Question <span id="qNum">' + (currentStep + 1) + '</span>';
  }

  if (q.type === "chips") {
    renderChips(q);
  } else if (isVision) {
    renderVision(q);
  } else {
    const input = document.createElement("input");
    input.id = "answerInput";
    input.name = "answerInput";
    input.type = q.type === "number" ? "number" : q.type;
    input.required = true;
    if (q.placeholder) input.placeholder = q.placeholder;
    if (answers[q.key] !== undefined) input.value = answers[q.key];
    input.classList.add("text-input");
    questionInput.appendChild(input);
    setTimeout(() => input.focus(), 30);
  }

  prevBtn.disabled = currentStep === 0;
  nextBtn.textContent = isVision ? "✨ Generate my plan" : "Next →";
  stepCurrentEl.textContent = currentStep + 1;
  const percent = Math.round(((currentStep + 1) / questionList.length) * 100);
  progressBar.style.width = percent + "%";
  if (progressPercentEl) progressPercentEl.textContent = percent + "%";
}

/* The free-form closing step: a generous textarea with the example as placeholder. */
function renderVision(q) {
  const field = document.createElement("div");
  field.className = "vision-field";

  const ta = document.createElement("textarea");
  ta.id = "answerInput";
  ta.name = "answerInput";
  ta.className = "text-input vision-input";
  ta.rows = 9;
  ta.placeholder = q.placeholder;
  if (answers[q.key] !== undefined) ta.value = answers[q.key];
  field.appendChild(ta);

  const note = document.createElement("p");
  note.className = "vision-note";
  note.textContent = "A few sentences is plenty — we'll combine this with everything you told us above.";
  field.appendChild(note);

  questionInput.appendChild(field);
  setTimeout(() => ta.focus(), 30);
}

function renderChips(q) {
  const wrap = document.createElement("div");
  wrap.className = "chip-group";
  const current = Array.isArray(answers[q.key]) ? answers[q.key] : [];
  q.options.forEach(opt => {
    const chip = document.createElement("button");
    chip.type = "button";
    const on = current.indexOf(opt) > -1;
    chip.className = "chip" + (on ? " chip-selected" : "");
    chip.textContent = opt;
    chip.setAttribute("aria-pressed", on ? "true" : "false");
    chip.addEventListener("click", () => {
      let arr = Array.isArray(answers[q.key]) ? [...answers[q.key]] : [];
      if (arr.indexOf(opt) > -1) arr = arr.filter(x => x !== opt);
      else arr.push(opt);
      answers[q.key] = arr;
      const nowOn = arr.indexOf(opt) > -1;
      chip.classList.toggle("chip-selected", nowOn);
      chip.setAttribute("aria-pressed", nowOn ? "true" : "false");
    });
    wrap.appendChild(chip);
  });
  questionInput.appendChild(wrap);
}

function isStepValid() {
  const q = questionList[currentStep];
  const v = answers[q.key];
  if (q.type === "chips") return Array.isArray(v) && v.length > 0;
  return v !== undefined && String(v).trim() !== "";
}

function nextStep() {
  const q = questionList[currentStep];
  if (q.type !== "chips") {
    const inputEl = $("answerInput");
    if (inputEl && !inputEl.checkValidity()) { inputEl.reportValidity(); return; }
    if (inputEl) answers[q.key] = inputEl.value;
  }
  if (!isStepValid()) {
    questionInput.classList.add("input-error");
    setTimeout(() => questionInput.classList.remove("input-error"), 600);
    return;
  }
  if (currentStep === questionList.length - 1) {
    generatePlan();
  } else {
    currentStep++;
    renderStep();
  }
}

function previousStep() {
  const q = questionList[currentStep];
  if (q.type !== "chips") {
    const inputEl = $("answerInput");
    if (inputEl) answers[q.key] = inputEl.value;
  }
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}

/* ============================================================
   Plan generation
   ============================================================ */
function collectProfile() {
  const vision = String(answers.vision || "").trim();
  const raw = detectSignals(vision);
  return {
    a: answers,
    type: eventType,
    vision,
    guests: parseInt(answers.guests || "0", 10) || 0,
    budget: parseInt(answers.budget || "0", 10) || 0,
    fmtDate: formatDate,
    sig: {
      cuisines: uniqueSignals(raw.cuisines),
      vibes: uniqueSignals(raw.vibes),
      settings: uniqueSignals(raw.settings),
      activities: uniqueSignals(raw.activities),
      moments: uniqueSignals(raw.moments),
      needs: uniqueSignals(raw.needs),
      colors: uniqueSignals(raw.colors)
    }
  };
}

function generatePlan() {
  plannerSection.classList.add("hidden");
  planSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const p = collectProfile();
  const plan = eventType.build(p);

  renderPlanHeader(p, plan);
  renderCards(plan);
  renderTimeline(plan);
  renderChecklist(plan);
  renderConsiderations(plan);
}

function renderPlanHeader(p, plan) {
  $("planTitle").textContent = eventType.planTitle(p);

  const bits = [];
  bits.push(p.guests ? `for ${p.guests} guests` : "for your guests");
  if (s(p, "date")) bits.push(`on ${formatDate(s(p, "date"))}`);
  if (s(p, "location")) bits.push(`in ${s(p, "location")}`);
  if (s(p, "ceremonyPlace")) bits.push(`in ${s(p, "ceremonyPlace")}`);
  $("planSummary").textContent = `A personalized ${eventType.label.toLowerCase()} plan ${listPhrase(bits)}.`;

  const metaEl = $("planMeta");
  metaEl.innerHTML = "";
  const pills = [`${eventType.emoji} ${eventType.label}`];
  pills.push(`📅 ${s(p, "date") ? formatDate(s(p, "date")) : "Date TBD"}`);
  if (s(p, "location")) pills.push(`📍 ${s(p, "location")}`);
  if (s(p, "ceremonyPlace")) pills.push(`📍 ${s(p, "ceremonyPlace")}`);
  let perHead = "";
  if (p.guests && p.budget) perHead = ` (~$${Math.round(p.budget / p.guests).toLocaleString()}/guest)`;
  pills.push(`👥 ${p.guests || "?"} ${s(p, "guestsLabel") || "guests"}`);
  pills.push(`💵 ${p.budget ? "$" + p.budget.toLocaleString() : "Budget TBD"}${perHead}`);
  pills.forEach(text => {
    const span = document.createElement("span");
    span.className = "meta-pill";
    span.textContent = text;
    metaEl.appendChild(span);
  });

  // Echo the user's own words back so the plan visibly starts from their vision.
  const visionEl = $("planVision");
  if (visionEl) {
    if (p.vision) {
      visionEl.innerHTML =
        '<span class="vision-quote-label">In your words</span>' +
        '<blockquote>' + escapeHtml(p.vision) + '</blockquote>';
      visionEl.classList.remove("hidden");
    } else {
      visionEl.innerHTML = "";
      visionEl.classList.add("hidden");
    }
  }
}

function renderCards(plan) {
  const planGrid = $("planGrid");
  planGrid.innerHTML = "";

  plan.cards.forEach(c => {
    const card = document.createElement("div");
    card.className = "plan-card";
    const h = document.createElement("h3");
    h.innerHTML = `<span class="card-icon">${c.icon}</span>${c.title}`;
    card.appendChild(h);

    if (c.budget) {
      card.appendChild(budgetBlock(plan));
    } else if (c.ordered && c.items) {
      const ol = document.createElement("ol");
      ol.className = "agenda-list";
      c.items.forEach(it => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="tl-when">${escapeHtml(it.when)}</span><span class="tl-detail">${escapeHtml(it.detail)}</span>`;
        ol.appendChild(li);
      });
      card.appendChild(ol);
    } else {
      const para = document.createElement("p");
      para.textContent = c.text;
      card.appendChild(para);
    }
    planGrid.appendChild(card);
  });
}

function budgetBlock(plan) {
  const wrap = document.createElement("div");
  wrap.className = "budget-list";
  const b = plan.budget || { cats: [], note: "" };

  if (!b.cats.length) {
    const para = document.createElement("p");
    para.textContent = b.note || "Add a budget to see a suggested category breakdown.";
    wrap.appendChild(para);
    return wrap;
  }

  b.cats.forEach(c => {
    const row = document.createElement("div");
    row.className = "budget-row";
    const top = document.createElement("div");
    top.className = "budget-top";
    top.innerHTML = `<span>${c.name}</span><span>$${c.amt.toLocaleString()} · ${c.pct}%</span>`;
    const bar = document.createElement("div");
    bar.className = "budget-bar";
    const fill = document.createElement("div");
    fill.className = "budget-fill";
    fill.style.width = c.pct + "%";
    bar.appendChild(fill);
    row.appendChild(top);
    row.appendChild(bar);
    wrap.appendChild(row);
  });

  if (b.note) {
    const note = document.createElement("p");
    note.className = "budget-note";
    note.textContent = b.note;
    wrap.appendChild(note);
  }
  return wrap;
}

function renderTimeline(plan) {
  const list = $("timelineList");
  list.innerHTML = "";
  const eventDate = parseLocalDate(s({ a: answers }, "date"));

  (plan.timeline || []).forEach(it => {
    const li = document.createElement("li");
    let when = it.label;
    if (eventDate) {
      const d = new Date(eventDate);
      if (it.weeks > 0) d.setDate(d.getDate() - it.weeks * 7);
      when = it.weeks === 0 ? formatDate(eventDate) : `${formatDate(toISODate(d))} (${it.label})`;
    }
    li.innerHTML = `<span class="tl-when">${escapeHtml(when)}</span><span class="tl-detail">${escapeHtml(it.detail)}</span>`;
    list.appendChild(li);
  });
}

function renderChecklist(plan) {
  const list = $("checklistList");
  list.innerHTML = "";
  (plan.checklist || []).forEach(it => {
    const li = document.createElement("li");
    li.className = "checklist-item";
    li.innerHTML = `<span class="check-box">☐</span><span class="check-text">${escapeHtml(it)}</span>`;
    li.addEventListener("click", () => {
      const box = li.querySelector(".check-box");
      const done = box.textContent === "☑";
      box.textContent = done ? "☐" : "☑";
      li.classList.toggle("checked", !done);
    });
    list.appendChild(li);
  });
}

function renderConsiderations(plan) {
  const list = $("considerationsList");
  list.innerHTML = "";
  (plan.considerations || []).forEach(it => {
    const li = document.createElement("li");
    li.textContent = it;
    list.appendChild(li);
  });
}

/* ---------- Utils ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build a Date in LOCAL time from a yyyy-mm-dd string. Using `new Date(iso)`
// would parse as UTC midnight and render a day early in western timezones.
function parseLocalDate(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

// Format a Date as yyyy-mm-dd using local parts (toISOString would shift to UTC).
function toISODate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = (value instanceof Date) ? value : parseLocalDate(value);
  if (!d || isNaN(d)) return String(value);
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
}

/* ---------- Navigation helpers ---------- */
function showHomeSection() {
  plannerSection.classList.add("hidden");
  planSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
}

function goHome() {
  showHomeSection();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* Back to the "Choose your event" grid rather than the very top of the page. */
function goToEventTypes() {
  showHomeSection();
  const target = document.getElementById("types");
  if (!target) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

// The header is sticky and always on screen, so its links must work from any
// view. Without revealing the homepage first, an in-page anchor like #types
// would scroll to a section still hidden behind the planner.
function goHomeAndScrollTo(targetId) {
  showHomeSection();
  const target = targetId ? document.getElementById(targetId) : null;
  if (!target) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

/* ---------- Event listeners ---------- */
prevBtn.addEventListener("click", previousStep);
nextBtn.addEventListener("click", nextStep);

// Ctrl/Cmd+Enter submits the vision textarea; plain Enter inserts a newline.
questionInput.addEventListener("keydown", (e) => {
  const isTextarea = e.target && e.target.tagName === "TEXTAREA";
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    nextStep();
  } else if (e.key === "Enter" && !isTextarea) {
    e.preventDefault();
    nextStep();
  }
});

const backHomeBtn = $("backHome");
const planBackHomeBtn = $("planBackHome");
const planEventTypesBtn = $("planEventTypes");
const restartBtn = $("restartBtn");
const printBtn = $("printBtn");
if (backHomeBtn) backHomeBtn.addEventListener("click", goHome);
if (planBackHomeBtn) planBackHomeBtn.addEventListener("click", goHome);
if (planEventTypesBtn) planEventTypesBtn.addEventListener("click", goToEventTypes);
if (restartBtn) restartBtn.addEventListener("click", () => { if (eventType) startEvent(keyFor(eventType)); });
if (printBtn) printBtn.addEventListener("click", () => window.print());

/* Map a definition back to its key so "Start over" can relaunch the same type. */
function keyFor(def) {
  return Object.keys(EVENT_TYPES).find(k => EVENT_TYPES[k] === def);
}

/* Every in-page anchor — header nav, hero CTAs, footer links, and the header
   logo — stays on screen in all three views, so each must work from the
   planner and plan views too. Reveal the homepage first, then scroll. */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href").slice(1);
    if (!targetId) goHome();
    else goHomeAndScrollTo(targetId);
  });
});

/* Event-type cards: delegate so newly enabled cards work without rebinding. */
document.querySelectorAll("[data-type]").forEach(card => {
  card.addEventListener("click", () => {
    if (card.disabled || card.classList.contains("disabled")) return;
    startEvent(card.getAttribute("data-type"));
  });
});

/* ---------- Expose for inline handlers / tests ---------- */
window.startEvent = startEvent;
window.startCustomEvent = () => startEvent("custom");
window.goHome = goHome;
window.goToEventTypes = goToEventTypes;
window.goHomeAndScrollTo = goHomeAndScrollTo;
window.EVENTLY = { EVENT_TYPES, answers, startEvent, collectProfile };
