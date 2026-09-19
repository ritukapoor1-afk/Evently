# ✦ Evently

**Plan Your Perfect Event** — a modern, mobile-friendly event-planning web app.

Evently walks you through a short, friendly questionnaire and returns a complete
personalized event plan: concept, theme, venue type, budget breakdown, catering
and décor ideas, entertainment, a countdown timeline, and a planning checklist.

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
Home  →  Choose Your Event  →  Custom Event  →  12-step questionnaire  →  Personalized Event Plan
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

## The questionnaire

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

Answers persist as you move Back and forth. The final button reads
**✨ Generate my plan**.

---

## The generated plan

Every section is derived from the answers — nothing is hard-coded filler:

- **Event concept**
- **Suggested theme**
- **Suggested venue type** (sized to your guest count)
- **Budget categories** — a six-way split with dollar amounts and bar visualisation
- **Food / catering ideas** — mapped from your chosen service styles
- **Decoration ideas**
- **Entertainment ideas**
- **Suggested timeline** — counted backwards from your real event date
- **Planning checklist** — click items to tick them off, with strike-through
- **Important things to consider** — includes your special requirements and avoids

Plans can be printed or saved as a PDF via the built-in print stylesheet.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup for all three views (home, questionnaire, plan) |
| `styles.css` | Design tokens, layout, responsive breakpoints, print styles |
| `app.js` | Question definitions, step engine, plan generator |
| `test-harness.html` | 75 automated end-to-end assertions (see below) |

---

## Tests

`test-harness.html` drives the real UI in an iframe and asserts on the live DOM —
it walks all 12 steps, generates a plan, and checks the output.

Serve the folder, then open `/test-harness.html`. Current status:

```
TOTAL: 80   PASSED: 80   FAILED: 0
```

It covers the full questionnaire walk, budget arithmetic, date correctness,
checklist interactivity, answer persistence, and navigation from every view
(header logo, header nav, hero CTAs, footer links, and the in-page back buttons).

---

## Notes

- **Demo data only.** Suggestions are sample content, not live vendor data.
- **No persistence.** Refreshing the page resets the questionnaire.
- **Mobile-friendly.** Verified down to 390px with no horizontal overflow;
  option chips and plan cards collapse to a single column.
- **Accessible.** Visible focus rings, semantic landmarks, and a
  `prefers-reduced-motion` fallback.
