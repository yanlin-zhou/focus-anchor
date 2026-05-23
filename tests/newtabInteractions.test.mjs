import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAppData } from "../src/domain/emptyData.js";
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
    tabs: { create: () => {} }
  };

  await import(`../src/newtab.js?test=${Date.now()}-${Math.random()}`);

  return {
    app,
    assignedUrls,
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
