# Privacy-First New Tab and Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a privacy-first Focus Anchor new-tab experience that hides sensitive priorities by default, reveals Top 3 by intent, auto-hides revealed content, and restores Google-style shortcuts.

**Architecture:** Add a small shortcuts domain module and make app-data migration normalize shortcuts before rendering or managing data. Split the home view model into safe non-sensitive data and reveal-only sensitive data, then render Safe Home by default and a temporary Focus drawer only when revealed. Extend Manage with a focused Shortcuts section backed by domain actions.

**Tech Stack:** Chrome MV3 extension, local `chrome.storage.local`, vanilla ES modules, Node `node:test`, existing DOM string rendering, existing Playwright CLI manual verification.

---

## Scope Check

The approved spec combines two tightly coupled surfaces: privacy-first new tab and shortcuts. They should be implemented in one plan because both shape the default new-tab screen and share the same app-data migration path. No external Lark, Gmail, Calendar, or screen-sharing integrations are included.

## File Structure

- Create `src/domain/shortcuts.js`: default shortcut definitions, migration, validation-friendly normalization, shortcut updates, reset-to-defaults.
- Modify `src/domain/emptyData.js`: include shortcuts in empty data and ensure existing data receives defaults.
- Modify `src/domain/sampleData.js`: include default shortcuts in fixture data.
- Modify `src/domain/schema.js`: validate shortcuts and reuse `isAllowedLinkUrl`.
- Modify `src/domain/importExport.js`: ensure imported data receives shortcuts and include shortcut count in summary.
- Modify `package.json`: include the new shortcuts module in `npm run check`.
- Create `tests/shortcuts.test.mjs`: domain behavior for shortcut defaults, migration, updates, reset, unsafe URL rejection.
- Modify `tests/schema.test.mjs`: shortcuts schema validation.
- Modify `src/domain/ranking.js`: include shortcuts in home model so UI does not need raw app data.
- Modify `src/ui/viewModel.js`: produce `safeHome` and `focusDrawer` surfaces.
- Modify `src/ui/render.js`: render Safe Home by default; render sensitive drawer only when `focusDrawer.revealed` is true.
- Modify `src/newtab.js`: manage reveal state, auto-hide, keyboard hide/reveal, blur hide, shortcut opening.
- Modify `tests/viewModel.test.mjs`: prove safe view model and default render do not leak sensitive titles.
- Modify `tests/newtabInteractions.test.mjs`: reveal/hide, tab blur, keyboard interaction, shortcut opening.
- Modify `src/ui/manageViewModel.js`: expose shortcuts in Manage.
- Modify `src/ui/manageRender.js`: render editable shortcut rows and reset action.
- Modify `src/manage.js`: handle shortcut save and reset actions.
- Modify `tests/manageActions.test.mjs`, `tests/manageRender.test.mjs`, `tests/manageInteractions.test.mjs`: cover shortcut editing, reset, rendering, invalid URL behavior.
- Modify `src/styles.css`: Safe Home, shortcut grid/menu, focus peek, reveal drawer, privacy indicator, responsive layout.
- Modify `docs/install-and-usage.md` and `README.md`: document privacy-first behavior and shortcuts.

## Task 1: Shortcuts Domain, Migration, and Schema

**Files:**
- Create: `src/domain/shortcuts.js`
- Modify: `src/domain/emptyData.js`
- Modify: `src/domain/sampleData.js`
- Modify: `src/domain/schema.js`
- Modify: `src/domain/importExport.js`
- Modify: `package.json`
- Test: `tests/shortcuts.test.mjs`
- Test: `tests/schema.test.mjs`
- Test: `tests/importExport.test.mjs`

- [ ] **Step 1: Write failing shortcut domain tests**

Create `tests/shortcuts.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SHORTCUTS,
  createDefaultShortcuts,
  ensureShortcuts,
  resetShortcuts,
  updateShortcut
} from "../src/domain/shortcuts.js";
import { createEmptyAppData } from "../src/domain/emptyData.js";

const NOW = "2026-05-30T09:00:00.000Z";

test("default shortcuts include Google apps and Lark in pinned order", () => {
  const shortcuts = createDefaultShortcuts(NOW);

  assert.deepEqual(shortcuts.map((shortcut) => shortcut.id), [
    "shortcut-gmail",
    "shortcut-calendar",
    "shortcut-drive",
    "shortcut-maps",
    "shortcut-search",
    "shortcut-lark"
  ]);
  assert.deepEqual(shortcuts.map((shortcut) => shortcut.position), [1, 2, 3, 4, 5, 6]);
  assert.equal(shortcuts.every((shortcut) => shortcut.pinned === true), true);
  assert.equal(shortcuts.every((shortcut) => shortcut.createdAt === NOW), true);
  assert.equal(DEFAULT_SHORTCUTS.length, 6);
});

test("ensureShortcuts migrates missing shortcuts without changing existing data identity fields", () => {
  const data = createEmptyAppData(NOW);
  delete data.shortcuts;

  const migrated = ensureShortcuts(data, "2026-05-30T10:00:00.000Z");

  assert.equal(migrated.version, 1);
  assert.equal(migrated.createdAt, NOW);
  assert.equal(migrated.shortcuts.length, 6);
  assert.equal(migrated.updatedAt, "2026-05-30T10:00:00.000Z");
});

test("ensureShortcuts normalizes existing shortcuts and drops unsafe urls", () => {
  const data = {
    ...createEmptyAppData(NOW),
    shortcuts: [
      { id: "custom", label: "Custom", url: "https://example.com", pinned: true, position: 2 },
      { id: "bad", label: "Bad", url: "javascript:alert(1)", pinned: true, position: 1 }
    ]
  };

  const migrated = ensureShortcuts(data, "2026-05-30T10:00:00.000Z");

  assert.deepEqual(migrated.shortcuts.map((shortcut) => shortcut.id), ["custom"]);
  assert.equal(migrated.shortcuts[0].label, "Custom");
  assert.equal(migrated.shortcuts[0].url, "https://example.com/");
  assert.equal(migrated.shortcuts[0].position, 1);
});

test("updateShortcut edits safe fields and rejects unsafe urls", () => {
  const data = ensureShortcuts(createEmptyAppData(NOW), NOW);
  const updated = updateShortcut(data, "shortcut-gmail", {
    label: "Mail",
    url: "https://mail.google.com/mail/u/0/",
    pinned: false,
    position: 3
  }, "2026-05-30T11:00:00.000Z");
  const shortcut = updated.shortcuts.find((entry) => entry.id === "shortcut-gmail");

  assert.equal(shortcut.label, "Mail");
  assert.equal(shortcut.url, "https://mail.google.com/mail/u/0/");
  assert.equal(shortcut.pinned, false);
  assert.equal(shortcut.position, 3);
  assert.equal(updated.updatedAt, "2026-05-30T11:00:00.000Z");

  const rejected = updateShortcut(updated, "shortcut-gmail", {
    label: "Bad",
    url: "javascript:alert(1)"
  }, "2026-05-30T12:00:00.000Z");

  assert.equal(rejected, updated);
});

test("resetShortcuts restores defaults", () => {
  const data = {
    ...ensureShortcuts(createEmptyAppData(NOW), NOW),
    shortcuts: [{ id: "custom", label: "Custom", url: "https://example.com", pinned: true, position: 1 }]
  };

  const reset = resetShortcuts(data, "2026-05-30T13:00:00.000Z");

  assert.deepEqual(reset.shortcuts.map((shortcut) => shortcut.id), createDefaultShortcuts(NOW).map((shortcut) => shortcut.id));
  assert.equal(reset.shortcuts[0].updatedAt, "2026-05-30T13:00:00.000Z");
  assert.equal(reset.updatedAt, "2026-05-30T13:00:00.000Z");
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
node --test tests/shortcuts.test.mjs
```

Expected: FAIL with module-not-found for `src/domain/shortcuts.js`.

- [ ] **Step 3: Create shortcuts domain module**

Create `src/domain/shortcuts.js`:

```js
import { isAllowedLinkUrl } from "./schema.js";

export const DEFAULT_SHORTCUTS = [
  { id: "shortcut-gmail", label: "Gmail", url: "https://mail.google.com/" },
  { id: "shortcut-calendar", label: "Calendar", url: "https://calendar.google.com/" },
  { id: "shortcut-drive", label: "Drive", url: "https://drive.google.com/" },
  { id: "shortcut-maps", label: "Maps", url: "https://maps.google.com/" },
  { id: "shortcut-search", label: "Search", url: "https://www.google.com/" },
  { id: "shortcut-lark", label: "Lark", url: "https://www.larksuite.com/" }
];

export function createDefaultShortcuts(nowIso = new Date().toISOString()) {
  return DEFAULT_SHORTCUTS.map((shortcut, index) => ({
    ...shortcut,
    url: normalizeUrl(shortcut.url),
    pinned: true,
    position: index + 1,
    createdAt: nowIso,
    updatedAt: nowIso
  }));
}

export function ensureShortcuts(data, nowIso = new Date().toISOString()) {
  if (data === null) return null;
  const current = Array.isArray(data.shortcuts) ? data.shortcuts : [];
  const shortcuts = current.length > 0
    ? normalizeShortcuts(current, nowIso)
    : createDefaultShortcuts(nowIso);

  return {
    ...data,
    updatedAt: data.shortcuts === undefined ? nowIso : data.updatedAt,
    shortcuts
  };
}

export function updateShortcut(data, shortcutId, patch = {}, nowIso = new Date().toISOString()) {
  const shortcut = data.shortcuts?.find((entry) => entry.id === shortcutId);
  if (!shortcut) return data;

  const label = "label" in patch ? trim(patch.label) : shortcut.label;
  const url = "url" in patch ? normalizeUrl(patch.url) : shortcut.url;
  if (!label || !isAllowedLinkUrl(url)) return data;

  const nextShortcut = {
    ...shortcut,
    label,
    url,
    pinned: "pinned" in patch ? Boolean(patch.pinned) : shortcut.pinned,
    position: "position" in patch ? normalizePosition(patch.position) : shortcut.position,
    updatedAt: nowIso
  };

  return {
    ...data,
    updatedAt: nowIso,
    shortcuts: normalizeShortcuts(data.shortcuts.map((entry) => (
      entry.id === shortcutId ? nextShortcut : entry
    )), nowIso)
  };
}

export function resetShortcuts(data, nowIso = new Date().toISOString()) {
  return {
    ...data,
    updatedAt: nowIso,
    shortcuts: createDefaultShortcuts(nowIso)
  };
}

export function pinnedShortcuts(shortcuts, limit = 6) {
  return normalizeShortcuts(shortcuts ?? [])
    .filter((shortcut) => shortcut.pinned)
    .slice(0, limit);
}

function normalizeShortcuts(shortcuts, nowIso = new Date().toISOString()) {
  return shortcuts
    .map((shortcut, index) => normalizeShortcut(shortcut, index, nowIso))
    .filter(Boolean)
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label))
    .map((shortcut, index) => ({ ...shortcut, position: index + 1 }));
}

function normalizeShortcut(shortcut, index, nowIso) {
  const id = trim(shortcut?.id) || `shortcut-${index + 1}`;
  const label = trim(shortcut?.label);
  const url = normalizeUrl(shortcut?.url);
  if (!label || !isAllowedLinkUrl(url)) return null;

  return {
    id,
    label,
    url,
    pinned: shortcut?.pinned !== false,
    position: normalizePosition(shortcut?.position ?? index + 1),
    createdAt: trim(shortcut?.createdAt) || nowIso,
    updatedAt: trim(shortcut?.updatedAt) || nowIso
  };
}

function normalizeUrl(value) {
  try {
    return new URL(trim(value)).toString();
  } catch {
    return "";
  }
}

function normalizePosition(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 999;
  return Math.max(1, Math.round(numeric));
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}
```

- [ ] **Step 4: Wire shortcuts into empty and sample data**

Modify `src/domain/emptyData.js`:

```js
import { createDefaultShortcuts, ensureShortcuts } from "./shortcuts.js";

export function createEmptyAppData(nowIso = new Date().toISOString()) {
  return {
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    goalCards: [],
    shortcuts: createDefaultShortcuts(nowIso),
    behaviorEvents: [],
    dailySnapshots: [],
    setup: createSetupMeta()
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
  if (data === null) return null;

  if (data.setup !== undefined) {
    return ensureShortcuts({
      ...data,
      setup: createSetupMeta(data.setup)
    }, nowIso);
  }

  return ensureShortcuts({
    ...data,
    setup: createSetupMeta({
      completedAt: data.goalCards?.length > 0 ? nowIso : null
    })
  }, nowIso);
}

export function markSetupSkipped(data, nowIso = new Date().toISOString()) {
  return {
    ...data,
    setup: createSetupMeta({
      ...data?.setup,
      skippedAt: nowIso
    })
  };
}

export function getSetupState(data) {
  if (!data?.setup) return "not_set_up";
  if (data.setup.completedAt) return "complete";
  if (data.setup.skippedAt) return "skipped";
  if (data.setup.draft) return "in_progress";
  return "not_set_up";
}
```

Modify `src/domain/sampleData.js` by importing `createDefaultShortcuts`:

```js
import { toLocalDateKey } from "./date.js";
import { createDefaultShortcuts } from "./shortcuts.js";
```

In `createInitialData`, insert this property after the `goalCards` array property and before `behaviorEvents`:

```js
    shortcuts: createDefaultShortcuts(nowIso),
```

Do not edit the fixture card contents in this task.

- [ ] **Step 5: Validate shortcuts in schema and import summaries**

Modify `src/domain/schema.js` with these targeted edits.

Add a top-level shortcuts array check immediately after the `goalCards` array check:

```js
  if (!Array.isArray(data.goalCards)) errors.push("goalCards must be an array");
  if (!Array.isArray(data.shortcuts)) errors.push("shortcuts must be an array");
```

Add this loop after setup validation and before the `for (const card of data.goalCards ?? [])` loop:

```js
  for (const shortcut of data.shortcuts ?? []) {
    if (!shortcut.id) errors.push("shortcut missing id");
    if (!shortcut.label) errors.push(`shortcut ${shortcut.id} missing label`);
    if (!shortcut.url) errors.push(`shortcut ${shortcut.id} missing url`);
    if (shortcut.url && !isAllowedLinkUrl(shortcut.url)) errors.push(`shortcut ${shortcut.id} has invalid url`);
    if (typeof shortcut.pinned !== "boolean") errors.push(`shortcut ${shortcut.id} pinned must be boolean`);
    if (!Number.isInteger(shortcut.position) || shortcut.position < 1) errors.push(`shortcut ${shortcut.id} position must be a positive integer`);
  }
```

Modify `src/domain/importExport.js` summary:

```js
export function summarizeAppData(data) {
  const goalCards = Array.isArray(data.goalCards) ? data.goalCards : [];
  const shortcuts = Array.isArray(data.shortcuts) ? data.shortcuts : [];
  const behaviorEvents = Array.isArray(data.behaviorEvents) ? data.behaviorEvents : [];
  const dailySnapshots = Array.isArray(data.dailySnapshots) ? data.dailySnapshots : [];
  const todayItems = goalCards.flatMap((card) => Array.isArray(card.todayItems) ? card.todayItems : []);

  return {
    cards: goalCards.length,
    shortcuts: shortcuts.length,
    links: goalCards.reduce((count, card) => count + (Array.isArray(card.links) ? card.links.length : 0), 0),
    rules: goalCards.reduce((count, card) => count + (Array.isArray(card.rules) ? card.rules.length : 0), 0),
    openItems: todayItems.filter((item) => item.status === "open").length,
    doneItems: todayItems.filter((item) => item.status === "done").length,
    events: behaviorEvents.length,
    snapshots: dailySnapshots.length
  };
}
```

Modify `package.json` so the `check` script includes `node --check src/domain/shortcuts.js` alongside the other domain modules.

- [ ] **Step 6: Extend schema and import/export tests**

Append to `tests/schema.test.mjs`:

```js
test("app data requires valid shortcuts", () => {
  const data = createInitialData("2026-05-30T09:12:00.000Z");
  data.shortcuts = [
    { id: "shortcut-safe", label: "Safe", url: "https://example.com", pinned: true, position: 1 },
    { id: "shortcut-unsafe", label: "Unsafe", url: "javascript:alert(1)", pinned: true, position: 2 }
  ];

  const result = validateAppData(data);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /shortcut shortcut-unsafe has invalid url/);
});
```

In `tests/importExport.test.mjs`, add an assertion to the existing valid import summary test:

```js
assert.equal(result.summary.shortcuts, data.shortcuts.length);
```

Add a new import migration test:

```js
test("import migrates missing shortcuts to defaults", () => {
  const data = createInitialData("2026-05-30T09:12:00.000Z");
  delete data.shortcuts;

  const result = parseImportJson(JSON.stringify(data), "2026-05-30T10:00:00.000Z");

  assert.equal(result.ok, true);
  assert.equal(result.data.shortcuts.length, 6);
  assert.equal(result.summary.shortcuts, 6);
});
```

- [ ] **Step 7: Run domain tests**

Run:

```bash
node --test tests/shortcuts.test.mjs tests/schema.test.mjs tests/importExport.test.mjs tests/emptyData.test.mjs
npm run check
```

Expected: selected tests pass and `npm run check` exits 0.

- [ ] **Step 8: Commit domain foundation**

Run:

```bash
git add package.json src/domain/shortcuts.js src/domain/emptyData.js src/domain/sampleData.js src/domain/schema.js src/domain/importExport.js tests/shortcuts.test.mjs tests/schema.test.mjs tests/importExport.test.mjs
git commit -m "feat: add shortcut data foundation"
```

## Task 2: Safe Home and Reveal View Model

**Files:**
- Modify: `src/domain/ranking.js`
- Modify: `src/ui/viewModel.js`
- Modify: `src/ui/render.js`
- Modify: `src/styles.css`
- Test: `tests/viewModel.test.mjs`

- [ ] **Step 1: Write failing view-model privacy tests**

Append to `tests/viewModel.test.mjs`:

```js
test("safe home view model excludes sensitive task and card titles", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-30T09:12:00.000Z"), "2026-05-30");
  const viewModel = toViewModel(homeModel, "2026-05-30T09:12:00.000Z");
  const serializedSafeHome = JSON.stringify(viewModel.safeHome);

  assert.equal(viewModel.focusDrawer.revealed, false);
  assert.doesNotMatch(serializedSafeHome, /Polish narrative and risks section/);
  assert.doesNotMatch(serializedSafeHome, /Biweekly report/);
  assert.match(serializedSafeHome, /anchors ready/);
  assert.equal(viewModel.safeHome.peekItems.length, 3);
  assert.equal(viewModel.safeHome.shortcuts.length, 6);
});

test("default rendered home does not include sensitive focus text", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-30T09:12:00.000Z"), "2026-05-30");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-30T09:12:00.000Z"));

  assert.match(html, /Reveal focus/);
  assert.match(html, /Gmail/);
  assert.match(html, /Calendar/);
  assert.doesNotMatch(html, /Polish narrative and risks section/);
  assert.doesNotMatch(html, /Biweekly report/);
  assert.doesNotMatch(html, /Top 3 Today Items/);
});

test("revealed drawer includes sensitive top task details", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-30T09:12:00.000Z"), "2026-05-30");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-30T09:12:00.000Z", {
    focusRevealed: true,
    expandedCardIds: new Set(),
    backlogExpanded: false
  }));

  assert.match(html, /Top 3 Today Items/);
  assert.match(html, /Polish narrative and risks section/);
  assert.match(html, /Biweekly report/);
  assert.match(html, /Auto-hide/);
});
```

- [ ] **Step 2: Run the privacy tests and verify they fail**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: FAIL because `safeHome` and `focusDrawer` do not exist and current default render includes sensitive text.

- [ ] **Step 3: Include shortcuts in home model**

Modify `src/domain/ranking.js` return object in `buildHomeModel`:

```js
  return {
    date: todayKey,
    summary: summaryFor(topTodayItems, focusCards),
    topTodayItems,
    focusCards,
    backlogCards,
    parkingCards,
    backlogCollapsed: true,
    shortcuts: data.shortcuts ?? []
  };
```

- [ ] **Step 4: Build safe and reveal view-model surfaces**

Replace `src/ui/viewModel.js` with:

```js
import { pinnedShortcuts } from "../domain/shortcuts.js";

export function toViewModel(homeModel, nowIso, uiState = {}) {
  const date = new Date(nowIso);
  const expandedCardIds = uiState.expandedCardIds ?? new Set();
  const backlogExpanded = Boolean(uiState.backlogExpanded);
  const focusRevealed = Boolean(uiState.focusRevealed);
  const readyCount = homeModel.topTodayItems.length;
  const dateCheckCount = homeModel.topTodayItems.filter((item) => item.goalType === "deadline").length
    + homeModel.focusCards.filter((card) => card.type === "deadline").length;

  return {
    dateLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    safeHome: {
      privacyLabel: "Private by default",
      headline: `${homeModel.focusCards.length} ${homeModel.focusCards.length === 1 ? "anchor" : "anchors"} ready`,
      detail: dateCheckCount > 0
        ? `${dateCheckCount} time-sensitive ${dateCheckCount === 1 ? "check" : "checks"} today`
        : `${readyCount} ready ${readyCount === 1 ? "item" : "items"} hidden`,
      metaLine: `Focus hidden - Backlog ${backlogExpanded ? "available" : "collapsed"}`,
      peekItems: homeModel.topTodayItems.map((item, index) => ({
        id: `peek-${item.id}`,
        rank: index + 1,
        type: item.goalType,
        label: labelForType(item.goalType)
      })),
      shortcuts: pinnedShortcuts(homeModel.shortcuts, 6)
    },
    focusDrawer: {
      revealed: focusRevealed,
      summary: homeModel.summary,
      autoHideLabel: "Auto-hide in 20s",
      topTasks: homeModel.topTodayItems,
      focusCards: homeModel.focusCards.map((card) => ({
        ...card,
        expanded: expandedCardIds.has(card.id)
      })),
      backlog: {
        collapsed: !backlogExpanded,
        count: homeModel.backlogCards.length,
        cards: homeModel.backlogCards
      },
      parkingCount: homeModel.parkingCards.length
    }
  };
}

function labelForType(type) {
  return ({ project: "Project", routine: "Routine", ad_hoc: "Ad hoc", deadline: "Date check" })[type] ?? "Focus";
}
```

- [ ] **Step 5: Render Safe Home by default and drawer only when revealed**

In `src/ui/render.js`, change `renderAppHtml` to:

```js
export function renderAppHtml(viewModel) {
  return `
    <header class="topbar">
      <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
      <div class="top-actions">
        <span>${escapeHtml(viewModel.dateLabel)}</span>
        <span>Privacy On</span>
        <button class="button" data-action="open-manage">Manage</button>
        <button class="button" data-action="quick-add">Quick Add</button>
      </div>
    </header>
    <section class="safe-home" aria-label="Safe Home">
      <div class="shortcut-row" aria-label="Shortcuts">
        ${viewModel.safeHome.shortcuts.map(renderShortcut).join("")}
      </div>
      <div class="safe-summary">
        <div class="summary-label">${escapeHtml(viewModel.safeHome.privacyLabel)}</div>
        <h1>${escapeHtml(viewModel.safeHome.headline)}</h1>
        <p>${escapeHtml(viewModel.safeHome.detail)}</p>
        <button class="button primary reveal-button" type="button" data-action="reveal-focus">Reveal focus</button>
      </div>
      <div class="focus-peek" aria-label="Focus Peek">
        ${viewModel.safeHome.peekItems.length > 0
          ? viewModel.safeHome.peekItems.map(renderPeekItem).join("")
          : `<div class="empty-line">No open focus item yet.</div>`}
      </div>
    </section>
    ${viewModel.focusDrawer.revealed ? renderFocusDrawer(viewModel.focusDrawer) : ""}
  `;
}
```

Add these helper functions before `renderTopTask`:

```js
function renderShortcut(shortcut) {
  if (!isAllowedLinkUrl(shortcut.url)) return "";
  return `<button class="shortcut" type="button" data-action="open-shortcut" data-shortcut-url="${escapeHtml(shortcut.url)}">${escapeHtml(shortcut.label)}</button>`;
}

function renderPeekItem(item) {
  return `
    <article class="peek-item">
      <span>${escapeHtml(item.rank)}</span>
      <strong>${escapeHtml(item.label)}</strong>
      <div class="peek-bar tag-${classNameForType(item.type)}" aria-hidden="true"></div>
    </article>
  `;
}

function renderFocusDrawer(drawer) {
  return `
    <section class="focus-drawer" aria-label="Revealed Focus">
      <div class="drawer-panel">
        <div class="drawer-head">
          <div>
            <div class="summary-label">Today's anchor</div>
            <h1>${escapeHtml(drawer.summary)}</h1>
          </div>
          <div class="drawer-actions">
            <span>${escapeHtml(drawer.autoHideLabel)}</span>
            <button class="button" type="button" data-action="hide-focus">Hide</button>
          </div>
        </div>
        <section class="top-tasks" aria-label="Top 3 Today Items">
          ${drawer.topTasks.length > 0 ? drawer.topTasks.map(renderTopTask).join("") : renderEmptyTopTasks()}
        </section>
        <section class="focus-lane" aria-label="Focus Lane">
          ${drawer.focusCards.map(renderFocusCard).join("")}
        </section>
        <section class="backlog" aria-label="Backlog Strip">
          <div class="section-head"><span>Backlog</span><span>${drawer.backlog.collapsed ? "Collapsed by default" : "Visible for review"}</span></div>
          ${drawer.backlog.collapsed ? renderCollapsedBacklog(drawer.backlog) : renderExpandedBacklog(drawer.backlog)}
        </section>
        <section class="parking" aria-label="Parking">
          <span>Parking / Paused</span>
          <span>${drawer.parkingCount} cards hidden until their return date</span>
        </section>
      </div>
    </section>
  `;
}
```

Keep existing `renderTopTask`, `renderFocusCard`, `renderExpandedCard`, backlog helpers, escaping helpers, and type label helpers.

- [ ] **Step 6: Add Safe Home and drawer CSS**

Append to `src/styles.css`:

```css
.safe-home {
  display: grid;
  gap: 20px;
  min-height: calc(100vh - 120px);
  align-content: start;
}

.shortcut-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.shortcut {
  border: 1px solid rgba(61, 47, 29, 0.16);
  background: rgba(255, 252, 246, 0.88);
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 12px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.safe-summary {
  text-align: center;
  padding: 32px 0 22px;
}

.safe-summary h1 {
  font-size: clamp(2.1rem, 6vw, 4.8rem);
  line-height: 1;
  margin: 10px 0;
}

.safe-summary p {
  margin: 0;
  color: var(--muted);
}

.reveal-button {
  margin-top: 22px;
}

.focus-peek {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.peek-item {
  border: 1px solid rgba(61, 47, 29, 0.14);
  background: rgba(255, 252, 246, 0.82);
  border-radius: 10px;
  padding: 14px;
  min-height: 86px;
}

.peek-item span {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(45, 106, 95, 0.1);
  color: var(--accent);
  font-weight: 800;
}

.peek-item strong {
  display: block;
  margin-top: 10px;
  font-size: 0.92rem;
}

.peek-bar {
  height: 8px;
  border-radius: 999px;
  margin-top: 12px;
}

.focus-drawer {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(42, 35, 27, 0.22);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  padding: 24px;
}

.drawer-panel {
  width: min(1120px, 100%);
  max-height: min(82vh, 760px);
  overflow: auto;
  margin: 0 auto;
  border: 1px solid rgba(61, 47, 29, 0.16);
  background: var(--surface);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(41, 31, 18, 0.28);
  padding: 20px;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.drawer-head h1 {
  font-size: 1.5rem;
  margin: 4px 0 0;
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 0.9rem;
}

@media (max-width: 760px) {
  .shortcut-row {
    justify-content: center;
  }

  .focus-peek {
    grid-template-columns: 1fr;
  }

  .focus-drawer {
    padding: 10px;
  }

  .drawer-head {
    flex-direction: column;
  }
}
```

- [ ] **Step 7: Migrate existing view-model/render tests to the new hidden-by-default shape**

Update the pre-existing assertions in `tests/viewModel.test.mjs` so they intentionally read either `safeHome` or a revealed `focusDrawer`:

- In `view model keeps Top 3 as the first execution surface`, assert `viewModel.safeHome.peekItems.length === 3`, `viewModel.focusDrawer.topTasks.length === 3`, `viewModel.focusDrawer.focusCards.every((card) => card.expanded === false)`, and `viewModel.focusDrawer.backlog.collapsed === true`.
- In `view model applies local expansion state without changing the ranking model`, pass `focusRevealed: true` in the UI state and change assertions from `viewModel.focusCards` / `viewModel.backlog` to `viewModel.focusDrawer.focusCards` / `viewModel.focusDrawer.backlog`.
- In `rendered html includes collapsed cards and a collapsed backlog`, pass `{ focusRevealed: true }` to `toViewModel` because `Top 3 Today Items`, `Show backlog`, and `Expand` are now intentionally hidden by default.
- In `rendered html shows expanded card details and expanded backlog on demand`, pass `focusRevealed: true` with the expanded-card and backlog state.
- In `rendered html includes dynamic task and card actions`, pass `focusRevealed: true` and read `task` from `viewModel.focusDrawer.topTasks[0]` and `card` from `viewModel.focusDrawer.focusCards[0]`.
- In the two hand-built render tests for escaping and unsafe links, wrap the sensitive fixture under:

```js
const taskFixture = {
  id: "item-unsafe",
  goalCardId: "card-unsafe",
  goalTitle: `Goal ${unsafe}`,
  goalType: unsafe,
  title: `Task ${unsafe}`,
  reason: `Reason ${unsafe}`
};
const cardFixture = {
  id: "card-unsafe",
  title: `Card ${unsafe}`,
  type: unsafe,
  sortReason: `Sort ${unsafe}`,
  openItemCount: 1,
  linkCount: 0,
  expanded: false,
  pinned: false
};
const html = renderAppHtml({
  dateLabel: "Fri, May 22",
  safeHome: {
    privacyLabel: "Private by default",
    headline: "1 anchor ready",
    detail: "1 ready item hidden",
    metaLine: "Focus hidden - Backlog collapsed",
    peekItems: [],
    shortcuts: []
  },
  focusDrawer: {
    revealed: true,
    summary: "Protect the tricky bits",
    autoHideLabel: "Auto-hide in 20s",
    topTasks: [taskFixture],
    focusCards: [cardFixture],
    backlog: { collapsed: true, count: 0, cards: [] },
    parkingCount: 0
  }
});
```

For the unsafe-links test, use the same wrapper shape and set the `focusDrawer.focusCards` array to the existing `card-links` fixture:

```js
{
  dateLabel: "Fri, May 22",
  safeHome: {
    privacyLabel: "Private by default",
    headline: "1 anchor ready",
    detail: "1 ready item hidden",
    metaLine: "Focus hidden - Backlog collapsed",
    peekItems: [],
    shortcuts: []
  },
  focusDrawer: {
    revealed: true,
    summary: "Protect the tricky bits",
    autoHideLabel: "Auto-hide in 20s",
    topTasks: [],
    focusCards: [cardLinksFixture],
    backlog: { collapsed: true, count: 0, cards: [] },
    parkingCount: 0
  }
}
```

Keep the unsafe-string and unsafe-link expectations that already exist in those tests.

- [ ] **Step 8: Run view-model tests**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit Safe Home rendering**

Run:

```bash
git add src/domain/ranking.js src/ui/viewModel.js src/ui/render.js src/styles.css tests/viewModel.test.mjs
git commit -m "feat: render privacy-first safe home"
```

## Task 3: Reveal, Auto-Hide, Keyboard, and Shortcut Interactions

**Files:**
- Modify: `src/newtab.js`
- Modify: `tests/newtabInteractions.test.mjs`

- [ ] **Step 1: Add failing new-tab interaction tests**

Extend `loadNewtabHarness` in `tests/newtabInteractions.test.mjs` so `document` and `window` collect listeners:

```js
  const listeners = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const timeoutCallbacks = [];
```

Use this `document` mock:

```js
  globalThis.document = {
    querySelector(selector) {
      if (selector === "#app") return app;
      if (selector === "#completion-toast") return null;
      return null;
    },
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    }
  };
```

Use this `window` mock:

```js
  globalThis.window = {
    location: {
      assign(url) {
        assignedUrls.push(url);
      }
    },
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    clearTimeout: () => {},
    setTimeout(callback) {
      timeoutCallbacks.push(callback);
      return timeoutCallbacks.length;
    },
    prompt: () => ""
  };
```

Return helpers:

```js
    async keydown(key) {
      const listener = documentListeners.get("keydown");
      assert.equal(typeof listener, "function");
      await listener({ key });
    },
    async blur() {
      const listener = windowListeners.get("blur");
      assert.equal(typeof listener, "function");
      await listener();
    },
    runLatestTimeout() {
      const callback = timeoutCallbacks.at(-1);
      assert.equal(typeof callback, "function");
      callback();
    },
```

Append tests:

```js
test("new tab reveals and hides focus drawer intentionally", async (t) => {
  const appData = createInitialData(NOW);
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.click({ action: "reveal-focus" });
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.click({ action: "hide-focus" });
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);
});

test("new tab hides revealed focus on timer, escape, and blur", async (t) => {
  const appData = createInitialData(NOW);
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  await harness.click({ action: "reveal-focus" });
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
  harness.runLatestTimeout();
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.keydown("f");
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
  await harness.keydown("Escape");
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.keydown("/");
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
  await harness.blur();
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);
});

test("new tab opens safe shortcut urls in a new tab", async (t) => {
  const appData = createInitialData(NOW);
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  await harness.click({ action: "open-shortcut", shortcutUrl: "https://mail.google.com/" });
  await harness.click({ action: "open-shortcut", shortcutUrl: "javascript:alert(1)" });

  assert.deepEqual(harness.createdTabs, [{ url: "https://mail.google.com/", active: true }]);
});
```

- [ ] **Step 2: Run interaction tests and verify they fail**

Run:

```bash
node --test tests/newtabInteractions.test.mjs
```

Expected: FAIL because reveal, hide, keyboard, blur, and shortcut actions are not implemented.

- [ ] **Step 3: Add reveal state and timers**

Modify the `uiState` block in `src/newtab.js`:

```js
const REVEAL_DURATION_MS = 20_000;
const app = document.querySelector("#app");
const toast = document.querySelector("#completion-toast");
const repo = createChromeRepository();
const uiState = {
  expandedCardIds: new Set(),
  backlogExpanded: false,
  focusRevealed: false
};
let revealTimerId = null;
let appData = ensureSetupMeta(await repo.load());
await refresh();
```

Add helper functions near the bottom:

```js
function revealFocus() {
  uiState.focusRevealed = true;
  scheduleRevealHide();
}

function hideFocus() {
  uiState.focusRevealed = false;
  clearRevealTimer();
}

function scheduleRevealHide() {
  clearRevealTimer();
  revealTimerId = window.setTimeout(async () => {
    uiState.focusRevealed = false;
    await refresh();
  }, REVEAL_DURATION_MS);
}

function clearRevealTimer() {
  if (revealTimerId !== null) {
    window.clearTimeout?.(revealTimerId);
    revealTimerId = null;
  }
}
```

- [ ] **Step 4: Wire click actions**

In the click listener in `src/newtab.js`, add these branches before the setup-state guard:

```js
  if (action === "open-shortcut") {
    const url = target.dataset.shortcutUrl;
    if (!isAllowedLinkUrl(url)) return;
    globalThis.chrome?.tabs?.create?.({ url, active: true });
    return;
  }

  if (action === "reveal-focus") {
    if (getSetupState(appData) !== "complete") return;
    revealFocus();
    await refresh();
    return;
  }

  if (action === "hide-focus") {
    hideFocus();
    await refresh();
    return;
  }
```

In the existing `complete-item` branch, add `scheduleRevealHide();` after `showCompletionReward(target);` so successful completion keeps the drawer briefly visible before hiding:

```js
  if (action === "complete-item") {
    const itemId = target.dataset.itemId;
    showCompletionReward(target);
    scheduleRevealHide();
    appData = completeTodayItem(appData, itemId, nowIso);
    await repo.save(appData);
    window.setTimeout(refresh, 700);
    return;
  }
```

- [ ] **Step 5: Add keyboard and blur listeners**

Add after the click listener in `src/newtab.js`:

```js
document.addEventListener("keydown", async (event) => {
  if (getSetupState(appData) !== "complete") return;
  if (event.key === "Escape" && uiState.focusRevealed) {
    hideFocus();
    await refresh();
    return;
  }
  if ((event.key === "f" || event.key === "/") && !uiState.focusRevealed) {
    revealFocus();
    await refresh();
  }
});

window.addEventListener("blur", async () => {
  if (!uiState.focusRevealed) return;
  hideFocus();
  await refresh();
});
```

- [ ] **Step 6: Run interaction tests**

Run:

```bash
node --test tests/newtabInteractions.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit reveal interactions**

Run:

```bash
git add src/newtab.js tests/newtabInteractions.test.mjs
git commit -m "feat: add intentional focus reveal interactions"
```

## Task 4: Manage Shortcuts Editing

**Files:**
- Modify: `src/ui/manageViewModel.js`
- Modify: `src/ui/manageRender.js`
- Modify: `src/manage.js`
- Test: `tests/manageActions.test.mjs`
- Test: `tests/manageRender.test.mjs`
- Test: `tests/manageInteractions.test.mjs`

- [ ] **Step 1: Add failing manage action tests**

Append to `tests/manageActions.test.mjs`:

```js
import { resetShortcuts, updateShortcut } from "../src/domain/shortcuts.js";
```

Append tests:

```js
test("updateShortcut edits manage shortcut fields safely", () => {
  const data = createInitialData(NOW);
  const next = updateShortcut(data, "shortcut-gmail", {
    label: "Mail",
    url: "https://mail.google.com/mail/u/0/",
    pinned: false,
    position: 4
  }, LATER);
  const shortcut = next.shortcuts.find((entry) => entry.id === "shortcut-gmail");

  assert.equal(shortcut.label, "Mail");
  assert.equal(shortcut.url, "https://mail.google.com/mail/u/0/");
  assert.equal(shortcut.pinned, false);
  assert.equal(shortcut.position, 4);
  assert.equal(validateAppData(next).ok, true);
});

test("resetShortcuts restores default shortcut set", () => {
  const data = {
    ...createInitialData(NOW),
    shortcuts: [{ id: "shortcut-custom", label: "Custom", url: "https://example.com", pinned: true, position: 1 }]
  };
  const next = resetShortcuts(data, LATER);

  assert.deepEqual(next.shortcuts.map((shortcut) => shortcut.id), [
    "shortcut-gmail",
    "shortcut-calendar",
    "shortcut-drive",
    "shortcut-maps",
    "shortcut-search",
    "shortcut-lark"
  ]);
  assert.equal(validateAppData(next).ok, true);
});
```

- [ ] **Step 2: Add failing manage render tests**

Append to `tests/manageRender.test.mjs`:

```js
test("renderManageHtml renders shortcuts editor", () => {
  const viewModel = toManageViewModel(createInitialData("2026-05-30T09:12:00.000Z"));
  const html = renderManageHtml(viewModel);

  assert.match(html, /data-section="shortcuts"/);
  assert.match(html, /Save shortcut/);
  assert.match(html, /Reset shortcuts/);
  assert.match(html, /Gmail/);
});
```

- [ ] **Step 3: Add failing manage interaction tests**

Append to `tests/manageInteractions.test.mjs`:

```js
test("manage page saves shortcut edits and resets shortcuts", async (t) => {
  const data = createInitialData(NOW);
  const harness = await loadManageHarness(data);
  t.after(harness.restore);

  await harness.submitShortcut("shortcut-gmail", {
    label: "Mail",
    url: "https://mail.google.com/mail/u/0/",
    pinned: false,
    position: "4"
  });
  let saved = harness.storage.saved.at(-1)["focus-anchor-data"];
  let shortcut = saved.shortcuts.find((entry) => entry.id === "shortcut-gmail");
  assert.equal(shortcut.label, "Mail");
  assert.equal(shortcut.pinned, false);

  await harness.click({ action: "reset-shortcuts" });
  saved = harness.storage.saved.at(-1)["focus-anchor-data"];
  assert.equal(saved.shortcuts.find((entry) => entry.id === "shortcut-gmail").label, "Gmail");
});
```

Add this helper to the object returned by `loadManageHarness`:

```js
    async submitShortcut(shortcutId, fields) {
      const listener = listeners.get("submit");
      assert.equal(typeof listener, "function");
      await listener({
        preventDefault() {},
        target: {
          dataset: { shortcutId },
          closest(selector) {
            return selector === "form[data-action='save-shortcut']" ? this : null;
          }
        },
        formData: fields
      });
    },
```

Update the FormData mock in that harness so `new FormData(form)` can read `event.formData`:

```js
const originalFormData = globalThis.FormData;
globalThis.FormData = class FakeFormData {
  constructor(form) {
    this.fields = form.formData ?? form.fields ?? {};
  }
  get(key) {
    return this.fields[key] ?? "";
  }
};
```

Restore it in `restore()`:

```js
globalThis.FormData = originalFormData;
```

- [ ] **Step 4: Run manage tests and verify failures**

Run:

```bash
node --test tests/manageActions.test.mjs tests/manageRender.test.mjs tests/manageInteractions.test.mjs
```

Expected: FAIL for render and interaction shortcuts support.

- [ ] **Step 5: Expose shortcuts in Manage view model**

Modify `src/ui/manageViewModel.js`:

```js
import { summarizeAppData } from "../domain/importExport.js";
import { ensureShortcuts } from "../domain/shortcuts.js";

export function toManageViewModel(data, selectedCardId = null) {
  const normalizedData = ensureShortcuts(data ?? {});
  const goalCards = Array.isArray(normalizedData?.goalCards) ? normalizedData.goalCards : [];
  const shortcuts = Array.isArray(normalizedData?.shortcuts) ? normalizedData.shortcuts : [];
  const safeData = {
    ...normalizedData,
    goalCards,
    shortcuts,
    behaviorEvents: Array.isArray(normalizedData?.behaviorEvents) ? normalizedData.behaviorEvents : [],
    dailySnapshots: Array.isArray(normalizedData?.dailySnapshots) ? normalizedData.dailySnapshots : []
  };
  const resolvedSelectedCardId = selectedCardId ?? goalCards[0]?.id ?? null;
  const selectedCard = goalCards.find((card) => card.id === resolvedSelectedCardId)
    ?? goalCards[0]
    ?? null;

  return {
    sections: [
      { id: "cards", label: "Cards" },
      { id: "shortcuts", label: "Shortcuts" },
      { id: "rules", label: "Rules" },
      { id: "data", label: "Data" }
    ],
    cards: goalCards.map((card) => ({
      id: card.id,
      title: card.title,
      type: card.type,
      status: card.status,
      importance: card.importance,
      itemCount: Array.isArray(card.todayItems) ? card.todayItems.length : 0,
      linkCount: Array.isArray(card.links) ? card.links.length : 0,
      ruleCount: Array.isArray(card.rules) ? card.rules.length : 0
    })),
    selectedCard,
    shortcuts,
    rules: goalCards.flatMap((card) => (Array.isArray(card.rules) ? card.rules : []).map((rule) => ({
      ...rule,
      goalTitle: card.title
    }))),
    summary: summarizeAppData(safeData)
  };
}
```

- [ ] **Step 6: Render shortcuts section**

In `src/ui/manageRender.js`, add shortcuts section in `manage-grid` after selected card:

```js
          ${renderSelectedCard(viewModel.selectedCard)}
          ${renderShortcutsSection(viewModel.shortcuts)}
          <section class="manage-rules" data-section="rules" aria-label="Rules">
```

Add helper:

```js
function renderShortcutsSection(shortcuts) {
  return `
    <section class="manage-shortcuts" data-section="shortcuts" aria-label="Shortcuts">
      <div class="section-head"><span>Shortcuts</span><span>${escapeHtml(shortcuts.length)} saved</span></div>
      <div class="shortcut-editor-list">
        ${shortcuts.map(renderShortcutEditor).join("")}
      </div>
      <button class="button" type="button" data-action="reset-shortcuts">Reset shortcuts</button>
    </section>
  `;
}

function renderShortcutEditor(shortcut) {
  return `
    <form class="shortcut-editor" data-action="save-shortcut" data-shortcut-id="${escapeHtml(shortcut.id)}">
      <label>
        <span>Label</span>
        <input name="label" value="${escapeHtml(shortcut.label)}" autocomplete="off">
      </label>
      <label>
        <span>URL</span>
        <input name="url" value="${escapeHtml(shortcut.url)}" autocomplete="off">
      </label>
      <div class="form-row">
        <label>
          <span>Position</span>
          <input name="position" type="number" min="1" max="99" value="${escapeHtml(shortcut.position)}">
        </label>
        <label class="checkbox-field">
          <input name="pinned" type="checkbox"${shortcut.pinned ? " checked" : ""}>
          <span>Pinned</span>
        </label>
      </div>
      <button class="button primary" type="submit">Save shortcut</button>
    </form>
  `;
}
```

Add `shortcuts` to `labelForSummary`:

```js
    shortcuts: "Shortcuts",
```

- [ ] **Step 7: Handle shortcut save and reset in Manage**

Modify imports in `src/manage.js`:

```js
import { resetShortcuts, updateShortcut } from "./domain/shortcuts.js";
```

In submit listener, after card form branch, add:

```js
  const shortcutForm = event.target.closest("form[data-action='save-shortcut']");
  if (shortcutForm && appData) {
    event.preventDefault();
    const fields = readFormData(shortcutForm);
    appData = updateShortcut(appData, shortcutForm.dataset.shortcutId, {
      label: fields.label,
      url: fields.url,
      pinned: readCheckbox(shortcutForm, "pinned"),
      position: readNumber(fields.position, 1)
    });
    await repo.save(appData);
    render();
    return;
  }
```

In click listener, add before import confirmation:

```js
  if (action === "reset-shortcuts") {
    appData = resetShortcuts(appData);
    await repo.save(appData);
    render();
    return;
  }
```

- [ ] **Step 8: Add shortcut manage CSS**

Append to `src/styles.css`:

```css
.manage-shortcuts {
  display: grid;
  gap: 14px;
}

.shortcut-editor-list {
  display: grid;
  gap: 12px;
}

.shortcut-editor {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(61, 47, 29, 0.12);
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 252, 246, 0.72);
}
```

- [ ] **Step 9: Run manage tests**

Run:

```bash
node --test tests/manageActions.test.mjs tests/manageRender.test.mjs tests/manageInteractions.test.mjs
```

Expected: PASS.

- [ ] **Step 10: Commit manage shortcuts**

Run:

```bash
git add src/domain/shortcuts.js src/ui/manageViewModel.js src/ui/manageRender.js src/manage.js src/styles.css tests/manageActions.test.mjs tests/manageRender.test.mjs tests/manageInteractions.test.mjs
git commit -m "feat: manage new tab shortcuts"
```

## Task 5: Documentation, Full Verification, and Browser QA

**Files:**
- Modify: `README.md`
- Modify: `docs/install-and-usage.md`

- [ ] **Step 1: Update README manual verification**

Modify `README.md` Manual Verification section to:

```md
## Manual Verification

After loading the extension locally:

- Open a new tab with empty local storage and confirm the setup screen appears instead of demo/sample data.
- Complete setup with one card and one today item.
- Confirm the default new tab shows Safe Home with non-sensitive counts and shortcuts, not task titles or project names.
- Click `Reveal focus` and confirm the Top 3 Today Items appear in the drawer.
- Click a Top 3 `Done` action and confirm the completion reward motion plays without shifting the layout.
- Confirm the drawer hides after `Escape`, tab blur, and the auto-hide timer.
- Open another new tab and confirm local state persists.
- Open Manage and confirm shortcuts can be edited and reset.
```

- [ ] **Step 2: Update install and usage docs**

In `docs/install-and-usage.md`, replace the post-setup display bullet list with:

```md
第一次安装成功后，新标签页会先显示 no-code setup。完成设置后，之后的新标签页会默认显示 Safe Home：

- 安全摘要：只显示 `3 anchors ready`、`1 time-sensitive check today` 这类不泄密的信息。
- `Focus Peek`：用抽象条目提醒你有 Top 3，但默认不显示任务名、项目名或排序原因。
- `Reveal focus`：点击后才显示真实 Top 3 和卡片上下文。
- Google-style shortcuts：Gmail、Calendar、Drive、Maps、Search、Lark 等快捷入口。
- `Manage`：编辑卡片、数据和快捷入口。
```

In daily usage, replace steps 1-4 with:

```md
1. 打开新标签页，先看 Safe Home 的安全摘要和 Focus Peek。
2. 如果正在 share screen，可以直接使用快捷入口，不需要 reveal priorities。
3. 如果准备开始做事，点击 `Reveal focus` 或按 `/` / `f` 打开真实 Top 3。
4. 先做 Top 3 的第一项，做完后点击 `Done`。
```

Add to current version boundaries:

```md
- 屏幕共享不会自动检测；当前版本通过默认安全首页、主动 reveal 和自动隐藏来降低泄露风险。
```

- [ ] **Step 3: Run full automated verification**

Run:

```bash
npm test
npm run check
git diff --check
```

Expected:

- `npm test`: all tests pass.
- `npm run check`: exits 0.
- `git diff --check`: no output.

- [ ] **Step 4: Run browser QA in the loaded Chrome extension**

Use the real unpacked extension for QA because this change depends on the New Tab override and `chrome.tabs.create`.

1. Open `chrome://extensions`.
2. Ensure Developer Mode is enabled.
3. Reload `Focus Anchor`.
4. Open a new tab.
5. Open DevTools Console for the new tab and run:

```js
chrome.storage.local.clear(() => location.reload());
```

Verify these flows in the browser:

1. Empty storage shows setup.
2. Setup can create one card and one today item.
3. Finished setup lands on Safe Home and does not show the exact task title or card title.
4. `Reveal focus` shows the exact Top 3.
5. `Done` records completion and returns to a safe default state after hide.
6. `Escape` hides the drawer.
7. Revealing focus and switching to another tab hides the drawer when this tab loses focus.
8. Clicking Gmail shortcut requests `https://mail.google.com/`.
9. Manage renders Shortcuts and can edit Gmail label.
10. Reset shortcuts restores defaults.

Expected: no non-favicon console errors.

- [ ] **Step 5: Commit docs and verification updates**

Run:

```bash
git add README.md docs/install-and-usage.md
git commit -m "docs: update privacy-first usage"
```

## Final Verification Before Merge

- [ ] Run:

```bash
npm test
npm run check
git diff --check
git status --short --branch
```

Expected:

- All tests pass.
- Syntax check passes.
- Diff check is clean.
- Working tree is clean after final commit.

- [ ] Prepare final summary with:

```md
Implemented privacy-first Safe Home, intentional reveal drawer, shortcut data/model/rendering, Manage shortcut editing, and docs.

Verification:
- npm test
- npm run check
- git diff --check
- Browser QA: setup, Safe Home privacy, reveal/hide, shortcut open, Manage shortcut edit/reset
```
