import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAppData } from "../src/domain/emptyData.js";
import { createInitialData } from "../src/domain/sampleData.js";
import { createDraft } from "../src/domain/templates.js";

const NOW = "2026-05-22T09:12:00.000Z";

test("new tab ignores stale setup template actions without crashing", async (t) => {
  const appData = createEmptyAppData(NOW);
  appData.setup.draft = createDraft();
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  await assert.doesNotReject(() => harness.click({
    action: "add-template-card",
    templateId: "stale-template"
  }));
  assert.equal(harness.storage.saved.length, 0);
});

test("new tab opens Manage without assuming Chrome extension globals", async (t) => {
  const appData = createEmptyAppData(NOW);
  appData.setup.completedAt = NOW;
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);
  delete globalThis.chrome;

  await assert.doesNotReject(() => harness.click({ action: "open-manage" }));
  assert.deepEqual(harness.assignedUrls, ["/src/manage.html"]);
});

test("new tab open-all ignores unsafe link URLs", async (t) => {
  const appData = createInitialData(NOW);
  appData.goalCards[0] = {
    ...appData.goalCards[0],
    links: [
      { id: "safe-link", goalCardId: appData.goalCards[0].id, label: "Safe", url: "https://example.com", kind: "doc", includeInOpenAll: true },
      { id: "unsafe-link", goalCardId: appData.goalCards[0].id, label: "Unsafe", url: "javascript:alert(1)", kind: "doc", includeInOpenAll: true }
    ]
  };
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  await harness.click({ action: "open-all", cardId: appData.goalCards[0].id });

  assert.deepEqual(harness.createdTabs, [{ url: "https://example.com", active: false }]);
});

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
  assert.equal(harness.timeoutCalls.at(-1)?.delay, 20_000);
  await harness.runLatestTimeout();
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.keydown("f");
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
  const firstRevealTimer = harness.timeoutCalls.at(-1)?.id;
  await harness.keydown("/");
  assert.deepEqual(harness.clearedTimeouts, []);
  await harness.keydown("Escape");
  assert.deepEqual(harness.clearedTimeouts, [firstRevealTimer]);
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.keydown("/");
  assert.deepEqual(harness.clearedTimeouts, [firstRevealTimer]);
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
  await harness.blur();
  assert.deepEqual(harness.clearedTimeouts, [firstRevealTimer, harness.timeoutCalls.at(-1)?.id]);
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);
});

test("new tab ignores modified and editable keyboard shortcuts", async (t) => {
  const appData = createInitialData(NOW);
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  await harness.keydown("f", { metaKey: true });
  await harness.keydown("f", { ctrlKey: true });
  await harness.keydown("/", { altKey: true });
  await harness.keydown("f", { shiftKey: true });
  await harness.keydown("f", { isComposing: true });
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.keydown("f", { target: { tagName: "INPUT" } });
  assert.doesNotMatch(harness.app.innerHTML, /Polish narrative and risks section/);

  await harness.keydown("/");
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
  await harness.keydown("Escape", { target: { isContentEditable: true } });
  assert.match(harness.app.innerHTML, /Polish narrative and risks section/);
});

test("new tab opens safe shortcut urls in a new tab", async (t) => {
  const appData = createInitialData(NOW);
  const harness = await loadNewtabHarness(appData);
  t.after(harness.restore);

  await harness.click({ action: "open-shortcut", shortcutUrl: "https://mail.google.com/" });
  await harness.click({ action: "open-shortcut", shortcutUrl: "javascript:alert(1)" });

  assert.deepEqual(harness.createdTabs, [{ url: "https://mail.google.com/", active: true }]);
});


async function loadNewtabHarness(initialData) {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalChrome = globalThis.chrome;
  const originalDate = globalThis.Date;
  const listeners = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const timeoutCallbacks = [];
  const timeoutCalls = [];
  const clearedTimeouts = [];
  const app = {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };
  const storage = {
    saved: [],
    async get() {
      return { "focus-anchor-data": structuredClone(initialData) };
    },
    async set(value) {
      this.saved.push(structuredClone(value));
    },
    async remove() {}
  };
  const assignedUrls = [];
  const createdTabs = [];

  globalThis.Date = class FixedDate extends originalDate {
    constructor(...args) {
      super(...(args.length === 0 ? [NOW] : args));
    }

    static now() {
      return originalDate.parse(NOW);
    }
  };
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
  globalThis.window = {
    location: {
      assign(url) {
        assignedUrls.push(url);
      }
    },
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    clearTimeout(id) {
      clearedTimeouts.push(id);
    },
    setTimeout(callback, delay) {
      timeoutCallbacks.push(callback);
      const id = timeoutCallbacks.length;
      timeoutCalls.push({ id, delay });
      return id;
    },
    prompt: () => ""
  };
  globalThis.chrome = {
    storage: { local: storage },
    runtime: { getURL: (path) => `chrome-extension://focus-anchor/${path}` },
    tabs: { create: (options) => createdTabs.push(options) }
  };

  await import(`../src/newtab.js?test=${Date.now()}-${Math.random()}`);

  return {
    app,
    assignedUrls,
    clearedTimeouts,
    createdTabs,
    storage,
    timeoutCalls,
    async click(dataset) {
      const listener = listeners.get("click");
      assert.equal(typeof listener, "function");
      await listener({
        target: {
          dataset,
          closest() {
            return this;
          }
        }
      });
    },
    async keydown(key, eventOptions = {}) {
      const listener = documentListeners.get("keydown");
      assert.equal(typeof listener, "function");
      await listener({ key, ...eventOptions });
    },
    async blur() {
      const listener = windowListeners.get("blur");
      assert.equal(typeof listener, "function");
      await listener();
    },
    async runLatestTimeout() {
      const callback = timeoutCallbacks.at(-1);
      assert.equal(typeof callback, "function");
      await callback();
    },
    restore() {
      globalThis.Date = originalDate;
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
      globalThis.chrome = originalChrome;
    }
  };
}
