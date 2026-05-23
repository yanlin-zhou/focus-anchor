import { GOAL_STATUSES, GOAL_TYPES, LINK_KINDS, RULE_TYPES, isAllowedLinkUrl } from "./schema.js";

let fallbackIdCounter = 0;

export function addGoalCard(data, input, nowIso = new Date().toISOString()) {
  const title = trim(input?.title);
  if (!title) return data;
  const existingIds = collectIds(data);

  const card = {
    id: makeId("card", nowIso, title, data.goalCards.length, existingIds),
    title,
    type: normalizeChoice(input?.type, GOAL_TYPES, "project"),
    importance: normalizeImportance(input?.importance),
    status: normalizeChoice(input?.status, GOAL_STATUSES, "active"),
    pinned: Boolean(input?.pinned),
    snoozedUntil: input?.snoozedUntil ?? null,
    sortReason: trim(input?.sortReason),
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    todayItems: [],
    links: [],
    rules: []
  };

  return {
    ...data,
    updatedAt: nowIso,
    goalCards: [...data.goalCards, card]
  };
}

export function updateGoalCard(data, cardId, patch = {}, nowIso = new Date().toISOString()) {
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;

    const next = { ...card };
    if ("title" in patch) {
      const title = trim(patch.title);
      if (title) next.title = title;
    }
    if ("type" in patch && GOAL_TYPES.includes(patch.type)) next.type = patch.type;
    if ("status" in patch && GOAL_STATUSES.includes(patch.status)) next.status = patch.status;
    if ("importance" in patch) next.importance = normalizeImportance(patch.importance);
    if ("pinned" in patch) next.pinned = Boolean(patch.pinned);
    if ("snoozedUntil" in patch) next.snoozedUntil = patch.snoozedUntil || null;
    if ("sortReason" in patch) next.sortReason = trim(patch.sortReason);

    changed = hasCardChanges(card, next);
    return changed ? { ...next, updatedAt: nowIso } : card;
  });

  if (!changed) return data;

  return {
    ...data,
    updatedAt: nowIso,
    goalCards
  };
}

export function addLinkToCard(data, cardId, input, nowIso = new Date().toISOString()) {
  const label = trim(input?.label);
  const url = trim(input?.url);
  if (!label || !isAllowedLinkUrl(url)) return data;
  const existingIds = collectIds(data);

  return updateCard(data, cardId, nowIso, (card) => ({
    ...card,
    links: [
      ...card.links,
      {
        id: makeId("link", nowIso, label, card.links.length, existingIds),
        goalCardId: card.id,
        label,
        url,
        kind: normalizeChoice(input?.kind, LINK_KINDS, "other"),
        includeInOpenAll: input?.includeInOpenAll !== false,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ]
  }));
}

export function addRuleToCard(data, cardId, input, nowIso = new Date().toISOString()) {
  const type = normalizeChoice(input?.type, RULE_TYPES, null);
  const titleTemplate = trim(input?.titleTemplate);
  if (!type || !titleTemplate) return data;

  const schedule = normalizeRuleSchedule(type, input?.schedule);
  if (!schedule) return data;
  const existingIds = collectIds(data);

  return updateCard(data, cardId, nowIso, (card) => ({
    ...card,
    rules: [
      ...card.rules,
      {
        id: makeId("rule", nowIso, titleTemplate, card.rules.length, existingIds),
        goalCardId: card.id,
        type,
        titleTemplate,
        schedule,
        active: input?.active !== false,
        lastGeneratedFor: null,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ]
  }));
}

function updateCard(data, cardId, nowIso, update) {
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return { ...update(card), updatedAt: nowIso };
  });

  if (!changed) return data;

  return {
    ...data,
    updatedAt: nowIso,
    goalCards
  };
}

function normalizeRuleSchedule(type, schedule = {}) {
  const safeSchedule = typeof schedule === "object" && schedule !== null ? schedule : {};
  if (type === "routine") {
    const cadence = ["weekly", "biweekly"].includes(safeSchedule.cadence) ? safeSchedule.cadence : "weekly";
    const weekdays = Array.isArray(safeSchedule.weekdays)
      ? safeSchedule.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [];
    const startDate = trim(safeSchedule.startDate);
    if (!startDate || weekdays.length === 0) return null;
    return { cadence, weekdays, startDate };
  }

  const date = trim(safeSchedule.date);
  return date ? { date } : null;
}

function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeImportance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function makeId(prefix, nowIso, label, offset, existingIds) {
  const readable = `${prefix}-${slugify(label)}`;
  if (globalThis.crypto?.randomUUID) {
    let candidate = `${readable}-${globalThis.crypto.randomUUID()}`;
    while (existingIds.has(candidate)) {
      candidate = `${readable}-${globalThis.crypto.randomUUID()}`;
    }
    return candidate;
  }

  let candidate = `${readable}-${Date.parse(nowIso)}-${offset}-${fallbackIdCounter}`;
  fallbackIdCounter += 1;
  while (existingIds.has(candidate)) {
    candidate = `${readable}-${Date.parse(nowIso)}-${offset}-${fallbackIdCounter}`;
    fallbackIdCounter += 1;
  }
  return candidate;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "entry";
}

function hasCardChanges(before, after) {
  return before.title !== after.title
    || before.type !== after.type
    || before.status !== after.status
    || before.importance !== after.importance
    || before.pinned !== after.pinned
    || before.snoozedUntil !== after.snoozedUntil
    || before.sortReason !== after.sortReason;
}

function collectIds(data) {
  const ids = new Set();
  for (const card of data.goalCards) {
    ids.add(card.id);
    for (const item of card.todayItems) ids.add(item.id);
    for (const link of card.links) ids.add(link.id);
    for (const rule of card.rules) ids.add(rule.id);
  }
  return ids;
}
