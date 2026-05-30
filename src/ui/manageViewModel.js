import { summarizeAppData } from "../domain/importExport.js";
import { ensureShortcuts } from "../domain/shortcuts.js";

export function toManageViewModel(data, selectedCardId = null) {
  const normalizedData = ensureShortcuts(data ?? {});
  const goalCards = Array.isArray(normalizedData?.goalCards) ? normalizedData.goalCards : [];
  const shortcuts = Array.isArray(normalizedData?.shortcuts) ? normalizedData.shortcuts : [];
  const safeData = {
    ...normalizedData,
    goalCards,
    shortcuts,
    behaviorEvents: Array.isArray(normalizedData?.behaviorEvents) ? normalizedData.behaviorEvents : [],
    dailySnapshots: Array.isArray(normalizedData?.dailySnapshots) ? normalizedData.dailySnapshots : []
  };
  const resolvedSelectedCardId = selectedCardId ?? goalCards[0]?.id ?? null;
  const selectedCard = goalCards.find((card) => card.id === resolvedSelectedCardId)
    ?? goalCards[0]
    ?? null;

  return {
    sections: [
      { id: "cards", label: "Cards" },
      { id: "shortcuts", label: "Shortcuts" },
      { id: "rules", label: "Rules" },
      { id: "data", label: "Data" }
    ],
    cards: goalCards.map((card) => ({
      id: card.id,
      title: card.title,
      type: card.type,
      status: card.status,
      importance: card.importance,
      itemCount: Array.isArray(card.todayItems) ? card.todayItems.length : 0,
      linkCount: Array.isArray(card.links) ? card.links.length : 0,
      ruleCount: Array.isArray(card.rules) ? card.rules.length : 0
    })),
    shortcuts,
    selectedCard,
    rules: goalCards.flatMap((card) => (Array.isArray(card.rules) ? card.rules : []).map((rule) => ({
      ...rule,
      goalTitle: card.title
    }))),
    summary: summarizeAppData(safeData)
  };
}
