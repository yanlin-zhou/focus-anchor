import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { createMemoryRepository } from "../src/storage/repository.js";
import { parseImportJson, serializeExportData, summarizeAppData } from "../src/domain/importExport.js";

const NOW = "2026-05-22T09:00:00.000Z";

test("export serializes complete app data as pretty JSON and preserves cards plus behavior events", () => {
  const data = {
    ...createInitialData(NOW),
    behaviorEvents: [
      { id: "event-1", type: "card_opened", createdAt: "2026-05-22T10:00:00.000Z", payload: { goalCardId: "card-biweekly-report" } }
    ]
  };

  const serialized = serializeExportData(data);
  const parsed = JSON.parse(serialized);

  assert.equal(serialized.endsWith("\n"), true);
  assert.match(serialized, /\n  "version": 1,/);
  assert.equal(parsed.goalCards.length, data.goalCards.length);
  assert.deepEqual(parsed.behaviorEvents, data.behaviorEvents);
});

test("import parses valid JSON and reports summary counts for initial data", () => {
  const data = createInitialData(NOW);
  const result = parseImportJson(JSON.stringify(data), NOW);

  assert.equal(result.ok, true);
  assert.equal(result.error, null);
  assert.deepEqual(result.summary, {
    cards: 4,
    links: 7,
    rules: 1,
    openItems: 6,
    doneItems: 0,
    events: 0,
    snapshots: 0
  });
  assert.equal(result.data.setup.completedAt, NOW);
});

test("invalid JSON returns a parse error without data or summary", () => {
  const result = parseImportJson("{ invalid json", NOW);

  assert.equal(result.ok, false);
  assert.equal(result.data, null);
  assert.equal(result.summary, null);
  assert.match(result.error, /valid JSON/);
});

test("invalid app data returns schema errors", () => {
  const result = parseImportJson(JSON.stringify({ ...createInitialData(NOW), goalCards: "not cards" }), NOW);

  assert.equal(result.ok, false);
  assert.equal(result.data, null);
  assert.equal(result.summary, null);
  assert.match(result.error, /schema error/i);
  assert.match(result.error, /goalCards must be an array/);
});

test("valid JSON with non-object app data returns schema errors without throwing", () => {
  for (const text of ["null", "\"not app data\"", "42", "true", "[]"]) {
    let result;
    assert.doesNotThrow(() => {
      result = parseImportJson(text, NOW);
    });

    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.equal(result.summary, null);
    assert.match(result.error, /schema error|import/i);
  }
});

test("invalid import does not overwrite memory repository state", async () => {
  const repo = createMemoryRepository(createInitialData(NOW));
  const before = await repo.load();
  const result = parseImportJson("{ invalid json", NOW);

  if (result.ok) await repo.save(result.data);
  const after = await repo.load();

  assert.equal(result.ok, false);
  assert.deepEqual(after, before);
});

test("summary counts behavior events and daily snapshots", () => {
  const data = {
    ...createInitialData(NOW),
    behaviorEvents: [
      { id: "event-1", type: "card_opened", createdAt: "2026-05-22T10:00:00.000Z", payload: {} },
      { id: "event-2", type: "today_item_completed", createdAt: "2026-05-22T11:00:00.000Z", payload: {} }
    ],
    dailySnapshots: [
      { id: "snapshot-1", date: "2026-05-22" }
    ]
  };

  assert.equal(summarizeAppData(data).events, 2);
  assert.equal(summarizeAppData(data).snapshots, 1);
});
