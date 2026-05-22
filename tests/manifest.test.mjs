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
