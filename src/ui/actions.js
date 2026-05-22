import { createBehaviorEvent } from "../domain/events.js";

export function completeTodayItem(data, itemId, nowIso) {
  let changedCardId = null;
  const goalCards = data.goalCards.map((card) => {
    const todayItems = card.todayItems.map((item) => {
      if (item.id !== itemId) return item;
      changedCardId = card.id;
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
        before: { status: "open" },
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

  const itemId = `item-manual-${Date.parse(nowIso)}-${slugify(trimmedTitle)}`;
  let changed = false;
  const goalCards = data.goalCards.map((card) => {
    if (card.id !== cardId) return card;
    changed = true;
    return {
      ...card,
      updatedAt: nowIso,
      todayItems: [
        ...card.todayItems,
        {
          id: itemId,
          goalCardId: card.id,
          title: trimmedTitle,
          status: "open",
          source: "manual",
          scheduledFor: todayKey,
          doneAt: null,
          skippedAt: null,
          note: "",
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ]
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
        todayItemId: itemId,
        after: { title: trimmedTitle, scheduledFor: todayKey }
      })
    ]
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

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "item";
}
