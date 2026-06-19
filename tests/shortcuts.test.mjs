import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SHORTCUTS,
  createDefaultShortcuts,
  ensureShortcuts,
  pinnedShortcuts,
  resetShortcuts,
  updateShortcut
} from "../src/domain/shortcuts.js";
import { createEmptyAppData } from "../src/domain/emptyData.js";

const NOW = "2026-05-30T09:00:00.000Z";

test("default shortcuts include Maps, Gmail, and Drive in pinned order", () => {
  const shortcuts = createDefaultShortcuts(NOW);

  assert.deepEqual(shortcuts.map((shortcut) => shortcut.id), [
    "shortcut-maps",
    "shortcut-gmail",
    "shortcut-drive"
  ]);
  assert.deepEqual(shortcuts.map((shortcut) => shortcut.position), [1, 2, 3]);
  assert.equal(shortcuts.every((shortcut) => shortcut.pinned === true), true);
  assert.equal(shortcuts.every((shortcut) => shortcut.createdAt === NOW), true);
  assert.equal(DEFAULT_SHORTCUTS.length, 3);
});

test("ensureShortcuts migrates missing shortcuts without changing existing data identity fields", () => {
  const data = createEmptyAppData(NOW);
  delete data.shortcuts;

  const migrated = ensureShortcuts(data, "2026-05-30T10:00:00.000Z");

  assert.equal(migrated.version, 1);
  assert.equal(migrated.createdAt, NOW);
  assert.equal(migrated.shortcuts.length, 3);
  assert.equal(migrated.updatedAt, "2026-05-30T10:00:00.000Z");
});

test("ensureShortcuts upgrades legacy default shortcuts to the current top three", () => {
  const data = {
    ...createEmptyAppData(NOW),
    updatedAt: NOW,
    shortcuts: [
      { id: "shortcut-gmail", label: "Gmail", url: "https://mail.google.com/", pinned: true, position: 1, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-calendar", label: "Calendar", url: "https://calendar.google.com/", pinned: true, position: 2, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-drive", label: "Drive", url: "https://drive.google.com/", pinned: true, position: 3, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-maps", label: "Maps", url: "https://maps.google.com/", pinned: true, position: 4, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-search", label: "Search", url: "https://www.google.com/", pinned: true, position: 5, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-lark", label: "Lark", url: "https://www.larksuite.com/", pinned: true, position: 6, createdAt: NOW, updatedAt: NOW }
    ]
  };

  const migrated = ensureShortcuts(data, "2026-05-30T10:00:00.000Z");

  assert.deepEqual(migrated.shortcuts.map((shortcut) => shortcut.id), [
    "shortcut-maps",
    "shortcut-gmail",
    "shortcut-drive"
  ]);
  assert.deepEqual(migrated.shortcuts.map((shortcut) => shortcut.position), [1, 2, 3]);
  assert.equal(migrated.updatedAt, "2026-05-30T10:00:00.000Z");
});

test("ensureShortcuts upgrades previous Maps Gmail Search defaults to Maps Gmail Drive", () => {
  const data = {
    ...createEmptyAppData(NOW),
    updatedAt: NOW,
    shortcuts: [
      { id: "shortcut-maps", label: "Maps", url: "https://maps.google.com/", pinned: true, position: 1, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-gmail", label: "Gmail", url: "https://mail.google.com/", pinned: true, position: 2, createdAt: NOW, updatedAt: NOW },
      { id: "shortcut-search", label: "Search", url: "https://www.google.com/", pinned: true, position: 3, createdAt: NOW, updatedAt: NOW }
    ]
  };

  const migrated = ensureShortcuts(data, "2026-05-30T10:00:00.000Z");

  assert.deepEqual(migrated.shortcuts.map((shortcut) => shortcut.id), [
    "shortcut-maps",
    "shortcut-gmail",
    "shortcut-drive"
  ]);
  assert.deepEqual(migrated.shortcuts.map((shortcut) => shortcut.position), [1, 2, 3]);
  assert.equal(migrated.updatedAt, "2026-05-30T10:00:00.000Z");
});

test("ensureShortcuts normalizes existing shortcuts and drops unsafe urls", () => {
  const data = {
    ...createEmptyAppData(NOW),
    shortcuts: [
      { id: "custom", label: "Custom", url: "https://example.com", pinned: true, position: 2 },
      { id: "bad", label: "Bad", url: "javascript:alert(1)", pinned: true, position: 1 }
    ]
  };

  const migrated = ensureShortcuts(data, "2026-05-30T10:00:00.000Z");

  assert.deepEqual(migrated.shortcuts.map((shortcut) => shortcut.id), ["custom"]);
  assert.equal(migrated.shortcuts[0].label, "Custom");
  assert.equal(migrated.shortcuts[0].url, "https://example.com/");
  assert.equal(migrated.shortcuts[0].position, 1);
});

test("updateShortcut edits safe fields and rejects unsafe urls", () => {
  const data = ensureShortcuts(createEmptyAppData(NOW), NOW);
  const updated = updateShortcut(data, "shortcut-gmail", {
    label: "Mail",
    url: "https://mail.google.com/mail/u/0/",
    pinned: false,
    position: 3
  }, "2026-05-30T11:00:00.000Z");
  const shortcut = updated.shortcuts.find((entry) => entry.id === "shortcut-gmail");

  assert.equal(shortcut.label, "Mail");
  assert.equal(shortcut.url, "https://mail.google.com/mail/u/0/");
  assert.equal(shortcut.pinned, false);
  assert.equal(shortcut.position, 3);
  assert.equal(updated.updatedAt, "2026-05-30T11:00:00.000Z");

  const rejected = updateShortcut(updated, "shortcut-gmail", {
    label: "Bad",
    url: "javascript:alert(1)"
  }, "2026-05-30T12:00:00.000Z");

  assert.equal(rejected, updated);
});

test("updateShortcut moves shortcut to requested position", () => {
  const data = ensureShortcuts(createEmptyAppData(NOW), NOW);
  const updated = updateShortcut(data, "shortcut-drive", {
    position: 1
  }, "2026-05-30T11:00:00.000Z");

  assert.deepEqual(updated.shortcuts.map((shortcut) => shortcut.id), [
    "shortcut-drive",
    "shortcut-maps",
    "shortcut-gmail"
  ]);
  assert.equal(updated.shortcuts.find((shortcut) => shortcut.id === "shortcut-drive").position, 1);
});

test("resetShortcuts restores defaults", () => {
  const data = {
    ...ensureShortcuts(createEmptyAppData(NOW), NOW),
    shortcuts: [{ id: "custom", label: "Custom", url: "https://example.com", pinned: true, position: 1 }]
  };

  const reset = resetShortcuts(data, "2026-05-30T13:00:00.000Z");

  assert.deepEqual(reset.shortcuts.map((shortcut) => shortcut.id), createDefaultShortcuts(NOW).map((shortcut) => shortcut.id));
  assert.equal(reset.shortcuts[0].updatedAt, "2026-05-30T13:00:00.000Z");
  assert.equal(reset.updatedAt, "2026-05-30T13:00:00.000Z");
});

test("pinnedShortcuts filters unsafe and unpinned entries while preserving order and limit", () => {
  const shortcuts = [
    { id: "shortcut-one", label: "One", url: "https://one.example", pinned: true, position: 1 },
    { id: "shortcut-hidden", label: "Hidden", url: "https://hidden.example", pinned: false, position: 2 },
    { id: "shortcut-unsafe", label: "Unsafe", url: "javascript:alert(1)", pinned: true, position: 3 },
    { id: "shortcut-malformed", label: "", url: "https://malformed.example", pinned: true, position: 4 },
    { id: "shortcut-two", label: "Two", url: "https://two.example", pinned: true, position: 5 },
    { id: "shortcut-three", label: "Three", url: "https://three.example", pinned: true, position: 6 },
    { id: "shortcut-four", label: "Four", url: "https://four.example", pinned: true, position: 7 }
  ];

  const pinned = pinnedShortcuts(shortcuts, 2);
  const defaultPinned = pinnedShortcuts(shortcuts);

  assert.deepEqual(pinned.map((shortcut) => shortcut.id), ["shortcut-one", "shortcut-two"]);
  assert.equal(pinned.length, 2);
  assert.equal(pinned.every((shortcut) => shortcut.pinned), true);
  assert.deepEqual(defaultPinned.map((shortcut) => shortcut.id), ["shortcut-one", "shortcut-two", "shortcut-three"]);
});
