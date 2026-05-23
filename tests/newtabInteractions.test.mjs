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


async function loadNewtabHarness(initialData) {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalChrome = globalThis.chrome;
  const originalDate = globalThis.Date;
  const listeners = new Map();
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
    }
  };
  globalThis.window = {
    location: {
      assign(url) {
        assignedUrls.push(url);
      }
    },
    setTimeout: originalWindow?.setTimeout ?? globalThis.setTimeout,
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
    createdTabs,
    storage,
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
    restore() {
      globalThis.Date = originalDate;
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
      globalThis.chrome = originalChrome;
    }
  };
}
