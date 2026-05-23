import { ensureSetupMeta } from "./emptyData.js";
import { validateAppData } from "./schema.js";

export function serializeExportData(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function parseImportJson(text, nowIso = new Date().toISOString()) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      data: null,
      summary: null,
      error: "Import file is not valid JSON."
    };
  }

  const data = ensureSetupMeta(parsed, nowIso);
  const validation = validateAppData(data);
  if (!validation.ok) {
    return {
      ok: false,
      data: null,
      summary: null,
      error: `Import file has schema error: ${validation.errors.slice(0, 5).join(" ")}`
    };
  }

  return {
    ok: true,
    data,
    summary: summarizeAppData(data),
    error: null
  };
}

export function summarizeAppData(data) {
  const goalCards = Array.isArray(data.goalCards) ? data.goalCards : [];
  const behaviorEvents = Array.isArray(data.behaviorEvents) ? data.behaviorEvents : [];
  const dailySnapshots = Array.isArray(data.dailySnapshots) ? data.dailySnapshots : [];
  const todayItems = goalCards.flatMap((card) => Array.isArray(card.todayItems) ? card.todayItems : []);

  return {
    cards: goalCards.length,
    links: goalCards.reduce((count, card) => count + (Array.isArray(card.links) ? card.links.length : 0), 0),
    rules: goalCards.reduce((count, card) => count + (Array.isArray(card.rules) ? card.rules.length : 0), 0),
    openItems: todayItems.filter((item) => item.status === "open").length,
    doneItems: todayItems.filter((item) => item.status === "done").length,
    events: behaviorEvents.length,
    snapshots: dailySnapshots.length
  };
}
