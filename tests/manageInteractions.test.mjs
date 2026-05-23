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

async function loadManageHarness(initialData) {
  const originalDocument = globalThis.document;
  const originalChrome = globalThis.chrome;
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
    async get() {
      return { "focus-anchor-data": structuredClone(initialData) };
    },
    async set() {},
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
    restore() {
      globalThis.document = originalDocument;
      globalThis.chrome = originalChrome;
    }
  };
}
