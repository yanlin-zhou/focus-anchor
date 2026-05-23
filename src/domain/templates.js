import { createEmptyAppData } from "./emptyData.js";
import { GOAL_TYPES, LINK_KINDS } from "./schema.js";

export const SETUP_TEMPLATES = [
  { id: "project_progress", label: "Project Progress", type: "project", importance: 4 },
  { id: "routine_work", label: "Routine Work", type: "routine", importance: 4 },
  { id: "ad_hoc_issue", label: "Ad Hoc Issue", type: "ad_hoc", importance: 5 },
  { id: "date_check", label: "Date Check", type: "deadline", importance: 4 }
];

export function createDraft(overrides = {}) {
  return {
    cards: [],
    activeCardId: null,
    ...overrides
  };
}

export function createDraftCardFromTemplate(templateId, nowIso) {
  const template = SETUP_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) throw new Error(`Unknown setup template: ${templateId}`);

  return {
    id: `draft-${template.id}-${Date.parse(nowIso)}`,
    templateId: template.id,
    title: template.label,
    type: template.type,
    importance: template.importance,
    items: [],
    links: [],
    routine: null,
    dateReminder: null
  };
}

export function validateSetupDraft(draft) {
  const cards = Array.isArray(draft?.cards) ? draft.cards : [];
  const errors = [];

  if (cards.length === 0) errors.push("Add at least one focus card.");
  if (cards.length > 5) errors.push("Keep setup to 5 focus cards or fewer.");
  if (cards.some((card) => !hasText(card?.title))) errors.push("Add a title for each focus card.");
  if (cards.some((card) => !GOAL_TYPES.includes(card?.type))) errors.push("Choose a valid type for each focus card.");
  if (!cards.some((card) => (card.items ?? []).some((item) => hasText(item?.title)))) {
    errors.push("Add at least one today item.");
  }

  return { ok: errors.length === 0, errors };
}

export function completeSetupDraft(draft, nowIso, todayKey) {
  const validation = validateSetupDraft(draft);
  if (!validation.ok) throw new Error(validation.errors.join(" "));

  const data = createEmptyAppData(nowIso);
  data.goalCards = draft.cards.map((card, index) => convertDraftCard(card, index, nowIso, todayKey));
  data.setup.completedAt = nowIso;
  data.setup.draft = null;
  data.updatedAt = nowIso;

  return data;
}

function convertDraftCard(card, index, nowIso, todayKey) {
  const title = trimText(card.title);
  const cardId = stableId("card", title || card.templateId, index);

  return {
    id: cardId,
    title,
    type: card.type,
    importance: card.importance,
    status: "active",
    pinned: false,
    snoozedUntil: null,
    sortReason: "",
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    todayItems: convertTodayItems(card.items ?? [], cardId, nowIso, todayKey),
    links: convertLinks(card.links ?? [], cardId, nowIso),
    rules: convertRules(card, cardId, nowIso, todayKey)
  };
}

function convertTodayItems(items, cardId, nowIso, todayKey) {
  return items
    .filter((item) => hasText(item?.title))
    .map((item, index) => ({
      id: stableId("item", `${cardId}-${item.title}`, index),
      goalCardId: cardId,
      title: trimText(item.title),
      status: "open",
      source: "manual",
      scheduledFor: item.scheduledFor || todayKey,
      doneAt: null,
      skippedAt: null,
      note: "",
      createdAt: nowIso,
      updatedAt: nowIso
    }));
}

function convertLinks(links, cardId, nowIso) {
  return links
    .filter((link) => hasText(link?.label) && hasText(link?.url))
    .map((link, index) => ({
      id: stableId("link", `${cardId}-${link.label}`, index),
      goalCardId: cardId,
      label: trimText(link.label),
      url: trimText(link.url),
      kind: LINK_KINDS.includes(link.kind) ? link.kind : "other",
      includeInOpenAll: link.includeInOpenAll !== false,
      createdAt: nowIso,
      updatedAt: nowIso
    }));
}

function convertRules(card, cardId, nowIso, todayKey) {
  const rules = [];

  if (hasText(card.routine?.title)) {
    rules.push({
      id: stableId("rule", `${cardId}-${card.routine.title}`, rules.length),
      goalCardId: cardId,
      type: "routine",
      titleTemplate: trimText(card.routine.title),
      schedule: {
        cadence: card.routine.cadence || "weekly",
        weekdays: Array.isArray(card.routine.weekdays) ? card.routine.weekdays : [],
        startDate: card.routine.startDate || todayKey
      },
      active: true,
      lastGeneratedFor: null,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  if (hasText(card.dateReminder?.title) && hasText(card.dateReminder?.date)) {
    rules.push({
      id: stableId("rule", `${cardId}-${card.dateReminder.title}`, rules.length),
      goalCardId: cardId,
      type: "date_triggered_check",
      titleTemplate: trimText(card.dateReminder.title),
      schedule: { date: trimText(card.dateReminder.date) },
      active: true,
      lastGeneratedFor: null,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  return rules;
}

function hasText(value) {
  return trimText(value) !== "";
}

function trimText(value) {
  return String(value ?? "").trim();
}

function stableId(prefix, value, index) {
  const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || `${prefix}-${index + 1}`;
  return `${prefix}-${slug}-${index + 1}`;
}
