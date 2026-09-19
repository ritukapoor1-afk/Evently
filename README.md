# ✦ Evently

**Plan Your Perfect Event** — a modern, mobile-friendly event-planning web app.

Evently walks you through a questionnaire tailored to your kind of event, then
invites you to describe it in your own words, and returns a complete personalized
plan built from **both** sources: your structured answers and your free-form vision.

No build step, no backend, no API keys — pure HTML, CSS, and JavaScript.

---

## Live demo

Open `index.html` in any browser — no server, build step, or install required.

To serve it locally instead (any static file server works):

```powershell
python -m http.server 8090     # Python
npx serve . -l 8090            # Node
```

Then visit `http://127.0.0.1:8090/`.

---

## The flow

```
Home → Choose Your Event → Questionnaire → Describe Your Vision → Personalized Plan
```

Every one of the ten event types is fully functional. Each has its **own
questionnaire** and its **own set of plan sections** — they are not the same
flow with the names swapped.

| Event type | Questions | Plan sections | Highlights |
|---|---|---|---|
| **Custom Event** | 13 | 8 | The original general-purpose flow |
| Wedding | 18 | 12 + day-of timeline | Ceremony plan, reception plan, photography, cake, wedding-day timeline |
| Birthday | 17 | 8 | Milestone, honoree's interests, cake, activities |
| Anniversary | 15 | 8 | Memories & traditions, surprise elements |
| Baby Shower | 17 | 8 | Due date timing, colour palette, games, gift preferences |
| Graduation | 16 | 8 | School, achievements, photo wall, activities |
| Corporate Event | 19 | 10 | Event format, run-of-show agenda, AV, branding, networking, accessibility |
| High Tea | 16 | 7 | Time of day, tiers, drinks service, china & tableware |
| Engagement | 15 | 8 | Proposal story, special elements |
| Wedding Shower | 18 | 8 | Shower type, gift approach, activities |

---

## Step 1 — The questionnaire

Common questions (date, location, guests, budget, indoor/outdoor, things to
avoid) are reused where they genuinely apply. Everything else is specific to the
event type. Examples:

- **Wedding** asks ceremony type, wedding-party size, cake, invitations, transportation, and cultural traditions
- **Corporate** asks company, purpose, formality, AV requirements, speakers, branding, networking, and accessibility
- **Baby Shower** asks the due date, colour palette, games, and gift preferences
- **Birthday** asks the milestone and the honoree's special interests

Answers persist as you move Back and forth, and empty answers are blocked with a
gentle nudge rather than silently advancing.

---

## Step 2 — Describe Your Vision

Every event type ends with the same closing step. A large textarea invites the
user to write freely:

> Tell us what you're imagining. Describe your event in your own words — the
> mood, people, special moments, things you love, and anything you want to avoid.

Each type ships its own worked example as the placeholder, e.g. for a wedding:

> *I'm picturing a garden wedding at golden hour with close family, lots of
> candles, and a relaxed dinner under string lights…*

**How the free text is used.** Rather than being displayed and ignored, the
description is scanned for signals across seven categories — cuisines, moods,
settings, activities, key moments, needs, and colours — and those signals feed
the plan generator alongside the structured answers:

| Written in the vision | Effect on the plan |
|---|---|
| "Indian food" | Food section centres it; the budget shifts toward catering |
| "outdoor" | Venue, décor, and a weather-plan consideration |
| "music" | Entertainment section weaves it in |
| "elegant but fun" | Concept and theme mood |
| "wheelchair access" | Guest-experience note + a consideration |
| "white flowers" | Colour and décor references |

The user's own words are also echoed at the top of the plan under **"In your
words"**, so the connection between input and output is visible.

---

## Step 3 — The generated plan

Each type produces its own section list. Every plan includes a budget breakdown,
a planning timeline counted backwards from the real event date, a clickable
checklist, and special considerations — plus type-specific sections such as a
ceremony plan, a run-of-show agenda, or a wedding-day timeline.

Budget splits are per-type too: a wedding weights photography and florals, a baby
shower weights games and décor, and a corporate event carries a larger
contingency because last-minute AV and headcount changes are routine.

Plans can be printed or saved as a PDF via the built-in print stylesheet.

---

## Navigation

- **Back to event types** — returns to the Choose Your Event grid to pick another type
- **Start over** — relaunches the *same* event type with a clean sheet
- **Header logo / nav / hero CTAs / footer links** — all work from every view

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup for all three views (home, questionnaire, plan) |
| `events.js` | The ten event types: their questions and their plan builders |
| `app.js` | The generic engine: step flow, vision parser, plan renderer |
| `styles.css` | Design tokens, layout, responsive breakpoints, print styles |
| `test-harness.html` | 220 automated end-to-end assertions (see below) |

The engine knows nothing about any specific event type. Adding an eleventh type
means adding one entry to `events.js` and one card to `index.html` — no engine
changes.

---

## Tests

`test-harness.html` drives the real UI in an iframe and asserts on the live DOM:
it clicks the actual event-type cards, walks every question of every type, types
the vision text, and checks the resulting plan.

Serve the folder, then open `/test-harness.html`. Current status:

```
TOTAL: 220   PASSED: 220   FAILED: 0
```

Coverage:

- All 10 cards enabled, with no "Coming soon" badges remaining
- All 10 flows walked end to end, every question in order
- Each type produces exactly the plan sections the brief requires
- **Personalization** — asserts plans actually contain values from the structured
  answers (80 guests, Austin) *and* the free-form vision (Indian, outdoor, wheelchair)
- Question sets are verified to be genuinely different, not copies
- The Custom Event flow is asserted unchanged: same 13 questions, same wording, same 8 sections
- Corporate agenda renders ordered run-of-show items
- Acronym casing (CEO, DJ) and preservation of user free-text casing
- Navigation: header logo, Back to event types, Start over (same type), Back preserving answers
- Empty-answer blocking
- No horizontal overflow at mobile width

---

## Notes

- **Demo data only.** Suggestions are sample content, not live vendor data.
- **No persistence.** Refreshing the page resets the questionnaire.
- **Mobile-friendly.** Verified at 390px across every event type with no
  horizontal overflow; chips and plan cards collapse to a single column.
- **Accessible.** Visible focus rings, semantic landmarks, `aria-pressed` on
  option chips, and a `prefers-reduced-motion` fallback.
