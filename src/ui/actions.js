import { createBehaviorEvent } from "../domain/events.js";

export function completeTodayItem(data, itemId, nowIso) {
  let changedCardId = null;
  let beforeStatus = null;
  const goalCards = data.goalCards.map((card) => {
    const todayItems = card.todayItems.map((item) => {
      if (item.id !== itemId) return item;
      if (item.status === "done") return item;
      changedCardId = card.id;
      beforeStatus = item.status;
      return { ...item, status: "done", doneAt: nowIso, updatedAt: nowIso };
    });
    return changedCardId === card.id ? { ...card, todayItems, updatedAt: nowIso } : card;
  });

  if (!changedCardId) return data;

  return {
    ...data,
    goalCards,
    updatedAt: nowIso,
    behaviorEvents: [
      ...data.behaviorEvents,
      createBehaviorEvent("today_item_completed", nowIso, {
        goalCardId: changedCardId,
        todayItemId: itemId,
        before: { status: beforeStatus },
        after: { status: "done" }
      })
    ]
  };
}

export function pinCard(data, cardId, nowIso) {
  return updateCard(data, cardId, nowIso, "card_pinned", (card) => ({ ...card, pinned: true }));
}

export function snoozeCard(data, cardId, snoozedUntil, nowIso) {
  return updateCard(data, cardId, nowIso, "card_snoozed", (card) => ({ ...card, snoozedUntil }));
}

export function addTodayItem(data, cardId, title, todayKey, nowIso) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return data;

  const item = createManualTodayItem(cardId, trimmedTitle, todayKey, nowIso);
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return {
      ...card,
      updatedAt: nowIso,
      todayItems: [...card.todayItems, item]
    };
  });

  if (!changed) return data;

  return {
    ...data,
    goalCards,
    updatedAt: nowIso,
    behaviorEvents: [
      ...data.behaviorEvents,
      createBehaviorEvent("manual_today_item_created", nowIso, {
        goalCardId: cardId,
        todayItemId: item.id,
        after: { title: trimmedTitle, scheduledFor: todayKey }
      })
    ]
  };
}

export function quickAddTodayItem(data, cardId, title, todayKey, nowIso) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { data, cardId: null };

  const targetCard = findQuickAddTargetCard(data, cardId, todayKey);
  if (targetCard) {
    return {
      data: addTodayItem(data, targetCard.id, trimmedTitle, todayKey, nowIso),
      cardId: targetCard.id
    };
  }

  const fallbackCardId = `card-quick-add-${Date.parse(nowIso)}-${slugify(trimmedTitle)}`;
  const item = createManualTodayItem(fallbackCardId, trimmedTitle, todayKey, nowIso);
  const fallbackCard = {
    id: fallbackCardId,
    title: "Today",
    type: "ad_hoc",
    importance: 4,
    status: "active",
    pinned: true,
    snoozedUntil: null,
    sortReason: "",
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    todayItems: [item],
    links: [],
    rules: []
  };

  return {
    data: {
      ...data,
      goalCards: [...data.goalCards, fallbackCard],
      updatedAt: nowIso,
      behaviorEvents: [
        ...data.behaviorEvents,
        createBehaviorEvent("manual_today_item_created", nowIso, {
          goalCardId: fallbackCardId,
          todayItemId: item.id,
          after: { title: trimmedTitle, scheduledFor: todayKey }
        })
      ]
    },
    cardId: fallbackCardId
  };
}

function updateCard(data, cardId, nowIso, eventType, update) {
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return { ...update(card), updatedAt: nowIso };
  });

  if (!changed) return data;

  return {
    ...data,
    goalCards,
    updatedAt: nowIso,
    behaviorEvents: [
      ...data.behaviorEvents,
      createBehaviorEvent(eventType, nowIso, { goalCardId: cardId })
    ]
  };
}

function createManualTodayItem(cardId, title, todayKey, nowIso) {
  return {
    id: `item-manual-${Date.parse(nowIso)}-${slugify(title)}`,
    goalCardId: cardId,
    title,
    status: "open",
    source: "manual",
    scheduledFor: todayKey,
    doneAt: null,
    skippedAt: null,
    note: "",
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function findQuickAddTargetCard(data, cardId, todayKey) {
  return data.goalCards.find((card) => card.id === cardId)
    ?? data.goalCards.find((card) => card.status === "active" && !(card.snoozedUntil && card.snoozedUntil > todayKey))
    ?? data.goalCards.find((card) => card.status === "active");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "item";
}
