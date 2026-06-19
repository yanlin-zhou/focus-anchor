import { isAllowedLinkUrl } from "./schema.js";

export const DEFAULT_SHORTCUTS = [
  { id: "shortcut-maps", label: "Maps", url: "https://maps.google.com/" },
  { id: "shortcut-gmail", label: "Gmail", url: "https://mail.google.com/" },
  { id: "shortcut-drive", label: "Drive", url: "https://drive.google.com/" }
];

const LEGACY_DEFAULT_SHORTCUTS = [
  { id: "shortcut-gmail", label: "Gmail", url: "https://mail.google.com/" },
  { id: "shortcut-calendar", label: "Calendar", url: "https://calendar.google.com/" },
  { id: "shortcut-drive", label: "Drive", url: "https://drive.google.com/" },
  { id: "shortcut-maps", label: "Maps", url: "https://maps.google.com/" },
  { id: "shortcut-search", label: "Search", url: "https://www.google.com/" },
  { id: "shortcut-lark", label: "Lark", url: "https://www.larksuite.com/" }
];

const PREVIOUS_DEFAULT_SHORTCUTS = [
  { id: "shortcut-maps", label: "Maps", url: "https://maps.google.com/" },
  { id: "shortcut-gmail", label: "Gmail", url: "https://mail.google.com/" },
  { id: "shortcut-search", label: "Search", url: "https://www.google.com/" }
];

export function createDefaultShortcuts(nowIso = new Date().toISOString()) {
  return DEFAULT_SHORTCUTS.map((shortcut, index) => ({
    ...shortcut,
    url: normalizeUrl(shortcut.url),
    pinned: true,
    position: index + 1,
    createdAt: nowIso,
    updatedAt: nowIso
  }));
}

export function ensureShortcuts(data, nowIso = new Date().toISOString()) {
  if (data === null) return null;
  const current = Array.isArray(data.shortcuts) ? data.shortcuts : [];
  const normalized = normalizeShortcuts(current, nowIso);
  const hasRetiredDefaults = isRetiredDefaultShortcutSet(normalized);
  const shortcuts = current.length > 0
    ? (hasRetiredDefaults ? createDefaultShortcuts(nowIso) : normalized)
    : createDefaultShortcuts(nowIso);

  return {
    ...data,
    updatedAt: data.shortcuts === undefined || hasRetiredDefaults ? nowIso : data.updatedAt,
    shortcuts
  };
}

export function updateShortcut(data, shortcutId, patch = {}, nowIso = new Date().toISOString()) {
  const shortcuts = normalizeShortcuts(data.shortcuts ?? [], nowIso);
  const shortcut = shortcuts.find((entry) => entry.id === shortcutId);
  if (!shortcut) return data;

  const label = "label" in patch ? trim(patch.label) : shortcut.label;
  const url = "url" in patch ? normalizeUrl(patch.url) : shortcut.url;
  if (!label || !isAllowedLinkUrl(url)) return data;

  const nextShortcut = {
    ...shortcut,
    label,
    url,
    pinned: "pinned" in patch ? Boolean(patch.pinned) : shortcut.pinned,
    updatedAt: nowIso
  };
  const shortcutsWithUpdate = "position" in patch
    ? moveShortcut(shortcuts, shortcutId, nextShortcut, patch.position)
    : normalizeShortcuts(shortcuts.map((entry) => (
      entry.id === shortcutId ? nextShortcut : entry
    )), nowIso);

  return {
    ...data,
    updatedAt: nowIso,
    shortcuts: shortcutsWithUpdate
  };
}

export function resetShortcuts(data, nowIso = new Date().toISOString()) {
  return {
    ...data,
    updatedAt: nowIso,
    shortcuts: createDefaultShortcuts(nowIso)
  };
}

export function pinnedShortcuts(shortcuts, limit = 3) {
  return normalizeShortcuts(shortcuts ?? [])
    .filter((shortcut) => shortcut.pinned)
    .slice(0, limit);
}

function normalizeShortcuts(shortcuts, nowIso = new Date().toISOString()) {
  return renumberShortcuts(shortcuts
    .map((shortcut, index) => normalizeShortcut(shortcut, index, nowIso))
    .filter(Boolean)
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label)));
}

function isRetiredDefaultShortcutSet(shortcuts) {
  return isDefaultShortcutSet(shortcuts, LEGACY_DEFAULT_SHORTCUTS) ||
    isDefaultShortcutSet(shortcuts, PREVIOUS_DEFAULT_SHORTCUTS);
}

function isDefaultShortcutSet(shortcuts, defaultSet) {
  if (shortcuts.length !== defaultSet.length) return false;
  return defaultSet.every((legacy, index) => {
    const shortcut = shortcuts[index];
    return shortcut?.id === legacy.id &&
      shortcut.label === legacy.label &&
      shortcut.url === normalizeUrl(legacy.url) &&
      shortcut.pinned === true;
  });
}

function moveShortcut(shortcuts, shortcutId, shortcut, requestedPosition) {
  const remaining = shortcuts.filter((entry) => entry.id !== shortcutId);
  const requestedIndex = normalizePosition(requestedPosition) - 1;
  const clampedIndex = Math.min(Math.max(requestedIndex, 0), remaining.length);
  return renumberShortcuts([
    ...remaining.slice(0, clampedIndex),
    shortcut,
    ...remaining.slice(clampedIndex)
  ]);
}

function renumberShortcuts(shortcuts) {
  return shortcuts.map((shortcut, index) => ({ ...shortcut, position: index + 1 }));
}

function normalizeShortcut(shortcut, index, nowIso) {
  const id = trim(shortcut?.id) || `shortcut-${index + 1}`;
  const label = trim(shortcut?.label);
  const url = normalizeUrl(shortcut?.url);
  if (!label || !isAllowedLinkUrl(url)) return null;

  return {
    id,
    label,
    url,
    pinned: shortcut?.pinned !== false,
    position: normalizePosition(shortcut?.position ?? index + 1),
    createdAt: trim(shortcut?.createdAt) || nowIso,
    updatedAt: trim(shortcut?.updatedAt) || nowIso
  };
}

function normalizeUrl(value) {
  try {
    return new URL(trim(value)).toString();
  } catch {
    return "";
  }
}

function normalizePosition(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 999;
  return Math.max(1, Math.round(numeric));
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}
