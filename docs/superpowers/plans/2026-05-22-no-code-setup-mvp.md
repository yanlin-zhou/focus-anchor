# No-code Setup MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-code first-run setup and Manage experience so beta users can configure Focus Anchor without editing source files.

**Architecture:** Keep the existing vanilla JavaScript extension and domain-module structure. Add focused domain modules for empty/setup data, templates, import/export, and manage actions; add setup/manage render modules; refactor `src/newtab.js` into a small state router that chooses setup or home based on stored data.

**Tech Stack:** Chrome Manifest V3, vanilla ES modules, `chrome.storage.local`, Node built-in test runner, static HTML/CSS/JS.

---

## File Structure

Create:

- `src/domain/emptyData.js`: empty app shell, setup metadata, MVP-data migration, setup-state helpers.
- `src/domain/templates.js`: setup template definitions, draft creation/update helpers, draft validation, draft-to-AppData conversion.
- `src/domain/importExport.js`: JSON serialization, JSON parse/validation, import summary, reset helper.
- `src/domain/manageActions.js`: no-code edits for cards, links, today items, rules.
- `src/ui/setupViewModel.js`: setup draft and live-preview view model.
- `src/ui/setupRender.js`: not-set-up state and setup wizard markup.
- `src/ui/manageViewModel.js`: Manage page list/detail/rules/data view model.
- `src/ui/manageRender.js`: Manage page markup.
- `src/ui/forms.js`: DOM form extraction helpers shared by setup/manage.
- `src/manage.html`: extension Manage page.
- `src/manage.js`: Manage page entrypoint.
- `tests/emptyData.test.mjs`
- `tests/templates.test.mjs`
- `tests/importExport.test.mjs`
- `tests/manageActions.test.mjs`
- `tests/setupRender.test.mjs`
- `tests/manageRender.test.mjs`

Modify:

- `manifest.json`: add manage page access via extension page only if needed; no new permissions expected.
- `src/newtab.html`: keep existing shell; no page duplication.
- `src/newtab.js`: state router for not-set-up/setup/home, setup event handling, Manage link handling.
- `src/styles.css`: setup/manage layouts, form controls, modal, danger zone, responsive rules.
- `src/domain/schema.js`: validate optional `setup`, rule schedule shape, and import data.
- `src/storage/repository.js`: add `remove()` to support reset.
- `src/ui/render.js`: add small Manage entry point to home header.
- `src/ui/viewModel.js`: include Manage affordance if needed.
- `package.json`: extend `check` script to include new JS files.
- `docs/install-and-usage.md`: replace code-edit setup with no-code setup instructions after implementation.
- Existing tests: update expectations that first-run sample data is no longer written by `newtab.js`; keep `createInitialData()` tests for fixture compatibility.

Implementation should not remove `src/domain/sampleData.js`; keep it as test/demo fixture for existing tests until a later cleanup.

---

## Task 1: Empty App Data, Setup Metadata, and Migration

**Files:**
- Create: `src/domain/emptyData.js`
- Test: `tests/emptyData.test.mjs`
- Modify: `src/domain/schema.js`
- Modify: `src/storage/repository.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing empty-data tests**

Create `tests/emptyData.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAppData, ensureSetupMeta, getSetupState, markSetupSkipped } from "../src/domain/emptyData.js";
import { createInitialData } from "../src/domain/sampleData.js";
import { validateAppData } from "../src/domain/schema.js";
import { createMemoryRepository } from "../src/storage/repository.js";

test("empty app shell contains setup metadata and no demo cards", () => {
  const data = createEmptyAppData("2026-05-22T09:00:00.000Z");

  assert.equal(data.version, 1);
  assert.deepEqual(data.goalCards, []);
  assert.deepEqual(data.behaviorEvents, []);
  assert.deepEqual(data.dailySnapshots, []);
  assert.deepEqual(data.setup, {
    completedAt: null,
    skippedAt: null,
    draft: null,
    version: 1
  });
  assert.equal(validateAppData(data).ok, true);
});

test("existing MVP data migrates to setup-completed data", () => {
  const mvpData = createInitialData("2026-05-22T09:00:00.000Z");
  const migrated = ensureSetupMeta(mvpData, "2026-05-22T10:00:00.000Z");

  assert.equal(migrated.setup.completedAt, "2026-05-22T10:00:00.000Z");
  assert.equal(migrated.setup.skippedAt, null);
  assert.equal(migrated.setup.draft, null);
  assert.equal(migrated.goalCards.length > 0, true);
  assert.equal(validateAppData(migrated).ok, true);
});

test("setup state distinguishes empty, skipped, draft, and complete", () => {
  const empty = createEmptyAppData("2026-05-22T09:00:00.000Z");
  const skipped = markSetupSkipped(empty, "2026-05-22T09:01:00.000Z");
  const draft = { ...empty, setup: { ...empty.setup, draft: { cards: [] } } };
  const complete = { ...empty, setup: { ...empty.setup, completedAt: "2026-05-22T09:02:00.000Z" } };

  assert.equal(getSetupState(null), "not_set_up");
  assert.equal(getSetupState(empty), "not_set_up");
  assert.equal(getSetupState(skipped), "skipped");
  assert.equal(getSetupState(draft), "in_progress");
  assert.equal(getSetupState(complete), "complete");
});

test("memory repository can remove local app data", async () => {
  const repo = createMemoryRepository(createEmptyAppData("2026-05-22T09:00:00.000Z"));

  assert.notEqual(await repo.load(), null);
  await repo.remove();
  assert.equal(await repo.load(), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/emptyData.test.mjs
```

Expected: FAIL with missing `src/domain/emptyData.js` and/or missing repository `remove()`.

- [ ] **Step 3: Implement empty app data helpers**

Create `src/domain/emptyData.js`:

```js
export function createEmptyAppData(nowIso = new Date().toISOString()) {
  return {
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    setup: createSetupMeta(),
    goalCards: [],
    behaviorEvents: [],
    dailySnapshots: []
  };
}

export function createSetupMeta(overrides = {}) {
  return {
    completedAt: null,
    skippedAt: null,
    draft: null,
    version: 1,
    ...overrides
  };
}

export function ensureSetupMeta(data, nowIso = new Date().toISOString()) {
  if (!data) return data;
  if (data.setup) {
    return {
      ...data,
      setup: createSetupMeta(data.setup)
    };
  }

  const completedAt = Array.isArray(data.goalCards) && data.goalCards.length > 0 ? nowIso : null;
  return {
    ...data,
    setup: createSetupMeta({ completedAt }),
    updatedAt: nowIso
  };
}

export function markSetupSkipped(data, nowIso = new Date().toISOString()) {
  return {
    ...ensureSetupMeta(data, nowIso),
    updatedAt: nowIso,
    setup: createSetupMeta({
      ...data.setup,
      skippedAt: nowIso
    })
  };
}

export function getSetupState(data) {
  if (!data) return "not_set_up";
  const setup = data.setup;
  if (!setup) return Array.isArray(data.goalCards) && data.goalCards.length > 0 ? "complete" : "not_set_up";
  if (setup.completedAt) return "complete";
  if (setup.draft) return "in_progress";
  if (setup.skippedAt) return "skipped";
  return "not_set_up";
}
```

- [ ] **Step 4: Extend repository with remove()**

Modify `src/storage/repository.js`:

```js
const STORAGE_KEY = "focus-anchor-data";

export function createMemoryRepository(initialData = null) {
  let current = cloneData(initialData);
  return {
    async load() {
      return cloneData(current);
    },
    async save(data) {
      current = cloneData(data);
      return cloneData(current);
    },
    async remove() {
      current = null;
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
    },
    async remove() {
      await chromeStorage.remove(STORAGE_KEY);
    }
  };
}

function cloneData(data) {
  return data === null ? null : structuredClone(data);
}
```

- [ ] **Step 5: Extend schema validation for setup metadata**

Modify `src/domain/schema.js` after top-level array checks:

```js
  if (data.setup !== undefined) {
    if (typeof data.setup !== "object" || data.setup === null) errors.push("setup must be an object");
    if (data.setup && data.setup.version !== 1) errors.push("setup version must be 1");
    if (data.setup && data.setup.completedAt !== null && typeof data.setup.completedAt !== "string") errors.push("setup completedAt must be null or a string");
    if (data.setup && data.setup.skippedAt !== null && typeof data.setup.skippedAt !== "string") errors.push("setup skippedAt must be null or a string");
  }
```

Do not validate full `setup.draft` shape in `validateAppData()`; draft validation belongs to `templates.js` because draft data is not yet canonical app data.

- [ ] **Step 6: Add new file to syntax checks**

Modify `package.json` `check` script to include:

```bash
node --check src/domain/emptyData.js
```

- [ ] **Step 7: Run targeted and full checks**

Run:

```bash
node --test tests/emptyData.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain/emptyData.js src/domain/schema.js src/storage/repository.js package.json tests/emptyData.test.mjs
git commit -m "feat: add setup metadata foundation"
```

---

## Task 2: Setup Templates and Draft Conversion

**Files:**
- Create: `src/domain/templates.js`
- Test: `tests/templates.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing template tests**

Create `tests/templates.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createDraft, createDraftCardFromTemplate, completeSetupDraft, SETUP_TEMPLATES, validateSetupDraft } from "../src/domain/templates.js";
import { validateAppData } from "../src/domain/schema.js";

const NOW = "2026-05-22T09:00:00.000Z";
const TODAY = "2026-05-22";

test("setup exposes four no-code templates", () => {
  assert.deepEqual(SETUP_TEMPLATES.map((template) => template.id), [
    "project_progress",
    "routine_work",
    "ad_hoc_issue",
    "date_check"
  ]);
});

test("templates create expected default card types and importance", () => {
  assert.equal(createDraftCardFromTemplate("project_progress", NOW).type, "project");
  assert.equal(createDraftCardFromTemplate("project_progress", NOW).importance, 4);
  assert.equal(createDraftCardFromTemplate("routine_work", NOW).type, "routine");
  assert.equal(createDraftCardFromTemplate("ad_hoc_issue", NOW).importance, 5);
  assert.equal(createDraftCardFromTemplate("date_check", NOW).type, "deadline");
});

test("setup draft requires at least one card and one today item", () => {
  assert.deepEqual(validateSetupDraft(createDraft()).errors, [
    "Add at least one focus card.",
    "Add at least one today item."
  ]);

  const cardOnly = createDraft({
    cards: [createDraftCardFromTemplate("project_progress", NOW)]
  });

  assert.deepEqual(validateSetupDraft(cardOnly).errors, ["Add at least one today item."]);
});

test("routine template creates weekly and biweekly rules", () => {
  const card = {
    ...createDraftCardFromTemplate("routine_work", NOW),
    title: "Biweekly report",
    items: [{ title: "Polish report", scheduledFor: TODAY }],
    routine: { title: "Polish report", cadence: "biweekly", weekdays: [4], startDate: TODAY }
  };

  const data = completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY);
  const rule = data.goalCards[0].rules[0];

  assert.equal(rule.type, "routine");
  assert.equal(rule.titleTemplate, "Polish report");
  assert.deepEqual(rule.schedule, { cadence: "biweekly", weekdays: [4], startDate: TODAY });
});

test("date check template creates a date-triggered reminder", () => {
  const card = {
    ...createDraftCardFromTemplate("date_check", NOW),
    title: "Launch follow-up",
    items: [{ title: "Prepare launch note", scheduledFor: TODAY }],
    dateReminder: { title: "Check whether launch shipped", date: "2026-05-30" }
  };

  const data = completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY);
  const rule = data.goalCards[0].rules[0];

  assert.equal(rule.type, "date_triggered_check");
  assert.equal(rule.titleTemplate, "Check whether launch shipped");
  assert.deepEqual(rule.schedule, { date: "2026-05-30" });
});

test("completed setup draft creates valid app data", () => {
  const card = {
    ...createDraftCardFromTemplate("project_progress", NOW),
    title: "Focus Anchor",
    items: [{ title: "Ship no-code setup", scheduledFor: TODAY }],
    links: [{ label: "Spec", url: "https://example.com/spec", kind: "doc", includeInOpenAll: true }]
  };

  const data = completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY);

  assert.equal(data.setup.completedAt, NOW);
  assert.equal(data.setup.draft, null);
  assert.equal(data.goalCards[0].todayItems[0].title, "Ship no-code setup");
  assert.equal(data.goalCards[0].links[0].label, "Spec");
  assert.equal(validateAppData(data).ok, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/templates.test.mjs
```

Expected: FAIL with missing `src/domain/templates.js`.

- [ ] **Step 3: Implement template module**

Create `src/domain/templates.js`:

```js
import { createEmptyAppData, createSetupMeta } from "./emptyData.js";

export const SETUP_TEMPLATES = [
  { id: "project_progress", label: "Project Progress", type: "project", importance: 4 },
  { id: "routine_work", label: "Routine Work", type: "routine", importance: 4 },
  { id: "ad_hoc_issue", label: "Ad Hoc Issue", type: "ad_hoc", importance: 5 },
  { id: "date_check", label: "Date Check", type: "deadline", importance: 4 }
];

export function createDraft(overrides = {}) {
  return {
    cards: [],
    activeCardId: null,
    ...overrides
  };
}

export function createDraftCardFromTemplate(templateId, nowIso = new Date().toISOString()) {
  const template = SETUP_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) throw new Error(`Unknown setup template: ${templateId}`);
  const cardId = `draft-${template.id}-${Date.parse(nowIso)}`;

  return {
    id: cardId,
    templateId,
    title: template.label,
    type: template.type,
    importance: template.importance,
    items: [],
    links: [],
    routine: null,
    dateReminder: null
  };
}

export function validateSetupDraft(draft) {
  const errors = [];
  const cards = draft?.cards ?? [];
  const itemCount = cards.flatMap((card) => card.items ?? []).filter((item) => item.title?.trim()).length;

  if (cards.length < 1) errors.push("Add at least one focus card.");
  if (cards.length > 5) errors.push("Keep setup to 5 focus cards or fewer.");
  if (itemCount < 1) errors.push("Add at least one today item.");

  return { ok: errors.length === 0, errors };
}

export function completeSetupDraft(draft, nowIso = new Date().toISOString(), todayKey) {
  const validation = validateSetupDraft(draft);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const data = createEmptyAppData(nowIso);
  const goalCards = draft.cards.map((card, index) => draftCardToGoalCard(card, index, nowIso, todayKey));

  return {
    ...data,
    setup: createSetupMeta({ completedAt: nowIso, draft: null }),
    goalCards,
    updatedAt: nowIso
  };
}

function draftCardToGoalCard(card, index, nowIso, todayKey) {
  const cardId = stableId("card", card.title || `focus-card-${index + 1}`, index);
  const todayItems = (card.items ?? [])
    .filter((item) => item.title?.trim())
    .map((item, itemIndex) => ({
      id: stableId("item", `${cardId}-${item.title}`, itemIndex),
      goalCardId: cardId,
      title: item.title.trim(),
      status: "open",
      source: "manual",
      scheduledFor: item.scheduledFor || todayKey,
      doneAt: null,
      skippedAt: null,
      note: "",
      createdAt: nowIso,
      updatedAt: nowIso
    }));

  const links = (card.links ?? [])
    .filter((link) => link.label?.trim() && link.url?.trim())
    .map((link, linkIndex) => ({
      id: stableId("link", `${cardId}-${link.label}`, linkIndex),
      goalCardId: cardId,
      label: link.label.trim(),
      url: link.url.trim(),
      kind: link.kind || "other",
      includeInOpenAll: link.includeInOpenAll !== false,
      createdAt: nowIso,
      updatedAt: nowIso
    }));

  return {
    id: cardId,
    title: card.title.trim(),
    type: card.type,
    importance: Number(card.importance ?? 3),
    status: "active",
    pinned: false,
    snoozedUntil: null,
    sortReason: "",
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    todayItems,
    links,
    rules: createRules(card, cardId, nowIso)
  };
}

function createRules(card, cardId, nowIso) {
  const rules = [];
  if (card.routine?.title?.trim()) {
    rules.push({
      id: stableId("rule", `${cardId}-${card.routine.title}`, 0),
      goalCardId: cardId,
      type: "routine",
      titleTemplate: card.routine.title.trim(),
      schedule: {
        cadence: card.routine.cadence,
        weekdays: card.routine.weekdays,
        startDate: card.routine.startDate
      },
      active: true,
      lastGeneratedFor: null,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  if (card.dateReminder?.title?.trim() && card.dateReminder?.date) {
    rules.push({
      id: stableId("rule", `${cardId}-${card.dateReminder.title}`, rules.length),
      goalCardId: cardId,
      type: "date_triggered_check",
      titleTemplate: card.dateReminder.title.trim(),
      schedule: { date: card.dateReminder.date },
      active: true,
      lastGeneratedFor: null,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  return rules;
}

function stableId(prefix, value, index) {
  const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || `${prefix}-${index + 1}`;
  return `${prefix}-${slug}-${index + 1}`;
}
```

- [ ] **Step 4: Add new file to syntax checks**

Modify `package.json` `check` script to include:

```bash
node --check src/domain/templates.js
```

- [ ] **Step 5: Run targeted and full checks**

Run:

```bash
node --test tests/templates.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/templates.js package.json tests/templates.test.mjs
git commit -m "feat: add setup templates"
```

---

## Task 3: Import, Export, Reset, and Validation Summaries

**Files:**
- Create: `src/domain/importExport.js`
- Test: `tests/importExport.test.mjs`
- Modify: `src/domain/schema.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing import/export tests**

Create `tests/importExport.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { parseImportJson, serializeExportData, summarizeAppData } from "../src/domain/importExport.js";
import { createMemoryRepository } from "../src/storage/repository.js";

test("export serializes complete app data as pretty JSON", () => {
  const data = createInitialData("2026-05-22T09:00:00.000Z");
  const json = serializeExportData(data);
  const parsed = JSON.parse(json);

  assert.equal(json.includes("\n  "), true);
  assert.equal(parsed.goalCards.length, data.goalCards.length);
  assert.deepEqual(parsed.behaviorEvents, []);
});

test("import parses valid JSON and reports summary counts", () => {
  const data = createInitialData("2026-05-22T09:00:00.000Z");
  const result = parseImportJson(JSON.stringify(data));

  assert.equal(result.ok, true);
  assert.equal(result.summary.cards, 4);
  assert.equal(result.summary.links, 7);
  assert.equal(result.summary.rules, 1);
  assert.equal(result.summary.openItems, 6);
  assert.equal(result.summary.doneItems, 0);
  assert.equal(result.summary.snapshots, 0);
});

test("import rejects invalid JSON without data", () => {
  const result = parseImportJson("{not json");

  assert.equal(result.ok, false);
  assert.match(result.error, /valid JSON/);
  assert.equal(result.data, null);
});

test("import rejects invalid app data with schema errors", () => {
  const result = parseImportJson(JSON.stringify({ goalCards: "bad", behaviorEvents: [], dailySnapshots: [] }));

  assert.equal(result.ok, false);
  assert.match(result.error, /goalCards must be an array/);
});

test("invalid import does not overwrite current repository state", async () => {
  const initial = createInitialData("2026-05-22T09:00:00.000Z");
  const repo = createMemoryRepository(initial);
  const result = parseImportJson("{bad");

  if (result.ok) await repo.save(result.data);

  assert.deepEqual(await repo.load(), initial);
});

test("summary counts behavior events and daily snapshots", () => {
  const data = {
    ...createInitialData("2026-05-22T09:00:00.000Z"),
    behaviorEvents: [{ id: "event-1" }],
    dailySnapshots: [{ date: "2026-05-22" }]
  };

  assert.equal(summarizeAppData(data).events, 1);
  assert.equal(summarizeAppData(data).snapshots, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/importExport.test.mjs
```

Expected: FAIL with missing `src/domain/importExport.js`.

- [ ] **Step 3: Implement import/export module**

Create `src/domain/importExport.js`:

```js
import { ensureSetupMeta } from "./emptyData.js";
import { validateAppData } from "./schema.js";

export function serializeExportData(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function parseImportJson(text, nowIso = new Date().toISOString()) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: null, summary: null, error: "Import file is not valid JSON." };
  }

  const data = ensureSetupMeta(parsed, nowIso);
  const validation = validateAppData(data);
  if (!validation.ok) {
    return {
      ok: false,
      data: null,
      summary: null,
      error: validation.errors.slice(0, 5).join(" ")
    };
  }

  return {
    ok: true,
    data,
    summary: summarizeAppData(data),
    error: null
  };
}

export function summarizeAppData(data) {
  const cards = data.goalCards ?? [];
  const items = cards.flatMap((card) => card.todayItems ?? []);
  return {
    cards: cards.length,
    links: cards.flatMap((card) => card.links ?? []).length,
    rules: cards.flatMap((card) => card.rules ?? []).length,
    openItems: items.filter((item) => item.status === "open").length,
    doneItems: items.filter((item) => item.status === "done").length,
    events: (data.behaviorEvents ?? []).length,
    snapshots: (data.dailySnapshots ?? []).length
  };
}
```

- [ ] **Step 4: Tighten schema for rule schedule shape**

Modify `src/domain/schema.js` inside the rule loop:

```js
      if (rule.type === "routine") {
        if (!["weekly", "biweekly"].includes(rule.schedule?.cadence)) errors.push(`rule ${rule.id} has invalid cadence`);
        if (!Array.isArray(rule.schedule?.weekdays)) errors.push(`rule ${rule.id} weekdays must be an array`);
        if (!rule.schedule?.startDate) errors.push(`rule ${rule.id} missing startDate`);
      }
      if (rule.type === "date_triggered_check" && !rule.schedule?.date) {
        errors.push(`rule ${rule.id} missing date`);
      }
```

- [ ] **Step 5: Add new file to syntax checks**

Modify `package.json` `check` script to include:

```bash
node --check src/domain/importExport.js
```

- [ ] **Step 6: Run targeted and full checks**

Run:

```bash
node --test tests/importExport.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/domain/importExport.js src/domain/schema.js package.json tests/importExport.test.mjs
git commit -m "feat: add local data import export"
```

---

## Task 4: Setup View Model and Rendering

**Files:**
- Create: `src/ui/setupViewModel.js`
- Create: `src/ui/setupRender.js`
- Test: `tests/setupRender.test.mjs`
- Modify: `package.json`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing setup render tests**

Create `tests/setupRender.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createDraft, createDraftCardFromTemplate } from "../src/domain/templates.js";
import { toSetupViewModel } from "../src/ui/setupViewModel.js";
import { renderNotSetUpHtml, renderSetupHtml } from "../src/ui/setupRender.js";

test("not-set-up render shows no demo cards and offers setup actions", () => {
  const html = renderNotSetUpHtml();

  assert.match(html, /Start setup/);
  assert.match(html, /Quick add one thing/);
  assert.doesNotMatch(html, /Biweekly report/);
});

test("setup view model recommends three cards but allows one to five", () => {
  const draft = createDraft({
    cards: [createDraftCardFromTemplate("project_progress", "2026-05-22T09:00:00.000Z")]
  });
  const viewModel = toSetupViewModel(draft, "2026-05-22T09:00:00.000Z");

  assert.equal(viewModel.cardCountLabel, "1 of 5 cards");
  assert.equal(viewModel.recommendation, "3 cards recommended");
});

test("setup render disables completion until draft has one today item", () => {
  const draft = createDraft({
    cards: [createDraftCardFromTemplate("project_progress", "2026-05-22T09:00:00.000Z")]
  });
  const html = renderSetupHtml(toSetupViewModel(draft, "2026-05-22T09:00:00.000Z"));

  assert.match(html, /Add at least one today item/);
  assert.match(html, /data-action="finish-setup" disabled/);
});

test("setup render shows live preview when draft has content", () => {
  const card = {
    ...createDraftCardFromTemplate("project_progress", "2026-05-22T09:00:00.000Z"),
    title: "Quarter plan",
    items: [{ title: "Write launch outline", scheduledFor: "2026-05-22" }]
  };
  const html = renderSetupHtml(toSetupViewModel(createDraft({ cards: [card] }), "2026-05-22T09:00:00.000Z"));

  assert.match(html, /Quarter plan/);
  assert.match(html, /Write launch outline/);
  assert.match(html, /data-action="finish-setup"/);
  assert.doesNotMatch(html, /data-action="finish-setup" disabled/);
});

test("setup styles are defined", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.setup-shell\s*\{/);
  assert.match(css, /\.setup-preview\s*\{/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/setupRender.test.mjs
```

Expected: FAIL with missing setup UI modules.

- [ ] **Step 3: Implement setup view model**

Create `src/ui/setupViewModel.js`:

```js
import { validateSetupDraft } from "../domain/templates.js";

export function toSetupViewModel(draft, nowIso) {
  const validation = validateSetupDraft(draft);
  const cards = draft.cards ?? [];
  return {
    nowIso,
    title: cards.length > 0 ? "Shape your focus anchors" : "Set up your anchors",
    cardCountLabel: `${cards.length} of 5 cards`,
    recommendation: "3 cards recommended",
    canFinish: validation.ok,
    errors: validation.errors,
    templates: [
      { id: "project_progress", label: "Project Progress", description: "Quarter goals, milestone work, ongoing bets." },
      { id: "routine_work", label: "Routine Work", description: "Weekly or biweekly work that should not surprise you." },
      { id: "ad_hoc_issue", label: "Ad Hoc Issue", description: "Urgent interrupts that need owner and closure." },
      { id: "date_check", label: "Date Check", description: "A future date when you need to verify a delivery." }
    ],
    cards: cards.map((card) => ({
      ...card,
      itemCount: (card.items ?? []).length,
      linkCount: (card.links ?? []).length
    })),
    preview: {
      topTasks: cards.flatMap((card) => (card.items ?? []).map((item) => ({
        title: item.title,
        goalTitle: card.title,
        goalType: card.type
      }))).slice(0, 3),
      cards: cards.slice(0, 3)
    }
  };
}
```

- [ ] **Step 4: Implement setup render**

Create `src/ui/setupRender.js`:

```js
export function renderNotSetUpHtml() {
  return `
    <section class="setup-empty" aria-label="Focus Anchor setup">
      <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
      <h1>Set up your anchors to start protecting today's focus.</h1>
      <p>Build a quiet new tab around the few work contexts that matter most.</p>
      <div class="setup-actions">
        <button class="button primary" data-action="start-setup">Start setup</button>
        <button class="button" data-action="quick-add-empty">Quick add one thing</button>
      </div>
    </section>
  `;
}

export function renderSetupHtml(viewModel) {
  return `
    <section class="setup-shell" aria-label="No-code setup">
      <div class="setup-panel">
        <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
        <div class="summary-label">${escapeHtml(viewModel.cardCountLabel)} - ${escapeHtml(viewModel.recommendation)}</div>
        <h1>${escapeHtml(viewModel.title)}</h1>
        <div class="template-grid">
          ${viewModel.templates.map(renderTemplate).join("")}
        </div>
        <div class="setup-card-list">
          ${viewModel.cards.map(renderDraftCard).join("")}
        </div>
        ${viewModel.errors.length > 0 ? `<div class="form-error">${escapeHtml(viewModel.errors[0])}</div>` : ""}
        <button class="button primary" data-action="finish-setup"${viewModel.canFinish ? "" : " disabled"}>Start focusing</button>
      </div>
      <aside class="setup-preview" aria-label="Live preview">
        <div class="summary-label">Live New Tab Preview</div>
        <h2>Today starts with ${escapeHtml(viewModel.preview.topTasks[0]?.title ?? "your first focus item")}.</h2>
        <div class="preview-top-tasks">
          ${viewModel.preview.topTasks.map(renderPreviewTask).join("") || `<div class="empty-line">Add a today item to unlock your Top 3.</div>`}
        </div>
        <div class="preview-cards">
          ${viewModel.preview.cards.map((card) => `<article class="mini-card"><h2>${escapeHtml(card.title)}</h2><div class="mini-meta"><span>${escapeHtml(card.type)}</span><span>${(card.items ?? []).length} items</span></div></article>`).join("")}
        </div>
      </aside>
    </section>
  `;
}

function renderTemplate(template) {
  return `
    <button class="template-option" data-action="add-template-card" data-template-id="${escapeHtml(template.id)}">
      <strong>${escapeHtml(template.label)}</strong>
      <span>${escapeHtml(template.description)}</span>
    </button>
  `;
}

function renderDraftCard(card) {
  return `
    <article class="draft-card" data-draft-card-id="${escapeHtml(card.id)}">
      <h2>${escapeHtml(card.title)}</h2>
      <div>${escapeHtml(card.type)} - ${card.itemCount} items - ${card.linkCount} links</div>
    </article>
  `;
}

function renderPreviewTask(task) {
  return `<article class="top-task"><div class="task-meta"><span>${escapeHtml(task.goalTitle)}</span><span>${escapeHtml(task.goalType)}</span></div><h2 class="task-title">${escapeHtml(task.title)}</h2></article>`;
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

- [ ] **Step 5: Add setup CSS**

Append to `src/styles.css`:

```css
.setup-empty,
.setup-shell {
  min-height: calc(100vh - 52px);
  animation: fadeIn 260ms ease both;
}

.setup-empty {
  display: grid;
  align-content: center;
  gap: 18px;
  max-width: 760px;
}

.setup-empty h1,
.setup-panel h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1.04;
}

.setup-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.setup-shell {
  display: grid;
  grid-template-columns: minmax(360px, 0.86fr) minmax(420px, 1.14fr);
  gap: 18px;
}

.setup-panel,
.setup-preview {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--raised);
  box-shadow: var(--soft-shadow);
  padding: 20px;
}

.template-grid {
  display: grid;
  gap: 9px;
  margin: 18px 0;
}

.template-option {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  text-align: left;
  padding: 12px;
  cursor: pointer;
}

.template-option span {
  display: block;
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}

.setup-card-list,
.preview-top-tasks,
.preview-cards {
  display: grid;
  gap: 10px;
}

.draft-card,
.form-error {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 12px;
}

.form-error {
  border-color: rgba(173, 75, 42, 0.35);
  color: #8c3f25;
  margin: 14px 0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@media (max-width: 980px) {
  .setup-shell {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Add syntax checks**

Modify `package.json` `check` script to include:

```bash
node --check src/ui/setupViewModel.js && node --check src/ui/setupRender.js
```

- [ ] **Step 7: Run targeted and full checks**

Run:

```bash
node --test tests/setupRender.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/ui/setupViewModel.js src/ui/setupRender.js src/styles.css package.json tests/setupRender.test.mjs
git commit -m "feat: render no-code setup"
```

---

## Task 5: New Tab State Router and Setup Interactions

**Files:**
- Modify: `src/newtab.js`
- Modify: `src/ui/render.js`
- Modify: `tests/manifest.test.mjs` or add `tests/newtab-state.test.mjs` if using extracted helper
- Test: `tests/setupRender.test.mjs`

- [ ] **Step 1: Write failing render test for Manage entry**

Add to `tests/viewModel.test.mjs`:

```js
test("rendered home includes a lightweight Manage entry point", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z"));

  assert.match(html, /data-action="open-manage"/);
  assert.match(html, /Manage/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: FAIL because home header has no Manage action.

- [ ] **Step 3: Add Manage entry to home header**

Modify `src/ui/render.js` top actions:

```js
        <button class="button" data-action="open-manage">Manage</button>
        <button class="button primary" data-action="quick-add">Quick Add</button>
```

- [ ] **Step 4: Refactor newtab imports**

Modify `src/newtab.js` imports:

```js
import { createEmptyAppData, ensureSetupMeta, getSetupState, markSetupSkipped } from "./domain/emptyData.js";
import { completeSetupDraft, createDraft, createDraftCardFromTemplate } from "./domain/templates.js";
import { nextLocalDateKey, toLocalDateKey } from "./domain/date.js";
import { generateDueTodayItems } from "./domain/rules.js";
import { buildHomeModel } from "./domain/ranking.js";
import { upsertDailySnapshot } from "./domain/snapshots.js";
import { createChromeRepository } from "./storage/repository.js";
import { toViewModel } from "./ui/viewModel.js";
import { mountApp } from "./ui/render.js";
import { renderNotSetUpHtml, renderSetupHtml } from "./ui/setupRender.js";
import { toSetupViewModel } from "./ui/setupViewModel.js";
import { addTodayItem, completeTodayItem, pinCard, snoozeCard } from "./ui/actions.js";
```

Remove `createInitialData` import from `newtab.js`.

- [ ] **Step 5: Implement state router in newtab**

Replace first-load flow in `src/newtab.js`:

```js
let appData = ensureSetupMeta(await repo.load());

await refresh();
```

Replace `refresh()` with:

```js
async function refresh() {
  const nowIso = new Date().toISOString();
  const state = getSetupState(appData);

  if (state === "not_set_up" || state === "skipped") {
    app.innerHTML = renderNotSetUpHtml();
    return;
  }

  if (state === "in_progress") {
    app.innerHTML = renderSetupHtml(toSetupViewModel(appData.setup.draft, nowIso));
    return;
  }

  const todayKey = toLocalDateKey(nowIso);
  const generated = generateDueTodayItems(appData, todayKey, nowIso);
  appData = generated.data;
  const homeModel = buildHomeModel(appData, todayKey);
  appData = upsertDailySnapshot(appData, todayKey, homeModel, completedIdsForToday(appData, todayKey));
  await repo.save(appData);
  mountApp(app, toViewModel(homeModel, nowIso, uiState));
}
```

- [ ] **Step 6: Add setup click handlers**

In `src/newtab.js` click handler, before home-only actions:

```js
  if (action === "start-setup") {
    appData = createEmptyAppData(nowIso);
    appData.setup.draft = createDraft();
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "add-template-card") {
    const base = appData ?? createEmptyAppData(nowIso);
    const draft = base.setup?.draft ?? createDraft();
    const card = createDraftCardFromTemplate(target.dataset.templateId, nowIso);
    appData = {
      ...base,
      updatedAt: nowIso,
      setup: {
        ...base.setup,
        draft: {
          ...draft,
          cards: [...(draft.cards ?? []), card],
          activeCardId: card.id
        }
      }
    };
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "finish-setup") {
    const todayKey = toLocalDateKey(nowIso);
    appData = completeSetupDraft(appData.setup.draft, nowIso, todayKey);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "quick-add-empty") {
    const title = window.prompt("One thing worth protecting today");
    if (!title?.trim()) return;
    const todayKey = toLocalDateKey(nowIso);
    const draftCard = {
      ...createDraftCardFromTemplate("project_progress", nowIso),
      title: "Today",
      items: [{ title: title.trim(), scheduledFor: todayKey }]
    };
    appData = completeSetupDraft(createDraft({ cards: [draftCard] }), nowIso, todayKey);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "open-manage") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/manage.html"), active: true });
    return;
  }
```

This minimal setup handler creates template cards but does not yet expose all form editing. Task 7 will add Manage editing, and Task 8 browser QA should verify the full setup path after form controls are added.

- [ ] **Step 7: Add Chrome runtime fallback for harnesses**

In `open-manage`, use a fallback for tests/harnesses:

```js
    const manageUrl = chrome.runtime?.getURL ? chrome.runtime.getURL("src/manage.html") : "/src/manage.html";
    chrome.tabs.create({ url: manageUrl, active: true });
```

- [ ] **Step 8: Run targeted and full checks**

Run:

```bash
node --test tests/viewModel.test.mjs tests/setupRender.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/newtab.js src/ui/render.js tests/viewModel.test.mjs
git commit -m "feat: route new tab setup state"
```

---

## Task 6: Manage Actions and View Model

**Files:**
- Create: `src/domain/manageActions.js`
- Create: `src/ui/manageViewModel.js`
- Test: `tests/manageActions.test.mjs`
- Test: `tests/manageRender.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing manage action tests**

Create `tests/manageActions.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { addGoalCard, addLinkToCard, addRuleToCard, updateGoalCard } from "../src/domain/manageActions.js";
import { validateAppData } from "../src/domain/schema.js";

const NOW = "2026-05-22T09:00:00.000Z";

test("manage actions add and edit goal cards", () => {
  const data = createInitialData(NOW);
  const added = addGoalCard(data, { title: "New launch", type: "project", importance: 4 }, NOW);
  const card = added.goalCards.at(-1);
  const updated = updateGoalCard(added, card.id, { title: "Launch readiness", status: "paused" }, NOW);

  assert.equal(card.title, "New launch");
  assert.equal(updated.goalCards.at(-1).title, "Launch readiness");
  assert.equal(updated.goalCards.at(-1).status, "paused");
  assert.equal(validateAppData(updated).ok, true);
});

test("manage actions add links to a card", () => {
  const data = createInitialData(NOW);
  const cardId = data.goalCards[0].id;
  const updated = addLinkToCard(data, cardId, { label: "Spec", url: "https://example.com/spec", kind: "doc", includeInOpenAll: true }, NOW);
  const link = updated.goalCards[0].links.at(-1);

  assert.equal(link.goalCardId, cardId);
  assert.equal(link.label, "Spec");
  assert.equal(link.kind, "doc");
  assert.equal(validateAppData(updated).ok, true);
});

test("manage actions add weekly and date reminder rules", () => {
  const data = createInitialData(NOW);
  const cardId = data.goalCards[0].id;
  const withRoutine = addRuleToCard(data, cardId, {
    type: "routine",
    titleTemplate: "Polish report",
    schedule: { cadence: "weekly", weekdays: [4], startDate: "2026-05-22" }
  }, NOW);
  const withDate = addRuleToCard(withRoutine, cardId, {
    type: "date_triggered_check",
    titleTemplate: "Check launch",
    schedule: { date: "2026-05-30" }
  }, NOW);

  assert.equal(withDate.goalCards[0].rules.at(-2).type, "routine");
  assert.equal(withDate.goalCards[0].rules.at(-1).type, "date_triggered_check");
  assert.equal(validateAppData(withDate).ok, true);
});
```

- [ ] **Step 2: Write failing manage view model test**

Create `tests/manageRender.test.mjs` with the view model part first:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { toManageViewModel } from "../src/ui/manageViewModel.js";

test("manage view model exposes cards, rules, and data summary", () => {
  const viewModel = toManageViewModel(createInitialData("2026-05-22T09:00:00.000Z"));

  assert.equal(viewModel.cards.length, 4);
  assert.equal(viewModel.rules.length, 1);
  assert.equal(viewModel.summary.cards, 4);
  assert.equal(viewModel.summary.links, 7);
  assert.equal(viewModel.sections.map((section) => section.id).join(","), "cards,rules,data");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
node --test tests/manageActions.test.mjs tests/manageRender.test.mjs
```

Expected: FAIL with missing manage modules.

- [ ] **Step 4: Implement manage actions**

Create `src/domain/manageActions.js`:

```js
export function addGoalCard(data, input, nowIso = new Date().toISOString()) {
  const card = {
    id: makeId("card", input.title, nowIso),
    title: input.title.trim(),
    type: input.type,
    importance: Number(input.importance ?? 3),
    status: input.status ?? "active",
    pinned: false,
    snoozedUntil: null,
    sortReason: "",
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    todayItems: [],
    links: [],
    rules: []
  };
  return { ...data, updatedAt: nowIso, goalCards: [...data.goalCards, card] };
}

export function updateGoalCard(data, cardId, patch, nowIso = new Date().toISOString()) {
  return updateCard(data, cardId, nowIso, (card) => ({ ...card, ...patch }));
}

export function addLinkToCard(data, cardId, input, nowIso = new Date().toISOString()) {
  return updateCard(data, cardId, nowIso, (card) => ({
    ...card,
    links: [
      ...card.links,
      {
        id: makeId("link", input.label, nowIso),
        goalCardId: cardId,
        label: input.label.trim(),
        url: input.url.trim(),
        kind: input.kind ?? "other",
        includeInOpenAll: input.includeInOpenAll !== false,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ]
  }));
}

export function addRuleToCard(data, cardId, input, nowIso = new Date().toISOString()) {
  return updateCard(data, cardId, nowIso, (card) => ({
    ...card,
    rules: [
      ...card.rules,
      {
        id: makeId("rule", input.titleTemplate, nowIso),
        goalCardId: cardId,
        type: input.type,
        titleTemplate: input.titleTemplate.trim(),
        schedule: input.schedule,
        active: true,
        lastGeneratedFor: null,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ]
  }));
}

function updateCard(data, cardId, nowIso, update) {
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return { ...update(card), updatedAt: nowIso };
  });
  return changed ? { ...data, updatedAt: nowIso, goalCards } : data;
}

function makeId(prefix, value, nowIso) {
  const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || prefix;
  return `${prefix}-${Date.parse(nowIso)}-${slug}`;
}
```

- [ ] **Step 5: Implement manage view model**

Create `src/ui/manageViewModel.js`:

```js
import { summarizeAppData } from "../domain/importExport.js";

export function toManageViewModel(data, selectedCardId = data.goalCards[0]?.id ?? null) {
  const selectedCard = data.goalCards.find((card) => card.id === selectedCardId) ?? data.goalCards[0] ?? null;
  return {
    sections: [
      { id: "cards", label: "Cards" },
      { id: "rules", label: "Rules" },
      { id: "data", label: "Data" }
    ],
    cards: data.goalCards.map((card) => ({
      id: card.id,
      title: card.title,
      type: card.type,
      status: card.status,
      importance: card.importance,
      itemCount: card.todayItems.length,
      linkCount: card.links.length,
      ruleCount: card.rules.length
    })),
    selectedCard,
    rules: data.goalCards.flatMap((card) => card.rules.map((rule) => ({
      ...rule,
      goalTitle: card.title
    }))),
    summary: summarizeAppData(data)
  };
}
```

- [ ] **Step 6: Add syntax checks**

Modify `package.json` `check` script to include:

```bash
node --check src/domain/manageActions.js && node --check src/ui/manageViewModel.js
```

- [ ] **Step 7: Run targeted and full checks**

Run:

```bash
node --test tests/manageActions.test.mjs tests/manageRender.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain/manageActions.js src/ui/manageViewModel.js package.json tests/manageActions.test.mjs tests/manageRender.test.mjs
git commit -m "feat: add manage data actions"
```

---

## Task 7: Manage Page Rendering and Entry Point

**Files:**
- Create: `src/manage.html`
- Create: `src/manage.js`
- Create: `src/ui/manageRender.js`
- Create: `src/ui/forms.js`
- Modify: `src/styles.css`
- Modify: `tests/manageRender.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add failing manage render tests**

Append to `tests/manageRender.test.mjs`:

```js
import { renderManageHtml } from "../src/ui/manageRender.js";

test("manage render includes cards, rules, data, and dangerous reset", () => {
  const viewModel = toManageViewModel(createInitialData("2026-05-22T09:00:00.000Z"));
  const html = renderManageHtml(viewModel);

  assert.match(html, /Manage Focus Anchor/);
  assert.match(html, /data-section="cards"/);
  assert.match(html, /data-section="rules"/);
  assert.match(html, /data-section="data"/);
  assert.match(html, /Export JSON/);
  assert.match(html, /Import JSON/);
  assert.match(html, /type RESET/);
});

test("manage render escapes card text", () => {
  const data = createInitialData("2026-05-22T09:00:00.000Z");
  data.goalCards[0].title = `"><script>alert(1)</script>`;
  const html = renderManageHtml(toManageViewModel(data));

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/manageRender.test.mjs
```

Expected: FAIL with missing `renderManageHtml`.

- [ ] **Step 3: Implement forms helper**

Create `src/ui/forms.js`:

```js
export function readFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function readCheckbox(form, name) {
  return Boolean(form.querySelector(`[name="${name}"]`)?.checked);
}

export function readNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
```

- [ ] **Step 4: Implement manage render**

Create `src/ui/manageRender.js`:

```js
export function renderManageHtml(viewModel) {
  return `
    <main class="manage-shell">
      <aside class="manage-sidebar">
        <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
        <h1>Manage Focus Anchor</h1>
        ${viewModel.sections.map((section) => `<button class="button" data-section="${escapeHtml(section.id)}">${escapeHtml(section.label)}</button>`).join("")}
      </aside>
      <section class="manage-main">
        <div class="manage-grid">
          <div class="manage-list">
            <div class="section-head"><span>Cards</span><button class="button primary" data-action="add-card">Add card</button></div>
            ${viewModel.cards.map(renderCardRow).join("")}
          </div>
          <div class="manage-detail">
            ${viewModel.selectedCard ? renderCardDetail(viewModel.selectedCard) : `<div class="empty-line">No cards yet.</div>`}
          </div>
        </div>
        <section class="manage-rules">
          <div class="section-head"><span>Rules</span><span>${viewModel.rules.length} active rules</span></div>
          ${viewModel.rules.map((rule) => `<article class="mini-card"><h2>${escapeHtml(rule.titleTemplate)}</h2><div class="mini-meta"><span>${escapeHtml(rule.goalTitle)}</span><span>${escapeHtml(rule.type)}</span></div></article>`).join("")}
        </section>
        <section class="manage-data">
          <div class="section-head"><span>Data</span><span>${viewModel.summary.cards} cards / ${viewModel.summary.rules} rules</span></div>
          <button class="button" data-action="export-json">Export JSON</button>
          <button class="button" data-action="import-json">Import JSON</button>
          <div class="danger-zone">
            <h2>Reset local data</h2>
            <p>Export first. This removes local cards, rules, links, events, and snapshots.</p>
            <label>type RESET<input class="mock-input" name="reset-confirmation" autocomplete="off"></label>
            <button class="button" data-action="reset-data" disabled>Reset local data</button>
          </div>
        </section>
      </section>
    </main>
    <div id="manage-toast" class="completion-toast" role="status" aria-live="polite"></div>
  `;
}

function renderCardRow(card) {
  return `<button class="card-row" data-action="select-card" data-card-id="${escapeHtml(card.id)}"><strong>${escapeHtml(card.title)}</strong><span>${escapeHtml(card.type)} - ${card.itemCount} items - ${card.linkCount} links</span></button>`;
}

function renderCardDetail(card) {
  return `
    <form class="card-editor" data-action="save-card" data-card-id="${escapeHtml(card.id)}">
      <label>Title<input class="mock-input" name="title" value="${escapeHtml(card.title)}"></label>
      <label>Type<input class="mock-input" name="type" value="${escapeHtml(card.type)}"></label>
      <label>Importance<input class="mock-input" name="importance" value="${escapeHtml(card.importance)}"></label>
      <label>Status<input class="mock-input" name="status" value="${escapeHtml(card.status)}"></label>
      <button class="button primary" type="submit">Save card</button>
    </form>
  `;
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

- [ ] **Step 5: Add manage page HTML**

Create `src/manage.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Focus Anchor Manage</title>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <main class="page">
      <div id="manage-app"></div>
    </main>
    <script type="module" src="./manage.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Add manage entrypoint**

Create `src/manage.js`:

```js
import { parseImportJson, serializeExportData } from "./domain/importExport.js";
import { updateGoalCard } from "./domain/manageActions.js";
import { createChromeRepository } from "./storage/repository.js";
import { readFormData, readNumber } from "./ui/forms.js";
import { renderManageHtml } from "./ui/manageRender.js";
import { toManageViewModel } from "./ui/manageViewModel.js";

const app = document.querySelector("#manage-app");
const repo = createChromeRepository();
let appData = await repo.load();
let selectedCardId = appData?.goalCards?.[0]?.id ?? null;

render();

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action='save-card']");
  if (!form) return;
  event.preventDefault();
  const values = readFormData(form);
  appData = updateGoalCard(appData, form.dataset.cardId, {
    title: values.title,
    type: values.type,
    importance: readNumber(values.importance, 3),
    status: values.status
  }, new Date().toISOString());
  await repo.save(appData);
  render();
});

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  if (target.dataset.action === "select-card") {
    selectedCardId = target.dataset.cardId;
    render();
  }

  if (target.dataset.action === "export-json") {
    downloadJson(serializeExportData(appData));
  }

  if (target.dataset.action === "reset-data") {
    await repo.remove();
    appData = null;
    render();
  }
});

app.addEventListener("input", (event) => {
  if (event.target.name === "reset-confirmation") {
    const button = app.querySelector("[data-action='reset-data']");
    button.disabled = event.target.value !== "RESET";
  }
});

function render() {
  if (!appData) {
    app.innerHTML = `<section class="setup-empty"><h1>No local data.</h1><p>Open a new tab to set up Focus Anchor again.</p></section>`;
    return;
  }
  app.innerHTML = renderManageHtml(toManageViewModel(appData, selectedCardId));
}

function downloadJson(json) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `focus-anchor-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

Import file picker can be implemented in Task 8 after browser verification wiring, because it needs DOM file input behavior.

- [ ] **Step 7: Add manage CSS**

Append to `src/styles.css`:

```css
.manage-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 18px;
}

.manage-sidebar,
.manage-main,
.manage-list,
.manage-detail,
.manage-rules,
.manage-data,
.danger-zone {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--raised);
  padding: 16px;
}

.manage-sidebar {
  align-self: start;
  display: grid;
  gap: 10px;
}

.manage-sidebar h1 {
  margin: 10px 0;
  font-size: 24px;
}

.manage-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.7fr) minmax(360px, 1.3fr);
  gap: 14px;
}

.manage-list,
.card-editor,
.manage-main {
  display: grid;
  gap: 12px;
}

.card-row {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  gap: 4px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.card-row span,
.danger-zone p {
  color: var(--muted);
  font-size: 13px;
}

.card-editor label,
.danger-zone label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 720;
}

.danger-zone {
  border-color: rgba(173, 75, 42, 0.35);
}

@media (max-width: 900px) {
  .manage-shell,
  .manage-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: Add syntax checks**

Modify `package.json` `check` script to include:

```bash
node --check src/manage.js && node --check src/ui/manageRender.js && node --check src/ui/forms.js
```

- [ ] **Step 9: Run targeted and full checks**

Run:

```bash
node --test tests/manageRender.test.mjs
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/manage.html src/manage.js src/ui/manageRender.js src/ui/forms.js src/styles.css package.json tests/manageRender.test.mjs
git commit -m "feat: add manage page shell"
```

---

## Task 8: Import UI, Setup Editing Completion, Docs, and Browser Verification

**Files:**
- Modify: `src/manage.js`
- Modify: `src/ui/manageRender.js`
- Modify: `src/ui/setupRender.js`
- Modify: `src/newtab.js`
- Modify: `src/styles.css`
- Modify: `docs/install-and-usage.md`
- Test: `tests/manageRender.test.mjs`
- Test: `tests/setupRender.test.mjs`

- [ ] **Step 1: Add import controls to manage render test**

Update `tests/manageRender.test.mjs` assertion block:

```js
  assert.match(html, /type="file"/);
  assert.match(html, /data-action="confirm-import"/);
  assert.match(html, /Import summary/);
```

Expected before implementation: FAIL because render lacks file input and confirm import area.

- [ ] **Step 2: Extend manage render with import modal area**

In `src/ui/manageRender.js`, replace the `Import JSON` button with:

```html
          <label class="button">Import JSON<input class="visually-hidden" type="file" accept="application/json" data-action="import-json-file"></label>
          <div class="import-panel" hidden>
            <h2>Import summary</h2>
            <div data-role="import-summary"></div>
            <button class="button primary" data-action="confirm-import" disabled>Confirm overwrite</button>
          </div>
```

Add CSS:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.import-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 12px;
}
```

- [ ] **Step 3: Wire import in manage.js**

Add module-level variable:

```js
let pendingImport = null;
```

Add change listener:

```js
app.addEventListener("change", async (event) => {
  if (event.target.dataset.action !== "import-json-file") return;
  const file = event.target.files?.[0];
  if (!file) return;
  const result = parseImportJson(await file.text());
  const panel = app.querySelector(".import-panel");
  const summary = app.querySelector("[data-role='import-summary']");
  const confirm = app.querySelector("[data-action='confirm-import']");
  panel.hidden = false;
  if (!result.ok) {
    pendingImport = null;
    summary.textContent = result.error;
    confirm.disabled = true;
    return;
  }
  pendingImport = result.data;
  summary.textContent = `${result.summary.cards} cards, ${result.summary.openItems} open items, ${result.summary.rules} rules, ${result.summary.snapshots} snapshots`;
  confirm.disabled = false;
});
```

Add click handler branch:

```js
  if (target.dataset.action === "confirm-import" && pendingImport) {
    appData = pendingImport;
    selectedCardId = appData.goalCards[0]?.id ?? null;
    pendingImport = null;
    await repo.save(appData);
    render();
  }
```

- [ ] **Step 4: Convert reset into an explicit confirmation panel**

Update `src/ui/manageRender.js` reset markup inside `.danger-zone`:

```html
            <button class="button" data-action="open-reset-confirmation">Reset local data</button>
            <div class="reset-confirmation" hidden>
              <p>This removes local cards, items, links, rules, behavior events, daily snapshots, and setup metadata. Export first.</p>
              <label>type RESET<input class="mock-input" name="reset-confirmation" autocomplete="off"></label>
              <button class="button" data-action="confirm-reset-data" disabled>Confirm reset</button>
            </div>
```

Update `src/manage.js` click handling:

```js
  if (target.dataset.action === "open-reset-confirmation") {
    app.querySelector(".reset-confirmation").hidden = false;
    return;
  }

  if (target.dataset.action === "confirm-reset-data") {
    await repo.remove();
    appData = null;
    render();
    return;
  }
```

Keep the existing input listener, but point it at `confirm-reset-data`:

```js
  if (event.target.name === "reset-confirmation") {
    const button = app.querySelector("[data-action='confirm-reset-data']");
    button.disabled = event.target.value !== "RESET";
  }
```

Update `tests/manageRender.test.mjs` to assert:

```js
  assert.match(html, /data-action="open-reset-confirmation"/);
  assert.match(html, /data-action="confirm-reset-data" disabled/);
```

- [ ] **Step 5: Add minimal setup editing controls**

Extend `renderSetupHtml()` so each draft card includes a small inline form:

```html
      <form class="draft-card-form" data-action="update-draft-card" data-draft-card-id="${escapeHtml(card.id)}">
        <input class="mock-input" name="title" value="${escapeHtml(card.title)}" aria-label="Card title">
        <input class="mock-input" name="itemTitle" placeholder="Today item">
        <button class="button" type="submit">Save draft card</button>
      </form>
```

In `src/newtab.js`, add submit listener:

```js
app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action='update-draft-card']");
  if (!form) return;
  event.preventDefault();
  const nowIso = new Date().toISOString();
  const todayKey = toLocalDateKey(nowIso);
  const values = Object.fromEntries(new FormData(form).entries());
  const draft = appData.setup.draft;
  appData = {
    ...appData,
    updatedAt: nowIso,
    setup: {
      ...appData.setup,
      draft: {
        ...draft,
        cards: draft.cards.map((card) => card.id === form.dataset.draftCardId ? {
          ...card,
          title: values.title?.trim() || card.title,
          items: values.itemTitle?.trim() ? [...(card.items ?? []), { title: values.itemTitle.trim(), scheduledFor: todayKey }] : card.items
        } : card)
      }
    }
  };
  await repo.save(appData);
  await refresh();
});
```

This gives the setup path enough no-code editing for MVP browser verification. Richer link/routine/date editing can happen in Manage after setup.

- [ ] **Step 6: Update install usage docs**

Modify `docs/install-and-usage.md` sections 3-5:

- Remove instructions requiring edits to `src/domain/sampleData.js` as the primary path.
- Add first-run setup steps:

```md
## 3. First-run setup

1. Open a new tab.
2. Click `Start setup`.
3. Choose a template: Project Progress, Routine Work, Ad Hoc Issue, or Date Check.
4. Create 1-5 cards. Three cards are recommended.
5. Add at least one today item.
6. Click `Start focusing`.
```

- Add Manage page instructions for cards/rules/data.
- Keep `sampleData.js` only in a developer appendix.

- [ ] **Step 7: Run unit checks**

Run:

```bash
npm test
npm run check
```

Expected: all pass.

- [ ] **Step 8: Browser verification with local harness**

Use Browser or Playwright harness. If using a temporary static server, serve the repo with a stubbed `chrome.storage.local`, `chrome.tabs.create`, and `chrome.runtime.getURL`.

Verify:

1. With empty storage, New Tab renders `Start setup` and no `Biweekly report`.
2. Click `Start setup`.
3. Click `Project Progress`.
4. Fill card title `Quarter launch`.
5. Fill today item `Write launch outline`.
6. Submit draft card.
7. Verify live preview shows `Quarter launch` and `Write launch outline`.
8. Click `Start focusing`.
9. Verify home shows Top 3 and Manage button.
10. Click Manage.
11. Verify Manage page shows Cards, Rules, Data, Export JSON, Import JSON, and Reset local data.
12. Verify reset confirmation panel opens.
13. Verify confirm reset button remains disabled until input equals `RESET`.

Expected: all verified, no console errors other than favicon 404 in local harness.

- [ ] **Step 9: Commit**

```bash
git add src/manage.js src/ui/manageRender.js src/ui/setupRender.js src/newtab.js src/styles.css docs/install-and-usage.md tests/manageRender.test.mjs
git commit -m "feat: complete no-code setup flow"
```

---

## Final Verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run syntax checks**

```bash
npm run check
```

Expected: all checked files pass.

- [ ] **Step 3: Run browser QA**

Repeat Task 8 browser verification and capture screenshots for:

- Not set up state.
- Setup + live preview.
- Normal home after setup.
- Manage page Data section.

- [ ] **Step 4: Request final code review**

Use a review subagent or code-review pass. Focus on:

- No demo data written on first open.
- Draft data does not affect ranking/snapshots.
- Import cannot overwrite on invalid JSON/schema.
- Reset requires `RESET`.
- Existing home interactions still work.

- [ ] **Step 5: Final commit if review fixes were needed**

If fixes are made:

```bash
git add <changed files>
git commit -m "fix: polish no-code setup mvp"
```

If no fixes are needed, do not create an empty commit.

---

## Spec Coverage Checklist

- Non-coding beta user: Tasks 4, 5, 7, 8.
- No demo data on first open: Tasks 1 and 5.
- New Tab remains execution-focused: Task 5.
- Separate Manage page: Tasks 6 and 7.
- Export / Import JSON: Tasks 3, 7, 8.
- Reset with `RESET`: Tasks 1, 7, 8.
- Templates: Task 2.
- Weekly/biweekly and date reminder support: Tasks 2 and 6.
- Draft persistence and setup metadata: Tasks 1, 2, 5.
- Existing ranking/routine/snapshot behavior: full test runs in every task and final verification.
