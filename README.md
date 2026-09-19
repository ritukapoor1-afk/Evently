# ✦ Evently

**Plan Your Perfect Event** — a modern, mobile-friendly event-planning web app.

Evently walks you through a short, friendly questionnaire, then invites you to
describe your event in your own words, and returns a complete personalized plan
built from **both** sources: your structured answers and your free-form vision.

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
Home → Choose Your Event → Custom Event → Questionnaire → Describe Your Vision → Personalized Plan
```

### Event types

| Event type | Status |
|---|---|
| **Custom Event** | **Ready — full working flow** |
| Wedding | Coming soon |
| Birthday | Coming soon |
| Anniversary | Coming soon |
| Baby Shower | Coming soon |
| Graduation | Coming soon |
| High Tea | Coming soon |
| Engagement | Coming soon |
| Wedding Shower | Coming soon |
| Corporate Event | Coming soon |

Custom Event is the first fully implemented path, as the brief requested.

---

## Step 1 — The questionnaire

Twelve questions, with tappable option chips wherever a free-text box would be
tedious:

1. What would you like to celebrate?
2. What is the event date?
3. What city or location?
4. Approximately how many guests?
5. What is your approximate budget?
6. What type of venue are you interested in? *(chips)*
7. What is the overall style or theme? *(chips)*
8. What food / catering preferences do you have? *(chips)*
9. What entertainment would you like? *(chips)*
10. What decorations or atmosphere do you want? *(chips)*
11. Are there any special requirements?
12. Is there anything you specifically do NOT want?

---

## Step 2 — Describe Your Vision

The closing step, and the one that makes the plan feel personal. A large
textarea invites the user to write freely:

> Tell us what you're imagining. Describe your event in your own words — the
> mood, people, special moments, things you love, and anything you want to avoid.

The placeholder shows a worked example:

> *I want an elegant but fun 50th birthday celebration for about 50 guests.
> I love Indian food, music and beautiful outdoor spaces…*

**How the free text is used.** Rather than being displayed and ignored, the
description is scanned for concrete signals across six categories — cuisines,
moods, settings, activities, key moments, and needs — and those signals feed the
plan generator alongside the structured answers:

| Written in the vision | Effect on the plan |
|---|---|
| "Indian food" | Food card centres it; budget shifts toward catering (32%) |
| "outdoor spaces" | Venue card, décor card, and a weather-plan consideration |
| "music" | Entertainment card weaves it in |
| "elegant but fun" | Concept and theme mood |
| "wheelchair access" | Guest-experience comfort note + a consideration |
| "no loud music" | Carried through to décor and considerations |

The user's own words are also echoed back at the top of the plan under
**"In your words"**, so the connection between input and output is visible.

Answers (including the vision) persist as you move Back and forth.

---

## Step 3 — The generated plan

All eleven required sections, each derived from the two input sources:

| # | Section | Personalised by |
|---|---|---|
| 1 | Event concept | occasion, place, guest count, mood, cuisine, setting |
| 2 | Theme & atmosphere | style chips, décor chips, vision mood, key moments |
| 3 | Venue type | venue chips, vision setting, guest count, catering needs |
| 4 | Guest experience | guest count, key moments, comfort needs, entertainment |
| 5 | Food & catering | catering chips, vision cuisines, dietary needs, guest count |
| 6 | Decorations | décor chips, indoor/outdoor setting, mood, things to avoid |
| 7 | Entertainment | entertainment chips, vision activities, key moments |
| 8 | Budget breakdown | total, per-guest figure, split weighted by food focus |
| 9 | Planning timeline | counted backwards from the real event date, with catering/décor notes |
| 10 | Detailed checklist | venue, budget, cuisine brief, entertainment, décor, moments, needs |
| 11 | Special considerations | special requirements, avoid list, needs, outdoor risk |

Plans can be printed or saved as a PDF via the built-in print stylesheet.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup for all three views (home, questionnaire, plan) |
| `styles.css` | Design tokens, layout, responsive breakpoints, print styles |
| `app.js` | Question definitions, step engine, vision parser, plan generator |
| `test-harness.html` | 107 automated end-to-end assertions (see below) |

---

## Tests

`test-harness.html` drives the real UI in an iframe and asserts on the live DOM —
it walks all 13 steps, types the vision text, generates a plan, and checks the
output. It is a real test, not a smoke test: it clicks the actual buttons and
reads the resulting DOM.

Serve the folder, then open `/test-harness.html`. Current status:

```
TOTAL: 107   PASSED: 107   FAILED: 0
```

Coverage:

- Full questionnaire walk, step by step, including the vision step
- The vision textarea: placeholder, guidance copy, "Final step" labelling
- Empty-answer blocking on both a normal question and the vision step
- All 11 plan sections present
- **Personalisation** — asserts the plan actually contains "Indian", "outdoor",
  "elegant", and "music" from the vision text
- Term casing — "Indian" stays capitalised, "DJ" keeps its capitals
- Budget arithmetic (categories sum to the entered total) and per-guest figure
- Date correctness (no timezone off-by-one)
- Checklist interactivity and answer persistence across Back/Forward
- Navigation from every view: header logo, header nav, hero CTAs, footer links
- No horizontal overflow at mobile width

---

## Notes

- **Demo data only.** Suggestions are sample content, not live vendor data.
- **No persistence.** Refreshing the page resets the questionnaire.
- **Mobile-friendly.** Verified at 390px across all views with no horizontal
  overflow; chips and plan cards collapse to a single column.
- **Accessible.** Visible focus rings, semantic landmarks, `aria-pressed` on
  option chips, and a `prefers-reduced-motion` fallback.
