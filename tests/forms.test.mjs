import assert from "node:assert/strict";
import test from "node:test";
import { readNumber } from "../src/ui/forms.js";

test("readNumber returns fallback for blank strings", () => {
  assert.equal(readNumber("", 4), 4);
  assert.equal(readNumber("   ", 5), 5);
});
