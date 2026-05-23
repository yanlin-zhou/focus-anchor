export function createEmptyAppData(nowIso = new Date().toISOString()) {
  return {
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    goalCards: [],
    behaviorEvents: [],
    dailySnapshots: [],
    setup: createSetupMeta()
  };
}

export function createSetupMeta(overrides = {}) {
  return {
    completedAt: null,
    skippedAt: null,
    draft: null,
    version: 1,
    ...overrides
  };
}

export function ensureSetupMeta(data, nowIso = new Date().toISOString()) {
  if (data === null) return null;

  if (data.setup !== undefined) {
    return {
      ...data,
      setup: createSetupMeta(data.setup)
    };
  }

  return {
    ...data,
    setup: createSetupMeta({
      completedAt: data.goalCards?.length > 0 ? nowIso : null
    })
  };
}

export function markSetupSkipped(data, nowIso = new Date().toISOString()) {
  return {
    ...data,
    setup: createSetupMeta({
      ...data?.setup,
      skippedAt: nowIso
    })
  };
}

export function getSetupState(data) {
  if (!data?.setup) return "not_set_up";
  if (data.setup.completedAt) return "complete";
  if (data.setup.skippedAt) return "skipped";
  if (data.setup.draft) return "in_progress";
  return "not_set_up";
}
