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
    }
  }

  return { ok: errors.length === 0, errors };
}
