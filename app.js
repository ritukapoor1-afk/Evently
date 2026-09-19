// Evently – Custom Event planner
// Drives the questionnaire, the free-form "Describe your vision" step, and the
// personalized plan generator. Everything lives in memory — no backend, no
// persistence — demo/sample content only.

/* ---------- Question definitions ----------
   type: "text" | "date" | "number" | "chips" | "vision"
   For "chips", options is the list of selectable values. */
const questions = [
  { id: 1, title: "What would you like to celebrate?", hint: "Tell us the occasion in a few words.", type: "text", placeholder: "e.g. A 50th birthday celebration" },
  { id: 2, title: "What is the event date?", hint: "Pick the date you're aiming for.", type: "date" },
  { id: 3, title: "What city or location will the event be held in?", hint: "Where should we base our suggestions?", type: "text", placeholder: "e.g. Austin, TX" },
  { id: 4, title: "Approximately how many guests?", hint: "A rough number is perfectly fine.", type: "number", placeholder: "e.g. 50" },
  { id: 5, title: "What is your approximate budget?", hint: "Total amount you're comfortable spending, in dollars.", type: "number", placeholder: "e.g. 5000" },
  {
    id: 6, title: "What type of venue are you interested in?", hint: "Pick the vibe that fits best. Choose as many as you like.", type: "chips",
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
  { id: 12, title: "Is there anything you specifically do NOT want?", hint: "Tell us what to avoid so we plan it right.", type: "text", placeholder: "e.g. No alcohol, no loud music after 10pm…" },
  {
    id: 13, type: "vision",
    title: "Describe your vision",
    hint: "Tell us what you're imagining. Describe your event in your own words — the mood, people, special moments, things you love, and anything you want to avoid.",
    placeholder: "I want an elegant but fun 50th birthday celebration for about 50 guests. I love Indian food, music and beautiful outdoor spaces…"
  }
];

/* ---------- State ---------- */
let currentStep = 0;
const answers = {}; // question.id -> string | number | string[]

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
  const isVision = q.type === "vision";

  questionTitle.textContent = q.title;
  questionHint.textContent = q.hint;
  questionInput.innerHTML = "";

  // The vision step is the closing invitation, not a numbered question.
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
    if (answers[q.id] !== undefined) input.value = answers[q.id];
    input.classList.add("text-input");
    questionInput.appendChild(input);
    // focus after a tick so the element is painted
    setTimeout(() => input.focus(), 30);
  }

  prevBtn.disabled = currentStep === 0;
  nextBtn.textContent = isVision ? "✨ Generate my plan" : "Next →";
  stepCurrentEl.textContent = currentStep + 1;
  const percent = Math.round(((currentStep + 1) / questions.length) * 100);
  progressBar.style.width = percent + "%";
  if (progressPercentEl) progressPercentEl.textContent = percent + "%";
}

/* The free-form step: a generous textarea with the example as its placeholder. */
function renderVision(q) {
  const field = document.createElement("div");
  field.className = "vision-field";

  const ta = document.createElement("textarea");
  ta.id = "answerInput";
  ta.name = "answerInput";
  ta.className = "text-input vision-input";
  ta.rows = 9;
  ta.placeholder = q.placeholder;
  if (answers[q.id] !== undefined) ta.value = answers[q.id];
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
  const current = answers[q.id] || [];
  q.options.forEach(opt => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (current.includes(opt) ? " chip-selected" : "");
    chip.textContent = opt;
    chip.setAttribute("aria-pressed", current.includes(opt) ? "true" : "false");
    chip.addEventListener("click", () => {
      let arr = answers[q.id] ? [...answers[q.id]] : [];
      if (arr.includes(opt)) {
        arr = arr.filter(x => x !== opt);
      } else {
        arr.push(opt);
      }
      answers[q.id] = arr;
      const on = arr.includes(opt);
      chip.classList.toggle("chip-selected", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
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
    if (inputEl && !inputEl.checkValidity()) { inputEl.reportValidity(); return; }
    if (inputEl) answers[q.id] = inputEl.value;
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

/* ---------- Vision parsing ----------
   Pull concrete signals out of the free-form description so the plan reflects
   what the user actually wrote, not only the chip selections. */
const VISION_VOCAB = {
  cuisines: ["indian", "italian", "mexican", "chinese", "thai", "japanese", "sushi", "korean",
    "greek", "french", "spanish", "mediterranean", "barbecue", "bbq", "pizza", "tacos", "pasta",
    "curry", "seafood", "biryani", "tandoori", "vegan", "vegetarian", "halal", "kosher",
    "gluten-free", "cake", "chocolate", "dessert", "cocktails", "champagne", "wine", "tea", "coffee"],
  vibes: ["elegant", "fun", "relaxed", "classy", "casual", "romantic", "intimate", "lively",
    "energetic", "cozy", "glamorous", "rustic", "modern", "tropical", "bohemian", "whimsical",
    "vintage", "festive", "joyful", "warm", "sophisticated", "playful", "laid-back"],
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
    "gluten", "vegan", "vegetarian"]
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

function listPhrase(items) {
  const arr = (items || []).filter(Boolean);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
}

/* Acronyms must keep their capitals, and cuisine names are proper nouns that
   stay capitalised mid-sentence. Everything else reads naturally lower case. */
const CANONICAL_TERMS = {
  dj: "DJ", bbq: "BBQ", diy: "DIY", av: "AV",
  indian: "Indian", italian: "Italian", mexican: "Mexican", chinese: "Chinese",
  thai: "Thai", japanese: "Japanese", korean: "Korean", greek: "Greek",
  french: "French", spanish: "Spanish", mediterranean: "Mediterranean",
  halal: "Halal", kosher: "Kosher"
};

/* Mid-sentence form: canonical spelling for known terms, lower case otherwise. */
function midTerm(word) {
  const key = String(word).toLowerCase();
  return CANONICAL_TERMS[key] || key;
}

/* Lead-in form: same, but capitalise an unknown word's first letter. */
function titleTerm(word) {
  const key = String(word).toLowerCase();
  return CANONICAL_TERMS[key] || (key.charAt(0).toUpperCase() + key.slice(1));
}

/* ---------- Plan generation ---------- */
function collectProfile() {
  const vision = String(answers[13] || "").trim();
  const raw = detectSignals(vision);
  return {
    occasion: answers[1] || "Custom Event",
    dateStr: answers[2] || "",
    location: answers[3] || "your chosen location",
    guests: parseInt(answers[4] || "0", 10) || 0,
    budget: parseInt(answers[5] || "0", 10) || 0,
    venues: answers[6] || [],
    styles: answers[7] || [],
    food: answers[8] || [],
    entertainment: answers[9] || [],
    decor: answers[10] || [],
    specialReq: String(answers[11] || "").trim(),
    avoid: String(answers[12] || "").trim(),
    vision,
    sig: {
      cuisines: uniqueSignals(raw.cuisines),
      vibes: uniqueSignals(raw.vibes),
      settings: uniqueSignals(raw.settings),
      activities: uniqueSignals(raw.activities),
      moments: uniqueSignals(raw.moments),
      needs: uniqueSignals(raw.needs)
    }
  };
}

function generatePlan() {
  plannerSection.classList.add("hidden");
  planSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const p = collectProfile();

  renderPlanHeader(p);

  const planGrid = $("planGrid");
  planGrid.innerHTML = "";
  [
    { icon: "🎯", title: "Event concept", body: conceptText(p) },
    { icon: "🎨", title: "Theme & atmosphere", body: themeText(p) },
    { icon: "🏛️", title: "Venue type", body: venueText(p) },
    { icon: "🥂", title: "Guest experience", body: guestText(p) },
    { icon: "🍽️", title: "Food & catering", body: foodText(p) },
    { icon: "✨", title: "Decorations", body: decorText(p) },
    { icon: "🎤", title: "Entertainment", body: entertainmentText(p) },
    { icon: "💰", title: "Budget breakdown", body: "", custom: () => budgetBreakdown(p) }
  ].forEach(c => {
    const card = document.createElement("div");
    card.className = "plan-card";
    const h = document.createElement("h3");
    h.innerHTML = `<span class="card-icon">${c.icon}</span>${c.title}`;
    card.appendChild(h);
    if (c.custom) {
      card.appendChild(c.custom());
    } else {
      const para = document.createElement("p");
      para.textContent = c.body;
      card.appendChild(para);
    }
    planGrid.appendChild(card);
  });

  renderTimeline(p);
  renderChecklist(p);
  renderConsiderations(p);
}

function renderPlanHeader(p) {
  $("planTitle").textContent = `Your ${p.occasion} Plan`;

  const bits = [];
  bits.push(p.guests ? `for ${p.guests} guests` : "for your guests");
  if (p.dateStr) bits.push(`on ${formatDate(p.dateStr)}`);
  bits.push(`in ${p.location}`);
  if (p.styles.length) bits.push(`styled ${listPhrase(p.styles.map(s => s.toLowerCase()))}`);
  $("planSummary").textContent = `A personalized plan ${listPhrase(bits)}.`;

  const metaEl = $("planMeta");
  metaEl.innerHTML = "";
  let perHead = "";
  if (p.guests && p.budget) perHead = ` (~$${Math.round(p.budget / p.guests).toLocaleString()}/guest)`;
  [
    `📅 ${p.dateStr ? formatDate(p.dateStr) : "Date TBD"}`,
    `📍 ${p.location}`,
    `👥 ${p.guests || "?"} guests`,
    `💵 ${p.budget ? "$" + p.budget.toLocaleString() : "Budget TBD"}${perHead}`
  ].forEach(text => {
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

/* ---------- Section content ---------- */
function conceptText(p) {
  const who = p.guests ? `${p.guests} guests` : "your guests";
  const where = p.location !== "your chosen location" ? ` in ${p.location}` : "";
  const mood = p.sig.vibes.length
    ? listPhrase(p.sig.vibes)
    : (p.styles.length ? listPhrase(p.styles.map(s => s.toLowerCase())) : "memorable");

  let text = `A ${mood} ${p.occasion.toLowerCase()}${where} for ${who}.`;
  if (p.sig.cuisines.length) {
    text += ` Food is a highlight — ${listPhrase(p.sig.cuisines.map(midTerm))} is clearly part of the story, so the menu and timing should be built around it.`;
  }
  if (p.sig.settings.length) {
    text += ` The setting leans ${listPhrase(p.sig.settings)}, which shapes everything from lighting to the floor plan.`;
  }
  text += ` Everything below is assembled from your answers and your own description.`;
  return text;
}

function themeText(p) {
  const styles = p.styles.map(s => s.toLowerCase());
  const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (styles.length ? listPhrase(styles) : "your chosen style");
  const parts = [`Build around a ${mood} atmosphere`];

  if (p.decor.length) parts.push(`expressed through ${listPhrase(p.decor.map(d => d.toLowerCase()))}`);
  if (p.sig.settings.length) parts.push(`letting the ${listPhrase(p.sig.settings)} setting do much of the work`);

  let text = parts.join(", ") + ".";
  text += " Keep one or two signature elements consistent — the invitation, the entrance, and the table styling — so the theme reads clearly without becoming a costume.";
  if (p.sig.moments.length) {
    text += ` Plan the look around your key moments (${listPhrase(p.sig.moments)}).`;
  }
  return text;
}

function venueText(p) {
  const venues = p.venues.length ? listPhrase(p.venues.map(v => v.toLowerCase())) : "a flexible venue";
  let text = `Target ${venues}`;
  if (p.sig.settings.length) text += ` — your description points toward something ${listPhrase(p.sig.settings)}`;
  text += ".";

  if (p.guests) {
    text += ` Confirm it comfortably holds ${p.guests} guests plus any catering or staging space.`;
  } else {
    text += " Confirm the capacity against your final guest count.";
  }
  if (p.sig.cuisines.length || p.food.indexOf("Food trucks") > -1) {
    text += " Check outside-catering and power rules early, since your food plans may need a kitchen or an outdoor setup.";
  }
  text += " Also verify parking, noise curfews, and a wet-weather backup before you sign.";
  return text;
}

function guestText(p) {
  const parts = [];

  if (p.guests) {
    parts.push(`Design the room for ${p.guests} guests, with seating that keeps groups together rather than scattering them.`);
  } else {
    parts.push("Design seating around your final headcount, keeping groups together rather than scattering them.");
  }

  if (p.sig.moments.length) {
    parts.push(`Give your standout moments room to land: ${listPhrase(p.sig.moments)}. Build them into the run-of-show so they don't get lost.`);
  } else {
    parts.push("Build two or three anchor moments into the run-of-show — a welcome, a toast, and a send-off — so the event has a shape.");
  }

  const comfort = [];
  if (p.sig.settings.some(s => s.indexOf("outdoor") > -1 || s === "garden" || s === "beach" || s === "patio" || s === "terrace" || s === "backyard" || s === "poolside" || s === "courtyard")) {
    comfort.push("shade, water, and a warm layer for the evening");
  }
  if (p.sig.needs.indexOf("kids") > -1 || p.sig.needs.indexOf("children") > -1) {
    comfort.push("a dedicated kids' zone with simple activities");
  }
  if (p.sig.needs.indexOf("elderly") > -1 || p.sig.needs.indexOf("wheelchair") > -1 || p.sig.needs.indexOf("accessible") > -1 || p.sig.needs.indexOf("accessibility") > -1) {
    comfort.push("step-free routes and seating within easy reach");
  }
  if (comfort.length) {
    parts.push(`Look after comfort: ${listPhrase(comfort)}.`);
  }

  if (p.entertainment.length) {
    parts.push(`Keep energy flowing with ${listPhrase(p.entertainment.map(midTerm))}.`);
  }

  return parts.join(" ");
}

function foodText(p) {
  const ideas = {
    "Plated dinner": "a sit-down multi-course plated service",
    "Buffet": "a self-serve buffet with varied stations",
    "Cocktail bites": "passed hors d'oeuvres and bite-size portions",
    "Food trucks": "one or two food trucks parked on-site",
    "Family-style": "large shared platters at each table",
    "Dessert bar": "a dessert bar with a showpiece centrepiece",
    "Vegan / vegetarian focus": "a plant-forward menu with creative mains",
    "DIY station": "interactive DIY stations (tacos, ramen, or hot cocoa)"
  };

  const parts = [];
  if (p.food.length) {
    parts.push(`Serve ${listPhrase(p.food.map(f => ideas[f] || f.toLowerCase()))}.`);
  } else {
    parts.push("Choose one primary service style (buffet or family-style usually stretch furthest) and let it set the room's rhythm.");
  }

  if (p.sig.cuisines.length) {
    const drinks = ["cocktails", "champagne", "wine", "tea", "coffee"];
    const foodWords = p.sig.cuisines.filter(c => drinks.indexOf(c) === -1);
    const drinkWords = p.sig.cuisines.filter(c => drinks.indexOf(c) > -1);
    if (foodWords.length) {
      parts.push(`Your description calls out ${listPhrase(foodWords.map(midTerm))} — make that the centrepiece rather than one option among many, and brief the caterer on it directly.`);
    }
    if (drinkWords.length) {
      parts.push(`Pair it with ${listPhrase(drinkWords.map(midTerm))} for the drinks.`);
    }
  }

  if (p.guests) parts.push(`Plan for roughly ${p.guests} servings.`);
  if (p.sig.needs.some(n => ["vegan", "vegetarian", "allergies", "allergy", "gluten", "halal", "kosher"].indexOf(n) > -1)) {
    parts.push("Flag your dietary requirements explicitly when you request quotes — clear labelling at the table avoids awkwardness on the day.");
  } else {
    parts.push("Include a vegetarian option and a couple of non-alcoholic choices as standard.");
  }
  return parts.join(" ");
}

function decorText(p) {
  const parts = [];
  if (p.decor.length) {
    parts.push(`Build the atmosphere with ${listPhrase(p.decor.map(d => d.toLowerCase()))}.`);
  } else {
    parts.push("Start with layered lighting — warm and dimmable beats a single overhead source.");
  }

  if (p.sig.settings.some(s => ["outdoor", "outdoors", "garden", "backyard", "beach", "rooftop", "patio", "terrace", "courtyard", "poolside", "park", "vineyard", "lake"].indexOf(s) > -1)) {
    parts.push("Because you're outdoors, lean on what's already there — greenery and natural light — and add structure where it's missing: a defined entrance, lighting on paths, and a wind plan for candles.");
  } else {
    parts.push("In an indoor room, concentrate décor at two or three focal points (entrance, main table, photo spot) and leave the rest calm so it doesn't feel cluttered.");
  }

  if (p.sig.vibes.length) {
    parts.push(`Keep choices consistent with the ${listPhrase(p.sig.vibes)} mood you described.`);
  }
  if (p.avoid) {
    parts.push(`Steer clear of anything that reads as: ${p.avoid.toLowerCase()}.`);
  }
  return parts.join(" ");
}

function entertainmentText(p) {
  const ideas = {
    "Live band": "a live band for the peak hour",
    "DJ": "a DJ to carry the dance floor",
    "Acoustic soloist": "an acoustic soloist through arrival and dinner",
    "Photo booth": "a photo booth with props matched to your theme",
    "Games & activities": "games that give people something to do together",
    "Karaoke": "a karaoke corner that opens up after dessert",
    "Dance floor": "a properly sized, lit dance floor",
    "Speaker / presentations": "a short programmed segment with mic and AV"
  };

  const parts = [];
  if (p.entertainment.length) {
    parts.push(`Book ${listPhrase(p.entertainment.map(e => ideas[e] || e.toLowerCase()))}.`);
  } else {
    parts.push("Anchor the evening with a curated playlist plus one interactive element — a photo moment or a toast — rather than filling every minute.");
  }

  if (p.sig.activities.length) {
    const extras = p.sig.activities.filter(a => !p.entertainment.join(" ").toLowerCase().split(/[^a-z]+/).includes(a));
    if (extras.length) parts.push(`Your description also mentions ${listPhrase(extras)} — worth weaving in.`);
  }
  if (p.sig.moments.length) {
    parts.push(`Sequence the entertainment around ${listPhrase(p.sig.moments)} so nothing competes for attention.`);
  }

  const drinkFree = p.sig.needs.indexOf("no alcohol") > -1 || p.sig.needs.indexOf("sober") > -1;
  parts.push(drinkFree
    ? "Keep the energy non-alcohol-led — good food, music, and a couple of shared activities carry it just as well."
    : "Alternate high-energy and low-key stretches so people can rest, eat, and talk.");
  return parts.join(" ");
}

function budgetBreakdown(p) {
  const wrap = document.createElement("div");
  wrap.className = "budget-list";
  const budget = p.budget;

  if (!budget) {
    const para = document.createElement("p");
    para.textContent = "Add a budget to see a suggested category breakdown.";
    wrap.appendChild(para);
    return wrap;
  }

  // Catering weighted up when food is a stated focus; venue up when it isn't.
  const foodFocus = p.sig.cuisines.length > 0 || p.food.length > 0;
  const cats = [
    { name: "Venue & rentals", pct: foodFocus ? 28 : 32 },
    { name: "Food & catering", pct: foodFocus ? 32 : 26 },
    { name: "Decor & flowers", pct: 12 },
    { name: "Entertainment", pct: 11 },
    { name: "Photo & video", pct: 7 },
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

  const note = document.createElement("p");
  note.className = "budget-note";
  const perHead = p.guests ? ` — roughly $${Math.round(budget / p.guests).toLocaleString()} per guest` : "";
  note.textContent = `Total $${budget.toLocaleString()}${perHead}. The contingency line is deliberate: hold it back for the last-minute additions that always appear.`;
  wrap.appendChild(note);
  return wrap;
}

function renderTimeline(p) {
  const list = $("timelineList");
  list.innerHTML = "";
  const eventDate = parseLocalDate(p.dateStr);

  // Catering and décor lead times shift with the choices made.
  const cateringNote = p.food.indexOf("Food trucks") > -1
    ? "Book food trucks and confirm power, parking, and permits."
    : "Book catering and lock the menu direction.";
  const decorNote = p.decor.length
    ? `Start on décor and order supplies for ${listPhrase(p.decor.map(d => d.toLowerCase()))}.`
    : "Start décor and theme planning.";

  const items = [
    { label: "12 weeks out", detail: "Lock the venue, finalize the date, and send save-the-dates." },
    { label: "8 weeks out", detail: `${cateringNote} Book entertainment and photo/video. Draft the guest list.` },
    { label: "6 weeks out", detail: `Send invitations. ${decorNote}` },
    { label: "4 weeks out", detail: "Confirm RSVPs, finalize the menu, and order rentals." },
    { label: "2 weeks out", detail: "Confirm every vendor, build the run-of-show, and assign helpers." },
    { label: "1 week out", detail: "Give final headcount to the caterer, prep décor, and confirm the weather backup." },
    { label: "Event day", detail: "Arrive early, do a walk-through, and enjoy it." }
  ];

  const weeksByLabel = {
    "12 weeks out": 12, "8 weeks out": 8, "6 weeks out": 6,
    "4 weeks out": 4, "2 weeks out": 2, "1 week out": 1, "Event day": 0
  };

  items.forEach(it => {
    const li = document.createElement("li");
    let when = it.label;
    if (eventDate) {
      const d = new Date(eventDate);
      const weeks = weeksByLabel[it.label];
      if (weeks > 0) d.setDate(d.getDate() - weeks * 7);
      when = weeks === 0 ? formatDate(eventDate) : `${formatDate(toISODate(d))} (${it.label})`;
    }
    li.innerHTML = `<span class="tl-when">${when}</span><span class="tl-detail">${it.detail}</span>`;
    list.appendChild(li);
  });
}

function renderChecklist(p) {
  const list = $("checklistList");
  list.innerHTML = "";

  const items = [
    "Define the goals and must-haves for the day",
    p.budget ? `Set and lock the budget ($${p.budget.toLocaleString()})` : "Set and lock the budget",
    p.venues.length ? `Book the venue (${listPhrase(p.venues)})` : "Book the venue",
    "Create and send invitations",
    p.sig.cuisines.length
      ? `Brief the caterer on ${listPhrase(p.sig.cuisines.filter(c => ["cocktails", "champagne", "wine", "tea", "coffee"].indexOf(c) === -1).map(midTerm)) || "your menu"}`
      : "Plan the menu and book catering",
    p.entertainment.length ? `Book entertainment (${listPhrase(p.entertainment.map(titleTerm))})` : "Hire entertainment / AV",
    p.decor.length ? `Order décor (${listPhrase(p.decor.map(titleTerm))})` : "Design décor and order supplies",
    "Arrange photo / video coverage",
    "Confirm rentals (tables, chairs, linens)",
    "Build a run-of-show timeline"
  ];

  if (p.sig.moments.length) {
    items.push(`Rehearse the key moments (${listPhrase(p.sig.moments)})`);
  }
  if (p.sig.needs.indexOf("kids") > -1 || p.sig.needs.indexOf("children") > -1) {
    items.push("Set up the kids' area and activities");
  }
  if (p.sig.needs.indexOf("parking") > -1 || p.sig.needs.indexOf("shuttle") > -1 || p.guests >= 80) {
    items.push("Sort parking or a shuttle for guests");
  }
  items.push("Confirm final headcount with the caterer");
  items.push("Prepare the day-of setup kit and a named point person");

  items.forEach(it => {
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

function renderConsiderations(p) {
  const list = $("considerationsList");
  list.innerHTML = "";

  const items = [];
  if (p.specialReq) items.push(`Your special requirements: ${p.specialReq}`);
  p.sig.needs.forEach(n => {
    if (n === "kids" || n === "children") items.push("Plan a safe, supervised space for children");
    else if (n === "wheelchair" || n === "accessible" || n === "accessibility") items.push("Verify step-free access, restrooms, and seating");
    else if (n === "elderly") items.push("Keep seating, shade, and rest areas within easy reach for older guests");
    else if (n === "pets") items.push("Confirm the venue's pet policy if animals are attending");
    else if (n === "allergies" || n === "allergy") items.push("Collect allergy information and label dishes clearly");
    else if (n === "parking" || n === "shuttle") items.push("Plan guest parking or a shuttle service");
    else if (n === "quiet") items.push("Keep volume and after-hours noise considerate of neighbours");
    else if (n === "no alcohol" || n === "sober") items.push("Build a drinks menu that works fully without alcohol");
  });

  const outdoors = p.sig.settings.some(s => ["outdoor", "outdoors", "garden", "backyard", "beach", "rooftop", "patio", "terrace", "courtyard", "poolside", "park", "vineyard", "lake", "marquee", "tent"].indexOf(s) > -1);
  if (outdoors) items.push("Have a wet-weather and wind plan — this is outdoors");

  items.push("Confirm venue noise rules and curfew times");
  items.push(p.budget
    ? `Hold back the contingency line ($${Math.round(p.budget * 0.1).toLocaleString()}) for last-minute costs`
    : "Build in a 15–20% contingency for last-minute costs");
  items.push("Name one person to own day-of coordination");

  if (p.avoid) items.push(`Avoid: ${p.avoid}`);
  if (p.sig.moments.length === 0 && !p.specialReq) {
    items.push("Decide early which single moment matters most, and protect it in the schedule");
  }

  items.forEach(it => {
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
function startOver() {
  Object.keys(answers).forEach(k => delete answers[k]);
  currentStep = 0;
  showPlanner();
}

function showHomeSection() {
  plannerSection.classList.add("hidden");
  planSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
}

function goHome() {
  showHomeSection();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  // Let the homepage paint before measuring where the section sits.
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
const restartBtn = $("restartBtn");
const printBtn = $("printBtn");
if (backHomeBtn) backHomeBtn.addEventListener("click", goHome);
if (planBackHomeBtn) planBackHomeBtn.addEventListener("click", goHome);
if (restartBtn) restartBtn.addEventListener("click", startOver);
if (printBtn) printBtn.addEventListener("click", () => window.print());

// Every in-page anchor — header nav, hero CTAs, footer links, and the header
// logo — stays on screen in all three views, so each must work from the
// planner and plan views too. Reveal the homepage first, then scroll.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href").slice(1);
    if (!targetId) {
      goHome();
    } else {
      goHomeAndScrollTo(targetId);
    }
  });
});

/* ---------- Expose for inline handlers ---------- */
window.startCustomEvent = showPlanner;
window.startOver = startOver;
window.goHome = goHome;
window.goHomeAndScrollTo = goHomeAndScrollTo;
