import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";

const NOW = "2026-05-22T09:12:00.000Z";

test("manage reset handler requires exact RESET confirmation", async (t) => {
  const harness = await loadManageHarness(createInitialData(NOW));
  t.after(harness.restore);

  harness.resetInput.value = "";
  await harness.click({ action: "confirm-reset-data" });
  assert.equal(harness.storage.removed, false);

  harness.resetInput.value = "RESET";
  await harness.click({ action: "confirm-reset-data" });
  assert.equal(harness.storage.removed, true);
});

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
  assert.equal(shortcut.url, "https://mail.google.com/mail/u/0/");
  assert.equal(shortcut.pinned, false);
  assert.equal(shortcut.position, 4);

  await harness.click({ action: "reset-shortcuts" });
  saved = harness.storage.saved.at(-1)["focus-anchor-data"];
  assert.equal(saved.shortcuts.find((entry) => entry.id === "shortcut-gmail").label, "Gmail");
});

test("manage page migrates missing shortcuts before saving shortcut edits", async (t) => {
  const data = createInitialData(NOW);
  delete data.shortcuts;
  const harness = await loadManageHarness(data);
  t.after(harness.restore);

  await harness.submitShortcut("shortcut-gmail", {
    label: "Mail",
    url: "https://mail.google.com/mail/u/0/",
    pinned: false,
    position: "4"
  });

  const saved = harness.storage.saved.at(-1)["focus-anchor-data"];
  const shortcut = saved.shortcuts.find((entry) => entry.id === "shortcut-gmail");
  assert.equal(Array.isArray(saved.shortcuts), true);
  assert.equal(shortcut.label, "Mail");
  assert.equal(shortcut.url, "https://mail.google.com/mail/u/0/");
  assert.equal(shortcut.pinned, false);
  assert.equal(shortcut.position, 4);
});

async function loadManageHarness(initialData) {
  const originalDocument = globalThis.document;
  const originalChrome = globalThis.chrome;
  const originalFormData = globalThis.FormData;
  const listeners = new Map();
  const resetInput = { name: "reset-confirmation", value: "" };
  const app = {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    querySelector(selector) {
      if (selector === "input[name='reset-confirmation']") return resetInput;
      if (selector === "[data-action='confirm-reset-data']") return { disabled: true };
      return null;
    }
  };
  const storage = {
    removed: false,
    saved: [],
    async get() {
      return { "focus-anchor-data": structuredClone(initialData) };
    },
    async set(payload) {
      this.saved.push(structuredClone(payload));
    },
    async remove(key) {
      if (key === "focus-anchor-data") this.removed = true;
    }
  };

  globalThis.document = {
    querySelector(selector) {
      if (selector === "#manage-app") return app;
      return null;
    },
    createElement() {
      return {
        click() {},
        remove() {}
      };
    },
    body: {
      append() {}
    }
  };
  globalThis.chrome = {
    storage: { local: storage }
  };
  globalThis.FormData = class FakeFormData {
    constructor(form) {
      this.fields = form.formData ?? form.fields ?? {};
    }
    get(key) {
      return this.fields[key] ?? "";
    }
    entries() {
      return Object.entries(this.fields)[Symbol.iterator]();
    }
  };
  globalThis.URL = globalThis.URL ?? {};
  globalThis.URL.createObjectURL = globalThis.URL.createObjectURL ?? (() => "blob:focus-anchor");
  globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL ?? (() => {});

  await import(`../src/manage.js?test=${Date.now()}-${Math.random()}`);

  return {
    resetInput,
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
    async submitShortcut(shortcutId, fields) {
      const listener = listeners.get("submit");
      assert.equal(typeof listener, "function");
      await listener({
        preventDefault() {},
        target: {
          dataset: { shortcutId },
          formData: fields,
          elements: {
            pinned: { checked: Boolean(fields.pinned) }
          },
          closest(selector) {
            return selector === "form[data-action='save-shortcut']" ? this : null;
          }
        },
        formData: fields
      });
    },
    restore() {
      globalThis.document = originalDocument;
      globalThis.chrome = originalChrome;
      globalThis.FormData = originalFormData;
    }
  };
}
