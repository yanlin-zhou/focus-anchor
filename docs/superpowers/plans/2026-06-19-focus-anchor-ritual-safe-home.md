# Focus Anchor Ritual Safe Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Focus Anchor so the Safe Home feels premium and ritualized, while Maps/Gmail/Drive remain visible before reveal and the revealed workbench stays calm and operational.

**Architecture:** Keep the existing local-first Chrome extension architecture: domain/view-model logic remains stable, render functions emit semantic HTML, and `src/styles.css` owns the visual system. The redesign is mostly CSS plus small markup class additions in existing renderers. Privacy constraints stay enforced through view-model and render tests.

**Tech Stack:** Vanilla JavaScript ES modules, static HTML render functions, CSS, Node's built-in test runner, Chrome extension New Tab surface.

---

## Scope And File Map

### Existing Dirty Worktree

The current worktree already contains uncommitted shortcut fixes that make Maps/Gmail/Drive the default shortcut set. Preserve and commit those changes before starting visual work so the redesign is built on the correct baseline.

### Files

- Modify: `src/domain/shortcuts.js`
  - Baseline shortcut defaults and retired-default migration.
- Modify: `docs/install-and-usage.md`
  - User-facing default shortcut documentation.
- Modify: `tests/shortcuts.test.mjs`
  - Shortcut default and migration regression tests.
- Modify: `tests/manageActions.test.mjs`
  - Reset-shortcut default regression test.
- Modify: `tests/viewModel.test.mjs`
  - Safe Home privacy, shortcut dock, rendered structure, and style-selector tests.
- Modify: `src/ui/render.js`
  - Safe Home semantic structure, shortcut dock markup, and workbench class hooks.
- Modify: `src/ui/manageRender.js`
  - Manage header and shortcut-editor class hooks.
- Modify: `src/ui/setupRender.js`
  - Setup class hooks only where visual consistency needs them.
- Modify: `src/styles.css`
  - Ritual Safe Home, shortcut dock, reveal workbench, Manage, Setup, responsive, and reduced-motion styles.

---

### Task 1: Commit Maps/Gmail/Drive Shortcut Baseline

**Files:**
- Modify: `src/domain/shortcuts.js`
- Modify: `docs/install-and-usage.md`
- Modify: `tests/shortcuts.test.mjs`
- Modify: `tests/manageActions.test.mjs`
- Modify: `tests/viewModel.test.mjs`

- [ ] **Step 1: Verify the shortcut baseline tests pass**

Run:

```bash
node --test tests/shortcuts.test.mjs tests/viewModel.test.mjs tests/manageActions.test.mjs
```

Expected: PASS. The output includes:

```text
✔ default shortcuts include Maps, Gmail, and Drive in pinned order
✔ ensureShortcuts upgrades previous Maps Gmail Search defaults to Maps Gmail Drive
✔ safe home renders Google Maps, Gmail, and Drive shortcuts
✔ resetShortcuts restores default shortcut set
```

- [ ] **Step 2: Confirm only the shortcut baseline files are staged**

Run:

```bash
git add src/domain/shortcuts.js docs/install-and-usage.md tests/shortcuts.test.mjs tests/manageActions.test.mjs tests/viewModel.test.mjs
git diff --cached --name-only
```

Expected exact staged file list:

```text
docs/install-and-usage.md
src/domain/shortcuts.js
tests/manageActions.test.mjs
tests/shortcuts.test.mjs
tests/viewModel.test.mjs
```

- [ ] **Step 3: Commit the shortcut baseline**

Run:

```bash
git commit -m "fix: restore drive shortcut"
```

Expected: commit succeeds. This commit is intentionally separate from the visual redesign.

---

### Task 2: Add Safe Home Ritual Markup Tests

**Files:**
- Modify: `tests/viewModel.test.mjs`

- [ ] **Step 1: Write the failing Safe Home structure test**

Add this test after `safe home renders Google Maps, Gmail, and Drive shortcuts` in `tests/viewModel.test.mjs`:

```js
test("safe home renders ritual structure with shortcut dock before reveal", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-30T09:12:00.000Z"), "2026-05-30");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-30T09:12:00.000Z"));

  assert.match(html, /class="safe-home safe-stage"/);
  assert.match(html, /class="ritual-summary"/);
  assert.match(html, /class="shortcut-dock"/);
  assert.match(html, /class="shortcut shortcut-tile"/);
  assert.match(html, /class="shortcut-mark" aria-hidden="true">M<\/span>/);
  assert.match(html, /class="shortcut-label">Maps<\/span>/);
  assert.ok(html.indexOf(`class="shortcut-dock"`) < html.indexOf(`class="reveal-button"`));
  const safeHomeStart = html.indexOf(`class="safe-home safe-stage"`);
  const safeHomeEnd = html.indexOf(`</section>`, safeHomeStart);
  const focusPeekIndex = html.indexOf(`class="focus-peek"`);
  assert.ok(focusPeekIndex > safeHomeStart && focusPeekIndex < safeHomeEnd);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: FAIL because `safe-home safe-stage`, `ritual-summary`, `shortcut-dock`, and `shortcut-tile` do not exist yet.

- [ ] **Step 3: Commit the failing test is not allowed**

Do not commit after the red test. Continue to Task 3.

---

### Task 3: Implement Safe Home Ritual Markup

**Files:**
- Modify: `src/ui/render.js`
- Test: `tests/viewModel.test.mjs`

- [ ] **Step 1: Update Safe Home markup and move Focus Peek inside the stage**

In `renderAppHtml`, replace the Safe Home section and the separate Focus Peek section with this structure:

```js
    <section class="safe-home safe-stage" aria-label="Safe Home">
      <div class="safe-summary ritual-summary">
        <div>
          <div class="summary-label">${escapeHtml(safeHome.privacyLabel)}</div>
          <h1>${escapeHtml(safeHome.headline)}</h1>
        </div>
        <div class="daily-meta">
          <div>${escapeHtml(safeHome.detail)}</div>
          <div>${escapeHtml(safeHome.metaLine)}</div>
        </div>
      </div>
      <div class="shortcut-dock" aria-label="Google shortcuts">
        ${safeHome.shortcuts.map(renderShortcut).join("")}
      </div>
      ${renderRevealToggle(viewModel.focusDrawer.revealed)}
      ${renderFocusPeek(safeHome)}
    </section>
    ${viewModel.focusDrawer.revealed ? renderFocusDrawer(viewModel.focusDrawer) : ""}
```

- [ ] **Step 2: Update shortcut button markup**

Replace `renderShortcut` in `src/ui/render.js` with:

```js
function renderShortcut(shortcut) {
  if (!shortcut.label || !shortcut.slot) return "";
  const label = escapeHtml(shortcut.label);
  const initial = label.slice(0, 1).toUpperCase();
  return `
    <button class="shortcut shortcut-tile" type="button" data-action="open-shortcut" data-shortcut-slot="${escapeHtml(shortcut.slot)}">
      <span class="shortcut-mark" aria-hidden="true">${initial}</span>
      <span class="shortcut-label">${label}</span>
    </button>
  `;
}
```

- [ ] **Step 3: Add a Focus Peek helper**

Add this helper below `renderRevealToggle` in `src/ui/render.js`:

```js
function renderFocusPeek(safeHome) {
  return `
    <div class="focus-peek" aria-label="Focus Peek">
      <div class="section-head"><span>Focus Peek</span><span>Titles hidden</span></div>
      ${safeHome.peekItems.length > 0 ? safeHome.peekItems.map(renderPeekItem).join("") : `<div class="empty-line">No ready items hidden.</div>`}
    </div>
  `;
}
```

- [ ] **Step 4: Run the render tests**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run the interaction tests that depend on shortcut buttons**

Run:

```bash
node --test tests/newtabInteractions.test.mjs
```

Expected: PASS. `data-action="open-shortcut"` and `data-shortcut-slot` remain unchanged.

- [ ] **Step 6: Commit Safe Home markup**

Run:

```bash
git add src/ui/render.js tests/viewModel.test.mjs
git commit -m "feat: add ritual safe home structure"
```

---

### Task 4: Add Ritual Safe Home Style Tests

**Files:**
- Modify: `tests/viewModel.test.mjs`

- [ ] **Step 1: Write the failing CSS selector test**

Add this test near the existing style test in `tests/viewModel.test.mjs`:

```js
test("styles include ritual safe home and shortcut dock selectors", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const selectors = [
    ".safe-stage",
    ".safe-stage::before",
    ".safe-stage::after",
    ".ritual-summary",
    ".shortcut-dock",
    ".shortcut-tile",
    ".shortcut-mark",
    ".shortcut-label"
  ];

  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(css, new RegExp(`${escaped}\\s*\\{`));
  }

  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.shortcut-dock\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: FAIL because the new CSS selectors are absent.

---

### Task 5: Implement Ritual Safe Home Styles

**Files:**
- Modify: `src/styles.css`
- Test: `tests/viewModel.test.mjs`

- [ ] **Step 1: Add visual-system variables**

At the end of the `:root` block in `src/styles.css`, add these variables:

```css
  --ink: #17211f;
  --ink-2: #20322f;
  --paper: #fffdf7;
  --paper-soft: #fff8ec;
  --stage: #ead4ad;
  --stage-deep: #182a27;
  --amber: #b85c1f;
  --amber-2: #793c15;
  --blue-quiet: #435f98;
```

- [ ] **Step 2: Replace Safe Home stage styles**

Replace the existing `.safe-home`, `.safe-summary`, `.shortcut-row`, `.shortcut`, `.shortcut:hover`, and `.safe-summary + .shortcut-row` rules with:

```css
.safe-home {
  margin-top: 30px;
  animation: enter 260ms ease both;
}

.safe-stage {
  min-height: 420px;
  border: 1px solid rgba(121, 60, 21, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 76% 22%, rgba(184, 92, 31, 0.26), transparent 26%),
    linear-gradient(122deg, var(--stage) 0%, #f7ead3 48%, var(--stage-deep) 49%, #203b36 100%);
  box-shadow: 0 24px 70px rgba(81, 55, 30, 0.14);
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 0.52fr);
  grid-template-areas:
    "summary summary"
    "peek dock"
    "peek reveal";
  align-items: end;
  gap: 18px 26px;
  position: relative;
  overflow: hidden;
}

.safe-stage::before {
  content: "";
  position: absolute;
  inset: 16px 16px 16px auto;
  width: min(38%, 520px);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 253, 247, 0.12), rgba(255, 253, 247, 0)),
    repeating-linear-gradient(90deg, rgba(255, 253, 247, 0.1) 0 1px, transparent 1px 24px);
  pointer-events: none;
}

.safe-stage::after {
  content: "";
  position: absolute;
  right: 9%;
  top: 24%;
  width: 104px;
  height: 104px;
  border: 1px solid rgba(255, 253, 247, 0.24);
  border-radius: 999px;
  box-shadow: inset 0 0 0 22px rgba(255, 253, 247, 0.04);
  pointer-events: none;
}

.safe-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 28px;
}

.ritual-summary {
  grid-area: summary;
  position: relative;
  z-index: 1;
}

.shortcut-dock {
  grid-area: dock;
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.shortcut {
  min-width: 0;
  min-height: 44px;
  border: 1px solid rgba(121, 60, 21, 0.24);
  border-radius: 8px;
  background: var(--raised);
  color: var(--text);
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 760;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 1px 0 rgba(45, 38, 31, 0.05);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.shortcut-tile {
  min-height: 62px;
  justify-content: flex-start;
  gap: 10px;
  background: rgba(255, 253, 247, 0.94);
  border-color: rgba(255, 253, 247, 0.34);
  box-shadow: 0 12px 28px rgba(20, 36, 32, 0.18);
}

.shortcut-mark {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(184, 92, 31, 0.12);
  color: var(--amber-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 860;
  flex: 0 0 auto;
}

.shortcut-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 253, 247, 0.72);
  box-shadow: 0 18px 38px rgba(20, 36, 32, 0.22);
}
```

- [ ] **Step 3: Place Focus Peek and Reveal inside the stage grid**

Add these rules after `.focus-peek` and `.reveal-button`:

```css
.safe-stage .focus-peek {
  grid-area: peek;
  margin-top: 0;
  position: relative;
  z-index: 1;
}

.safe-stage .reveal-button {
  grid-area: reveal;
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Update mobile rules**

Inside `@media (max-width: 1120px)`, add:

```css
  .safe-stage {
    grid-template-columns: 1fr;
    grid-template-areas:
      "summary"
      "dock"
      "reveal"
      "peek";
  }

  .safe-stage::before,
  .safe-stage::after {
    opacity: 0.55;
  }
```

Inside `@media (max-width: 620px)`, replace the old `.shortcut-row` rule with:

```css
  .shortcut-dock {
    grid-template-columns: 1fr;
  }

  .shortcut-tile {
    min-height: 54px;
  }
```

- [ ] **Step 5: Run Safe Home tests**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Safe Home styles**

Run:

```bash
git add src/styles.css tests/viewModel.test.mjs
git commit -m "feat: style ritual safe home"
```

---

### Task 6: Add Reveal Workbench Style Tests

**Files:**
- Modify: `tests/viewModel.test.mjs`

- [ ] **Step 1: Write the failing workbench selector test**

Add this test near the style tests in `tests/viewModel.test.mjs`:

```js
test("styles include calm reveal workbench selectors", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const selectors = [
    ".focus-drawer",
    ".drawer-panel",
    ".drawer-head",
    ".top-tasks",
    ".top-task",
    ".goal-card",
    ".backlog-collapsed",
    ".parking"
  ];

  for (const selector of selectors) {
    assert.match(css, new RegExp(`${selector.replace(".", "\\.")}\\s*\\{`));
  }

  assert.match(css, /\.drawer-panel\s*\{[\s\S]*box-shadow:\s*var\(--shadow\);/);
  assert.match(css, /\.top-task\s*\{[\s\S]*grid-template-rows:\s*auto 1fr auto;/);
});
```

- [ ] **Step 2: Run the test to verify it passes or fails for the intended reason**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: PASS if existing selectors satisfy this baseline. If it fails, the failure points to the missing workbench selector or declaration to preserve during styling.

---

### Task 7: Refine Reveal Workbench Styles

**Files:**
- Modify: `src/styles.css`
- Test: `tests/viewModel.test.mjs`

- [ ] **Step 1: Replace drawer surface with calmer workbench styling**

Update the existing `.focus-drawer` and `.drawer-panel` rules to:

```css
.focus-drawer {
  margin-top: 22px;
  animation: enter 220ms ease both;
}

.drawer-panel {
  border: 1px solid rgba(38, 49, 47, 0.12);
  border-radius: 14px;
  background: rgba(255, 253, 247, 0.96);
  box-shadow: var(--shadow);
  padding: 18px;
}
```

- [ ] **Step 2: Tighten Top Task and Goal Card surfaces**

Update `.top-task` and `.goal-card` with these declarations while preserving their existing layout-related declarations:

```css
.top-task {
  min-height: 124px;
  border: 1px solid rgba(38, 49, 47, 0.12);
  border-radius: 10px;
  background: var(--paper);
  padding: 14px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  box-shadow: 0 10px 26px rgba(81, 55, 30, 0.07);
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  position: relative;
  overflow: hidden;
}

.goal-card {
  min-height: 188px;
  border: 1px solid rgba(38, 49, 47, 0.12);
  border-radius: 10px;
  background: var(--paper);
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 26px rgba(81, 55, 30, 0.07);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  animation: cardIn 320ms ease both;
}
```

- [ ] **Step 3: Keep Backlog and Parking secondary**

Update `.backlog-collapsed` and `.parking` to:

```css
.backlog-collapsed {
  min-height: 58px;
  border: 1px dashed rgba(38, 49, 47, 0.18);
  border-radius: 10px;
  background: rgba(255, 250, 241, 0.58);
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: var(--muted);
  font-size: 13px;
}

.parking {
  margin-top: 14px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px dashed rgba(38, 49, 47, 0.16);
  border-radius: 10px;
  color: var(--muted);
  background: rgba(255, 250, 241, 0.48);
  padding: 0 14px;
  font-size: 13px;
}
```

- [ ] **Step 4: Run workbench tests**

Run:

```bash
node --test tests/viewModel.test.mjs tests/newtabInteractions.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit workbench styling**

Run:

```bash
git add src/styles.css tests/viewModel.test.mjs
git commit -m "feat: refine reveal workbench"
```

---

### Task 8: Add Manage Control Panel Tests

**Files:**
- Modify: `tests/manageRender.test.mjs`

- [ ] **Step 1: Write the failing Manage structure test**

Add this test after `renderManageHtml renders manage shell sections and data actions`:

```js
test("renderManageHtml renders local control panel heading and shortcut labels", () => {
  const html = renderManageHtml(toManageViewModel(createInitialData("2026-05-30T09:12:00.000Z")));

  assert.match(html, /class="manage-kicker"/);
  assert.match(html, /Local-only control panel/);
  assert.match(html, /class="manage-subtitle"/);
  assert.match(html, /Cards, shortcuts, rules, and local data stay in this browser\./);
  assert.match(html, /Maps/);
  assert.match(html, /Gmail/);
  assert.match(html, /Drive/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/manageRender.test.mjs
```

Expected: FAIL because `manage-kicker` and `manage-subtitle` do not exist yet.

---

### Task 9: Implement Manage Control Panel Markup And Styles

**Files:**
- Modify: `src/ui/manageRender.js`
- Modify: `src/styles.css`
- Test: `tests/manageRender.test.mjs`

- [ ] **Step 1: Update Manage heading markup**

In `renderManageHtml`, replace the current `.manage-heading` content with:

```js
        <div class="manage-heading">
          <p class="summary-label manage-kicker">Local-only control panel</p>
          <h1>Manage Focus Anchor</h1>
          <p class="manage-subtitle">Cards, shortcuts, rules, and local data stay in this browser.</p>
        </div>
```

- [ ] **Step 2: Add Manage heading and shortcut editor styles**

Add these rules near existing Manage styles in `src/styles.css`:

```css
.manage-kicker {
  margin: 0 0 8px;
}

.manage-subtitle {
  margin: 10px 0 0;
  max-width: 620px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
}

.manage-heading {
  border: 1px solid rgba(121, 60, 21, 0.22);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(240, 214, 173, 0.9), rgba(255, 253, 247, 0.82)),
    var(--panel);
  box-shadow: var(--soft-shadow);
  padding: 20px;
}

.shortcut-editor {
  display: grid;
  gap: 10px;
  border: 1px solid rgba(38, 49, 47, 0.1);
  border-radius: 8px;
  padding: 12px;
  background: rgba(255, 252, 246, 0.78);
}
```

- [ ] **Step 3: Run Manage tests**

Run:

```bash
node --test tests/manageRender.test.mjs tests/manageInteractions.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit Manage control panel**

Run:

```bash
git add src/ui/manageRender.js src/styles.css tests/manageRender.test.mjs
git commit -m "feat: polish manage control panel"
```

---

### Task 10: Add Setup Visual Consistency Tests

**Files:**
- Modify: `tests/setupRender.test.mjs`

- [ ] **Step 1: Extend the setup style selector test**

In `styles include required setup selectors and responsive shell`, append these selectors to the `selectors` array:

```js
    ".setup-heading",
    ".setup-actions",
    ".draft-card-stats"
```

Add these assertions after the existing responsive assertion:

```js
  assert.match(css, /\.setup-panel\s*\{[\s\S]*background:\s*var\(--raised\);/);
  assert.match(css, /\.template-option:hover\s*\{[\s\S]*background:\s*#fff4e3;/);
```

- [ ] **Step 2: Run the setup tests**

Run:

```bash
node --test tests/setupRender.test.mjs
```

Expected: PASS if current setup styling already satisfies the baseline. If it fails, continue to Task 11.

---

### Task 11: Refine Setup Styles Without Changing Behavior

**Files:**
- Modify: `src/styles.css`
- Test: `tests/setupRender.test.mjs`

- [ ] **Step 1: Tighten setup panel styling**

Update `.setup-panel` to:

```css
.setup-panel {
  padding: 22px;
  display: grid;
  gap: 18px;
  background: var(--raised);
}
```

- [ ] **Step 2: Tighten template option hover state**

Update `.template-option:hover` to:

```css
.template-option:hover {
  transform: translateY(-1px);
  border-color: #c4ad8b;
  background: #fff4e3;
  box-shadow: var(--soft-shadow);
}
```

- [ ] **Step 3: Run setup tests**

Run:

```bash
node --test tests/setupRender.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit setup polish**

Run:

```bash
git add src/styles.css tests/setupRender.test.mjs
git commit -m "feat: align setup visual system"
```

---

### Task 12: Add Responsive And Reduced Motion Style Tests

**Files:**
- Modify: `tests/viewModel.test.mjs`

- [ ] **Step 1: Write responsive CSS regression test**

Add this test near the style tests:

```js
test("styles keep ritual home responsive and motion-safe", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 1120px\)[\s\S]*\.safe-stage\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.shortcut-dock\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*h1\s*\{[\s\S]*font-size:\s*34px;/);
});
```

- [ ] **Step 2: Run the test**

Run:

```bash
node --test tests/viewModel.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Commit responsive coverage if it required CSS/test changes**

Run:

```bash
git add src/styles.css tests/viewModel.test.mjs
git commit -m "test: cover ritual responsive styles"
```

If no files changed after Step 2, skip this commit.

---

### Task 13: Full Automated Verification

**Files:**
- No production file changes.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected:

```text
fail 0
```

- [ ] **Step 2: Run syntax checks**

Run:

```bash
npm run check
```

Expected: command exits 0.

- [ ] **Step 3: Search for old default shortcut wording**

Run:

```bash
rg 'Maps`、`Gmail`、`Search|shortcut-search"\s*\]' docs/install-and-usage.md tests src
```

Expected: no output and exit code 1. This means no current docs/tests/source assert Maps/Gmail/Search as the active default trio.

- [ ] **Step 4: Confirm git status**

Run:

```bash
git status --short
```

Expected: clean, or only intentional untracked screenshots outside the repository. Do not leave generated preview files in the repository.

---

### Task 14: Rendered Frontend Verification

**Files:**
- No committed files unless a verification failure identifies a bug.

- [ ] **Step 1: Define flow under test**

Use this exact flow statement in the verification notes:

```text
The flow under test is: app loads -> Safe Home renders -> Maps/Gmail/Drive are visible before reveal -> Reveal focus opens workbench -> focus details appear.
```

- [ ] **Step 2: Load a local preview or the extension**

Preferred path: use the in-app Browser plugin against the loaded Chrome extension or a localhost preview of `src/newtab.html`.

If browser policy blocks `data:` previews or localhost servers, record this blocker and rely on the render-level tests from Task 13. Do not bypass browser policy with raw Chrome DevTools Protocol or alternate browser surfaces.

- [ ] **Step 3: Check desktop viewport**

Verify:

```text
Safe Home is not blank.
Maps, Gmail, and Drive are visible before reveal.
Reveal focus is the dominant action.
Task titles are hidden before reveal.
No visible text overlaps in the first viewport.
```

- [ ] **Step 4: Check narrow viewport**

Use a mobile-width viewport if the Browser plugin allows it. Verify:

```text
The shortcut dock stacks to one column.
Safe Home summary, shortcut dock, and Reveal focus do not overlap.
Reveal workbench remains readable.
```

- [ ] **Step 5: Check interaction**

Click `Reveal focus`.

Expected:

```text
Top 3 Today Items appears.
Sensitive task details appear only after reveal.
Hide replaces Reveal focus.
```

- [ ] **Step 6: Record evidence in final implementation response**

Include:

```text
Automated checks: npm test, npm run check
Rendered checks: desktop, narrow viewport, reveal interaction
Known limitations: browser policy or localhost sandbox blockers, if any
```

---

## Self-Review Checklist

- Every Safe Home requirement from the spec maps to Tasks 2, 3, 4, 5, 12, and 14.
- Reveal Workbench requirements map to Tasks 6, 7, and 14.
- Manage requirements map to Tasks 8 and 9.
- Setup consistency maps to Tasks 10 and 11.
- Privacy and shortcut constraints map to Tasks 1, 2, 3, 13, and 14.
- No task changes storage schema, ranking behavior, manifest behavior, import/export, or shortcut URL validation.
- Each code-changing task has a test-first or selector-baseline step, a verification command, and a commit step.
