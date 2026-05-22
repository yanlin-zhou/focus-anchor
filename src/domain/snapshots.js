import { toLocalDateKey } from "./date.js";

export function upsertDailySnapshot(data, dateKey, homeModel, completedTodayItemIds = []) {
  const existing = data.dailySnapshots.find((snapshot) => snapshot.date === dateKey);
  const behaviorEventIds = data.behaviorEvents
    .filter((event) => toLocalDateKey(event.timestamp) === dateKey)
    .map((event) => event.id);
  const generatedTodayItemIds = data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === dateKey && (item.source === "routine" || item.source === "date_triggered"))
      .map((item) => item.id)
  );
  const manualTodayItemIds = data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === dateKey && item.source === "manual")
      .map((item) => item.id)
  );

  const nextSnapshot = existing
    ? {
        ...existing,
        finalFocusLaneCardIds: homeModel.focusCards.map((card) => card.id),
        finalBacklogCardIds: homeModel.backlogCards.map((card) => card.id),
        generatedTodayItemIds,
        manualTodayItemIds,
        completedTodayItemIds,
        skippedTodayItemIds: collectSkipped(data, dateKey),
        snoozedCardIds: collectSnoozed(data),
        behaviorEventIds
      }
    : {
        date: dateKey,
        initialFocusLaneCardIds: homeModel.focusCards.map((card) => card.id),
        initialBacklogCardIds: homeModel.backlogCards.map((card) => card.id),
        finalFocusLaneCardIds: homeModel.focusCards.map((card) => card.id),
        finalBacklogCardIds: homeModel.backlogCards.map((card) => card.id),
        generatedTodayItemIds,
        manualTodayItemIds,
        completedTodayItemIds,
        skippedTodayItemIds: collectSkipped(data, dateKey),
        snoozedCardIds: collectSnoozed(data),
        behaviorEventIds,
        optionalReflection: ""
      };

  return {
    ...data,
    dailySnapshots: [
      ...data.dailySnapshots.filter((snapshot) => snapshot.date !== dateKey),
      nextSnapshot
    ]
  };
}

function collectSkipped(data, dateKey) {
  return data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === dateKey && item.status === "skipped")
      .map((item) => item.id)
  );
}

function collectSnoozed(data) {
  return data.goalCards.filter((card) => card.snoozedUntil).map((card) => card.id);
}
