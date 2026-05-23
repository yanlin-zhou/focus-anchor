import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAppData, ensureSetupMeta, getSetupState, markSetupSkipped } from "../src/domain/emptyData.js";
import { createInitialData } from "../src/domain/sampleData.js";
import { validateAppData } from "../src/domain/schema.js";
import { createMemoryRepository } from "../src/storage/repository.js";

test("empty app shell contains setup metadata and no demo cards", () => {
  const data = createEmptyAppData("2026-05-22T09:00:00.000Z");

  assert.equal(data.version, 1);
  assert.equal(data.createdAt, "2026-05-22T09:00:00.000Z");
  assert.equal(data.updatedAt, "2026-05-22T09:00:00.000Z");
  assert.deepEqual(data.goalCards, []);
  assert.deepEqual(data.behaviorEvents, []);
  assert.deepEqual(data.dailySnapshots, []);
  assert.deepEqual(data.setup, {
    completedAt: null,
    skippedAt: null,
    draft: null,
    version: 1
  });
  assert.equal(validateAppData(data).ok, true);
});

test("existing MVP data migrates to setup-completed data", () => {
  const mvpData = createInitialData("2026-05-22T09:00:00.000Z");
  const migrated = ensureSetupMeta(mvpData, "2026-05-22T10:00:00.000Z");

  assert.equal(migrated.setup.completedAt, "2026-05-22T10:00:00.000Z");
  assert.equal(migrated.setup.skippedAt, null);
  assert.equal(migrated.setup.draft, null);
  assert.deepEqual(migrated.goalCards, mvpData.goalCards);
  assert.equal(migrated.goalCards.length > 0, true);
  assert.equal(validateAppData(migrated).ok, true);
});

test("setup state distinguishes empty, skipped, draft, and complete", () => {
  const empty = createEmptyAppData("2026-05-22T09:00:00.000Z");
  const skipped = markSetupSkipped(empty, "2026-05-22T09:01:00.000Z");
  const draft = { ...empty, setup: { ...empty.setup, draft: { cards: [] } } };
  const complete = { ...empty, setup: { ...empty.setup, completedAt: "2026-05-22T09:02:00.000Z" } };

  assert.equal(getSetupState(null), "not_set_up");
  assert.equal(getSetupState(empty), "not_set_up");
  assert.equal(getSetupState(skipped), "skipped");
  assert.equal(getSetupState(draft), "in_progress");
  assert.equal(getSetupState(complete), "complete");
});

test("memory repository can remove local app data", async () => {
  const repo = createMemoryRepository(createEmptyAppData("2026-05-22T09:00:00.000Z"));

  assert.notEqual(await repo.load(), null);
  await repo.remove();
  assert.equal(await repo.load(), null);
});
