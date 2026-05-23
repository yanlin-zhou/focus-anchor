export const GOAL_TYPES = ["project", "routine", "ad_hoc", "deadline"];
export const GOAL_STATUSES = ["active", "paused", "done"];
export const ITEM_STATUSES = ["open", "done", "skipped"];
export const ITEM_SOURCES = ["manual", "routine", "date_triggered", "suggested"];
export const LINK_KINDS = ["doc", "dashboard", "repo", "thread", "other"];
export const RULE_TYPES = ["routine", "date_triggered_check"];

export function validateAppData(data) {
  const errors = [];
  if (!Array.isArray(data.goalCards)) errors.push("goalCards must be an array");
  if (!Array.isArray(data.behaviorEvents)) errors.push("behaviorEvents must be an array");
  if (!Array.isArray(data.dailySnapshots)) errors.push("dailySnapshots must be an array");
  if (data.setup !== undefined) {
    if (typeof data.setup !== "object" || data.setup === null) errors.push("setup must be an object");
    if (data.setup && data.setup.version !== 1) errors.push("setup version must be 1");
    if (data.setup && data.setup.completedAt !== null && typeof data.setup.completedAt !== "string") errors.push("setup completedAt must be null or a string");
    if (data.setup && data.setup.skippedAt !== null && typeof data.setup.skippedAt !== "string") errors.push("setup skippedAt must be null or a string");
  }

  for (const card of data.goalCards ?? []) {
    if (!card.id) errors.push("goal card missing id");
    if (!card.title) errors.push(`goal card ${card.id} missing title`);
    if (!GOAL_TYPES.includes(card.type)) errors.push(`goal card ${card.id} has invalid type`);
    if (!GOAL_STATUSES.includes(card.status)) errors.push(`goal card ${card.id} has invalid status`);
    if (!Array.isArray(card.todayItems)) errors.push(`goal card ${card.id} todayItems must be an array`);
    if (!Array.isArray(card.links)) errors.push(`goal card ${card.id} links must be an array`);
    if (!Array.isArray(card.rules)) errors.push(`goal card ${card.id} rules must be an array`);

    for (const item of card.todayItems ?? []) {
      if (!item.id) errors.push(`goal card ${card.id} has item missing id`);
      if (!item.title) errors.push(`item ${item.id} missing title`);
      if (!ITEM_STATUSES.includes(item.status)) errors.push(`item ${item.id} has invalid status`);
      if (!ITEM_SOURCES.includes(item.source)) errors.push(`item ${item.id} has invalid source`);
    }

    for (const link of card.links ?? []) {
      if (!link.id) errors.push(`goal card ${card.id} has link missing id`);
      if (!link.label) errors.push(`link ${link.id} missing label`);
      if (!link.url) errors.push(`link ${link.id} missing url`);
      if (!LINK_KINDS.includes(link.kind)) errors.push(`link ${link.id} has invalid kind`);
    }

    for (const rule of card.rules ?? []) {
      if (!rule.id) errors.push(`goal card ${card.id} has rule missing id`);
      if (!RULE_TYPES.includes(rule.type)) errors.push(`rule ${rule.id} has invalid type`);
      if (!rule.titleTemplate) errors.push(`rule ${rule.id} missing titleTemplate`);
      if (rule.type === "routine") {
        if (!["weekly", "biweekly"].includes(rule.schedule?.cadence)) errors.push(`rule ${rule.id} routine cadence must be weekly or biweekly`);
        if (!Array.isArray(rule.schedule?.weekdays)) errors.push(`rule ${rule.id} routine weekdays must be an array`);
        if (!rule.schedule?.startDate) errors.push(`rule ${rule.id} routine startDate is required`);
      }
      if (rule.type === "date_triggered_check" && !rule.schedule?.date) {
        errors.push(`rule ${rule.id} date_triggered_check date is required`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
