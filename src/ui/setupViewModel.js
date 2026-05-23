import { validateSetupDraft } from "../domain/templates.js";

const TEMPLATES = [
  {
    id: "project_progress",
    label: "Project progress",
    description: "Track one outcome and the next concrete step."
  },
  {
    id: "routine_work",
    label: "Routine work",
    description: "Keep recurring work visible without extra setup."
  },
  {
    id: "ad_hoc_issue",
    label: "Ad hoc issue",
    description: "Capture a blocker, interruption, or urgent follow-up."
  },
  {
    id: "date_check",
    label: "Date check",
    description: "Create a card tied to a future review date."
  }
];

export function toSetupViewModel(draft, nowIso) {
  const cards = Array.isArray(draft?.cards) ? draft.cards : [];
  const validation = validateSetupDraft({ ...draft, cards });

  return {
    nowIso,
    title: cards.length > 0 ? "Shape your focus anchors" : "Set up your anchors",
    cardCountLabel: `${cards.length} of 5 cards`,
    recommendation: "3 cards recommended",
    canFinish: validation.ok,
    errors: validation.errors,
    templates: TEMPLATES,
    cards: cards.map(toDraftCardViewModel),
    preview: {
      topTasks: cards.flatMap((card) => Array.isArray(card?.items) ? card.items : [])
        .filter((item) => hasText(item?.title))
        .slice(0, 3)
        .map((item) => ({ title: trimText(item.title) })),
      cards: cards.slice(0, 3).map(toDraftCardViewModel)
    }
  };
}

function toDraftCardViewModel(card) {
  const items = Array.isArray(card?.items) ? card.items : [];
  const links = Array.isArray(card?.links) ? card.links : [];

  return {
    id: card?.id ?? "",
    templateId: card?.templateId ?? "",
    title: card?.title ?? "",
    type: card?.type ?? "",
    itemCount: items.length,
    linkCount: links.length,
    items: items.map((item) => ({ title: item?.title ?? "" })),
    links: links.map((link) => ({ label: link?.label ?? "", url: link?.url ?? "" }))
  };
}

function hasText(value) {
  return trimText(value) !== "";
}

function trimText(value) {
  return String(value ?? "").trim();
}
