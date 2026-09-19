// Evently – event type definitions
// Each event type owns its questionnaire and its plan builder. The engine in
// app.js is generic and knows nothing about any specific type.
//
// Loaded BEFORE app.js, so app.js can call buildEventPlan()/EVENT_TYPES.

/* ============================================================
   Shared helpers
   ============================================================ */

/* Every event type is registered here. */
const EVENT_TYPES = {};
function defEvent(key, def) { EVENT_TYPES[key] = def; }

/* Answer accessors — the engine stores answers by key, not by position. */
function s(p, k) { return String((p.a[k] === undefined || p.a[k] === null) ? "" : p.a[k]).trim(); }
function n(p, k) { return parseInt(p.a[k] || "0", 10) || 0; }
function list(p, k) { const v = p.a[k]; return Array.isArray(v) ? v : (v ? [v] : []); }

function listPhrase(items) {
  const arr = (items || []).filter(Boolean);
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
}

/* Acronyms keep their capitals; cuisines are proper nouns. */
const CANONICAL_TERMS = {
  dj: "DJ", bbq: "BBQ", diy: "DIY", av: "AV",
  indian: "Indian", italian: "Italian", mexican: "Mexican", chinese: "Chinese",
  thai: "Thai", japanese: "Japanese", korean: "Korean", greek: "Greek",
  french: "French", spanish: "Spanish", mediterranean: "Mediterranean",
  halal: "Halal", kosher: "Kosher"
};
function midTerm(w) { const k = String(w).toLowerCase(); return CANONICAL_TERMS[k] || k; }
function titleTerm(w) { const k = String(w).toLowerCase(); return CANONICAL_TERMS[k] || (k.charAt(0).toUpperCase() + k.slice(1)); }

/* Restore acronyms anywhere inside a phrase ("ceo or leadership" -> "CEO or
   leadership"). Needed for multi-word chip values, which midTerm can't match. */
const PHRASE_ACRONYMS = [["ceo", "CEO"], ["hr", "HR"], ["mc", "MC"], ["dj", "DJ"],
  ["bbq", "BBQ"], ["diy", "DIY"], ["av", "AV"], ["pr", "PR"]];
function fixAcronyms(str) {
  let out = String(str);
  PHRASE_ACRONYMS.forEach(pair => {
    out = out.replace(new RegExp("\\b" + pair[0] + "\\b", "gi"), pair[1]);
  });
  return out;
}

/* Lower-case a chip value for mid-sentence use ("Outdoor garden" -> "outdoor garden"). */
function lc(w) { return String(w).toLowerCase(); }
function lcList(items) { return listPhrase((items || []).map(lc)); }

/* ============================================================
   Question builders — keeps the shared questions consistent
   ============================================================ */

const VISION_HINT = "Tell us what you're imagining. Describe your event in your own words — the mood, people, special moments, things you love, and anything you want to avoid.";

const Q = {
  text:   (key, label, hint, placeholder) => ({ key, label, hint, type: "text", placeholder }),
  date:   (key, label, hint) => ({ key, label, hint: hint || "Pick the date you're aiming for.", type: "date" }),
  number: (key, label, hint, placeholder) => ({ key, label, hint, type: "number", placeholder }),
  chips:  (key, label, hint, options) => ({ key, label, hint, type: "chips", options }),
  vision: (placeholder, label, hint) => ({ key: "vision", label: label || "Describe your vision", hint: hint || VISION_HINT, type: "vision", placeholder })
};

/* Questions shared by every event type. */
const COMMON = {
  location: (hint) => Q.text("location", "What city or location will it be held in?", hint || "Where should we base our suggestions?", "e.g. Austin, TX"),
  guests: () => Q.number("guests", "Approximately how many guests?", "A rough number is perfectly fine.", "e.g. 80"),
  budget: () => Q.number("budget", "What is your approximate budget?", "Total amount you're comfortable spending, in dollars.", "e.g. 15000"),
  setting: () => Q.chips("setting", "Will it be indoors or outdoors?", "Pick the one that fits best.", ["Indoor", "Outdoor", "Both / mixed", "Not sure yet"]),
  avoid: () => Q.text("avoid", "Is there anything you specifically do NOT want?", "Tell us what to avoid so we plan it right.", "e.g. No loud music after 10pm"),
  specialReq: () => Q.text("specialReq", "Are there any special requirements?", "Anything we should plan around — accessibility, kids, pets, etc.", "e.g. Wheelchair access, kid-friendly area")
};

/* ============================================================
   Shared plan content helpers
   ============================================================ */

function settingWords(p) {
  const v = s(p, "setting");
  if (!v) return "";
  return v === "Both / mixed" ? "indoor and outdoor" : v.toLowerCase();
}

function isOutdoors(p) {
  const v = s(p, "setting").toLowerCase();
  if (v.indexOf("outdoor") > -1 || v === "both / mixed") return true;
  return p.sig.settings.some(x => ["outdoor", "outdoors", "garden", "backyard", "beach", "rooftop", "terrace", "patio", "vineyard", "lake", "park", "poolside", "courtyard", "marquee", "tent"].indexOf(x) > -1);
}

/* Guest count phrasing reused across cards. */
function guestPhrase(p, fallback) { return p.guests ? `${p.guests} guests` : (fallback || "your guests"); }

/* A standard "comfort" paragraph derived from needs + setting. */
function comfortNotes(p) {
  const notes = [];
  if (isOutdoors(p)) notes.push("shade, water, and a warm layer for the evening");
  if (p.sig.needs.indexOf("kids") > -1 || p.sig.needs.indexOf("children") > -1) notes.push("a supervised kids' area");
  if (p.sig.needs.some(x => ["wheelchair", "accessible", "accessibility", "elderly"].indexOf(x) > -1)) notes.push("step-free routes and seating within easy reach");
  return notes;
}

/* Standard considerations every event should think about. */
function baseConsiderations(p) {
  const items = [];
  if (s(p, "specialReq")) items.push(`Your special requirements: ${s(p, "specialReq")}`);
  p.sig.needs.forEach(x => {
    if (x === "kids" || x === "children") items.push("Plan a safe, supervised space for children");
    else if (x === "wheelchair" || x === "accessible" || x === "accessibility") items.push("Verify step-free access, restrooms, and seating");
    else if (x === "elderly") items.push("Keep seating, shade, and rest areas within easy reach for older guests");
    else if (x === "pets") items.push("Confirm the venue's pet policy if animals are attending");
    else if (x === "allergies" || x === "allergy") items.push("Collect allergy information and label dishes clearly");
    else if (x === "parking" || x === "shuttle") items.push("Plan guest parking or a shuttle service");
    else if (x === "quiet") items.push("Keep volume and after-hours noise considerate of neighbours");
    else if (x === "no alcohol" || x === "sober") items.push("Build a drinks menu that works fully without alcohol");
  });
  if (isOutdoors(p)) items.push("Have a wet-weather and wind plan — part of this is outdoors");
  items.push("Confirm venue noise rules and curfew times");
  items.push(p.budget
    ? `Hold back the contingency line ($${Math.round(p.budget * 0.1).toLocaleString()}) for last-minute costs`
    : "Build in a 15–20% contingency for last-minute costs");
  items.push("Name one person to own day-of coordination");
  if (s(p, "avoid")) items.push(`Avoid: ${s(p, "avoid")}`);
  return items;
}

/* Turn a {weeks, detail} list into the timeline rows the engine renders. */
function weeks(offset, detail) {
  const labels = { 0: "Event day" };
  return { weeks: offset, detail, label: labels[offset] || offset + " weeks out" };
}

/* Standard planning timeline, lightly customised by the type. */
function baseTimeline(p, notes) {
  const n = notes || {};
  return [
    weeks(12, n.w12 || "Lock the venue, finalize the date, and send save-the-dates."),
    weeks(8,  n.w8  || "Book catering, entertainment, and photo/video. Draft the guest list."),
    weeks(6,  n.w6  || "Send invitations. Start décor and theme planning."),
    weeks(4,  n.w4  || "Confirm RSVPs, finalize the menu, and order rentals."),
    weeks(2,  n.w2  || "Confirm every vendor, build the run-of-show, and assign helpers."),
    weeks(1,  n.w1  || "Give final headcount to your vendors, prep décor, and confirm the weather backup."),
    weeks(0,  n.w0  || "Arrive early, do a walk-through, and enjoy it.")
  ];
}

/* Default budget split; each type overrides or tweaks it. */
function budgetPlan(p, cats, note) {
  const budget = p.budget;
  if (!budget) {
    return { cats: [], note: "Add a budget to see a suggested category breakdown." };
  }
  return {
    cats: cats.map(c => ({ name: c.name, pct: c.pct, amt: Math.round((budget * c.pct) / 100) })),
    note: note || ""
  };
}

/* Per-guest line appended to budget notes. */
function perGuest(p) {
  return (p.guests && p.budget) ? ` — roughly $${Math.round(p.budget / p.guests).toLocaleString()} per guest` : "";
}

function budgetNote(p, lead) {
  return `${lead || "Total"} $${p.budget.toLocaleString()}${perGuest(p)}. The contingency line is deliberate: hold it back for the last-minute additions that always appear.`;
}

/* ============================================================
   1. Custom Event — preserved exactly as the original flow
   ============================================================ */

defEvent("custom", {
  label: "Custom Event",
  emoji: "🎉",
  tagline: "Any celebration, gathering, or occasion — built entirely around you.",
  primary: true,
  planTitle: (p) => `Your ${s(p, "occasion") || "Custom Event"} Plan`,
  questions: [
    Q.text("occasion", "What would you like to celebrate?", "Tell us the occasion in a few words.", "e.g. A 50th birthday celebration"),
    Q.date("date", "What is the event date?"),
    COMMON.location(),
    COMMON.guests(),
    COMMON.budget(),
    Q.chips("venue", "What type of venue are you interested in?", "Pick the vibe that fits best. Choose as many as you like.", ["Banquet hall", "Outdoor garden", "Beach", "Restaurant / private dining", "Rooftop", "Home / backyard", "Hotel ballroom", "Virtual / online"]),
    Q.chips("style", "What is the overall style or theme?", "Choose the feel you're going for.", ["Elegant & formal", "Rustic & cozy", "Modern & minimal", "Bohemian", "Glamorous", "Vintage / retro", "Tropical", "Whimsical & fun"]),
    Q.chips("food", "What food / catering preferences do you have?", "How would you like to feed your guests?", ["Plated dinner", "Buffet", "Cocktail bites", "Food trucks", "Family-style", "Dessert bar", "Vegan / vegetarian focus", "DIY station"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should keep the energy going?", ["Live band", "DJ", "Acoustic soloist", "Photo booth", "Games & activities", "Karaoke", "Dance floor", "Speaker / presentations"]),
    Q.chips("decor", "What decorations or atmosphere do you want?", "Set the scene with the right look.", ["Fairy lights", "Fresh flowers", "Candles", "Balloon arch", "Greenery & plants", "Lounge seating", "Themed props", "Minimalist & clean"]),
    COMMON.specialReq(),
    COMMON.avoid(),
    Q.vision("I want an elegant but fun 50th birthday celebration for about 50 guests. I love Indian food, music and beautiful outdoor spaces…")
  ],
  build: function (p) {
    const occasion = s(p, "occasion") || "Custom Event";
    const venues = list(p, "venue"), styles = list(p, "style");
    const food = list(p, "food"), ent = list(p, "entertainment"), decor = list(p, "decor");
    const who = guestPhrase(p);
    const where = s(p, "location") ? ` in ${s(p, "location")}` : "";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (styles.length ? lcList(styles) : "memorable");

    // ---- Event concept
    let concept = `A ${mood} ${lc(occasion)}${where} for ${who}.`;
    if (p.sig.cuisines.length) concept += ` Food is a highlight — ${listPhrase(p.sig.cuisines.map(midTerm))} is clearly part of the story, so the menu and timing should be built around it.`;
    if (p.sig.settings.length) concept += ` The setting leans ${listPhrase(p.sig.settings)}, which shapes everything from lighting to the floor plan.`;
    concept += " Everything below is assembled from your answers and your own description.";

    // ---- Theme & atmosphere
    const themeParts = [`Build around a ${mood} atmosphere`];
    if (decor.length) themeParts.push(`expressed through ${lcList(decor)}`);
    if (p.sig.settings.length) themeParts.push(`letting the ${listPhrase(p.sig.settings)} setting do much of the work`);
    let theme = themeParts.join(", ") + ". Keep one or two signature elements consistent — the invitation, the entrance, and the table styling — so the theme reads clearly without becoming a costume.";
    if (p.sig.moments.length) theme += ` Plan the look around your key moments (${listPhrase(p.sig.moments)}).`;

    // ---- Venue
    let venue = `Target ${venues.length ? lcList(venues) : "a flexible venue"}`;
    if (p.sig.settings.length) venue += ` — your description points toward something ${listPhrase(p.sig.settings)}`;
    venue += ".";
    venue += p.guests ? ` Confirm it comfortably holds ${p.guests} guests plus any catering or staging space.` : " Confirm the capacity against your final guest count.";
    if (p.sig.cuisines.length || food.indexOf("Food trucks") > -1) venue += " Check outside-catering and power rules early, since your food plans may need a kitchen or an outdoor setup.";
    venue += " Also verify parking, noise curfews, and a wet-weather backup before you sign.";

    // ---- Guest experience
    const gx = [];
    gx.push(p.guests ? `Design the room for ${p.guests} guests, with seating that keeps groups together rather than scattering them.` : "Design seating around your final headcount, keeping groups together rather than scattering them.");
    gx.push(p.sig.moments.length
      ? `Give your standout moments room to land: ${listPhrase(p.sig.moments)}. Build them into the run-of-show so they don't get lost.`
      : "Build two or three anchor moments into the run-of-show — a welcome, a toast, and a send-off — so the event has a shape.");
    const comfort = comfortNotes(p);
    if (comfort.length) gx.push(`Look after comfort: ${listPhrase(comfort)}.`);
    if (ent.length) gx.push(`Keep energy flowing with ${listPhrase(ent.map(midTerm))}.`);

    // ---- Food & catering
    const foodIdeas = {
      "Plated dinner": "a sit-down multi-course plated service", "Buffet": "a self-serve buffet with varied stations",
      "Cocktail bites": "passed hors d'oeuvres and bite-size portions", "Food trucks": "one or two food trucks parked on-site",
      "Family-style": "large shared platters at each table", "Dessert bar": "a dessert bar with a showpiece centrepiece",
      "Vegan / vegetarian focus": "a plant-forward menu with creative mains", "DIY station": "interactive DIY stations (tacos, ramen, or hot cocoa)"
    };
    const fp = [];
    fp.push(food.length ? `Serve ${listPhrase(food.map(f => foodIdeas[f] || lc(f)))}.` : "Choose one primary service style (buffet or family-style usually stretch furthest) and let it set the room's rhythm.");
    const drinks = ["cocktails", "champagne", "wine", "tea", "coffee"];
    const foodWords = p.sig.cuisines.filter(c => drinks.indexOf(c) === -1);
    const drinkWords = p.sig.cuisines.filter(c => drinks.indexOf(c) > -1);
    if (foodWords.length) fp.push(`Your description calls out ${listPhrase(foodWords.map(midTerm))} — make that the centrepiece rather than one option among many, and brief the caterer on it directly.`);
    if (drinkWords.length) fp.push(`Pair it with ${listPhrase(drinkWords.map(midTerm))} for the drinks.`);
    if (p.guests) fp.push(`Plan for roughly ${p.guests} servings.`);
    if (p.sig.needs.some(x => ["vegan", "vegetarian", "allergies", "allergy", "gluten", "halal", "kosher"].indexOf(x) > -1)) fp.push("Flag your dietary requirements explicitly when you request quotes — clear labelling at the table avoids awkwardness on the day.");
    else fp.push("Include a vegetarian option and a couple of non-alcoholic choices as standard.");

    // ---- Decorations
    const dp = [];
    dp.push(decor.length ? `Build the atmosphere with ${lcList(decor)}.` : "Start with layered lighting — warm and dimmable beats a single overhead source.");
    if (isOutdoors(p)) dp.push("Because part of this is outdoors, lean on what's already there — greenery and natural light — and add structure where it's missing: a defined entrance, lighting on paths, and a wind plan for candles.");
    else dp.push("In an indoor room, concentrate décor at two or three focal points (entrance, main table, photo spot) and leave the rest calm so it doesn't feel cluttered.");
    if (p.sig.vibes.length) dp.push(`Keep choices consistent with the ${listPhrase(p.sig.vibes)} mood you described.`);
    if (s(p, "avoid")) dp.push(`Steer clear of anything that reads as: ${lc(s(p, "avoid"))}.`);

    // ---- Entertainment
    const entIdeas = {
      "Live band": "a live band for the peak hour", "DJ": "a DJ to carry the dance floor",
      "Acoustic soloist": "an acoustic soloist through arrival and dinner", "Photo booth": "a photo booth with props matched to your theme",
      "Games & activities": "games that give people something to do together", "Karaoke": "a karaoke corner that opens up after dessert",
      "Dance floor": "a properly sized, lit dance floor", "Speaker / presentations": "a short programmed segment with mic and AV"
    };
    const ep = [];
    ep.push(ent.length ? `Book ${listPhrase(ent.map(e => entIdeas[e] || lc(e)))}.` : "Anchor the evening with a curated playlist plus one interactive element — a photo moment or a toast — rather than filling every minute.");
    if (p.sig.activities.length) {
      const extras = p.sig.activities.filter(a => ent.join(" ").toLowerCase().split(/[^a-z]+/).indexOf(a) === -1);
      if (extras.length) ep.push(`Your description also mentions ${listPhrase(extras)} — worth weaving in.`);
    }
    if (p.sig.moments.length) ep.push(`Sequence the entertainment around ${listPhrase(p.sig.moments)} so nothing competes for attention.`);
    const drinkFree = p.sig.needs.indexOf("no alcohol") > -1 || p.sig.needs.indexOf("sober") > -1;
    ep.push(drinkFree ? "Keep the energy non-alcohol-led — good food, music, and a couple of shared activities carry it just as well." : "Alternate high-energy and low-key stretches so people can rest, eat, and talk.");

    return {
      cards: [
        { icon: "🎯", title: "Event concept", text: concept },
        { icon: "🎨", title: "Theme & atmosphere", text: theme },
        { icon: "🏛️", title: "Venue type", text: venue },
        { icon: "🥂", title: "Guest experience", text: gx.join(" ") },
        { icon: "🍽️", title: "Food & catering", text: fp.join(" ") },
        { icon: "✨", title: "Decorations", text: dp.join(" ") },
        { icon: "🎤", title: "Entertainment", text: ep.join(" ") },
        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, (function () {
        const foodFocus = p.sig.cuisines.length > 0 || food.length > 0;
        return [
          { name: "Venue & rentals", pct: foodFocus ? 28 : 32 },
          { name: "Food & catering", pct: foodFocus ? 32 : 26 },
          { name: "Decor & flowers", pct: 12 },
          { name: "Entertainment", pct: 11 },
          { name: "Photo & video", pct: 7 },
          { name: "Misc & contingency", pct: 10 }
        ];
      })(), budgetNote(p)),
      timeline: baseTimeline(p, {
        w8: (food.indexOf("Food trucks") > -1 ? "Book food trucks and confirm power, parking, and permits." : "Book catering and lock the menu direction.") + " Book entertainment and photo/video. Draft the guest list.",
        w6: "Send invitations. " + (decor.length ? `Start on décor and order supplies for ${lcList(decor)}.` : "Start décor and theme planning.")
      }),
      checklist: (function () {
        const c = [
          "Define the goals and must-haves for the day",
          p.budget ? `Set and lock the budget ($${p.budget.toLocaleString()})` : "Set and lock the budget",
          venues.length ? `Book the venue (${listPhrase(venues)})` : "Book the venue",
          "Create and send invitations",
          foodWords.length ? `Brief the caterer on ${listPhrase(foodWords.map(midTerm))}` : "Plan the menu and book catering",
          ent.length ? `Book entertainment (${listPhrase(ent.map(titleTerm))})` : "Hire entertainment / AV",
          decor.length ? `Order décor (${listPhrase(decor.map(titleTerm))})` : "Design décor and order supplies",
          "Arrange photo / video coverage",
          "Confirm rentals (tables, chairs, linens)",
          "Build a run-of-show timeline"
        ];
        if (p.sig.moments.length) c.push(`Rehearse the key moments (${listPhrase(p.sig.moments)})`);
        if (p.sig.needs.indexOf("kids") > -1 || p.sig.needs.indexOf("children") > -1) c.push("Set up the kids' area and activities");
        if (p.sig.needs.indexOf("parking") > -1 || p.sig.needs.indexOf("shuttle") > -1 || p.guests >= 80) c.push("Sort parking or a shuttle for guests");
        c.push("Confirm final headcount with the caterer");
        c.push("Prepare the day-of setup kit and a named point person");
        return c;
      })(),
      considerations: baseConsiderations(p)
    };
  }
});

/* ============================================================
   2. Wedding
   ============================================================ */

defEvent("wedding", {
  label: "Wedding",
  emoji: "💒",
  tagline: "Your perfect day, planned in detail.",
  planTitle: () => "Your Wedding Plan",
  questions: [
    Q.date("date", "What is your wedding date?", "Pick the date you're aiming for."),
    Q.text("ceremonyPlace", "Where will the ceremony and reception be held?", "A town, venue, or area — whatever you know so far.", "e.g. Fredericksburg, TX"),
    COMMON.guests(),
    COMMON.budget(),
    Q.chips("style", "What is your wedding style or theme?", "Choose the feel you're going for.", ["Elegant & formal", "Rustic & cozy", "Modern & minimal", "Bohemian", "Glamorous", "Vintage / retro", "Tropical", "Garden party"]),
    Q.chips("ceremonyType", "What type of ceremony are you planning?", "Pick the closest fit.", ["Religious", "Civil / registry", "Cultural or traditional", "Interfaith", "Destination ceremony", "Elopement / intimate", "Vow renewal"]),
    COMMON.setting(),
    Q.chips("catering", "What catering style do you want?", "How would you like to feed your guests?", ["Plated dinner", "Buffet", "Family-style", "Cocktail reception", "Food stations", "Food trucks", "Vegan / vegetarian focus"]),
    Q.chips("partySize", "How large is your wedding party?", "Bridesmaids, groomsmen, and anyone standing with you.", ["Just the two of us", "1–2 each", "3–4 each", "5–6 each", "7 or more each"]),
    Q.chips("photo", "What photography and videography do you want?", "Choose as many as you like.", ["Full-day photography", "Ceremony only", "Photojournalistic style", "Cinematic video", "Highlight reel", "Drone footage", "Photo booth"]),
    Q.chips("music", "What music and entertainment do you want?", "What should carry the day?", ["Live band", "DJ", "String quartet", "Acoustic soloist", "Cultural music", "Dance floor", "Karaoke"]),
    Q.chips("florals", "What flowers and decorations do you want?", "Set the scene with the right look.", ["Fresh flowers", "Seasonal blooms", "Greenery & eucalyptus", "Candles & lanterns", "Fairy lights", "Arches & backdrops", "Draping & fabric", "Minimalist"]),
    Q.chips("cake", "What are your thoughts on the wedding cake?", "Dessert is part of the plan.", ["Traditional tiered cake", "Naked / rustic cake", "Cupcake tower", "Dessert table instead", "Cultural sweets", "No cake — other dessert"]),
    Q.chips("invitations", "How would you like to handle invitations?", "Pick what suits you.", ["Formal printed invitations", "Digital / email", "Save-the-dates + printed", "Handmade / DIY", "Letterpress", "Simple and minimal"]),
    Q.chips("transport", "Do you need transportation arrangements?", "Getting everyone there matters.", ["Shuttle for guests", "Bridal car", "No transport needed", "Limousine", "Vintage car", "Horse and carriage", "Rideshare coordination"]),
    Q.text("traditions", "Are there special traditions or cultural requirements?", "Anything we should honour or build in.", "e.g. Mehndi, tea ceremony, jumping the broom…"),
    COMMON.avoid(),
    Q.vision("I'm picturing a garden wedding at golden hour with close family, lots of candles, and a relaxed dinner under string lights. We love Italian food and want live music, but nothing too formal…")
  ],
  build: function (p) {
    const styles = list(p, "style");
    const catering = list(p, "catering");
    const party = list(p, "partySize");
    const photo = list(p, "photo");
    const music = list(p, "music");
    const florals = list(p, "florals");
    const cake = list(p, "cake");
    const invites = list(p, "invitations");
    const transport = list(p, "transport");
    const ceremonyType = list(p, "ceremonyType");
    const place = s(p, "ceremonyPlace") || "your chosen location";
    const traditions = s(p, "traditions");
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (styles.length ? lcList(styles) : "memorable");
    const who = guestPhrase(p);
    const outdoors = isOutdoors(p);

    return {
      cards: [
        { icon: "💍", title: "Wedding concept", text:
          `A ${mood} wedding in ${place} for ${who}${styles.length ? `, styled ${lcList(styles)}` : ""}.` +
          (ceremonyType.length ? ` The ceremony is ${lcList(ceremonyType)}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)} — that mood should carry through every decision below.` : "") +
          (traditions ? ` Special traditions to honour: ${traditions}.` : "") +
          " Everything below is built from your answers and your own description." },

        { icon: "🎨", title: "Theme, colours & style", text:
          (styles.length ? `Anchor the day in a ${lcList(styles)} palette.` : "Choose a two- or three-colour palette and hold it everywhere.") +
          (p.sig.colors && p.sig.colors.length ? ` You mentioned ${listPhrase(p.sig.colors)} — build the palette around that.` : "") +
          (florals.length ? ` Carry it through ${lcList(florals)}.` : "") +
          " Keep it to two or three repeating elements — the invitation, the ceremony backdrop, and the table settings — so it reads as intentional rather than themed." +
          (outdoors ? " Outdoors, let the landscape set half the colour story." : "") },

        { icon: "🏛️", title: "Venue plan", text:
          `You're looking in ${place}${p.guests ? ` for ${p.guests} guests` : ""}.` +
          (outdoors ? " Since part of this is outdoors, confirm a wet-weather backup and whether a marquee or tent is allowed." : " Confirm the room can hold your ceremony and reception without a full reset between them, or budget for a flip.") +
          " Check capacity, curfew, accessibility, parking, and whether outside catering and your chosen drinks are permitted. Ask about a getting-ready room for each partner." },

        { icon: "🕊️", title: "Ceremony plan", text:
          `A ${ceremonyType.length ? lcList(ceremonyType) : "classic"} ceremony` +
          (p.guests ? ` in front of ${p.guests} guests` : "") + ". Decide the order of the procession, who speaks, and whether you're writing your own vows." +
          (traditions ? ` Build in your traditions (${traditions}) and agree with your officiant how much time they need.` : "") +
          " Aim for 20–30 minutes of ceremony; anything longer and guests start shifting in their seats. Have a plan for heat, shade, or rain if it's outdoors." },

        { icon: "🥂", title: "Reception plan", text:
          (catering.length ? `Open with a cocktail hour so guests can mingle while you take photos, then move into ${lcList(catering)}.` : "Open with a cocktail hour while you take photos, then move into dinner.") +
          " Sequence it as entrance, welcome toast, dinner, speeches (two or three, capped at three minutes each), cake, then dancing." +
          (music.length ? ` Your music choices (${lcList(music)}) set the energy for the second half.` : "") +
          " Protect the first 20 minutes after dinner for you two to actually eat and breathe." },

        { icon: "🍽️", title: "Catering", text:
          (catering.length ? `Serve ${lcList(catering)}.` : "Choose a service style that suits your guest count and venue.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — make that the centrepiece and brief the caterer directly.` : "") +
          (traditions ? " Confirm whether your traditions require specific dishes, and whether a separate vegetarian or cultural menu is needed." : "") +
          " Always collect dietary requirements on the RSVP and label dishes at the table." },

        { icon: "🌸", title: "Decorations & florals", text:
          (florals.length ? `Build the look with ${lcList(florals)}.` : "Choose a floral direction and repeat it in three places.") +
          " Prioritise where photos happen — the ceremony backdrop, the head table, and the entrance. Everything else can be simpler." +
          (outdoors ? " Outdoors, weight everything down and avoid open flames unless they're enclosed; a wind plan saves the day." : "") +
          (styles.length ? ` Stay consistent with the ${lcList(styles)} style you chose.` : "") },

        { icon: "🎶", title: "Entertainment", text:
          (music.length ? `Book ${lcList(music)}.` : "Book one main music source and a backup playlist.") +
          " Give the band or DJ a do-not-play list and three must-play songs, and agree the exact cues for the first dance and the send-off." +
          (party.length ? ` With ${lcList(party)} in the wedding party, plan a moment that gets them onto the floor early.` : "") },

        { icon: "📸", title: "Photography", text:
          (photo.length ? `You're after ${lcList(photo)}.` : "Book a photographer for at least the ceremony and the first hour of the reception.") +
          " Write a shot list of the family groupings you actually want — it's the single biggest time saver on the day." +
          " Schedule golden-hour portraits around your dinner timing, and make sure your photographer eats when you do." +
          (outdoors ? " If part of this is outdoors, confirm a backup location for portraits." : "") },

        { icon: "🍰", title: "Cake & desserts", text:
          (cake.length ? `Plan for ${lcList(cake)}.` : "Decide between a traditional cake and a dessert spread.") +
          (p.guests ? ` Size it for ${p.guests} guests — most caterers cut 1×1 inch slices, so ask.` : " Ask your baker how many servings their tier count actually yields.") +
          " Keep the cake out of direct sun and confirm the delivery window with the venue." },

        { icon: "🤝", title: "Guest experience", text:
          `Think about the day from a guest's point of view${p.guests ? ` — all ${p.guests} of them` : ""}.` +
          " Clear signage, a visible timeline, and somewhere to sit during the cocktail hour go a long way." +
          (transport.length ? ` Your transport plan (${lcList(transport)}) should include the last return trip, not just the arrival.` : " Decide early how guests get home if the venue is remote.") +
          (invites.length ? ` With ${lcList(invites)}, make sure the practical details — time, dress code, directions, parking — are impossible to miss.` : "") +
          (p.sig.needs.indexOf("kids") > -1 ? " Plan a supervised area for children." : "") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 25 },
        { name: "Catering & bar", pct: 27 },
        { name: "Photography & video", pct: 12 },
        { name: "Florals & décor", pct: 10 },
        { name: "Music & entertainment", pct: 8 },
        { name: "Attire, cake & stationery", pct: 10 },
        { name: "Misc & contingency", pct: 8 }
      ], budgetNote(p, "Wedding total") + " Photography and florals are the two lines couples most often under-budget, so protect them."),
      timeline: baseTimeline(p, {
        w12: "Lock the venue and set the date. Send save-the-dates and book your photographer.",
        w8: "Book catering, florals, music, and the officiant. Order attire — alterations take longer than you expect.",
        w6: "Send invitations. Finalize the menu and book the cake.",
        w4: "Confirm RSVPs, finalize the ceremony order, and lock the shot list.",
        w2: "Confirm every vendor's arrival time, build the run-of-show, and write your vows.",
        w1: "Give the caterer the final headcount, hand the timeline to your party, and pack the day-of kit.",
        w0: "Be present. Someone else is holding the schedule — let them."
      }),
      extraSections: [{
        icon: "⏱️",
        title: "Wedding-day timeline",
        ordered: true,
        items: [
          { when: "Morning", detail: "Hair and makeup begins; breakfast is eaten, not skipped. Attire and rings handed to whoever is responsible." },
          { when: "2 hours before ceremony", detail: "Vendors arrive. Florals delivered. Photographer starts with detail and getting-ready shots." },
          { when: "30 minutes before", detail: "Guests seated. Music cued. Officiant and wedding party in position." },
          { when: "Ceremony", detail: `Processional, ${ceremonyType.length ? lcList(ceremonyType) : "ceremony"}, vows, and recessional.` + (traditions ? ` Includes ${traditions}.` : "") },
          { when: "Immediately after", detail: "Congratulations, then group photos — start with the largest groupings and work down." },
          { when: "+1 hour", detail: "Cocktail hour for guests. You two join at the end for the entrance." },
          { when: "Dinner", detail: `${catering.length ? titleTerm(catering[0]) : "Dinner"} service. You eat first, at the same time as your guests.` },
          { when: "After dinner", detail: "Speeches — two or three, three minutes each. Then cake." },
          { when: "Evening", detail: `First dance, then open dancing${music.length ? ` with ${lcList(music)}` : ""}.` },
          { when: "Last 30 minutes", detail: "Send-off, final photos, and a quiet moment together before you leave." }
        ]
      }],
      checklist: [
        "Set the overall budget and agree who is contributing",
        "Book the venue and confirm the date",
        "Book the officiant and agree the ceremony structure",
        ceremonyType.length ? `Plan the ${lcList(ceremonyType)} ceremony` : "Plan the ceremony",
        "Book catering and confirm the menu",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        invites.length ? `Send invitations (${lcList(invites)})` : "Send invitations",
        "Book the photographer and videographer",
        music.length ? `Book music (${listPhrase(music.map(titleTerm))})` : "Book music and entertainment",
        florals.length ? `Order florals (${listPhrase(florals.map(titleTerm))})` : "Order florals and décor",
        cake.length ? `Order the cake (${lcList(cake)})` : "Order the cake",
        "Arrange attire and alterations for both partners",
        transport.length ? `Arrange transportation (${lcList(transport)})` : "Decide on transportation for guests",
        "Buy the rings and confirm they fit",
        "Confirm rentals (tables, chairs, linens, glassware)",
        traditions ? `Confirm arrangements for: ${traditions}` : "Confirm any cultural or family traditions",
        "Build the wedding-day timeline and share it with the wedding party",
        "Confirm final headcount with the caterer",
        "Pack the day-of emergency kit and assign a point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Marriage licence: check your local waiting period and bring the right documents",
        "Agree on a rain plan in writing with the venue if any part is outdoors",
        "Decide the tipping plan for vendors and put the cash in labelled envelopes",
        "Make sure both partners eat a real meal — assign someone to make it happen",
        "Expect at least two things to go wrong; the schedule matters more than the details"
      ])
    };
  }
});

/* ============================================================
   3. Birthday
   ============================================================ */

defEvent("birthday", {
  label: "Birthday Party",
  emoji: "🎂",
  tagline: "From sweet 16 to milestone celebrations.",
  planTitle: (p) => `Your ${s(p, "milestone") ? s(p, "milestone") + " " : ""}Birthday Plan`,
  questions: [
    Q.text("milestone", "What age or milestone are you celebrating?", "A number, or a milestone like 'sweet 16'.", "e.g. 50th"),
    Q.text("honoree", "Who is the birthday for?", "Their name, and what they're into.", "e.g. My mum, Priya — loves gardening and Motown"),
    Q.date("date", "What is the party date?", "Pick the date you're aiming for."),
    COMMON.location(),
    COMMON.guests(),
    COMMON.budget(),
    COMMON.setting(),
    Q.chips("theme", "What theme or style do you want?", "Choose the feel you're going for.", ["Elegant & formal", "Fun & playful", "Rustic & cozy", "Modern & minimal", "Glamorous", "Vintage / retro", "Tropical", "Themed (character, era, or hobby)"]),
    Q.chips("food", "What food would you like?", "How would you like to feed your guests?", ["Buffet", "Plated dinner", "BBQ / cookout", "Cocktail bites", "Food trucks", "Pizza party", "Potluck", "Vegan / vegetarian focus"]),
    Q.chips("cake", "What are your cake and dessert plans?", "Dessert is part of the plan.", ["Traditional birthday cake", "Custom themed cake", "Cupcake tower", "Dessert table", "Ice cream bar", "Cultural sweets", "No cake — other dessert"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should keep the energy going?", ["DJ", "Live band", "Karaoke", "Photo booth", "Games & activities", "Magician / performer", "Dance floor", "Playlist only"]),
    Q.chips("decor", "What decorations do you want?", "Set the scene with the right look.", ["Balloon arch", "Balloon garland", "Banner / signage", "Fairy lights", "Fresh flowers", "Themed props", "Table centrepieces", "Minimalist"]),
    Q.chips("activities", "What activities do you want?", "What should guests actually do?", ["Party games", "Trivia / quiz", "Photo booth", "Dancing", "Crafts station", "Outdoor games", "Slideshow / memory wall", "Just mingling"]),
    Q.text("interests", "What are the birthday person's special interests?", "We'll weave these into the theme and details.", "e.g. Jazz records, gardening, her grandkids"),
    COMMON.specialReq(),
    COMMON.avoid(),
    Q.vision("I want a relaxed garden party for my mum's 60th with about 40 people. She loves jazz and gardening, so I'd like it to feel like a summer afternoon — good food, a proper cake, and lots of photos…")
  ],
  build: function (p) {
    const theme = list(p, "theme"), food = list(p, "food"), cake = list(p, "cake");
    const ent = list(p, "entertainment"), decor = list(p, "decor"), acts = list(p, "activities");
    const milestone = s(p, "milestone"), honoree = s(p, "honoree"), interests = s(p, "interests");
    const where = s(p, "location") || "your chosen location";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (theme.length ? lcList(theme) : "joyful");
    const who = guestPhrase(p);

    return {
      cards: [
        { icon: "🎂", title: "Birthday concept", text:
          `A ${mood} celebration${milestone ? ` for a ${lc(milestone)} birthday` : ""} in ${where} for ${who}.` +
          (honoree ? ` Centred on ${honoree.split("—")[0].trim()}.` : "") +
          (interests ? ` The details should speak to what they love: ${interests}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") },

        { icon: "🎨", title: "Theme", text:
          (theme.length ? `Build the party around a ${lcList(theme)} look.` : "Pick one clear theme and repeat it in three places.") +
          (interests ? ` Work their interests (${interests}) into the details — a photo display, a signature drink name, or the playlist.` : "") +
          (decor.length ? ` Express it through ${lcList(decor)}.` : "") +
          " A birthday reads best when the theme shows up in the entrance, the cake table, and one photo moment. Everything else can stay simple." },

        { icon: "🏛️", title: "Venue type", text:
          (isOutdoors(p) ? "An outdoor or garden setting suits this well — confirm a wet-weather backup and check the noise curfew." : "A private room or a home setting keeps the guest list contained and the atmosphere relaxed.") +
          (p.guests ? ` Make sure the space seats or holds ${p.guests} comfortably without feeling empty or packed.` : " Check the capacity against your final list.") +
          (food.indexOf("Food trucks") > -1 ? " Food trucks need power, parking, and permission — confirm all three early." : " Confirm whether you can bring your own cake and drinks.") },

        { icon: "🍽️", title: "Food & cake", text:
          (food.length ? `Serve ${lcList(food)}.` : "Choose a service style that keeps people moving.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — make that the centrepiece.` : "") +
          (cake.length ? ` For dessert: ${lcList(cake)}.` : " Decide between a traditional cake and a dessert spread.") +
          (interests ? ` Consider naming a signature dish or drink after the birthday person.` : "") },

        { icon: "🎤", title: "Entertainment", text:
          (ent.length ? `Book ${lcList(ent)}.` : "A strong playlist plus one interactive element usually beats hiring more than you need.") +
          (acts.length ? ` Keep guests busy with ${lcList(acts)}.` : "") +
          (p.sig.activities.length ? ` Your description mentions ${listPhrase(p.sig.activities)} — worth building in.` : "") +
          " Plan one moment where everyone gathers — the cake, a toast, or a group photo — so the party has a centre." },

        { icon: "✨", title: "Decorations", text:
          (decor.length ? `Set the scene with ${lcList(decor)}.` : "Start with lighting and one statement piece behind the cake table.") +
          (p.sig.moments.some(x => ["surprise", "grand entrance"].indexOf(x) > -1) ? " If there's a surprise element, plan the reveal so the décor isn't given away on arrival." : "") +
          (isOutdoors(p) ? " Outdoors, weight balloons and props down, and avoid open flames unless enclosed." : " Indoors, concentrate the décor at the entrance and the cake table.") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "🎯", title: "Activities", text:
          (acts.length ? `Run ${lcList(acts)}.` : "Plan two or three optional activities rather than a full schedule — people mostly want to talk.") +
          " Give any group activity a clear host so it actually starts, and keep it short enough that nobody feels trapped." +
          (p.sig.needs.indexOf("kids") > -1 || p.sig.needs.indexOf("children") > -1 ? " Set up a separate zone for children so the adults get their own space." : "") +
          (interests ? ` A slideshow or memory wall themed around ${interests} always lands well.` : "") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 28 },
        { name: "Food & catering", pct: 30 },
        { name: "Cake & desserts", pct: 8 },
        { name: "Décor & balloons", pct: 12 },
        { name: "Entertainment", pct: 11 },
        { name: "Misc & contingency", pct: 11 }
      ], budgetNote(p, "Party total") + (p.guests ? ` That's a workable per-head target of about $${Math.round(p.budget / p.guests).toLocaleString()}.` : "")),
      timeline: baseTimeline(p, {
        w12: "Pick the date, lock the venue, and send a save-the-date to your must-haves.",
        w8: "Book catering and entertainment. Order the cake and decide the theme.",
        w6: "Send invitations. Order décor and any personalised items.",
        w4: "Confirm RSVPs, finalize the menu, and sort the cake design.",
        w2: "Confirm vendors, buy drinks, and plan the activity or slideshow.",
        w1: "Final headcount, prep décor, and confirm who is handling the cake moment.",
        w0: "Set up early, brief whoever is hosting the toast, and enjoy it."
      }),
      checklist: [
        "Set the budget and agree who is contributing",
        "Confirm the date and check it doesn't clash with other events",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or confirm the home setup",
        food.length ? `Book catering (${listPhrase(food.map(titleTerm))})` : "Book catering",
        cake.length ? `Order the cake (${lcList(cake)})` : "Order the cake or dessert",
        ent.length ? `Book entertainment (${listPhrase(ent.map(titleTerm))})` : "Sort music and entertainment",
        decor.length ? `Order décor (${listPhrase(decor.map(titleTerm))})` : "Order decorations",
        "Create and send invitations",
        acts.length ? `Plan activities (${lcList(acts)})` : "Plan the activities",
        interests ? `Prepare something personal tied to: ${interests}` : "Plan a personal touch for the birthday person",
        "Arrange the cake moment: candles, knife, and someone to take photos",
        "Sort drinks, ice, and glasses",
        "Confirm final headcount with the caterer",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Plan the cake moment — someone needs to bring it out and photograph it",
        "If it's a surprise, agree exactly who knows and how the guest arrives",
        "Keep a card and gift table somewhere visible and secure",
        "Have a plan for leftovers, especially food and cake"
      ])
    };
  }
});

/* ============================================================
   4. Anniversary
   ============================================================ */

defEvent("anniversary", {
  label: "Anniversary",
  emoji: "💕",
  tagline: "Celebrate love at any stage.",
  planTitle: (p) => `Your ${s(p, "which") ? s(p, "which") + " " : ""}Anniversary Plan`,
  questions: [
    Q.text("which", "Which anniversary are you celebrating?", "A number, or a name like 'golden'.", "e.g. 25th"),
    Q.text("couple", "Who are you celebrating?", "Names, and what they're like together.", "e.g. Mum and Dad — married 25 years, love dancing"),
    Q.date("date", "What is the anniversary date?", "Pick the date you're aiming for."),
    COMMON.location(),
    COMMON.guests(),
    COMMON.budget(),
    Q.chips("style", "What style suits the celebration?", "Pick the closest fit.", ["Romantic & intimate", "Formal & elegant", "Casual & relaxed", "Glamorous", "Sentimental & nostalgic"]),
    COMMON.setting(),
    Q.chips("food", "What food and drinks do you want?", "How would you like to host?", ["Plated dinner", "Buffet", "Cocktail reception", "Intimate dinner party", "Restaurant booking", "Family-style", "Dessert & drinks only"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should carry the evening?", ["Live band", "DJ", "Acoustic soloist", "String quartet", "Dance floor", "Playlist only", "Slideshow & speeches"]),
    Q.chips("decor", "What decorations would you like?", "Set the scene.", ["Candles", "Fresh flowers", "Fairy lights", "Photo display / memory table", "Balloons", "Table centrepieces", "Minimalist & clean"]),
    Q.text("memories", "Are there special memories or traditions to honour?", "Anything the celebration should reference.", "e.g. They honeymooned in Italy — could we nod to that?"),
    Q.chips("surprise", "Do you want any surprise elements?", "Choose as many as you like.", ["Surprise guest", "Surprise speech", "Slideshow", "Renewal of vows", "Surprise gift", "None — keep it straightforward"]),
    COMMON.avoid(),
    Q.vision("I want an intimate dinner for my parents' 25th anniversary — about 30 people, candles everywhere, and a slideshow of their life together. Italian food, because that's where they honeymooned…")
  ],
  build: function (p) {
    const styles = list(p, "style"), food = list(p, "food"), ent = list(p, "entertainment");
    const decor = list(p, "decor"), surprise = list(p, "surprise");
    const which = s(p, "which"), couple = s(p, "couple"), memories = s(p, "memories");
    const where = s(p, "location") || "your chosen location";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (styles.length ? lcList(styles) : "warm");
    const who = guestPhrase(p);

    return {
      cards: [
        { icon: "💕", title: "Anniversary concept", text:
          `A ${mood} anniversary celebration${which ? ` for ${which.includes("th") || which.includes("st") || which.includes("nd") || which.includes("rd") ? "a " + lc(which) : "the " + lc(which)}` : ""} in ${where} for ${who}.` +
          (couple ? ` Honouring ${couple.split("—")[0].trim()}.` : "") +
          (memories ? ` The celebration should reference what matters: ${memories}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") },

        { icon: "🌹", title: "Atmosphere & theme", text:
          (styles.length ? `Anchor the evening in a ${lcList(styles)} feel.` : "Choose a mood and commit to it.") +
          (memories ? ` Let the theme draw on your shared history (${memories}) rather than looking generic — that's what makes an anniversary land.` : "") +
          (decor.length ? ` Build it with ${lcList(decor)}.` : " Candles and warm lighting do most of the work.") +
          " An anniversary works best when it feels personal. One or two meaningful details beat a room full of decoration." },

        { icon: "🏛️", title: "Venue", text:
          (isOutdoors(p) ? "An outdoor or garden setting suits a romantic evening — confirm lighting, a wind plan, and a rain backup." : "A private dining room or an intimate indoor space keeps the evening feeling personal.") +
          (p.guests ? ` Look for a space that holds ${p.guests} without feeling oversized — a half-empty room kills the mood.` : " Choose a space sized to your guest list.") +
          (p.sig.moments.indexOf("surprise") > -1 || surprise.indexOf("Surprise guest") > -1 ? " If a surprise guest is arriving, brief the venue so the entrance isn't spoiled." : "") +
          " Confirm the noise curfew and whether you can bring your own wine or cake." },

        { icon: "🍽️", title: "Food", text:
          (food.length ? `Serve ${lcList(food)}.` : "Choose a service style that lets people linger over the table.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — make that the centrepiece, especially if it carries a memory.` : (memories ? " If the food can nod to a shared memory, do it — it's the easiest way to make the evening personal." : "")) +
          " Include a toast-friendly drink and a dessert worth pausing for." },

        { icon: "🎶", title: "Entertainment", text:
          (ent.length ? `Book ${lcList(ent)}.` : "A strong playlist plus a well-timed speech is usually enough.") +
          (surprise.indexOf("Slideshow") > -1 || p.sig.activities.indexOf("slideshow") > -1 ? " Prepare the slideshow early and test it on the venue's equipment — this is the thing that most often fails on the night." : "") +
          (ent.indexOf("Dance floor") > -1 ? " Give the dance floor a proper opening moment rather than hoping people start." : "") +
          " Cue the music for any speeches so people can hear." },

        { icon: "✨", title: "Décor", text:
          (decor.length ? `Set the scene with ${lcList(decor)}.` : "Warm, layered lighting and simple florals suit most anniversaries.") +
          (decor.indexOf("Photo display / memory table") > -1 || memories ? " A memory table or photo display gives guests something to gather around during the quieter moments." : "") +
          (isOutdoors(p) ? " Outdoors, use enclosed candles and weight everything against wind." : "") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "💫", title: "Special moments", text:
          (surprise.length && surprise.indexOf("None — keep it straightforward") === -1
            ? `Plan these in: ${lcList(surprise)}. Each needs a named person to make it happen and a natural pause in the evening.`
            : "Even a straightforward evening benefits from two or three deliberate moments.") +
          " Build the evening around a toast, a short speech from someone who knows them, and one shared look back — a slideshow, a photo wall, or a letter read aloud." +
          (p.sig.moments.length ? ` You mentioned ${listPhrase(p.sig.moments)} — those are your anchors.` : "") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 30 },
        { name: "Food & drink", pct: 30 },
        { name: "Décor & flowers", pct: 14 },
        { name: "Entertainment", pct: 11 },
        { name: "Photo & video", pct: 7 },
        { name: "Misc & contingency", pct: 8 }
      ], budgetNote(p, "Total")),
      timeline: baseTimeline(p, {
        w12: "Pick the date and book the venue. Decide the guest list size.",
        w8: "Book catering and entertainment. Start gathering photos for any display or slideshow.",
        w6: "Send invitations. Order décor and flowers.",
        w4: "Confirm RSVPs and finalize the menu.",
        w2: "Build the slideshow, write the speech, and confirm any surprise arrangements.",
        w1: "Final headcount, prep décor, and test the slideshow on the venue equipment.",
        w0: "Arrive early, do a walk-through, and be present for the toast."
      }),
      checklist: [
        "Set the budget and agree who is contributing",
        "Confirm the date and whether it clashes with the actual anniversary",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or confirm the home setup",
        food.length ? `Book catering (${listPhrase(food.map(titleTerm))})` : "Arrange food and drinks",
        ent.length ? `Book entertainment (${listPhrase(ent.map(titleTerm))})` : "Sort music and entertainment",
        decor.length ? `Order décor (${listPhrase(decor.map(titleTerm))})` : "Arrange decorations",
        "Create and send invitations",
        memories ? `Gather material for: ${memories}` : "Gather photos for a display or slideshow",
        surprise.length && surprise.indexOf("None — keep it straightforward") === -1
          ? `Organise surprise elements (${lcList(surprise)})` : "Plan two or three deliberate moments",
        "Write and rehearse the speech or toast",
        "Confirm the cake or dessert and a toast-friendly drink",
        "Sort the gift or keepsake for the couple",
        "Confirm final headcount with the caterer",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Test any slideshow or A/V on the venue's actual equipment beforehand",
        "Cue the music down for speeches, or nobody will hear them",
        "Ask the couple's permission first if it's a surprise — some people hate them",
        "Keep a photo moment planned; family groups are hard to reassemble later"
      ])
    };
  }
});

/* ============================================================
   5. Baby Shower
   ============================================================ */

defEvent("baby", {
  label: "Baby Shower",
  emoji: "🍼",
  tagline: "Welcome the newest member of the family.",
  planTitle: () => "Your Baby Shower Plan",
  questions: [
    Q.date("dueDate", "What is the expected date?", "The baby's due date helps us time everything.", "Pick the due date."),
    Q.date("date", "What is the shower date?", "Usually four to six weeks before the due date."),
    COMMON.guests(),
    COMMON.budget(),
    COMMON.location(),
    Q.chips("theme", "What theme would you like?", "Choose the feel you're going for.", ["Classic & sweet", "Woodland / animals", "Modern & minimal", "Boho / neutral", "Storybook / nursery rhyme", "Tropical", "Seasonal", "Surprise — no theme"]),
    Q.chips("colors", "What colour palette or style?", "Pick the look.", ["Pastels", "Neutrals & earth tones", "Blue tones", "Pink tones", "Sage green", "Yellow & gold", "Bright & bold", "Not decided yet"]),
    Q.chips("food", "What food would you like?", "How would you like to host?", ["Brunch", "Afternoon tea", "Buffet", "Cocktail bites", "Grazing table", "Dessert only", "Full lunch or dinner"]),
    Q.chips("cake", "What cake and dessert plans do you have?", "Dessert is part of the plan.", ["Custom themed cake", "Cupcakes", "Dessert table", "Cookies / favours", "Cultural sweets", "Simple sheet cake"]),
    Q.chips("games", "What games and activities would you like?", "Choose as many as you like.", ["Guess the baby photo", "Baby bingo", "Name the baby", "Advice for the parents", "Diaper raffle", "Craft station", "Keepsake signing", "No games"]),
    Q.chips("decor", "What decorations would you like?", "Set the scene.", ["Balloon arch", "Balloon garland", "Banner / name sign", "Fresh flowers", "Table centrepieces", "Themed props", "Fairy lights", "Minimalist"]),
    Q.chips("gifts", "What are the gift preferences?", "Helps guests get it right.", ["Gift registry", "Books for the baby", "Nappies / essentials", "Group gift", "No gifts — just company", "Cash / contribution fund"]),
    Q.text("traditions", "Are there special cultural traditions to include?", "Anything we should honour or build in.", "e.g. A naming ceremony, or a specific blessing"),
    COMMON.setting(),
    COMMON.specialReq(),
    COMMON.avoid(),
    Q.vision("I'm planning a relaxed weekend brunch shower for my sister — about 25 people, sage green and cream, lots of flowers, and a nappy raffle. She loves books, so we'd like guests to bring one for the baby…")
  ],
  build: function (p) {
    const theme = list(p, "theme"), colors = list(p, "colors"), food = list(p, "food");
    const cake = list(p, "cake"), games = list(p, "games"), decor = list(p, "decor"), gifts = list(p, "gifts");
    const traditions = s(p, "traditions");
    const where = s(p, "location") || "your chosen location";
    const due = s(p, "dueDate");
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (theme.length ? lcList(theme) : "warm and celebratory");
    const who = guestPhrase(p);
    const noGames = games.indexOf("No games") > -1;

    return {
      cards: [
        { icon: "🍼", title: "Baby shower concept", text:
          `A ${mood} baby shower in ${where} for ${who}${due ? `, timed around a due date of ${p.fmtDate(due)}` : ""}.` +
          (theme.length ? ` The theme leans ${lcList(theme)}.` : "") +
          (traditions ? ` Including ${traditions}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") +
          " Shower timing matters: four to six weeks before the due date is the sweet spot — late enough to feel imminent, early enough that the parent-to-be can still enjoy it." },

        { icon: "🎨", title: "Theme", text:
          (theme.length ? `Build around ${lcList(theme)}.` : "Choose one theme and keep it light — this should feel easy, not over-produced.") +
          (colors.length && colors.indexOf("Not decided yet") === -1 ? ` Hold a ${lcList(colors)} palette.` : " Pick two or three colours and repeat them in the cake, the signage, and the table.") +
          (decor.length ? ` Carry it through ${lcList(decor)}.` : "") +
          " Show it in three places: the entrance or welcome sign, the food table, and the cake or dessert display." },

        { icon: "🏛️", title: "Venue setup", text:
          (isOutdoors(p) ? "Outdoors works beautifully for a shower — confirm shade, a rain backup, and somewhere for gifts that won't blow away." : "A home, a private dining room, or a café back room all suit a shower well.") +
          (p.guests ? ` Set up for ${p.guests} guests with plenty of seating — showers involve a lot of sitting and watching.` : " Prioritise seating over standing room.") +
          " Plan a clear focal point for gift opening and a table for presents, a guest book, and any keepsake activity." +
          (noGames ? "" : " Leave space for the games so they don't crowd the food table.") },

        { icon: "🍽️", title: "Food & desserts", text:
          (food.length ? `Serve ${lcList(food)}.` : "Choose a service style that means the host isn't stuck in the kitchen.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — build the menu around it.` : "") +
          (cake.length ? ` For dessert: ${lcList(cake)}.` : " Plan a cake or dessert table as the centrepiece.") +
          " Keep drinks simple and include a non-alcoholic signature drink — the guest of honour will be drinking that one." },

        { icon: "✨", title: "Decorations", text:
          (decor.length ? `Set the scene with ${lcList(decor)}.` : "Balloons, a welcome sign, and fresh flowers cover most of it.") +
          (colors.length && colors.indexOf("Not decided yet") === -1 ? ` Keep everything in the ${lcList(colors)} palette, including the balloons and the cake.` : "") +
          (traditions ? ` Leave room for anything your traditions need (${traditions}).` : "") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "🎯", title: "Games & activities", text:
          (noGames
            ? "You've opted out of games — that's completely fine. A guest book, an advice card station, and good food are enough to keep a shower warm."
            : (games.length ? `Run ${lcList(games)}.` : "Plan two or three short games — more than that and it starts to feel like a schedule.") ) +
          (noGames ? "" : " Give each game a named host and keep them under ten minutes. Leave a long gap for eating and talking in between.") +
          " An advice-for-the-parents card station is the lowest-effort activity that guests consistently love, and it doubles as a keepsake." +
          (traditions ? ` Build in your traditions (${traditions}) as part of the flow rather than an afterthought.` : "") },

        { icon: "🎁", title: "Gift ideas", text:
          (gifts.length ? `Guests should be pointed toward: ${lcList(gifts)}.` : "State the gift preference clearly on the invitation so nobody has to guess.") +
          (gifts.indexOf("Books for the baby") > -1 ? " Ask each guest to write a short note inside the book they bring — it becomes a real keepsake." : "") +
          (gifts.indexOf("Nappies / essentials") > -1 ? " A nappy raffle works well: every pack brought earns an entry." : "") +
          (gifts.indexOf("Group gift") > -1 ? " For a group gift, collect contributions quietly in advance and present it once." : "") +
          " Have someone assigned to record who gave what, so thank-you notes are easy afterwards." },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 26 },
        { name: "Food & catering", pct: 28 },
        { name: "Cake & desserts", pct: 10 },
        { name: "Décor & balloons", pct: 16 },
        { name: "Games & favours", pct: 10 },
        { name: "Misc & contingency", pct: 10 }
      ], budgetNote(p, "Shower total")),
      timeline: baseTimeline(p, {
        w12: "Pick the date — ideally four to six weeks before the due date — and confirm the venue.",
        w8: "Book catering. Settle on the theme and colour palette.",
        w6: "Send invitations with the gift preference stated clearly.",
        w4: "Confirm RSVPs, order the cake, and buy decorations.",
        w2: "Prep the games, print any cards or signage, and confirm the drinks.",
        w1: "Final headcount, collect decorations, and brief whoever is hosting.",
        w0: "Set up early, keep the food replenished, and make sure the guest of honour sits down."
      }),
      checklist: [
        "Agree the date with the parent-to-be before anything else",
        due ? `Work back from the due date (${p.fmtDate(due)})` : "Confirm the due date and time the shower around it",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or confirm the home setup",
        food.length ? `Arrange food (${listPhrase(food.map(titleTerm))})` : "Arrange food and drinks",
        cake.length ? `Order the cake or desserts (${lcList(cake)})` : "Order the cake or dessert table",
        decor.length ? `Order décor (${listPhrase(decor.map(titleTerm))})` : "Order decorations",
        colors.length && colors.indexOf("Not decided yet") === -1 ? `Confirm the ${lcList(colors)} palette across cake, balloons, and signage` : "Settle the colour palette",
        "Create and send invitations, including the gift preference",
        noGames ? "Plan a guest book or advice card station" : (games.length ? `Prepare the games (${lcList(games)})` : "Plan two or three games"),
        "Arrange a gift table and someone to record who gave what",
        traditions ? `Confirm arrangements for: ${traditions}` : "Confirm any cultural or family traditions",
        "Plan a non-alcoholic signature drink for the guest of honour",
        "Confirm final headcount with the caterer",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Ask the parent-to-be who they want invited before sending anything — never assume",
        "Keep the guest of honour seated and comfortable; give them a chair with a back",
        "Hand someone else the hosting duties so the family can actually enjoy it",
        "Avoid anything messy, competitive, or that puts the guest of honour on the spot",
        "Check whether the parent-to-be wants a surprise arrival or to be there from the start"
      ])
    };
  }
});

/* ============================================================
   6. Graduation
   ============================================================ */

defEvent("graduation", {
  label: "Graduation",
  emoji: "🎓",
  tagline: "Honor academic achievements in style.",
  planTitle: () => "Your Graduation Plan",
  questions: [
    Q.text("graduate", "Who is the graduate?", "Their name, and what they studied.", "e.g. Arjun — BSc Computer Science"),
    Q.text("school", "Which school or college?", "Where they're graduating from.", "e.g. University of Texas"),
    Q.date("date", "What is the graduation date?", "The ceremony date, or when you'd like to celebrate."),
    COMMON.guests(),
    COMMON.budget(),
    COMMON.location(),
    COMMON.setting(),
    Q.chips("theme", "What theme or style would you like?", "Choose the feel you're going for.", ["Elegant & formal", "Fun & celebratory", "Rustic & cozy", "Modern & minimal", "School colours", "Future-focused / career", "Casual cookout", "Themed to their field"]),
    Q.chips("food", "What food would you like?", "How would you like to feed everyone?", ["Buffet", "BBQ / cookout", "Plated dinner", "Cocktail bites", "Food trucks", "Grazing table", "Potluck", "Catering from a favourite restaurant"]),
    Q.chips("cake", "What cake and dessert plans do you have?", "Dessert is part of the plan.", ["Custom graduation cake", "Sheet cake", "Cupcakes", "Dessert table", "Cultural sweets", "Ice cream bar", "No cake — other dessert"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should keep the energy going?", ["DJ", "Playlist only", "Live band", "Photo booth", "Slideshow", "Games & activities", "Speeches & toasts", "Dance floor"]),
    Q.chips("decor", "What decorations would you like?", "Set the scene.", ["Balloon arch", "Graduate photo display", "School colours banner", "Fairy lights", "Fresh flowers", "Table centrepieces", "Gift & card table", "Minimalist"]),
    Q.chips("activities", "What activities would you like?", "What should guests actually do?", ["Photo wall", "Slideshow of their journey", "Guest advice cards", "Trivia about the graduate", "Lawn games", "Open mic toasts", "Just mingling"]),
    Q.text("achievements", "What achievements should we celebrate?", "We'll weave these into the plan.", "e.g. First in the family to graduate, dean's list, a job offer lined up"),
    COMMON.avoid(),
    Q.vision("We're throwing a backyard cookout for my daughter's graduation — about 60 people, school colours everywhere, a photo wall of her four years, and lots of BBQ. She wants it casual and fun, nothing formal…")
  ],
  build: function (p) {
    const theme = list(p, "theme"), food = list(p, "food"), cake = list(p, "cake");
    const ent = list(p, "entertainment"), decor = list(p, "decor"), acts = list(p, "activities");
    const graduate = s(p, "graduate"), school = s(p, "school"), ach = s(p, "achievements");
    const where = s(p, "location") || "your chosen location";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (theme.length ? lcList(theme) : "celebratory");
    const who = guestPhrase(p);
    const name = graduate ? graduate.split("—")[0].trim() : "the graduate";

    return {
      cards: [
        { icon: "🎓", title: "Graduation concept", text:
          `A ${mood} graduation celebration for ${name}${school ? ` of ${school}` : ""} in ${where} for ${who}.` +
          (ach ? ` The focus is on what they achieved: ${ach}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") +
          " Graduation parties work best when they're easy to drift through — people arrive and leave around the ceremony, so keep the food and drinks self-serve." },

        { icon: "🎨", title: "Theme", text:
          (theme.length ? `Build around ${lcList(theme)}.` : "Pick one direction and keep it consistent.") +
          (theme.indexOf("School colours") > -1 || decor.indexOf("School colours banner") > -1 ? " Use the school colours in the balloons, the cake, and the signage — it's the simplest way to make the party feel specific to them." : "") +
          (theme.indexOf("Future-focused / career") > -1 ? " Lean into what's next — a board of their plans, or a 'next chapter' theme works well." : "") +
          (decor.length ? ` Express it through ${lcList(decor)}.` : "") +
          (ach ? ` The theme should leave room for celebrating what they achieved (${ach}).` : "") },

        { icon: "🏛️", title: "Venue", text:
          (isOutdoors(p) ? "Outdoors suits a graduation party — a backyard or park handles a big, loose guest list well. Confirm shade, parking, and a rain plan." : "A home, a hired hall, or a restaurant back room all work; the priority is space for people to move around.") +
          (p.guests ? ` Set up for ${p.guests} guests with plenty of standing and perching room, plus seating for older relatives.` : " Prioritise seating for older guests and room for people to move.") +
          " Locate it near the ceremony if you can — guests often come straight from it." +
          " Plan a table for cards and gifts, near the entrance so you can keep an eye on it." },

        { icon: "🍽️", title: "Food", text:
          (food.length ? `Serve ${lcList(food)}.` : "Self-serve beats plated for a party where people come and go.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings — graduation crowds skew hungrier than you expect.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — build the menu around it.` : "") +
          (cake.length ? ` For dessert: ${lcList(cake)}.` : " Order a cake that names them and the year.") +
          " Include vegetarian and kid-friendly options, and keep everything easy to eat standing up." },

        { icon: "🎤", title: "Entertainment", text:
          (ent.length ? `Book ${lcList(ent)}.` : "A good playlist plus one photo moment covers most graduation parties.") +
          (ent.indexOf("Slideshow") > -1 || acts.indexOf("Slideshow of their journey") > -1 ? " Build the slideshow early and test it on the actual equipment — and keep it under five minutes." : "") +
          (acts.indexOf("Open mic toasts") > -1 ? " Open-mic toasts work beautifully if you cap them at two or three minutes each and have someone cueing them." : "") +
          " Plan one moment where everyone gathers — a toast or a group photo — so the party has a centre." },

        { icon: "✨", title: "Decorations", text:
          (decor.length ? `Set the scene with ${lcList(decor)}.` : "A photo display, balloons, and a banner cover most of it.") +
          (decor.indexOf("Graduate photo display") > -1 || acts.indexOf("Photo wall") > -1 ? " A photo wall showing the journey from first day to graduation is the detail guests actually stop and look at." : "") +
          (isOutdoors(p) ? " Outdoors, weight the balloons and props down and avoid open flames." : "") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "🎯", title: "Activities", text:
          (acts.length ? `Run ${lcList(acts)}.` : "Keep activities light — people mainly want to congratulate them and eat.") +
          (acts.indexOf("Guest advice cards") > -1 ? " Advice cards for their next chapter make an easy keepsake and give shy guests something to do." : "") +
          (acts.indexOf("Trivia about the graduate") > -1 ? " A short trivia round about their time at school is a strong icebreaker — keep it kind." : "") +
          (ach ? ` Build one moment that explicitly acknowledges ${ach}.` : " Build one moment where their achievement is named out loud.") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 26 },
        { name: "Food & catering", pct: 31 },
        { name: "Cake & desserts", pct: 8 },
        { name: "Décor & signage", pct: 14 },
        { name: "Entertainment & photos", pct: 11 },
        { name: "Misc & contingency", pct: 10 }
      ], budgetNote(p, "Party total")),
      timeline: baseTimeline(p, {
        w12: "Confirm the ceremony date and time first — everything else works around it.",
        w8: "Book catering and confirm the venue. Decide the theme and order any personalised items.",
        w6: "Send invitations with the ceremony details, or a drop-in window if it's open house.",
        w4: "Confirm RSVPs, order the cake, and gather photos for the display.",
        w2: "Confirm vendors, prep the slideshow, and plan the toast.",
        w1: "Final headcount, prep décor, and confirm parking arrangements.",
        w0: "Set up early, keep food replenished, and make sure someone photographs the graduate with each family group."
      }),
      checklist: [
        "Confirm the ceremony date, time, and ticket allocation",
        "Set the budget and agree who is contributing",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or confirm the home setup",
        food.length ? `Book catering (${listPhrase(food.map(titleTerm))})` : "Arrange food and drinks",
        cake.length ? `Order the cake (${lcList(cake)})` : "Order the cake",
        decor.length ? `Order décor (${listPhrase(decor.map(titleTerm))})` : "Order decorations",
        "Create and send invitations",
        "Gather photos for a display or slideshow",
        ent.length ? `Sort entertainment (${listPhrase(ent.map(titleTerm))})` : "Build the playlist",
        acts.length ? `Plan activities (${lcList(acts)})` : "Plan one gathering moment",
        ach ? `Prepare something that acknowledges: ${ach}` : "Write the toast",
        "Set up a card and gift table near the entrance",
        "Confirm final headcount with the caterer",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Guests often come straight from the ceremony — keep food ready early",
        "Check the ceremony's ticket limits before inviting people to both",
        "Keep the card and gift table visible and attended",
        "Photograph the graduate with each family group while everyone is still there",
        "If it's an open-house format, say so clearly on the invitation"
      ])
    };
  }
});

/* ============================================================
   7. Corporate Event
   ============================================================ */

defEvent("corporate", {
  label: "Corporate Event",
  emoji: "💼",
  tagline: "Product launches, team building, galas & more.",
  planTitle: (p) => `Your ${s(p, "company") || "Corporate"} Event Plan`,
  questions: [
    Q.text("company", "What company or organisation is this for?", "Who's hosting.", "e.g. Northwind Analytics"),
    Q.text("purpose", "What is the purpose of the event?", "The outcome you're aiming for.", "e.g. Launch our new product to press and partners"),
    Q.date("date", "What is the event date?", "Pick the date you're aiming for."),
    Q.number("guests", "How many attendees do you expect?", "A rough number is fine.", "e.g. 150"),
    COMMON.budget(),
    Q.text("location", "What city or venue are you considering?", "Where it'll be held.", "e.g. Downtown Chicago"),
    Q.chips("eventType", "What type of corporate event is this?", "Pick the closest fit.", ["Conference", "Product launch", "Team building", "Networking reception", "Awards / gala dinner", "Training or workshop", "Client appreciation", "Board meeting", "Holiday party", "Town hall"]),
    Q.chips("formality", "What's the formality level?", "Sets the tone for everything else.", ["Formal", "Business casual", "Business formal", "Smart casual", "Casual", "Black tie"]),
    Q.chips("venueReq", "What venue requirements matter most?", "Choose as many as you like.", ["Central location", "Near public transport", "On-site parking", "AV built in", "Catering in-house", "Breakout rooms", "Accessible throughout", "Hotel rooms nearby", "Outdoor space", "Wi-Fi and power throughout"]),
    Q.chips("catering", "What catering do you need?", "How you'll feed attendees.", ["Plated dinner", "Buffet", "Standing reception / canapés", "Breakfast / coffee service", "Working lunch", "Full-day catering", "Drinks reception only", "No catering"]),
    Q.chips("av", "What audio/visual do you need?", "Choose as many as you like.", ["Projector / screen", "Large display", "Microphones", "Podium and mic", "Live streaming", "Recording", "Presentation clicker", "Music system", "Translation / captioning", "Technical support on site"]),
    Q.chips("speakers", "Who will be speaking?", "Choose all that apply.", ["CEO or leadership", "External keynote", "Department heads", "Panel discussion", "Client or partner", "MC / host", "No formal speakers"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should keep the energy going?", ["Live band", "DJ", "Networking games", "Photo booth", "Comedian / performer", "Awards ceremony", "Guided activity", "Playlist only"]),
    Q.chips("branding", "What branding do you need?", "Choose as many as you like.", ["Stage backdrop", "Roll-up banners", "Step-and-repeat / photo wall", "Branded lanyards", "Signage and wayfinding", "Printed programmes", "Branded gifts", "Digital screens", "Name badges"]),
    Q.chips("networking", "What networking requirements do you have?", "Choose as many as you like.", ["Structured introductions", "Assigned seating", "Open networking time", "Name badges by role", "Icebreaker activity", "Reserved tables by team", "Meeting space available"]),
    Q.chips("accessibility", "What accessibility requirements apply?", "Choose as many as you like.", ["Step-free access", "Accessible restrooms", "Hearing loop", "Sign language interpreter", "Captioning", "Quiet room", "Dietary and allergy labelling", "Large-print materials", "None identified"]),
    COMMON.specialReq(),
    Q.vision("We're hosting a 150-person product launch in a downtown venue — mostly standing reception with canapés, a short CEO keynote, our branding on the stage backdrop, and structured networking after. Image matters here…")
  ],
  build: function (p) {
    const eventType = list(p, "eventType"), formality = list(p, "formality"), venueReq = list(p, "venueReq");
    const catering = list(p, "catering"), av = list(p, "av"), speakers = list(p, "speakers");
    const ent = list(p, "entertainment"), branding = list(p, "branding");
    const networking = list(p, "networking"), access = list(p, "accessibility");
    const company = s(p, "company") || "Your organisation";
    const purpose = s(p, "purpose");
    const where = s(p, "location") || "your chosen location";
    const who = p.guests ? `${p.guests} attendees` : "your attendees";
    const noFood = catering.indexOf("No catering") > -1;
    const accessReal = access.filter(a => a !== "None identified");

    return {
      cards: [
        { icon: "🎯", title: "Event concept", text:
          `${eventType.length ? titleTerm(eventType[0]) : "A corporate gathering"} for ${company} in ${where}, hosting ${who}${formality.length ? ` with a ${lcList(formality)} tone` : ""}.` +
          (purpose ? ` The objective is clear: ${purpose}.` : "") +
          " Every decision below is judged against that objective — for corporate events, the outcome matters more than the decoration." },

        { icon: "📋", title: "Recommended format", text:
          (eventType.length ? `Run this as a ${lcList(eventType)}.` : "Choose a format and hold to it.") +
          (eventType.indexOf("Product launch") > -1 ? " A launch works best as a tight keynote (20–30 minutes) followed immediately by a reception where people can talk — the talking is where the value is." : "") +
          (eventType.indexOf("Conference") > -1 ? " A conference needs a visible spine: clear signage, a printed or digital programme, and generous breaks. Sessions that run back-to-back with no gap lose the room." : "") +
          (eventType.indexOf("Team building") > -1 ? " Team building succeeds or fails on the activity. Choose something with a low skill floor so nobody is left out or embarrassed." : "") +
          (eventType.indexOf("Awards / gala dinner") > -1 ? " A gala needs a strict run-of-show — awards ceremonies overrun more than any other format. Rehearse the transitions." : "") +
          (formality.length ? ` Set the dress code as ${lcList(formality)} and state it clearly on the invitation.` : "") },

        { icon: "🏛️", title: "Venue requirements", text:
          (venueReq.length ? `Your priorities: ${lcList(venueReq)}.` : "Confirm capacity, transport links, and AV before committing.") +
          (p.guests ? ` Verify the space holds ${p.guests} in the format you've chosen — reception, theatre, and cabaret capacities differ enormously for the same room.` : " Always ask for capacity in your specific format, not just the headline number.") +
          (av.length > 3 ? " With this much AV, insist on a technical site visit and a named on-site technician." : "") +
          " Confirm load-in times, insurance requirements, and whether you can bring your own suppliers." },

        { icon: "🗓️", title: "Agenda", text:
          "A workable shape for the day:", ordered: true,
          items: [
            { when: "60 min before", detail: "Vendors and AV arrive. Test every microphone, screen, and slide deck on the actual equipment." },
            { when: "30 min before", detail: "Doors open. Registration and badges. Coffee available." },
            { when: "Start", detail: `${speakers.length ? listPhrase(speakers.map(x => fixAcronyms(lc(x)))) : "Your host"} opens with a short welcome and the housekeeping nobody reads.` },
            { when: "+15 min", detail: speakers.indexOf("CEO or leadership") > -1 ? "Leadership keynote. Keep it to 20–30 minutes." : "Main segment or presentation." },
            { when: "Midpoint", detail: "Break. Nothing scheduled for at least 15 minutes — this is where the real conversations happen." },
            { when: "+60 min", detail: catering.length && !noFood ? `${titleTerm(catering[0])} service.` : "Continue programme." },
            { when: "Final 30 min", detail: networking.length ? "Structured networking or open mingling." : "Close out with a clear thank-you and next steps." },
            { when: "After", detail: "Feedback collection, and a follow-up email within 48 hours while it's fresh." }
          ] },

        { icon: "🍽️", title: "Catering", text:
          (noFood ? "No catering required — but if the event runs over a mealtime, provide at least water and coffee." :
            (catering.length ? `Provide ${lcList(catering)}.` : "Match the catering to the format — standing events need food that's eaten in one hand.")) +
          (p.guests ? ` Plan for roughly ${p.guests} covers, and confirm the venue's minimum spend before you finalise numbers.` : "") +
          " Collect dietary requirements at registration, not on the day, and make sure labelled options are actually visible." +
          (p.sig.cuisines.length ? ` Your description mentions ${listPhrase(p.sig.cuisines.map(midTerm))} — brief the caterer directly on that.` : "") },

        { icon: "🔊", title: "Audio/visual", text:
          (av.length ? `You need: ${lcList(av)}.` : "Confirm what the venue provides before renting anything.") +
          " Insist on a full rehearsal with your actual slides on the venue's actual system — more corporate events fail on this than on anything else." +
          (av.indexOf("Live streaming") > -1 ? " For streaming, test the upload bandwidth during the event's peak hours, not at setup." : "") +
          " Always have a backup: spare microphone batteries, a dongle, and slides on a USB as well as a laptop." },

        { icon: "🎨", title: "Branding", text:
          (branding.length ? `Produce: ${lcList(branding)}.` : "At minimum, put your logo where photos will be taken.") +
          (branding.indexOf("Stage backdrop") > -1 ? " The stage backdrop is the single most photographed element — get the logo sizing and safe margins right and check it with the AV team." : "") +
          (branding.indexOf("Step-and-repeat / photo wall") > -1 ? " A step-and-repeat earns its cost: it brands every photo that guests share afterwards." : "") +
          " Send all artwork to print at least three weeks out, and request proofs before the full run." },

        { icon: "🎤", title: "Entertainment", text:
          (ent.length ? `Book ${lcList(ent)}.` : "Choose entertainment that supports conversation rather than competing with it.") +
          (ent.indexOf("Live band") > -1 || ent.indexOf("DJ") > -1 ? " Keep music at conversation volume during any networking period and bring it up only for the social close." : "") +
          (ent.indexOf("Awards ceremony") > -1 ? " Cap acceptance speeches at 90 seconds and have a visible countdown — it's the only thing that keeps an awards segment on schedule." : "") +
          " Brief any performer on your brand tone and what should not be said on stage." },

        { icon: "🤝", title: "Networking ideas", text:
          (networking.length ? `Build in: ${lcList(networking)}.` : "Give people a reason to talk to someone new.") +
          (networking.indexOf("Name badges by role") > -1 ? " Badges that show role and company (large enough to read at a glance) remove the awkwardness of asking." : "") +
          (networking.indexOf("Structured introductions") > -1 ? " Structured introductions work best in short, timed rounds with a clear signal to rotate." : "") +
          " Leave genuinely unstructured time too — over-programming is the most common networking mistake." +
          (networking.indexOf("Meeting space available") > -1 ? " Book a quiet side room where small groups can step away; it's where actual deals get discussed." : "") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & space", pct: 27 },
        { name: "Catering & bar", pct: 26 },
        { name: "AV & production", pct: 15 },
        { name: "Branding & print", pct: 10 },
        { name: "Speakers & entertainment", pct: 9 },
        { name: "Staffing & logistics", pct: 6 },
        { name: "Misc & contingency", pct: 7 }
      ], budgetNote(p, "Event total") + " For corporate events the contingency matters more, not less — last-minute AV and headcount changes are routine."),
      timeline: [
        weeks(12, "Confirm the objective, date, budget owner, and venue. Book the space and any keynote speakers."),
        weeks(8, "Lock the AV supplier and catering. Brief the branding and print work."),
        weeks(6, "Send invitations or registration links. Open registration with dietary questions included."),
        weeks(4, "Confirm speaker slots and build the run-of-show with exact timings."),
        weeks(2, "Finalise the agenda, print badges and signage, and confirm every vendor's arrival time."),
        weeks(1, "Technical rehearsal on site. Test all AV, slides, and microphones. Confirm final headcount."),
        weeks(0, "Walk the room before doors open. Brief staff on the flow. Keep a printed run-of-show on you.")
      ],
      checklist: [
        "Define the objective and how you'll measure success",
        "Confirm the budget owner and approval process",
        p.guests ? `Set the target attendance (${p.guests})` : "Set the target attendance",
        "Book the venue and confirm the format capacity",
        catering.length && !noFood ? `Book catering (${listPhrase(catering.map(titleTerm))})` : "Confirm catering requirements",
        av.length ? `Arrange AV (${listPhrase(av.map(titleTerm))})` : "Confirm AV provision",
        speakers.length ? `Confirm speakers (${listPhrase(speakers.map(titleTerm))})` : "Confirm the programme",
        branding.length ? `Order branding (${listPhrase(branding.map(titleTerm))})` : "Prepare branded materials",
        "Build the run-of-show with exact timings and owners",
        "Open registration and collect dietary and access requirements",
        accessReal.length ? `Confirm accessibility arrangements (${lcList(accessReal)})` : "Confirm accessibility provisions",
        networking.length ? `Plan networking (${lcList(networking)})` : "Plan networking time",
        "Book the technical rehearsal on site",
        "Print badges, signage, and programmes",
        "Brief staff and volunteers on the flow and their roles",
        "Prepare the follow-up email and feedback survey"
      ],
      considerations: baseConsiderations(p).concat([
        "Get budget sign-off in writing before committing to vendors",
        "Do a technical rehearsal on the venue's actual equipment — not a laptop in an office",
        "Assign one person to own the run-of-show; a committee cannot run a schedule",
        "Have a plan for no-shows; corporate attendance rates are often 70–80%",
        "Check whether the venue requires insurance or approved supplier lists",
        "Send a follow-up within 48 hours while the event is still memorable"
      ]),
      footerNote: "Demo plan — sample content only."
    };
  }
});

/* ============================================================
   8. High Tea
   ============================================================ */

defEvent("high-tea", {
  label: "High Tea",
  emoji: "🫖",
  tagline: "Elegant afternoon gatherings with charm.",
  planTitle: () => "Your High Tea Plan",
  questions: [
    Q.text("occasion", "What's the occasion for the tea?", "Or just because — that's fine too.", "e.g. A birthday, a thank-you, or simply getting everyone together"),
    Q.date("date", "What date are you thinking?", "Pick the date you're aiming for."),
    Q.chips("timeOfDay", "What time of day suits best?", "Tea has a rhythm.", ["Morning tea (10–11am)", "Lunchtime tea (12–2pm)", "Afternoon tea (3–5pm)", "High tea (5–7pm)"]),
    COMMON.guests(),
    COMMON.budget(),
    COMMON.location(),
    COMMON.setting(),
    Q.chips("theme", "What style would you like?", "Choose the feel you're going for.", ["Classic English", "Modern & minimal", "Vintage / nostalgic", "Garden party", "Indian high tea", "Asian-inspired", "Festive / seasonal", "Whimsical"]),
    Q.chips("tiers", "What should the tea stand include?", "Choose as many as you like.", ["Finger sandwiches", "Scones with cream and jam", "Pastries & cakes", "Savouries / quiches", "Chocolate items", "Fresh fruit", "Gluten-free options", "Vegetarian options"]),
    Q.chips("drinks", "What drinks would you like?", "Tea is the anchor, but not the only option.", ["English breakfast tea", "Earl Grey", "Green tea", "Herbal / fruit teas", "Chai", "Coffee", "Champagne / prosecco", "Iced tea", "Non-alcoholic cocktails"]),
    Q.chips("china", "What about tableware and setup?", "This is where a tea really shows.", ["Fine china teacups", "Mismatched vintage china", "Modern minimal tableware", "Tiered cake stands", "Linen napkins", "Fresh flowers on each table", "Place cards", "Candles"]),
    Q.chips("decor", "What decorations would you like?", "Set the scene.", ["Fresh flowers", "Fairy lights", "Candles", "Bunting", "Lace & linens", "Table centrepieces", "Themed props", "Minimalist"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should accompany the tea?", ["String quartet", "Acoustic soloist", "Pianist", "Playlist only", "Live harp", "Games & activities", "Guest speaker / reading"]),
    Q.text("traditions", "Any special traditions or dietary needs to honour?", "We'll build them in.", "e.g. Halal only, or a family recipe we always serve"),
    COMMON.avoid(),
    Q.vision("I'd like a classic afternoon tea for my grandmother's 85th — about 20 people in the garden, mismatched vintage china, tiered stands, and someone playing piano. Traditional but not stiff…")
  ],
  build: function (p) {
    const timeOfDay = list(p, "timeOfDay"), theme = list(p, "theme"), tiers = list(p, "tiers");
    const drinks = list(p, "drinks"), china = list(p, "china"), decor = list(p, "decor");
    const ent = list(p, "entertainment"), traditions = s(p, "traditions");
    const occasion = s(p, "occasion");
    const where = s(p, "location") || "your chosen location";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (theme.length ? lcList(theme) : "gracious");
    const who = guestPhrase(p);

    return {
      cards: [
        { icon: "🫖", title: "High tea concept", text:
          `A ${mood} tea${occasion ? ` for ${lc(occasion)}` : ""} in ${where} for ${who}${timeOfDay.length ? `, held as a ${lcList(timeOfDay)}` : ""}.` +
          (theme.length ? ` Styled ${lcList(theme)}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") +
          " A tea lives or dies on pacing: guests should be seated, served in courses, and never rushed. Build the whole plan around that rhythm." },

        { icon: "🎨", title: "Theme & atmosphere", text:
          (theme.length ? `Anchor it in ${lcList(theme)}.` : "Choose a direction and keep it consistent across the table.") +
          (china.length ? ` Your tableware sets the tone: ${lcList(china)}.` : "") +
          (decor.length ? ` Add ${lcList(decor)}.` : "") +
          (isOutdoors(p) ? " In a garden, let the setting do the work — but weight the tablecloths and keep a wind plan for candles." : "") +
          " Aim for calm and considered rather than elaborate. A tea reads as elegant when the table is uncluttered." },

        { icon: "🍽️", title: "Menu & tiers", text:
          (tiers.length ? `Build the stands with ${lcList(tiers)}.` : "A classic stand runs savoury on the bottom, scones in the middle, sweets on top.") +
          (p.guests ? ` Plan roughly three to four items per guest per tier, so about ${p.guests * 3}–${p.guests * 4} pieces in total.` : " Allow three to four items per guest per tier.") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — make sure it appears on the stand.` : "") +
          (traditions ? ` Dietary and tradition notes to honour: ${traditions}.` : " Confirm gluten-free and vegetarian versions before the day; somebody will need them.") +
          " Scones should come out warm, in a batch timed to the middle of the sitting — not at the start." },

        { icon: "☕", title: "Drinks service", text:
          (drinks.length ? `Offer ${lcList(drinks)}.` : "Offer at least one black, one green, and one herbal tea, plus coffee for the holdouts.") +
          " Serve tea properly: loose leaf in a pot, hot water refilled without being asked, and milk and lemon both available." +
          (drinks.some(d => d.indexOf("Champagne") > -1 || d.indexOf("prosecco") > -1) ? " If you're pouring sparkling wine, do it as guests arrive — it makes the opening feel like an occasion." : "") +
          " Keep a pot of hot water on every table so nobody has to flag anyone down." },

        { icon: "✨", title: "Décor & table setting", text:
          (china.length ? `Set the table with ${lcList(china)}.` : "The table is the decoration — invest there rather than in the room.") +
          (decor.length ? ` Add ${lcList(decor)}.` : "") +
          (china.indexOf("Tiered cake stands") > -1 ? " Tiered stands are the visual centrepiece; keep them evenly spaced and at a height guests can reach without standing." : "") +
          (china.indexOf("Place cards") > -1 ? " Place cards let you seat people thoughtfully, which matters more at a tea than at a standing event — everyone is at a fixed table." : "") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "🎶", title: "Entertainment", text:
          (ent.length ? `Book ${lcList(ent)}.` : "Live music at low volume suits a tea far better than a playlist.") +
          (ent.indexOf("String quartet") > -1 || ent.indexOf("Live harp") > -1 || ent.indexOf("Pianist") > -1 ? " Keep the volume under conversation level — if guests have to raise their voices, it's too loud." : "") +
          (ent.indexOf("Games & activities") > -1 ? " If you're running an activity, place it after the food rather than during — nobody wants to stop eating scones." : "") +
          (occasion ? ` If there's a reason for the tea (${lc(occasion)}), build in a short toast or a few words.` : "") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & space", pct: 22 },
        { name: "Food & catering", pct: 34 },
        { name: "Tea, drinks & service", pct: 13 },
        { name: "China, linens & rentals", pct: 14 },
        { name: "Flowers & décor", pct: 9 },
        { name: "Misc & contingency", pct: 8 }
      ], budgetNote(p, "Tea total") + " China hire and service staff are the two lines people forget — check them before you commit to a per-head food budget."),
      timeline: [
        weeks(12, "Set the date and confirm the venue or the garden setup."),
        weeks(8, "Book catering or your baker, and reserve any china and linen hire."),
        weeks(6, "Send invitations — for a tea, an exact arrival time matters."),
        weeks(4, "Confirm RSVPs and dietary requirements. Finalise the menu and the tea selection."),
        weeks(2, "Confirm the cake stand and tableware delivery. Book the musician."),
        weeks(1, "Final headcount, confirm service timings, and check the weather plan."),
        weeks(0, "Set the tables early, warm the scones to order, and keep the pots topped up.")
      ],
      checklist: [
        "Set the date and confirm the time of day",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or confirm the garden setup",
        "Book catering or commission the baking",
        "Reserve china, teacups, cake stands, and linens",
        tiers.length ? `Finalise the menu (${listPhrase(tiers.map(titleTerm))})` : "Finalise the menu across all three tiers",
        drinks.length ? `Order the teas and drinks (${listPhrase(drinks.map(titleTerm))})` : "Order teas, coffee, and any drinks",
        "Create and send invitations with an exact arrival time",
        "Collect dietary requirements and plan alternatives",
        ent.length ? `Book entertainment (${listPhrase(ent.map(titleTerm))})` : "Choose background music",
        decor.length ? `Order décor and flowers (${listPhrase(decor.map(titleTerm))})` : "Order flowers for the tables",
        "Plan the seating arrangement and any place cards",
        traditions ? `Confirm arrangements for: ${traditions}` : "Confirm any traditions or dietary requirements",
        "Confirm final numbers with the caterer or baker",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Serve in courses — sandwiches, then warm scones, then sweets — rather than all at once",
        "Keep hot water topped up; running out of tea is the one thing guests notice",
        "Confirm china and linen hire dates carefully; returns are often next-day",
        "Check whether the venue has a kitchen for warming scones",
        "Seat older guests away from drafts, especially in a garden"
      ])
    };
  }
});

/* ============================================================
   9. Engagement
   ============================================================ */

defEvent("engagement", {
  label: "Engagement",
  emoji: "💍",
  tagline: "Celebrate the \"yes!\" moment beautifully.",
  planTitle: () => "Your Engagement Plan",
  questions: [
    Q.text("couple", "Who are you celebrating?", "Names, and how they got engaged.", "e.g. Sara and Dev — engaged on holiday in Lisbon"),
    Q.date("date", "What is the engagement party date?", "Pick the date you're aiming for."),
    COMMON.location(),
    COMMON.guests(),
    COMMON.budget(),
    Q.chips("style", "What style suits the celebration?", "Pick the closest fit.", ["Elegant & formal", "Fun & relaxed", "Intimate & romantic", "Glamorous", "Garden party", "Cocktail party", "Surprise party"]),
    COMMON.setting(),
    Q.chips("food", "What food and drinks would you like?", "How would you like to host?", ["Cocktail reception", "Plated dinner", "Buffet", "Grazing table", "Dessert & drinks", "Restaurant booking", "Family-style"]),
    Q.chips("entertainment", "What entertainment would you like?", "What should carry the celebration?", ["DJ", "Live band", "Acoustic soloist", "String quartet", "Photo booth", "Dance floor", "Slideshow of the proposal", "Playlist only"]),
    Q.chips("decor", "What decorations would you like?", "Set the scene.", ["Fresh flowers", "Candles", "Fairy lights", "Balloons", "Photo display", "Table centrepieces", "Neon / custom sign", "Minimalist"]),
    Q.text("proposal", "Is there anything about the proposal to celebrate?", "We'll weave it into the plan.", "e.g. They got engaged in Lisbon — could we nod to that?"),
    Q.chips("elements", "What special elements would you like?", "Choose as many as you like.", ["Toast from a friend", "Slideshow", "Announcement moment", "Guest book / advice cards", "Custom cake", "None — keep it simple"]),
    COMMON.avoid(),
    Q.vision("We're throwing an engagement party for my brother and his fiancée — about 60 people, cocktail style, lots of candles and white flowers, and a slideshow of their trip to Lisbon. Fun but a bit elegant…")
  ],
  build: function (p) {
    const styles = list(p, "style"), food = list(p, "food"), ent = list(p, "entertainment");
    const decor = list(p, "decor"), elements = list(p, "elements");
    const couple = s(p, "couple"), proposal = s(p, "proposal");
    const where = s(p, "location") || "your chosen location";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (styles.length ? lcList(styles) : "joyful");
    const who = guestPhrase(p);
    const names = couple ? couple.split("—")[0].trim() : "the couple";
    const simple = elements.indexOf("None — keep it simple") > -1;

    return {
      cards: [
        { icon: "💍", title: "Engagement concept", text:
          `A ${mood} engagement celebration for ${names} in ${where} for ${who}${styles.length ? `, styled ${lcList(styles)}` : ""}.` +
          (proposal ? ` The proposal is part of the story: ${proposal}.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") +
          " An engagement party sets the tone for everything that follows, but it isn't the wedding — keep it warm and loose rather than formal and precise." },

        { icon: "🌹", title: "Atmosphere & theme", text:
          (styles.length ? `Build around a ${lcList(styles)} feel.` : "Pick a mood and hold it consistently.") +
          (proposal ? ` Draw the details from their story (${proposal}) — a signature drink named after the place, or photos from the trip.` : "") +
          (decor.length ? ` Set the scene with ${lcList(decor)}.` : " Candles and simple flowers go a long way.") +
          (elements.indexOf("Neon / custom sign") > -1 || decor.indexOf("Neon / custom sign") > -1 ? " A custom sign with their names or the date makes an easy photo backdrop." : "") +
          " Resist over-theming. An engagement party reads best as a gathering of people who are genuinely happy for them." },

        { icon: "🏛️", title: "Venue", text:
          (isOutdoors(p) ? "A garden or terrace suits this well — confirm lighting for after dark and a rain backup." : "A private room, a restaurant, or a home all work; choose based on how much you want to control the food.") +
          (p.guests ? ` Look for a space that holds ${p.guests} comfortably without feeling sparse.` : " Size the space to your guest list.") +
          (food.indexOf("Restaurant booking") > -1 ? " A restaurant booking removes most of the logistics — confirm the set menu, the drinks package, and whether you can bring a cake." : " Confirm whether you can bring your own cake and decorations.") +
          (elements.indexOf("Slideshow") > -1 || p.sig.activities.indexOf("slideshow") > -1 ? " Check the venue has a screen or wall you can project onto, and test it beforehand." : "") },

        { icon: "🍽️", title: "Food & drinks", text:
          (food.length ? `Serve ${lcList(food)}.` : "Cocktail style keeps people moving and talking, which suits an engagement party.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — build the menu around it.` : "") +
          " Include a signature drink — named after the couple, the proposal location, or the date. It's the cheapest way to make the party feel personal." +
          (elements.indexOf("Custom cake") > -1 ? " A custom cake with their names doubles as the centrepiece and the dessert." : "") },

        { icon: "🎶", title: "Entertainment", text:
          (ent.length ? `Book ${lcList(ent)}.` : "A good playlist plus one shared moment is enough.") +
          (ent.indexOf("Slideshow of the proposal") > -1 || elements.indexOf("Slideshow") > -1 ? " A slideshow of the proposal works best early, before people have had much to drink — keep it to three or four minutes." : "") +
          (ent.indexOf("Photo booth") > -1 ? " A photo booth earns its cost here: guests share the photos, which spreads the news for you." : "") +
          (elements.indexOf("Toast from a friend") > -1 ? " Cap the toast at three minutes and have someone ready to follow it, so it doesn't drift." : "") },

        { icon: "✨", title: "Décor", text:
          (decor.length ? `Set the scene with ${lcList(decor)}.` : "Warm lighting and simple florals suit most engagement parties.") +
          (decor.indexOf("Photo display") > -1 || proposal ? " A small photo display of their time together gives guests something to gather around and starts conversations." : "") +
          (isOutdoors(p) ? " Outdoors, use enclosed candles and weight everything down against wind." : "") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "💫", title: "Special moments", text:
          (simple
            ? "You've opted to keep it simple — that's a perfectly good choice. One toast and a group photo are all an engagement party needs to feel like an occasion."
            : (elements.length ? `Plan these in: ${lcList(elements)}. Each needs a named person to make it happen and a natural pause.` : "Plan two or three deliberate moments rather than a full schedule.") ) +
          (simple ? "" : " The announcement moment, if you're doing one, should come early — after that, guests can relax into the party.") +
          (p.sig.moments.length ? ` You mentioned ${listPhrase(p.sig.moments)} — those are your anchors.` : "") +
          (proposal ? ` A short reading or speech referencing ${proposal} lands well.` : "") },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 28 },
        { name: "Food & drink", pct: 32 },
        { name: "Décor & flowers", pct: 13 },
        { name: "Entertainment", pct: 11 },
        { name: "Photo & signage", pct: 8 },
        { name: "Misc & contingency", pct: 8 }
      ], budgetNote(p, "Party total")),
      timeline: baseTimeline(p, {
        w12: "Set the date, agree the guest list with the couple, and book the venue.",
        w8: "Book catering and entertainment. Decide the theme and start gathering photos.",
        w6: "Send invitations. Order flowers and décor.",
        w4: "Confirm RSVPs, finalize the menu, and name the signature drink.",
        w2: "Build the slideshow, write the toast, and confirm any special elements.",
        w1: "Final headcount, prep décor, and test the slideshow on the venue equipment.",
        w0: "Arrive early, do a walk-through, and enjoy the moment with them."
      }),
      checklist: [
        "Agree the date and guest list with the couple",
        "Set the budget and agree who is contributing",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or restaurant",
        food.length ? `Book catering (${listPhrase(food.map(titleTerm))})` : "Arrange food and drinks",
        ent.length ? `Book entertainment (${listPhrase(ent.map(titleTerm))})` : "Sort music and entertainment",
        decor.length ? `Order décor and flowers (${listPhrase(decor.map(titleTerm))})` : "Arrange decorations",
        "Create and send invitations",
        proposal ? `Gather material referencing: ${proposal}` : "Gather photos for a display or slideshow",
        simple ? "Plan one toast and a group photo" : (elements.length ? `Organise special elements (${lcList(elements)})` : "Plan two or three deliberate moments"),
        "Write and rehearse the toast",
        "Name the signature drink",
        elements.indexOf("Custom cake") > -1 ? "Order the custom cake" : "Confirm the cake or dessert",
        "Confirm final headcount with the caterer",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Check with the couple before announcing anything publicly",
        "Keep the focus on them rather than on wedding planning logistics",
        "Test any slideshow on the venue's actual equipment beforehand",
        "Cue the music down for toasts, or nobody will hear them",
        "Remember it isn't the wedding — resisting the pressure to over-formalise keeps it fun"
      ])
    };
  }
});

/* ============================================================
   10. Wedding Shower
   ============================================================ */

defEvent("wedding-shower", {
  label: "Wedding Shower",
  emoji: "🎊",
  tagline: "Bridal or couple's shower celebrations.",
  planTitle: () => "Your Wedding Shower Plan",
  questions: [
    Q.chips("showerType", "What kind of shower is this?", "Bridal or couple's — it changes the tone.", ["Bridal shower", "Couple's shower", "Bridal + groom separately", "Lingerie / personal shower", "Recipe or kitchen shower", "Stock-the-bar shower"]),
    Q.text("couple", "Who is the shower for?", "Names, and their wedding plans.", "e.g. Sara and Dev — marrying in June in Napa"),
    Q.date("date", "What is the shower date?", "Usually four to eight weeks before the wedding."),
    COMMON.location(),
    COMMON.guests(),
    COMMON.budget(),
    Q.chips("theme", "What theme would you like?", "Choose the feel you're going for.", ["Elegant & classic", "Garden party", "Brunch / mimosa", "Around the world", "Recipe & kitchen", "Cozy & rustic", "Modern & minimal", "Cultural / traditional"]),
    Q.chips("food", "What food would you like?", "How would you like to host?", ["Brunch", "Afternoon tea", "Buffet", "Cocktail bites", "Grazing table", "Full lunch", "Dessert & drinks only"]),
    Q.chips("cake", "What desserts would you like?", "Dessert is part of the plan.", ["Custom shower cake", "Cupcakes", "Dessert table", "Cookies as favours", "Cultural sweets", "Ice cream bar"]),
    Q.chips("activities", "What activities would you like?", "Choose as many as you like.", ["Gift opening", "Advice cards for the couple", "How-we-met quiz", "Date night jar", "Recipe cards", "Craft station", "Bridal bingo", "No games"]),
    Q.chips("decor", "What decorations would you like?", "Set the scene.", ["Fresh flowers", "Balloon garland", "Custom banner", "Table centrepieces", "Fairy lights", "Ribbon & lace", "Photo display", "Minimalist"]),
    Q.chips("gifts", "How should gifts work?", "Helps guests get it right.", ["Registered wishlist", "Kitchen / home items", "Stock the bar", "Recipe cards instead", "Group gift", "No gifts — just company", "Lingerie / personal"]),
    Q.text("traditions", "Are there special cultural or family traditions?", "Anything we should honour or build in.", "e.g. A specific blessing, or a family recipe we always share"),
    COMMON.setting(),
    COMMON.specialReq(),
    COMMON.avoid(),
    Q.vision("We're hosting a garden brunch shower for my best friend — about 30 people, pastel flowers, mimosas, and everyone brings a recipe card instead of a gift. Relaxed and pretty…")
  ],
  build: function (p) {
    const showerType = list(p, "showerType"), theme = list(p, "theme"), food = list(p, "food");
    const cake = list(p, "cake"), acts = list(p, "activities"), decor = list(p, "decor");
    const gifts = list(p, "gifts"), traditions = s(p, "traditions");
    const couple = s(p, "couple");
    const where = s(p, "location") || "your chosen location";
    const mood = p.sig.vibes.length ? listPhrase(p.sig.vibes) : (theme.length ? lcList(theme) : "warm and celebratory");
    const who = guestPhrase(p);
    const names = couple ? couple.split("—")[0].trim() : "the couple";
    const noGames = acts.indexOf("No games") > -1;
    const coupleShower = showerType.some(t => t.indexOf("Couple") > -1);

    return {
      cards: [
        { icon: "🎊", title: "Wedding shower concept", text:
          `A ${mood} ${showerType.length ? lcList(showerType) : "bridal shower"} for ${names} in ${where} for ${who}.` +
          (theme.length ? ` Styled ${lcList(theme)}.` : "") +
          (couple ? ` Building toward the wedding.` : "") +
          (p.sig.vibes.length ? ` Your description points to something ${listPhrase(p.sig.vibes)}.` : "") +
          (coupleShower ? " Since this is a couple's shower, plan activities and gifts that work for both of them rather than centring one person." : "") +
          " A shower should feel generous and unhurried — the point is the people, not the production." },

        { icon: "🎨", title: "Theme", text:
          (theme.length ? `Build around ${lcList(theme)}.` : "Pick one clear direction and keep it light.") +
          (decor.length ? ` Express it through ${lcList(decor)}.` : "") +
          (couple ? ` Pull one detail from their wedding plans so the shower feels like part of the same story.` : "") +
          (traditions ? ` Leave room for your traditions (${traditions}).` : " If the wedding has a colour palette, echoing it here is an easy, thoughtful touch.") +
          " Keep the theme in three places — the entrance or welcome sign, the food table, and the dessert display." },

        { icon: "🏛️", title: "Venue setup", text:
          (isOutdoors(p) ? "A garden or terrace suits a shower beautifully — confirm shade, a rain backup, and a wind plan for lightweight décor." : "A home, a private dining room, or a café back room all suit a shower well.") +
          (p.guests ? ` Set up for ${p.guests} guests with generous seating — showers involve sitting, eating, and watching gifts being opened.` : " Prioritise seating over standing room.") +
          " Plan a clear spot for gift opening — ideally where everyone can see without crowding, with somewhere to put opened gifts and a person recording who gave what." +
          (acts.indexOf("Gift opening") > -1 ? " Gift opening takes longer than people expect; budget a full 30–45 minutes for it." : "") },

        { icon: "🍽️", title: "Food & desserts", text:
          (food.length ? `Serve ${lcList(food)}.` : "Choose a service style that keeps the host out of the kitchen.") +
          (p.guests ? ` Plan for roughly ${p.guests} servings.` : "") +
          (p.sig.cuisines.length ? ` Your description calls out ${listPhrase(p.sig.cuisines.map(midTerm))} — build the menu around it.` : "") +
          (cake.length ? ` For dessert: ${lcList(cake)}.` : " A cake or dessert table gives the shower a natural centrepiece.") +
          (gifts.indexOf("Recipe cards instead") > -1 ? " If guests are bringing recipe cards, work one of those recipes into the menu — it ties the activity to the food." : "") },

        { icon: "✨", title: "Decorations", text:
          (decor.length ? `Set the scene with ${lcList(decor)}.` : "Flowers, a welcome sign, and pretty table linens cover most of it.") +
          (decor.indexOf("Photo display") > -1 ? " A photo display of the couple gives guests something to look at during quieter moments." : "") +
          (isOutdoors(p) ? " Outdoors, weight everything down and use enclosed candles." : "") +
          (traditions ? ` Leave space in the setup for anything your traditions need.` : "") +
          (s(p, "avoid") ? ` Steer clear of: ${lc(s(p, "avoid"))}.` : "") },

        { icon: "🎯", title: "Activities", text:
          (noGames
            ? "You've opted out of games — completely fine. A gift opening, an advice card station, and good food are all a shower needs."
            : (acts.length ? `Run ${lcList(acts)}.` : "Plan two or three short activities — more than that starts to feel like a programme.") ) +
          (noGames ? "" : " Give each one a named host and keep them under fifteen minutes, with long gaps for eating and talking in between.") +
          (acts.indexOf("Advice cards for the couple") > -1 ? " Advice cards are the lowest-effort activity that guests consistently love, and they make a genuine keepsake afterwards." : "") +
          (acts.indexOf("Gift opening") > -1 ? " Seat the guest of honour somewhere everyone can see, and have someone note each gift as it's opened so thank-you notes are easy." : "") +
          (coupleShower ? " For a couple's shower, choose activities both people can take part in equally." : "") },

        { icon: "🎁", title: "Gift ideas", text:
          (gifts.length ? `Point guests toward: ${lcList(gifts)}.` : "State the gift preference clearly on the invitation so nobody has to guess.") +
          (gifts.indexOf("Recipe cards instead") > -1 ? " Ask each guest to bring a favourite recipe on a card — they become a book, and it costs the guest nothing." : "") +
          (gifts.indexOf("Stock the bar") > -1 ? " A stock-the-bar shower works well: each guest brings a bottle, and the couple ends up with a real bar for the wedding." : "") +
          (gifts.indexOf("Registered wishlist") > -1 ? " Include the registry details on the invitation, and note if it's also held elsewhere." : "") +
          (gifts.indexOf("Group gift") > -1 ? " Collect group-gift contributions quietly in advance, and present once rather than during the main opening." : "") +
          " Assign someone to record who gave what — it's the detail that makes thank-you notes painless." },

        { icon: "💰", title: "Budget breakdown", budget: true }
      ],
      budget: budgetPlan(p, [
        { name: "Venue & rentals", pct: 25 },
        { name: "Food & catering", pct: 30 },
        { name: "Cake & desserts", pct: 10 },
        { name: "Décor & flowers", pct: 15 },
        { name: "Activities & favours", pct: 10 },
        { name: "Misc & contingency", pct: 10 }
      ], budgetNote(p, "Shower total")),
      timeline: [
        weeks(12, "Agree the date with the couple and confirm the venue — avoid clashing with other wedding events."),
        weeks(8, "Book catering. Settle the theme and palette, and agree the gift preference."),
        weeks(6, "Send invitations with the gift details stated clearly."),
        weeks(4, "Confirm RSVPs, order the cake, and buy decorations."),
        weeks(2, "Prepare activities, print cards and signage, and confirm the drinks."),
        weeks(1, "Final headcount, collect decorations, and brief whoever is hosting."),
        weeks(0, "Set up early, keep food replenished, and make sure the guest of honour is seated and looked after.")
      ],
      checklist: [
        "Agree the date with the couple and check it doesn't clash with wedding events",
        "Confirm who is hosting and who is contributing",
        p.guests ? `Build the guest list (target ${p.guests})` : "Build the guest list",
        "Book the venue or confirm the home setup",
        food.length ? `Arrange food (${listPhrase(food.map(titleTerm))})` : "Arrange food and drinks",
        cake.length ? `Order desserts (${lcList(cake)})` : "Order the cake or dessert table",
        decor.length ? `Order décor (${listPhrase(decor.map(titleTerm))})` : "Order decorations",
        "Create and send invitations, including the gift preference",
        noGames ? "Plan an advice card or keepsake station" : (acts.length ? `Prepare activities (${lcList(acts)})` : "Plan two or three activities"),
        "Arrange a gift table and someone to record who gave what",
        traditions ? `Confirm arrangements for: ${traditions}` : "Confirm any cultural or family traditions",
        coupleShower ? "Make sure activities and gifts suit both people" : "Confirm any personal or theme-specific gift details",
        "Plan a signature drink or non-alcoholic alternative",
        "Confirm final headcount with the caterer",
        "Prepare the setup kit and a named point person"
      ],
      considerations: baseConsiderations(p).concat([
        "Check with the couple who they want invited, and whether both should be there",
        "Coordinate with the wedding timeline — showers shouldn't compete with other events",
        "Gift opening takes longer than expected; give it a real slot in the plan",
        "Record who gave what so thank-you notes aren't guesswork",
        "Avoid games that embarrass the guest of honour",
        "If it's a couple's shower, keep the focus on both of them"
      ])
    };
  }
});

