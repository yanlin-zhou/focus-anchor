export function createBehaviorEvent(type, timestamp, details = {}) {
  return {
    id: `event-${timestamp}-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp,
    goalCardId: details.goalCardId ?? null,
    todayItemId: details.todayItemId ?? null,
    before: details.before ?? null,
    after: details.after ?? null,
    context: details.context ?? {}
  };
}
