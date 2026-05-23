import { summarizeAppData } from "../domain/importExport.js";

export function toManageViewModel(data, selectedCardId = data.goalCards[0]?.id ?? null) {
  const selectedCard = data.goalCards.find((card) => card.id === selectedCardId)
    ?? data.goalCards[0]
    ?? null;

  return {
    sections: [
      { id: "cards", label: "Cards" },
      { id: "rules", label: "Rules" },
      { id: "data", label: "Data" }
    ],
    cards: data.goalCards.map((card) => ({
      id: card.id,
      title: card.title,
      type: card.type,
      status: card.status,
      importance: card.importance,
      itemCount: Array.isArray(card.todayItems) ? card.todayItems.length : 0,
      linkCount: Array.isArray(card.links) ? card.links.length : 0,
      ruleCount: Array.isArray(card.rules) ? card.rules.length : 0
    })),
    selectedCard,
    rules: data.goalCards.flatMap((card) => (Array.isArray(card.rules) ? card.rules : []).map((rule) => ({
      ...rule,
      goalTitle: card.title
    }))),
    summary: summarizeAppData(data)
  };
}
