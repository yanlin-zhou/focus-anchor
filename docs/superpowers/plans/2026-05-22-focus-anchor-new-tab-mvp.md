# Focus Anchor New Tab MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local-first Chrome New Tab MVP for Focus Anchor with Top 3 Today Items, collapsed Focus Lane cards, collapsed Backlog, local storage, transparent ranking, rule-generated items, daily snapshots, and completion reward motion.

**Architecture:** Use a Chrome Manifest V3 extension with a static New Tab page and vanilla ES modules. Keep domain logic pure and testable under Node, then have the browser UI render a `homeModel` produced by those pure modules. Persist data with `chrome.storage.local`, with a memory repository used for tests.

**Tech Stack:** Chrome Manifest V3, HTML, CSS, vanilla JavaScript ES modules, Node.js built-in `node:test`, `assert/strict`, and manual browser verification with the existing Playwright CLI wrapper.

---

## Scope Check

This plan implements the MVP only:

- Browser extension New Tab page.
- Local storage.
- Goal Cards, Today Items, Links, Rules, Behavior Events, Daily Snapshots.
- Top 3 Today Items as the default execution surface.
- Collapsed Focus Lane and collapsed Backlog by default.
- Manual item completion with completion reward motion.
- Seed data for first-run usability.

This plan does not implement Lark integration, AI prioritization, cross-device sync, full weekly review, or automatic external data import.

## File Structure

- Create: `package.json` - Node scripts for tests and static checks.
- Create: `manifest.json` - Chrome extension manifest and New Tab override.
- Create: `src/newtab.html` - Extension New Tab document.
- Create: `src/styles.css` - V2 visual system and motion styles.
- Create: `src/newtab.js` - Browser entrypoint: load repository, build model, render, bind interactions.
- Create: `src/domain/schema.js` - Runtime validators and constants for supported enum values.
- Create: `src/domain/sampleData.js` - First-run data matching the design mockup.
- Create: `src/domain/date.js` - Date helpers using local ISO dates.
- Create: `src/domain/rules.js` - Idempotent routine and date-triggered Today Item generation.
- Create: `src/domain/ranking.js` - Card scoring, sort reasons, Top 3 item derivation, Focus Lane/Backlog split.
- Create: `src/domain/snapshots.js` - Daily Snapshot creation and update.
- Create: `src/domain/events.js` - Behavior Event constructors.
- Create: `src/storage/repository.js` - `chrome.storage.local` repository plus memory repository.
- Create: `src/ui/viewModel.js` - Convert domain state into render-friendly UI state.
- Create: `src/ui/render.js` - Render and update the New Tab DOM.
- Create: `src/ui/actions.js` - User actions that mutate state and record events.
- Create: `tests/manifest.test.mjs` - Extension manifest smoke test.
- Create: `tests/schema.test.mjs` - Runtime validation tests.
- Create: `tests/rules.test.mjs` - Rule generation and idempotency tests.
- Create: `tests/ranking.test.mjs` - Sorting, Top 3, Focus Lane, Backlog tests.
- Create: `tests/snapshots.test.mjs` - Daily Snapshot tests.
- Create: `tests/actions.test.mjs` - Completion, pin, snooze, and event tests.
- Create: `tests/viewModel.test.mjs` - UI view model tests.
- Modify: `README.md` - Local development and Chrome loading instructions.

## Task 1: Extension Skeleton

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `src/newtab.html`
- Create: `src/newtab.js`
- Create: `src/styles.css`
- Create: `tests/manifest.test.mjs`
- Modify: `README.md`

- [ ] **Step 1: Write the failing manifest smoke test**

Create `tests/manifest.test.mjs`:

```js
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("manifest configures Focus Anchor as a Chrome New Tab extension", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Focus Anchor");
  assert.equal(manifest.chrome_url_overrides.newtab, "src/newtab.html");
  assert.equal(manifest.permissions.includes("storage"), true);
  assert.equal(manifest.permissions.includes("tabs"), true);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --test tests/manifest.test.mjs
```

Expected: FAIL with `ENOENT` for `manifest.json`.

- [ ] **Step 3: Add package scripts**

Create `package.json`:

```json
{
  "name": "focus-anchor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "check": "node --check src/newtab.js"
  }
}
```

- [ ] **Step 4: Add the Chrome extension manifest**

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Focus Anchor",
  "description": "Stay anchored on what matters most.",
  "version": "0.1.0",
  "permissions": ["storage", "tabs"],
  "chrome_url_overrides": {
    "newtab": "src/newtab.html"
  }
}
```

- [ ] **Step 5: Add the New Tab shell**

Create `src/newtab.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Focus Anchor</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main id="app" class="page" aria-label="Focus Anchor New Tab"></main>
  <div id="completion-toast" class="completion-toast" role="status" aria-live="polite"></div>
  <script type="module" src="./newtab.js"></script>
</body>
</html>
```

Create `src/newtab.js`:

```js
const app = document.querySelector("#app");
app.innerHTML = "<p>Focus Anchor is loading.</p>";
```

Create `src/styles.css`:

```css
:root {
  --bg: #f2f0e8;
  --surface: #fff9ed;
  --raised: #fffdf7;
  --panel: #f0d6ad;
  --text: #26312f;
  --muted: #6f746c;
  --border: #ded4c2;
  --accent: #b85c1f;
  --accent-dark: #793c15;
  --accent-soft: #f6d4b6;
  --complete: #167963;
  --project: #435f98;
  --routine: #8c6118;
  --adhoc: #9d4326;
  --shadow: 0 18px 42px rgba(81, 55, 30, 0.12);
  --soft-shadow: 0 10px 26px rgba(81, 55, 30, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: "Aptos", "IBM Plex Sans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0;
}

.page {
  width: min(1480px, calc(100vw - 56px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 28px 0 34px;
}
```

- [ ] **Step 6: Update README**

Replace `README.md` with:

```md
# focus-anchor

Stay anchored on what matters most.

## MVP

Focus Anchor is a local-first Chrome New Tab extension. It shows the top 3 things to do today, keeps larger work contexts collapsed by default, and stores data locally.

## Development

Run tests:

```bash
npm test
```

Run syntax checks:

```bash
npm run check
```

Load locally in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Load unpacked".
4. Select this repository folder.
5. Open a new tab.
```

- [ ] **Step 7: Run tests and checks**

Run:

```bash
npm test
npm run check
```

Expected: `tests/manifest.test.mjs` passes and `src/newtab.js` passes syntax checks.

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json manifest.json src/newtab.html src/newtab.js src/styles.css tests/manifest.test.mjs README.md
git commit -m "feat: add extension shell"
```

## Task 2: Schema and First-Run Data

**Files:**
- Create: `src/domain/schema.js`
- Create: `src/domain/sampleData.js`
- Create: `tests/schema.test.mjs`

- [ ] **Step 1: Write failing schema tests**

Create `tests/schema.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { validateAppData, GOAL_TYPES, GOAL_STATUSES, ITEM_STATUSES } from "../src/domain/schema.js";

test("schema exposes supported values", () => {
  assert.deepEqual(GOAL_TYPES, ["project", "routine", "ad_hoc", "deadline"]);
  assert.deepEqual(GOAL_STATUSES, ["active", "paused", "done"]);
  assert.deepEqual(ITEM_STATUSES, ["open", "done", "skipped"]);
});

test("first-run data is valid and contains realistic MVP content", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const result = validateAppData(data);

  assert.equal(result.ok, true);
  assert.equal(data.goalCards.length >= 4, true);
  assert.equal(data.goalCards.some((card) => card.type === "routine"), true);
  assert.equal(data.goalCards.some((card) => card.type === "ad_hoc"), true);
  assert.equal(data.goalCards.some((card) => card.type === "project"), true);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test tests/schema.test.mjs
```

Expected: FAIL with module-not-found for `src/domain/sampleData.js` or `src/domain/schema.js`.

- [ ] **Step 3: Implement schema validators**

Create `src/domain/schema.js`:

```js
export const GOAL_TYPES = ["project", "routine", "ad_hoc", "deadline"];
export const GOAL_STATUSES = ["active", "paused", "done"];
export const ITEM_STATUSES = ["open", "done", "skipped"];
export const ITEM_SOURCES = ["manual", "routine", "date_triggered", "suggested"];
export const LINK_KINDS = ["doc", "dashboard", "repo", "thread", "other"];
export const RULE_TYPES = ["routine", "date_triggered_check"];

export function validateAppData(data) {
  const errors = [];
  if (!Array.isArray(data.goalCards)) errors.push("goalCards must be an array");
  if (!Array.isArray(data.behaviorEvents)) errors.push("behaviorEvents must be an array");
  if (!Array.isArray(data.dailySnapshots)) errors.push("dailySnapshots must be an array");

  for (const card of data.goalCards ?? []) {
    if (!card.id) errors.push("goal card missing id");
    if (!card.title) errors.push(`goal card ${card.id} missing title`);
    if (!GOAL_TYPES.includes(card.type)) errors.push(`goal card ${card.id} has invalid type`);
    if (!GOAL_STATUSES.includes(card.status)) errors.push(`goal card ${card.id} has invalid status`);
    if (!Array.isArray(card.todayItems)) errors.push(`goal card ${card.id} todayItems must be an array`);
    if (!Array.isArray(card.links)) errors.push(`goal card ${card.id} links must be an array`);
    if (!Array.isArray(card.rules)) errors.push(`goal card ${card.id} rules must be an array`);

    for (const item of card.todayItems ?? []) {
      if (!item.id) errors.push(`goal card ${card.id} has item missing id`);
      if (!item.title) errors.push(`item ${item.id} missing title`);
      if (!ITEM_STATUSES.includes(item.status)) errors.push(`item ${item.id} has invalid status`);
      if (!ITEM_SOURCES.includes(item.source)) errors.push(`item ${item.id} has invalid source`);
    }

    for (const link of card.links ?? []) {
      if (!link.id) errors.push(`goal card ${card.id} has link missing id`);
      if (!link.label) errors.push(`link ${link.id} missing label`);
      if (!link.url) errors.push(`link ${link.id} missing url`);
      if (!LINK_KINDS.includes(link.kind)) errors.push(`link ${link.id} has invalid kind`);
    }

    for (const rule of card.rules ?? []) {
      if (!rule.id) errors.push(`goal card ${card.id} has rule missing id`);
      if (!RULE_TYPES.includes(rule.type)) errors.push(`rule ${rule.id} has invalid type`);
      if (!rule.titleTemplate) errors.push(`rule ${rule.id} missing titleTemplate`);
    }
  }

  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Implement first-run sample data**

Create `src/domain/sampleData.js`:

```js
export function createInitialData(nowIso = new Date().toISOString()) {
  return {
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    goalCards: [
      {
        id: "card-biweekly-report",
        title: "Biweekly report",
        type: "routine",
        importance: 5,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [
          {
            id: "item-report-polish",
            goalCardId: "card-biweekly-report",
            title: "Polish narrative and risks section",
            status: "open",
            source: "routine",
            scheduledFor: "2026-05-22",
            doneAt: null,
            skippedAt: null,
            note: "",
            createdAt: nowIso,
            updatedAt: nowIso
          },
          {
            id: "item-report-metrics-check",
            goalCardId: "card-biweekly-report",
            title: "Check metrics table against dashboard",
            status: "open",
            source: "date_triggered",
            scheduledFor: "2026-05-22",
            doneAt: null,
            skippedAt: null,
            note: "",
            createdAt: nowIso,
            updatedAt: nowIso
          }
        ],
        links: [
          { id: "link-report-doc", goalCardId: "card-biweekly-report", label: "Lark Doc", url: "https://example.com/report", kind: "doc", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-report-metrics", goalCardId: "card-biweekly-report", label: "Metrics", url: "https://example.com/metrics", kind: "dashboard", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-report-prev", goalCardId: "card-biweekly-report", label: "Previous report", url: "https://example.com/previous-report", kind: "doc", includeInOpenAll: false, createdAt: nowIso, updatedAt: nowIso }
        ],
        rules: [
          {
            id: "rule-report-biweekly-polish",
            goalCardId: "card-biweekly-report",
            type: "routine",
            titleTemplate: "Polish narrative and risks section",
            schedule: { cadence: "biweekly", weekdays: [3], startDate: "2026-05-06" },
            active: true,
            lastGeneratedFor: null,
            createdAt: nowIso,
            updatedAt: nowIso
          }
        ]
      },
      {
        id: "card-rollout-follow-up",
        title: "Rollout follow-up",
        type: "ad_hoc",
        importance: 5,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [
          { id: "item-rollout-impact", goalCardId: "card-rollout-follow-up", title: "Confirm current impact is closed", status: "open", source: "manual", scheduledFor: "2026-05-22", doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso },
          { id: "item-rollout-prevention", goalCardId: "card-rollout-follow-up", title: "Write prevention note for review", status: "open", source: "manual", scheduledFor: "2026-05-22", doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso }
        ],
        links: [
          { id: "link-rollout-alert", goalCardId: "card-rollout-follow-up", label: "Alert", url: "https://example.com/alert", kind: "dashboard", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-rollout-thread", goalCardId: "card-rollout-follow-up", label: "Thread", url: "https://example.com/thread", kind: "thread", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso }
        ],
        rules: []
      },
      {
        id: "card-focus-anchor-mvp",
        title: "Focus Anchor MVP",
        type: "project",
        importance: 4,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [
          { id: "item-focus-review-design", goalCardId: "card-focus-anchor-mvp", title: "Review frontend design direction", status: "open", source: "manual", scheduledFor: "2026-05-22", doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso },
          { id: "item-focus-slices", goalCardId: "card-focus-anchor-mvp", title: "Decide implementation slices", status: "open", source: "manual", scheduledFor: "2026-05-22", doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso }
        ],
        links: [
          { id: "link-focus-spec", goalCardId: "card-focus-anchor-mvp", label: "Spec", url: "https://example.com/spec", kind: "doc", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-focus-repo", goalCardId: "card-focus-anchor-mvp", label: "Repo", url: "https://example.com/repo", kind: "repo", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso }
        ],
        rules: []
      },
      {
        id: "card-weekly-planning",
        title: "Weekly planning",
        type: "routine",
        importance: 2,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [],
        links: [],
        rules: []
      }
    ],
    behaviorEvents: [],
    dailySnapshots: []
  };
}
```

- [ ] **Step 5: Run schema tests**

Run:

```bash
node --test tests/schema.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/domain/schema.js src/domain/sampleData.js tests/schema.test.mjs
git commit -m "feat: add domain schema and sample data"
```

## Task 3: Rule-Generated Today Items

**Files:**
- Create: `src/domain/date.js`
- Create: `src/domain/rules.js`
- Create: `tests/rules.test.mjs`

- [ ] **Step 1: Write failing rule tests**

Create `tests/rules.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { generateDueTodayItems } from "../src/domain/rules.js";

test("date-triggered rule creates exactly one check item for the scheduled date", () => {
  const now = "2026-06-10T09:00:00.000Z";
  const data = createInitialData(now);
  data.goalCards[2].rules.push({
    id: "rule-ship-check",
    goalCardId: "card-focus-anchor-mvp",
    type: "date_triggered_check",
    titleTemplate: "Check whether MVP shipped",
    schedule: { date: "2026-06-10" },
    active: true,
    lastGeneratedFor: null,
    createdAt: now,
    updatedAt: now
  });

  const once = generateDueTodayItems(data, "2026-06-10", now);
  const twice = generateDueTodayItems(once.data, "2026-06-10", now);
  const generated = twice.data.goalCards[2].todayItems.filter((item) => item.id === "item-rule-ship-check-2026-06-10");

  assert.equal(generated.length, 1);
  assert.equal(generated[0].source, "date_triggered");
  assert.equal(twice.generatedItemIds.length, 0);
});

test("biweekly routine rule generates on matching weekday and cadence", () => {
  const now = "2026-05-20T09:00:00.000Z";
  const data = createInitialData(now);
  data.goalCards[0].todayItems = [];

  const result = generateDueTodayItems(data, "2026-05-20", now);
  const generated = result.data.goalCards[0].todayItems.find((item) => item.id === "item-rule-report-biweekly-polish-2026-05-20");

  assert.equal(generated.title, "Polish narrative and risks section");
  assert.equal(generated.source, "routine");
  assert.equal(result.generatedItemIds.includes(generated.id), true);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test tests/rules.test.mjs
```

Expected: FAIL with module-not-found for `src/domain/rules.js`.

- [ ] **Step 3: Implement date helpers**

Create `src/domain/date.js`:

```js
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toLocalDateKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekdayForDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`).getDay();
}

export function daysBetween(startDateKey, endDateKey) {
  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function isSameOrAfter(dateKey, maybeEarlierDateKey) {
  return daysBetween(maybeEarlierDateKey, dateKey) >= 0;
}
```

- [ ] **Step 4: Implement idempotent rule generation**

Create `src/domain/rules.js`:

```js
import { daysBetween, isSameOrAfter, weekdayForDateKey } from "./date.js";

export function generateDueTodayItems(data, todayKey, nowIso) {
  const generatedItemIds = [];
  const goalCards = data.goalCards.map((card) => {
    if (card.status !== "active") return card;

    let todayItems = [...card.todayItems];
    let generatedForCard = false;
    const rules = card.rules.map((rule) => {
      if (!shouldGenerate(rule, todayKey)) return rule;

      const itemId = `item-${rule.id}-${todayKey}`;
      const alreadyExists = todayItems.some((item) => item.id === itemId);
      if (alreadyExists) return rule;

      todayItems = [
        ...todayItems,
        {
          id: itemId,
          goalCardId: card.id,
          title: rule.titleTemplate,
          status: "open",
          source: rule.type === "routine" ? "routine" : "date_triggered",
          scheduledFor: todayKey,
          doneAt: null,
          skippedAt: null,
          note: "",
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ];
      generatedItemIds.push(itemId);
      generatedForCard = true;
      return { ...rule, lastGeneratedFor: todayKey, updatedAt: nowIso };
    });

    return { ...card, todayItems, rules, updatedAt: generatedForCard ? nowIso : card.updatedAt };
  });

  return { data: { ...data, goalCards, updatedAt: nowIso }, generatedItemIds };
}

function shouldGenerate(rule, todayKey) {
  if (!rule.active) return false;
  if (rule.lastGeneratedFor === todayKey) return false;

  if (rule.type === "date_triggered_check") {
    return rule.schedule.date === todayKey;
  }

  if (rule.type === "routine") {
    const weekdayMatches = rule.schedule.weekdays.includes(weekdayForDateKey(todayKey));
    if (!weekdayMatches) return false;
    if (!isSameOrAfter(todayKey, rule.schedule.startDate)) return false;
    if (rule.schedule.cadence === "weekly") return true;
    if (rule.schedule.cadence === "biweekly") return daysBetween(rule.schedule.startDate, todayKey) % 14 === 0;
  }

  return false;
}
```

- [ ] **Step 5: Run rule tests**

Run:

```bash
node --test tests/rules.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/domain/date.js src/domain/rules.js tests/rules.test.mjs
git commit -m "feat: generate rule-based today items"
```

## Task 4: Ranking and Home Model

**Files:**
- Create: `src/domain/ranking.js`
- Create: `tests/ranking.test.mjs`

- [ ] **Step 1: Write failing ranking tests**

Create `tests/ranking.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";

test("home model shows top 3 open today items before collapsed cards", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");

  assert.equal(model.topTodayItems.length, 3);
  assert.equal(model.focusCards.length, 3);
  assert.equal(model.backlogCards.length, 1);
  assert.equal(model.focusCards[0].expanded, false);
  assert.equal(model.backlogCollapsed, true);
});

test("pinned cards outrank unpinned cards", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const weekly = data.goalCards.find((card) => card.id === "card-weekly-planning");
  weekly.pinned = true;
  weekly.todayItems.push({
    id: "item-weekly-plan",
    goalCardId: "card-weekly-planning",
    title: "Draft next week plan",
    status: "open",
    source: "manual",
    scheduledFor: "2026-05-22",
    doneAt: null,
    skippedAt: null,
    note: "",
    createdAt: "2026-05-22T09:12:00.000Z",
    updatedAt: "2026-05-22T09:12:00.000Z"
  });

  const model = buildHomeModel(data, "2026-05-22");

  assert.equal(model.focusCards[0].id, "card-weekly-planning");
  assert.match(model.focusCards[0].sortReason, /Pinned/);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test tests/ranking.test.mjs
```

Expected: FAIL with module-not-found for `src/domain/ranking.js`.

- [ ] **Step 3: Implement ranking**

Create `src/domain/ranking.js`:

```js
const TYPE_WEIGHT = {
  ad_hoc: 34,
  routine: 28,
  deadline: 26,
  project: 20
};

export function buildHomeModel(data, todayKey) {
  const activeCards = data.goalCards.filter((card) => card.status === "active" && !isSnoozed(card, todayKey));
  const scored = activeCards
    .map((card) => {
      const score = scoreCard(card, todayKey);
      return { ...card, score, sortReason: reasonFor(card, todayKey) };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const focusCards = scored.slice(0, 3).map(toCollapsedCard);
  const backlogCards = scored.slice(3).map(toCollapsedCard);
  const topTodayItems = deriveTopTodayItems(scored, todayKey);
  const parkingCards = data.goalCards.filter((card) => card.status === "paused" || isSnoozed(card, todayKey)).map(toCollapsedCard);

  return {
    date: todayKey,
    summary: summaryFor(topTodayItems, focusCards),
    topTodayItems,
    focusCards,
    backlogCards,
    parkingCards,
    backlogCollapsed: true
  };
}

export function scoreCard(card, todayKey) {
  let score = 0;
  if (card.pinned) score += 100;
  score += TYPE_WEIGHT[card.type] ?? 0;
  score += Number(card.importance ?? 0) * 10;
  score += openItemsForToday(card, todayKey).length * 8;
  score += card.todayItems.some((item) => item.source === "date_triggered" && item.scheduledFor === todayKey && item.status === "open") ? 20 : 0;
  return score;
}

function deriveTopTodayItems(cards, todayKey) {
  return cards
    .flatMap((card) => openItemsForToday(card, todayKey).map((item) => ({
      id: item.id,
      goalCardId: card.id,
      goalTitle: card.title,
      goalType: card.type,
      title: item.title,
      reason: reasonFor(card, todayKey),
      score: card.score
    })))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 3);
}

function toCollapsedCard(card) {
  return {
    id: card.id,
    title: card.title,
    type: card.type,
    sortReason: card.sortReason,
    openItemCount: card.todayItems.filter((item) => item.status === "open").length,
    linkCount: card.links.length,
    expanded: false,
    pinned: card.pinned
  };
}

function openItemsForToday(card, todayKey) {
  return card.todayItems.filter((item) => item.status === "open" && (!item.scheduledFor || item.scheduledFor <= todayKey));
}

function isSnoozed(card, todayKey) {
  return Boolean(card.snoozedUntil && card.snoozedUntil > todayKey);
}

function reasonFor(card, todayKey) {
  if (card.pinned) return "Pinned to the front.";
  if (card.todayItems.some((item) => item.source === "date_triggered" && item.scheduledFor === todayKey && item.status === "open")) return "Today has a delivery check.";
  if (card.type === "routine") return "Routine work is in its active window.";
  if (card.type === "ad_hoc") return "Needs owner and closure today.";
  if (card.type === "project") return "Important project work is ready to move.";
  return "Deadline work needs attention.";
}

function summaryFor(topTodayItems, focusCards) {
  if (topTodayItems.length > 0) return `Today starts with ${topTodayItems[0].title}.`;
  if (focusCards.length > 0) return `No open item yet. Start by reviewing ${focusCards[0].title}.`;
  return "No active anchors. Add one thing worth protecting today.";
}
```

- [ ] **Step 4: Run ranking tests**

Run:

```bash
node --test tests/ranking.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/domain/ranking.js tests/ranking.test.mjs
git commit -m "feat: rank focus cards and top items"
```

## Task 5: Events, Snapshots, and Repository

**Files:**
- Create: `src/domain/events.js`
- Create: `src/domain/snapshots.js`
- Create: `src/storage/repository.js`
- Create: `tests/snapshots.test.mjs`

- [ ] **Step 1: Write failing snapshot tests**

Create `tests/snapshots.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";
import { createBehaviorEvent } from "../src/domain/events.js";
import { upsertDailySnapshot } from "../src/domain/snapshots.js";
import { createMemoryRepository } from "../src/storage/repository.js";

test("daily snapshot is created once and updated during the day", async () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");
  const event = createBehaviorEvent("today_item_completed", "2026-05-22T10:00:00.000Z", {
    goalCardId: "card-biweekly-report",
    todayItemId: "item-report-polish",
    before: { status: "open" },
    after: { status: "done" }
  });

  const withInitial = upsertDailySnapshot(data, "2026-05-22", model, []);
  const withUpdate = upsertDailySnapshot({ ...withInitial, behaviorEvents: [event] }, "2026-05-22", model, ["item-report-polish"]);

  assert.equal(withUpdate.dailySnapshots.length, 1);
  assert.deepEqual(withUpdate.dailySnapshots[0].completedTodayItemIds, ["item-report-polish"]);
  assert.deepEqual(withUpdate.dailySnapshots[0].behaviorEventIds, [event.id]);
});

test("memory repository saves and loads data", async () => {
  const repo = createMemoryRepository();
  const data = createInitialData("2026-05-22T09:12:00.000Z");

  await repo.save(data);
  const loaded = await repo.load();

  assert.equal(loaded.goalCards.length, data.goalCards.length);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test tests/snapshots.test.mjs
```

Expected: FAIL with module-not-found for `src/domain/events.js`.

- [ ] **Step 3: Implement behavior events**

Create `src/domain/events.js`:

```js
export function createBehaviorEvent(type, timestamp, details = {}) {
  return {
    id: `event-${timestamp}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp,
    goalCardId: details.goalCardId ?? null,
    todayItemId: details.todayItemId ?? null,
    before: details.before ?? null,
    after: details.after ?? null,
    context: details.context ?? {}
  };
}
```

- [ ] **Step 4: Implement daily snapshots**

Create `src/domain/snapshots.js`:

```js
export function upsertDailySnapshot(data, dateKey, homeModel, completedTodayItemIds = []) {
  const existing = data.dailySnapshots.find((snapshot) => snapshot.date === dateKey);
  const behaviorEventIds = data.behaviorEvents.map((event) => event.id);
  const generatedTodayItemIds = data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === dateKey && (item.source === "routine" || item.source === "date_triggered"))
      .map((item) => item.id)
  );
  const manualTodayItemIds = data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === dateKey && item.source === "manual")
      .map((item) => item.id)
  );

  const nextSnapshot = existing
    ? {
        ...existing,
        finalFocusLaneCardIds: homeModel.focusCards.map((card) => card.id),
        finalBacklogCardIds: homeModel.backlogCards.map((card) => card.id),
        generatedTodayItemIds,
        manualTodayItemIds,
        completedTodayItemIds,
        skippedTodayItemIds: collectSkipped(data, dateKey),
        snoozedCardIds: collectSnoozed(data),
        behaviorEventIds
      }
    : {
        date: dateKey,
        initialFocusLaneCardIds: homeModel.focusCards.map((card) => card.id),
        initialBacklogCardIds: homeModel.backlogCards.map((card) => card.id),
        finalFocusLaneCardIds: homeModel.focusCards.map((card) => card.id),
        finalBacklogCardIds: homeModel.backlogCards.map((card) => card.id),
        generatedTodayItemIds,
        manualTodayItemIds,
        completedTodayItemIds,
        skippedTodayItemIds: collectSkipped(data, dateKey),
        snoozedCardIds: collectSnoozed(data),
        behaviorEventIds,
        optionalReflection: ""
      };

  return {
    ...data,
    dailySnapshots: [
      ...data.dailySnapshots.filter((snapshot) => snapshot.date !== dateKey),
      nextSnapshot
    ]
  };
}

function collectSkipped(data, dateKey) {
  return data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === dateKey && item.status === "skipped")
      .map((item) => item.id)
  );
}

function collectSnoozed(data) {
  return data.goalCards.filter((card) => card.snoozedUntil).map((card) => card.id);
}
```

- [ ] **Step 5: Implement repositories**

Create `src/storage/repository.js`:

```js
const STORAGE_KEY = "focus-anchor-data";

export function createMemoryRepository(initialData = null) {
  let current = initialData;
  return {
    async load() {
      return current;
    },
    async save(data) {
      current = structuredClone(data);
      return current;
    }
  };
}

export function createChromeRepository(chromeStorage = globalThis.chrome?.storage?.local) {
  return {
    async load() {
      const result = await chromeStorage.get(STORAGE_KEY);
      return result[STORAGE_KEY] ?? null;
    },
    async save(data) {
      await chromeStorage.set({ [STORAGE_KEY]: data });
      return data;
    }
  };
}
```

- [ ] **Step 6: Run snapshot tests**

Run:

```bash
node --test tests/snapshots.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/domain/events.js src/domain/snapshots.js src/storage/repository.js tests/snapshots.test.mjs
git commit -m "feat: record events and daily snapshots"
```

## Task 6: UI View Model and Rendering

**Files:**
- Create: `src/ui/viewModel.js`
- Create: `src/ui/render.js`
- Create: `tests/viewModel.test.mjs`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing view model tests**

Create `tests/viewModel.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";
import { toViewModel } from "../src/ui/viewModel.js";
import { renderAppHtml } from "../src/ui/render.js";

test("view model keeps Top 3 as the first execution surface", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z");

  assert.equal(viewModel.topTasks.length, 3);
  assert.equal(viewModel.focusCards.every((card) => card.expanded === false), true);
  assert.equal(viewModel.backlog.collapsed, true);
});

test("rendered html includes collapsed cards and a collapsed backlog", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z"));

  assert.match(html, /Top 3 Today Items/);
  assert.match(html, /Show backlog/);
  assert.match(html, /Expand/);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: FAIL with module-not-found for `src/ui/viewModel.js`.

- [ ] **Step 3: Implement the view model**

Create `src/ui/viewModel.js`:

```js
export function toViewModel(homeModel, nowIso) {
  const date = new Date(nowIso);
  return {
    dateLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    summary: homeModel.summary,
    metaLine: `${homeModel.topTodayItems.length} ready - Backlog collapsed`,
    topTasks: homeModel.topTodayItems,
    focusCards: homeModel.focusCards,
    backlog: {
      collapsed: homeModel.backlogCollapsed,
      count: homeModel.backlogCards.length,
      cards: homeModel.backlogCards
    },
    parkingCount: homeModel.parkingCards.length
  };
}
```

- [ ] **Step 4: Implement pure HTML rendering**

Create `src/ui/render.js`:

```js
export function renderAppHtml(viewModel) {
  return `
    <header class="topbar">
      <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
      <div class="top-actions">
        <span>${escapeHtml(viewModel.dateLabel)}</span>
        <span>Snapshot saved</span>
        <button class="button" data-action="settings">Settings</button>
        <button class="button primary" data-action="quick-add">Quick Add</button>
      </div>
    </header>
    <section class="daily-panel" aria-label="Today summary">
      <div>
        <div class="summary-label">Today's anchor</div>
        <h1>${escapeHtml(viewModel.summary)}</h1>
      </div>
      <div class="daily-meta">
        <div>${escapeHtml(viewModel.metaLine)}</div>
        <div>Local only</div>
      </div>
    </section>
    <section class="top-tasks" aria-label="Top 3 Today Items">
      ${viewModel.topTasks.length > 0 ? viewModel.topTasks.map(renderTopTask).join("") : renderEmptyTopTasks()}
    </section>
    <section class="focus-lane" aria-label="Focus Lane">
      ${viewModel.focusCards.map(renderFocusCard).join("")}
    </section>
    <section class="backlog" aria-label="Backlog Strip">
      <div class="section-head"><span>Backlog</span><span>Collapsed by default</span></div>
      <div class="backlog-collapsed">
        <span>${viewModel.backlog.count} lower-priority cards hidden to keep the page quiet.</span>
        <button class="button" data-action="show-backlog">Show backlog</button>
      </div>
    </section>
    <section class="parking" aria-label="Parking">
      <span>Parking / Paused</span>
      <span>${viewModel.parkingCount} cards hidden until their return date</span>
    </section>
  `;
}

export function mountApp(container, viewModel) {
  container.innerHTML = renderAppHtml(viewModel);
}

function renderTopTask(task) {
  return `
    <article class="top-task" data-task-id="${escapeHtml(task.id)}" data-card-id="${escapeHtml(task.goalCardId)}">
      <div class="task-meta">
        <span>${escapeHtml(task.goalTitle)}</span>
        <span class="tag-${classNameForType(task.goalType)}">${labelForType(task.goalType)}</span>
      </div>
      <h2 class="task-title">${escapeHtml(task.title)}</h2>
      <div class="task-foot">
        <span>${escapeHtml(task.reason)}</span>
        <button class="complete-action" type="button" data-action="complete-item" data-item-id="${escapeHtml(task.id)}" aria-label="Mark ${escapeHtml(task.title)} done"><span class="tiny-check"><span class="checkbox"></span><span>Done</span></span></button>
      </div>
    </article>
  `;
}

function renderFocusCard(card) {
  return `
    <article class="goal-card ${card.pinned ? "primary" : ""}" data-card-id="${escapeHtml(card.id)}">
      <div class="card-band">
        <div><div class="rank">${escapeHtml(card.title)}</div><div class="type tag-${classNameForType(card.type)}">${labelForType(card.type)}</div></div>
        <div class="reason">${escapeHtml(card.sortReason)}</div>
      </div>
      <div class="card-body">
        <h2 class="card-title">${escapeHtml(card.title)}</h2>
        <div class="collapsed-meta">
          <div class="collapsed-stat"><strong>${card.openItemCount}</strong>open items</div>
          <div class="collapsed-stat"><strong>${card.linkCount}</strong>links</div>
        </div>
        <div class="card-footer">
          <div class="footer-group">
            <button class="button primary" data-action="expand-card" data-card-id="${escapeHtml(card.id)}">Expand</button>
            <button class="button text" data-action="open-all" data-card-id="${escapeHtml(card.id)}">Open all</button>
          </div>
          <div class="footer-group">
            <button class="button" data-action="pin-card" data-card-id="${escapeHtml(card.id)}">Pin</button>
            <button class="button" data-action="snooze-card" data-card-id="${escapeHtml(card.id)}">Snooze</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyTopTasks() {
  return `<article class="top-task"><h2 class="task-title">No open item yet.</h2><div class="task-foot"><span>Add one thing worth protecting today.</span><button class="button primary" data-action="quick-add">Quick Add</button></div></article>`;
}

function labelForType(type) {
  return ({ project: "Project", routine: "Routine", ad_hoc: "Ad Hoc", deadline: "Deadline" })[type] ?? type;
}

function classNameForType(type) {
  return ({ project: "project", routine: "routine", ad_hoc: "adhoc", deadline: "deadline" })[type] ?? "project";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
```

- [ ] **Step 5: Replace CSS with V2 mockup styles**

Replace `src/styles.css` with the exact CSS from `docs/design/focus-anchor-new-tab-mockup-v2.html` lines 8-832, removing the shared four-space indentation from each CSS line and excluding the opening `<style>` and closing `</style>` tags. The mockup file is the source of truth for the confirmed visual direction. After replacement, confirm these selectors are present because `render.js` emits them:

```css
.topbar
.brand
.mark
.top-actions
.button
.daily-panel
.summary-label
.daily-meta
.top-tasks
.top-task
.task-meta
.task-title
.task-foot
.tiny-check
.goal-card
.card-band
.rank
.type
.reason
.card-body
.card-title
.collapsed-meta
.collapsed-stat
.checkbox
.complete-action
.completion-toast
.focus-lane
.backlog
.backlog-collapsed
.parking
```

After copying, keep the `@media (prefers-reduced-motion: reduce)` block from the mockup.

Run:

```bash
node --check src/ui/render.js
```

Expected: PASS.

- [ ] **Step 6: Run view model tests**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/ui/viewModel.js src/ui/render.js src/styles.css tests/viewModel.test.mjs
git commit -m "feat: render collapsed new tab view"
```

## Task 7: User Actions and Completion Reward

**Files:**
- Create: `src/ui/actions.js`
- Create: `tests/actions.test.mjs`
- Modify: `src/newtab.js`
- Modify: `src/ui/render.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing action tests**

Create `tests/actions.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { addTodayItem, completeTodayItem, pinCard, snoozeCard } from "../src/ui/actions.js";

test("completeTodayItem marks item done and records behavior event", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const next = completeTodayItem(data, "item-report-polish", "2026-05-22T10:00:00.000Z");
  const item = next.goalCards[0].todayItems.find((entry) => entry.id === "item-report-polish");

  assert.equal(item.status, "done");
  assert.equal(item.doneAt, "2026-05-22T10:00:00.000Z");
  assert.equal(next.behaviorEvents[0].type, "today_item_completed");
});

test("pinCard and snoozeCard update card state", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const pinned = pinCard(data, "card-weekly-planning", "2026-05-22T10:00:00.000Z");
  const snoozed = snoozeCard(pinned, "card-weekly-planning", "2026-05-24", "2026-05-22T10:05:00.000Z");
  const card = snoozed.goalCards.find((entry) => entry.id === "card-weekly-planning");

  assert.equal(card.pinned, true);
  assert.equal(card.snoozedUntil, "2026-05-24");
  assert.equal(snoozed.behaviorEvents.at(-1).type, "card_snoozed");
});

test("addTodayItem creates a manual item on the selected card", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const next = addTodayItem(data, "card-focus-anchor-mvp", "Write first implementation task", "2026-05-22", "2026-05-22T10:10:00.000Z");
  const card = next.goalCards.find((entry) => entry.id === "card-focus-anchor-mvp");
  const item = card.todayItems.at(-1);

  assert.equal(item.title, "Write first implementation task");
  assert.equal(item.source, "manual");
  assert.equal(item.scheduledFor, "2026-05-22");
  assert.equal(next.behaviorEvents.at(-1).type, "manual_today_item_created");
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
node --test tests/actions.test.mjs
```

Expected: FAIL with module-not-found for `src/ui/actions.js`.

- [ ] **Step 3: Implement pure actions**

Create `src/ui/actions.js`:

```js
import { createBehaviorEvent } from "../domain/events.js";

export function completeTodayItem(data, itemId, nowIso) {
  let changedCardId = null;
  const goalCards = data.goalCards.map((card) => {
    const todayItems = card.todayItems.map((item) => {
      if (item.id !== itemId) return item;
      changedCardId = card.id;
      return { ...item, status: "done", doneAt: nowIso, updatedAt: nowIso };
    });
    return changedCardId === card.id ? { ...card, todayItems, updatedAt: nowIso } : card;
  });

  if (!changedCardId) return data;

  return {
    ...data,
    goalCards,
    updatedAt: nowIso,
    behaviorEvents: [
      ...data.behaviorEvents,
      createBehaviorEvent("today_item_completed", nowIso, {
        goalCardId: changedCardId,
        todayItemId: itemId,
        before: { status: "open" },
        after: { status: "done" }
      })
    ]
  };
}

export function pinCard(data, cardId, nowIso) {
  return updateCard(data, cardId, nowIso, "card_pinned", (card) => ({ ...card, pinned: true }));
}

export function snoozeCard(data, cardId, snoozedUntil, nowIso) {
  return updateCard(data, cardId, nowIso, "card_snoozed", (card) => ({ ...card, snoozedUntil }));
}

export function addTodayItem(data, cardId, title, todayKey, nowIso) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return data;

  const itemId = `item-manual-${Date.parse(nowIso)}-${slugify(trimmedTitle)}`;
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return {
      ...card,
      updatedAt: nowIso,
      todayItems: [
        ...card.todayItems,
        {
          id: itemId,
          goalCardId: card.id,
          title: trimmedTitle,
          status: "open",
          source: "manual",
          scheduledFor: todayKey,
          doneAt: null,
          skippedAt: null,
          note: "",
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ]
    };
  });

  if (!changed) return data;

  return {
    ...data,
    goalCards,
    updatedAt: nowIso,
    behaviorEvents: [
      ...data.behaviorEvents,
      createBehaviorEvent("manual_today_item_created", nowIso, {
        goalCardId: cardId,
        todayItemId: itemId,
        after: { title: trimmedTitle, scheduledFor: todayKey }
      })
    ]
  };
}

function updateCard(data, cardId, nowIso, eventType, update) {
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return { ...update(card), updatedAt: nowIso };
  });

  if (!changed) return data;

  return {
    ...data,
    goalCards,
    updatedAt: nowIso,
    behaviorEvents: [
      ...data.behaviorEvents,
      createBehaviorEvent(eventType, nowIso, { goalCardId: cardId })
    ]
  };
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "item";
}
```

- [ ] **Step 4: Wire browser entrypoint**

Replace `src/newtab.js` with:

```js
import { createInitialData } from "./domain/sampleData.js";
import { toLocalDateKey } from "./domain/date.js";
import { generateDueTodayItems } from "./domain/rules.js";
import { buildHomeModel } from "./domain/ranking.js";
import { upsertDailySnapshot } from "./domain/snapshots.js";
import { createChromeRepository } from "./storage/repository.js";
import { toViewModel } from "./ui/viewModel.js";
import { mountApp } from "./ui/render.js";
import { addTodayItem, completeTodayItem, pinCard, snoozeCard } from "./ui/actions.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#completion-toast");
const repo = createChromeRepository();
let appData = await repo.load();

if (!appData) {
  appData = createInitialData(new Date().toISOString());
  await repo.save(appData);
}

await refresh();

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const nowIso = new Date().toISOString();

  if (action === "complete-item") {
    const itemId = target.dataset.itemId;
    showCompletionReward(target);
    appData = completeTodayItem(appData, itemId, nowIso);
    await repo.save(appData);
    window.setTimeout(refresh, 700);
    return;
  }

  if (action === "quick-add") {
    const title = window.prompt("One thing worth protecting today");
    if (!title?.trim()) return;
    const todayKey = toLocalDateKey(nowIso);
    const targetCardId = buildHomeModel(appData, todayKey).focusCards[0]?.id ?? appData.goalCards.find((card) => card.status === "active")?.id;
    if (!targetCardId) return;
    appData = addTodayItem(appData, targetCardId, title, todayKey, nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "pin-card") {
    appData = pinCard(appData, target.dataset.cardId, nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "snooze-card") {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    appData = snoozeCard(appData, target.dataset.cardId, toLocalDateKey(tomorrow), nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "open-all") {
    const card = appData.goalCards.find((entry) => entry.id === target.dataset.cardId);
    for (const link of card.links.filter((entry) => entry.includeInOpenAll)) {
      chrome.tabs.create({ url: link.url, active: false });
    }
  }
});

async function refresh() {
  const nowIso = new Date().toISOString();
  const todayKey = toLocalDateKey(nowIso);
  const generated = generateDueTodayItems(appData, todayKey, nowIso);
  appData = generated.data;
  const homeModel = buildHomeModel(appData, todayKey);
  appData = upsertDailySnapshot(appData, todayKey, homeModel, completedIdsForToday(appData, todayKey));
  await repo.save(appData);
  mountApp(app, toViewModel(homeModel, nowIso));
}

function completedIdsForToday(data, todayKey) {
  return data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === todayKey && item.status === "done")
      .map((item) => item.id)
  );
}

function showCompletionReward(button) {
  const task = button.closest(".top-task");
  button.classList.add("completed");
  task.classList.add("is-completing");
  window.setTimeout(() => {
    task.classList.remove("is-completing");
    task.classList.add("is-complete");
  }, 520);
  toast.textContent = "Task closed. One less thing pulling on your day.";
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}
```

- [ ] **Step 5: Run action tests**

Run:

```bash
node --test tests/actions.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Expand syntax check script**

Replace `package.json` with:

```json
{
  "name": "focus-anchor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "check": "node --check src/newtab.js && node --check src/domain/schema.js && node --check src/domain/date.js && node --check src/domain/rules.js && node --check src/domain/ranking.js && node --check src/domain/snapshots.js && node --check src/domain/events.js && node --check src/storage/repository.js && node --check src/ui/viewModel.js && node --check src/ui/render.js && node --check src/ui/actions.js"
  }
}
```

- [ ] **Step 7: Run all tests and syntax checks**

Run:

```bash
npm test
npm run check
```

Expected: all tests PASS and all `node --check` commands PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json src/ui/actions.js src/newtab.js src/ui/render.js tests/actions.test.mjs
git commit -m "feat: handle item completion and card actions"
```

## Task 8: Browser Verification and Polish

**Files:**
- Modify: `src/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm test
npm run check
```

Expected: all tests PASS and syntax checks PASS.

- [ ] **Step 2: Load extension manually**

Run no command for this step. In Chrome:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Load unpacked".
4. Select `/Users/yanlin/Desktop/projects/codex/focus-anchor`.
5. Open a new tab.

Expected: Focus Anchor replaces the New Tab page.

- [ ] **Step 3: Verify default view**

Expected visual state:

- Warm daily header visible.
- Top 3 Today Items visible above Focus Lane.
- Focus Lane cards collapsed by default.
- Backlog collapsed by default.
- Parking visible as low-emphasis row.
- No text overlap at desktop width.

- [ ] **Step 4: Verify completion reward**

Click the first Top 3 item `Done`.

Expected:

- Checkbox fills green and draws the check.
- Task surface briefly pulses warm.
- Compact toast appears.
- Task becomes muted completed state.
- Page does not jump.

- [ ] **Step 5: Verify local persistence**

Open a second new tab.

Expected:

- The completed item remains completed or is removed from Top 3 according to the current rendering behavior.
- The page still loads without console errors other than a favicon 404 if no icon file exists.

- [ ] **Step 6: Update README verification notes**

Append to `README.md`:

```md
## Manual Verification

After loading the extension locally:

- Open a new tab and confirm the Top 3 Today Items appear above collapsed Focus Lane cards.
- Confirm Backlog is collapsed by default.
- Click a Top 3 `Done` action and confirm the completion reward motion plays without shifting the layout.
- Open another new tab and confirm local state persists.
```

- [ ] **Step 7: Commit**

Run:

```bash
git add src/styles.css README.md
git commit -m "docs: add manual verification notes"
```

## Final Verification

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npm test
npm run check
```

Expected: all tests and syntax checks pass.

- [ ] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: no output.
