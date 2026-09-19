// Evently – Custom Event planner
// Drives the 12-step questionnaire and generates a personalized plan from the answers.
// All data lives in memory — no backend, no persistence — sample/demo only.

/* ---------- Question definitions ----------
   type: "text" | "date" | "number" | "chips"
   For "chips", options is the list of selectable values. */
const questions = [
  { id: 1, title: "What would you like to celebrate?", hint: "Tell us the occasion in a few words.", type: "text", placeholder: "e.g. A 30th birthday, a family reunion…" },
  { id: 2, title: "What is the event date?", hint: "Pick the date you're aiming for.", type: "date" },
  { id: 3, title: "What city or location will the event be held in?", hint: "Where should we base our suggestions?", type: "text", placeholder: "e.g. Austin, TX" },
  { id: 4, title: "Approximately how many guests?", hint: "A rough number is perfectly fine.", type: "number", placeholder: "e.g. 50" },
  { id: 5, title: "What is your approximate budget?", hint: "Total amount you're comfortable spending, in dollars.", type: "number", placeholder: "e.g. 5000" },
  {
    id: 6, title: "What type of venue are you interested in?", hint: "Pick the vibe that fits best.", type: "chips",
    options: ["Banquet hall", "Outdoor garden", "Beach", "Restaurant / private dining", "Rooftop", "Home / backyard", "Hotel ballroom", "Virtual / online"]
  },
  {
    id: 7, title: "What is the overall style or theme?", hint: "Choose the feel you're going for.", type: "chips",
    options: ["Elegant & formal", "Rustic & cozy", "Modern & minimal", "Bohemian", "Glamorous", "Vintage / retro", "Tropical", "Whimsical & fun"]
  },
  {
    id: 8, title: "What food / catering preferences do you have?", hint: "How would you like to feed your guests?", type: "chips",
    options: ["Plated dinner", "Buffet", "Cocktail bites", "Food trucks", "Family-style", "Dessert bar", "Vegan / vegetarian focus", "DIY station"]
  },
  {
    id: 9, title: "What entertainment would you like?", hint: "What should keep the energy going?", type: "chips",
    options: ["Live band", "DJ", "Acoustic soloist", "Photo booth", "Games & activities", "Karaoke", "Dance floor", "Speaker / presentations"]
  },
  {
    id: 10, title: "What decorations or atmosphere do you want?", hint: "Set the scene with the right look.", type: "chips",
    options: ["Fairy lights", "Fresh flowers", "Candles", "Balloon arch", "Greenery & plants", "Lounge seating", "Themed props", "Minimalist & clean"]
  },
  { id: 11, title: "Are there any special requirements?", hint: "Anything we should plan around — accessibility, kids, pets, etc.", type: "text", placeholder: "e.g. Wheelchair access, kid-friendly area…" },
  { id: 12, title: "Is there anything you specifically do NOT want?", hint: "Tell us what to avoid so we plan it right.", type: "text", placeholder: "e.g. No alcohol, no loud music after 10pm…" }
];

/* ---------- State ---------- */
let currentStep = 0;
const answers = {}; // question.id -> value (string for text/date/number, array for chips)

/* ---------- DOM refs ---------- */
const $ = (id) => document.getElementById(id);
const stepTotalEl = $("stepTotal");
const stepCurrentEl = $("stepCurrent");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const questionTitle = $("questionTitle");
const questionHint = $("questionHint");
const questionInput = $("questionInput");
const progressBar = $("progressFill");
const qNumEl = $("qNum");
const progressPercentEl = $("progressPercent");
const plannerSection = $("planner");
const homeSection = $("home");
const planSection = $("plan");

/* ---------- Planner flow ---------- */
function showPlanner() {
  homeSection.classList.add("hidden");
  planSection.classList.add("hidden");
  plannerSection.classList.remove("hidden");
  currentStep = 0;
  stepTotalEl.textContent = questions.length;
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStep() {
  const q = questions[currentStep];
  questionTitle.textContent = q.title;
  questionHint.textContent = q.hint;
  questionInput.innerHTML = "";

  if (q.type === "chips") {
    renderChips(q);
  } else {
    const input = document.createElement("input");
    input.id = "answerInput";
    input.name = "answerInput";
    input.type = q.type === "number" ? "number" : q.type;
    input.required = true;
    if (q.placeholder) input.placeholder = q.placeholder;
    if (answers[q.id] !== undefined) input.value = answers[q.id];
    input.classList.add("text-input");
    questionInput.appendChild(input);
    // focus after a tick so the element is painted
    setTimeout(() => input.focus(), 30);
  }

  prevBtn.disabled = currentStep === 0;
  nextBtn.textContent = currentStep === questions.length - 1 ? "✨ Generate my plan" : "Next →";
  stepCurrentEl.textContent = currentStep + 1;
  if (qNumEl) qNumEl.textContent = currentStep + 1;
  const percent = Math.round(((currentStep + 1) / questions.length) * 100);
  progressBar.style.width = percent + "%";
  if (progressPercentEl) progressPercentEl.textContent = percent + "%";
}

function renderChips(q) {
  const wrap = document.createElement("div");
  wrap.className = "chip-group";
  const current = answers[q.id] || [];
  q.options.forEach(opt => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (current.includes(opt) ? " chip-selected" : "");
    chip.textContent = opt;
    chip.addEventListener("click", () => {
      let arr = answers[q.id] ? [...answers[q.id]] : [];
      if (arr.includes(opt)) {
        arr = arr.filter(x => x !== opt);
      } else {
        arr.push(opt);
      }
      answers[q.id] = arr;
      chip.classList.toggle("chip-selected");
    });
    wrap.appendChild(chip);
  });
  questionInput.appendChild(wrap);
}

function isStepValid() {
  const q = questions[currentStep];
  const v = answers[q.id];
  if (q.type === "chips") return Array.isArray(v) && v.length > 0;
  return v !== undefined && String(v).trim() !== "";
}

function nextStep() {
  const q = questions[currentStep];
  if (q.type !== "chips") {
    const inputEl = document.getElementById("answerInput");
    if (!inputEl.checkValidity()) { inputEl.reportValidity(); return; }
    answers[q.id] = inputEl.value;
  }
  if (!isStepValid()) {
    // nudge: highlight the input area
    questionInput.classList.add("input-error");
    setTimeout(() => questionInput.classList.remove("input-error"), 600);
    return;
  }
  if (currentStep === questions.length - 1) {
    generatePlan();
  } else {
    currentStep++;
    renderStep();
  }
}

function previousStep() {
  const q = questions[currentStep];
  if (q.type !== "chips") {
    const inputEl = document.getElementById("answerInput");
    if (inputEl) answers[q.id] = inputEl.value;
  }
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}

/* ---------- Plan generation ---------- */
function generatePlan() {
  plannerSection.classList.add("hidden");
  planSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const occasion = answers[1] || "Custom Event";
  const dateStr = answers[2] || "";
  const location = answers[3] || "your chosen location";
  const guests = parseInt(answers[4] || "0", 10) || 0;
  const budget = parseInt(answers[5] || "0", 10) || 0;
  const venue = (answers[6] && answers[6].join(", ")) || "a flexible venue";
  const style = (answers[7] && answers[7].join(", ")) || "your chosen style";
  const food = answers[8] || [];
  const entertainment = answers[9] || [];
  const decor = answers[10] || [];
  const specialReq = answers[11] || "";
  const avoid = answers[12] || "";

  // Title + summary
  $("planTitle").textContent = `Your ${occasion} Plan`;
  $("planSummary").textContent =
    `A personalized plan for ${guests || "your"} guests${dateStr ? ` on ${formatDate(dateStr)}` : ""} in ${location}, built around a ${style.toLowerCase()} style.`;

  // Meta pills
  const metaEl = $("planMeta");
  metaEl.innerHTML = "";
  const pills = [
    `📅 ${dateStr ? formatDate(dateStr) : "Date TBD"}`,
    `📍 ${location}`,
    `👥 ${guests || "?"} guests`,
    `💵 ${budget ? "$" + budget.toLocaleString() : "Budget TBD"}`
  ];
  pills.forEach(p => {
    const span = document.createElement("span");
    span.className = "meta-pill";
    span.textContent = p;
    metaEl.appendChild(span);
  });

  // Plan cards
  const planGrid = $("planGrid");
  planGrid.innerHTML = "";

  const cards = [
    { icon: "🎯", title: "Event concept", body: conceptText(occasion, location, guests, style) },
    { icon: "🎨", title: "Suggested theme", body: themeText(style, decor) },
    { icon: "🏛️", title: "Suggested venue type", body: venueText(venue, guests) },
    { icon: "💰", title: "Budget categories", body: "", custom: () => budgetBreakdown(budget) },
    { icon: "🍽️", title: "Food / catering ideas", body: foodText(food, guests) },
    { icon: "✨", title: "Decoration ideas", body: decorText(decor) },
    { icon: "🎤", title: "Entertainment ideas", body: entertainmentText(entertainment) }
  ];

  cards.forEach(c => {
    const card = document.createElement("div");
    card.className = "plan-card";
    const h = document.createElement("h3");
    h.innerHTML = `<span class="card-icon">${c.icon}</span>${c.title}`;
    card.appendChild(h);
    if (c.custom) {
      card.appendChild(c.custom());
    } else {
      const p = document.createElement("p");
      p.textContent = c.body;
      card.appendChild(p);
    }
    planGrid.appendChild(card);
  });

  renderTimeline(dateStr);
  renderChecklist(dateStr, venue);
  renderConsiderations(specialReq, avoid, venue);
}

/* ---------- Plan content helpers ---------- */
function conceptText(occasion, location, guests, style) {
  const g = guests ? ` for ${guests} guests` : "";
  return `A ${style.toLowerCase()}-styled ${occasion.toLowerCase()} held in ${location}${g}. The plan below tailors venue, catering, décor, and entertainment to your answers so you can move forward with confidence.`;
}

function themeText(style, decor) {
  const d = decor.length ? ` accented with ${decor.join(", ").toLowerCase()}` : "";
  return `Lean into a ${style.toLowerCase()} aesthetic${d}. Carry this look consistently across invitations, table settings, and the entrance so the theme feels cohesive from the moment guests arrive.`;
}

function venueText(venue, guests) {
  const g = guests ? ` Ideally one that comfortably seats ${guests}` : "";
  return `Target a ${venue.toLowerCase()}${g}. Confirm capacity, parking, and whether the space allows outside catering or has noise restrictions before signing.`;
}

function foodText(food, guests) {
  if (!food.length) return "A balanced menu with a vegetarian option and a signature drink or dessert to match the theme.";
  const per = guests ? ` Plan for ~${guests} servings.` : "";
  const ideas = {
    "Plated dinner": "a sit-down multi-course plated service",
    "Buffet": "a self-serve buffet with varied stations",
    "Cocktail bites": "passed hors d'oeuvres and bite-size portions",
    "Food trucks": "1–2 food trucks parked on-site for a casual vibe",
    "Family-style": "large shared platters at each table",
    "Dessert bar": "a dessert bar with a showpiece cake and treats",
    "Vegan / vegetarian focus": "a plant-forward menu with creative mains",
    "DIY station": "interactive DIY stations (tacos, ramen, or hot cocoa)"
  };
  const list = food.map(f => ideas[f] || f.toLowerCase()).join(", ");
  return `Serve ${list}.${per} Include a couple of options to cover dietary needs, and round it out with non-alcoholic choices.`;
}

function decorText(decor) {
  if (!decor.length) return "Layered lighting (fairy lights + candles) with subtle floral touches to match the theme without crowding the space.";
  return `Build the atmosphere with ${decor.join(", ").toLowerCase()}. Cluster décor at the entrance and focal points (stage, cake table, photo wall) for maximum impact, and keep the rest of the room clean so the space doesn't feel cluttered.`;
}

function entertainmentText(entertainment) {
  if (!entertainment.length) return "A curated playlist for background ambiance plus one interactive moment (photo area or toast) to anchor the timeline.";
  const ideas = {
    "Live band": "a live band for a high-energy set during the peak hour",
    "DJ": "a DJ to keep the dance floor moving all night",
    "Acoustic soloist": "an acoustic soloist during arrival and dinner",
    "Photo booth": "a photo booth with themed props as a guest favorite",
    "Games & activities": "lawn or table games for mingling moments",
    "Karaoke": "a karaoke corner that opens up after dessert",
    "Dance floor": "a dedicated dance floor with lighting",
    "Speaker / presentations": "a short programmed segment with a mic and AV setup"
  };
  const list = entertainment.map(e => ideas[e] || e.toLowerCase()).join(", ");
  return `Book ${list}. Stagger entertainment across the evening so there's always something happening, with natural breaks for food and conversation.`;
}

function budgetBreakdown(budget) {
  const wrap = document.createElement("div");
  wrap.className = "budget-list";
  if (!budget) {
    const p = document.createElement("p");
    p.textContent = "Add a budget to see a suggested category breakdown.";
    wrap.appendChild(p);
    return wrap;
  }
  // Industry-style split
  const cats = [
    { name: "Venue & rentals", pct: 30 },
    { name: "Food & catering", pct: 28 },
    { name: "Decor & flowers", pct: 12 },
    { name: "Entertainment", pct: 12 },
    { name: "Photo & video", pct: 8 },
    { name: "Misc & contingency", pct: 10 }
  ];
  cats.forEach(c => {
    const amt = Math.round((budget * c.pct) / 100);
    const row = document.createElement("div");
    row.className = "budget-row";
    const top = document.createElement("div");
    top.className = "budget-top";
    top.innerHTML = `<span>${c.name}</span><span>$${amt.toLocaleString()} · ${c.pct}%</span>`;
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
  return wrap;
}

function renderTimeline(dateStr) {
  const list = $("timelineList");
  list.innerHTML = "";
  let eventDate = dateStr ? new Date(dateStr) : null;
  if (eventDate && isNaN(eventDate)) eventDate = null;

  const items = [
    { label: "12 weeks out", detail: "Lock the venue, finalize the date, and send save-the-dates." },
    { label: "8 weeks out", detail: "Book catering, entertainment, and photo/video. Draft the guest list." },
    { label: "6 weeks out", detail: "Send invitations. Start décor and theme planning." },
    { label: "4 weeks out", detail: "Confirm RSVPs, finalize the menu, and order rentals." },
    { label: "2 weeks out", detail: "Confirm vendors, build the run-of-show, and assign helpers." },
    { label: "1 week out", detail: "Final headcount to caterer, prep décor, and confirm weather backup." },
    { label: "Event day", detail: "Arrive early, do a walk-through, and enjoy!" }
  ];

  // If we have a real date, anchor labels to it; otherwise keep relative phrasing.
  items.forEach(it => {
    const li = document.createElement("li");
    let when = it.label;
    if (eventDate) {
      const d = new Date(eventDate);
      const weeks = { "12 weeks out": 12, "8 weeks out": 8, "6 weeks out": 6, "4 weeks out": 4, "2 weeks out": 2, "1 week out": 1, "Event day": 0 }[it.label];
      if (weeks > 0) d.setDate(d.getDate() - weeks * 7);
      when = weeks === 0 ? formatDate(eventDate.toISOString().slice(0, 10)) : `${formatDate(d.toISOString().slice(0, 10))} (${it.label})`;
    }
    li.innerHTML = `<span class="tl-when">${when}</span><span class="tl-detail">${it.detail}</span>`;
    list.appendChild(li);
  });
}

function renderChecklist(dateStr, venue) {
  const list = $("checklistList");
  list.innerHTML = "";
  const items = [
    "Define event goals and must-haves",
    "Set and lock the budget",
    "Book the venue" + (venue ? ` (${venue})` : ""),
    "Create and send invitations",
    "Plan the menu and book catering",
    "Hire entertainment / AV",
    "Design décor and order supplies",
    "Arrange photo / video coverage",
    "Confirm rentals (tables, chairs, linens)",
    "Build a run-of-show timeline",
    "Confirm final headcount with caterer",
    "Day-of setup checklist and emergency kit"
  ];
  items.forEach((it, i) => {
    const li = document.createElement("li");
    li.className = "checklist-item";
    li.innerHTML = `<span class="check-box">☐</span><span class="check-text">${it}</span>`;
    li.addEventListener("click", () => {
      const box = li.querySelector(".check-box");
      const done = box.textContent === "☑";
      box.textContent = done ? "☐" : "☑";
      li.classList.toggle("checked", !done);
    });
    list.appendChild(li);
  });
}

function renderConsiderations(specialReq, avoid, venue) {
  const list = $("considerationsList");
  list.innerHTML = "";
  const items = [
    "Have a weather backup plan if any part is outdoors",
    "Confirm accessibility (parking, restrooms, step-free access)",
    "Check venue noise rules and curfew times",
    "Build in a 15–20% contingency in the budget",
    "Assign a point person for day-of coordination"
  ];
  if (specialReq) items.unshift(`Your special requirements: ${specialReq}`);
  if (avoid) items.push(`Avoid: ${avoid}`);
  items.forEach(it => {
    const li = document.createElement("li");
    li.textContent = it;
    list.appendChild(li);
  });
}

/* ---------- Utils ---------- */
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
}

/* ---------- Navigation helpers ---------- */
function startOver() {
  Object.keys(answers).forEach(k => delete answers[k]);
  currentStep = 0;
  showPlanner();
}

function goHome() {
  plannerSection.classList.add("hidden");
  planSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Event listeners ---------- */
prevBtn.addEventListener("click", previousStep);
nextBtn.addEventListener("click", nextStep);

// Enter key advances text/date/number inputs
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    nextStep();
  }
});

const backHomeBtn = $("backHome");
const planBackHomeBtn = $("planBackHome");
const restartBtn = $("restartBtn");
const printBtn = $("printBtn");
if (backHomeBtn) backHomeBtn.addEventListener("click", goHome);
if (planBackHomeBtn) planBackHomeBtn.addEventListener("click", goHome);
if (restartBtn) restartBtn.addEventListener("click", startOver);
if (printBtn) printBtn.addEventListener("click", () => window.print());

/* ---------- Expose for inline handlers ---------- */
window.startCustomEvent = showPlanner;
window.startOver = startOver;
window.goHome = goHome;
