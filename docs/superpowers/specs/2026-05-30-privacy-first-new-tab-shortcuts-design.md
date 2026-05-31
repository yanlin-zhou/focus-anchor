# Privacy-First New Tab and Shortcuts Design

## Summary

Focus Anchor should become safe to open during screen sharing. The new default new-tab state will hide specific priorities and show only non-sensitive focus signals, while keeping the reminder value strong enough that the user does not drift. Real task titles, project names, and ranking details are shown only after an intentional reveal action.

This design also restores the utility of Chrome's native new tab shortcuts by adding a lightweight Focus Anchor shortcuts surface. Because a Chrome new-tab override cannot embed the native Google new-tab widgets directly, Focus Anchor will provide its own configurable shortcuts for Google apps and work links.

The product principle is:

> Privacy by default, focus by intent.

## Goals

- Make Focus Anchor comfortable to leave as the default new-tab page even when screen sharing is frequent.
- Preserve the core daily behavior: opening a new tab should remind the user that important work exists.
- Avoid showing task titles, project names, sort reasons, or detailed priority lists by default.
- Add Google-style quick access for commonly used destinations such as Gmail, Calendar, Drive, Maps, Search, and Lark.
- Keep the interaction lightweight enough for daily dogfooding.

## Non-Goals

- Do not attempt to detect active screen sharing automatically in v1. Browser extensions cannot reliably know when the user is sharing a screen across Zoom, Lark, Meet, and other tools.
- Do not embed or depend on Chrome's native Google new-tab page widgets.
- Do not add calendar, Lark, Gmail, or project-management integrations in this design.
- Do not build a full app launcher or bookmark manager.
- Do not make privacy depend only on the user remembering to toggle a presentation mode.

## Default State: Safe Home

After setup is complete, a new tab opens to Safe Home by default.

Safe Home shows:

- The Focus Anchor brand.
- Date and local-only status.
- A safe focus summary, such as `3 anchors ready`, `1 time-sensitive check today`, or `Next focus is ready`.
- A compact abstract focus peek for the top items, represented by count, category, color, or bars, not task text.
- A primary `Reveal focus` action.
- A Google-style shortcuts row or menu.
- Entry points for `Manage` and `Quick Add`, kept visually secondary.

Safe Home must not show by default:

- Task titles.
- Project/card names.
- Sort reasons.
- Link labels that reveal internal work.
- Backlog contents.
- Expanded cards.

The page should feel useful even without reveal. The user should be able to open Gmail, Calendar, Maps, Drive, Search, Lark, or another pinned shortcut without exposing the priority list.

## Focus Peek

Focus Peek is the reminder mechanism inside Safe Home. It should answer, "Is there something I need to come back to?" without answering, "What exactly is it?"

Allowed visible information:

- Number of ready items.
- Number of date checks or urgent checks.
- Item categories such as `Project`, `Routine`, `Ad hoc`, or `Date check`.
- Relative strength or order using bars, dots, color, or position.

Not allowed in default view:

- The exact title of a task.
- The exact title of a project or routine.
- The exact source link or document name.
- Ranking explanation text.

## Reveal Focus Drawer

Clicking `Reveal focus` opens a drawer or command-palette-style layer over Safe Home. This drawer shows the real execution surface:

- Top 3 today items.
- Associated card/project names.
- Item type and urgency.
- `Done` actions.
- Optional `Open all` or link actions when the related card is expanded.

Reveal is intentional and temporary.

The drawer should close when:

- The user clicks `Hide`.
- The user presses `Escape`.
- The new tab loses focus.
- A short timer expires, with a default target around 20 seconds.

The drawer can be reopened quickly with the reveal button.

## Keyboard Interaction

Keyboard support is useful, but must not create accidental disclosure.

Recommended shortcuts:

- `/` or `f`: reveal Focus drawer.
- `Escape`: hide Focus drawer.
- Number keys may be considered later for completing top items, but they are not required in the first version.

Hover should not reveal sensitive content. Hover reveal is too easy to trigger accidentally during presentation or screen sharing.

## Privacy Mode

Privacy is the default state, not a special mode the user must remember to enable.

The UI may still show a small `Privacy On` indicator, but it should communicate the current safety posture rather than act as the primary safety mechanism.

If a future `Focus Mode` toggle is added, it should be temporary and auto-revert to safe state after inactivity or tab blur.

## Shortcuts Surface

Focus Anchor will add its own shortcut surface to replace the practical utility lost from Chrome's native new-tab page.

Initial shortcut defaults:

- Gmail
- Google Calendar
- Google Drive
- Google Maps
- Google Search
- Lark

The shortcuts surface should support:

- Four to six pinned shortcuts visible by default.
- A `More` or grid button for additional shortcuts.
- User-configurable labels and URLs in Manage.
- Safe URL validation using the existing allowed-link URL rules.

The shortcuts should be visually present but not compete with the focus reminder. They are utility, not the main product.

## Manage Page Additions

Manage should gain a lightweight `Shortcuts` section.

The section should allow:

- Viewing current shortcuts.
- Editing label and URL.
- Toggling pinned visibility.
- Reordering pinned shortcuts.
- Resetting to defaults.

This does not need to be a full bookmark manager. The first version can use a small fixed list with edit support.

## Data Model

Add a `shortcuts` collection to local app data.

Each shortcut should include:

```js
{
  id: "shortcut-gmail",
  label: "Gmail",
  url: "https://mail.google.com/",
  pinned: true,
  position: 1
}
```

Privacy display preference can be stored as UI preference data if needed, but the default must remain safe:

```js
{
  privacy: {
    defaultMode: "safe",
    revealDurationSeconds: 20
  }
}
```

The first implementation can avoid exposing this preference in UI and hardcode the safe default plus reveal duration.

## Rendering Model

The home view model should produce two separate surfaces:

- `safeHome`: non-sensitive summary, counts, categories, shortcut data.
- `focusDrawer`: sensitive top task details used only when revealed.

This separation matters. It keeps privacy rules testable and avoids accidental leakage by making the safe surface explicit.

## Error Handling

- If shortcuts are missing, migrate defaults into app data.
- If a shortcut URL is invalid or unsafe, do not render it as a clickable link.
- If there are no open top items, Safe Home should still show a safe empty state such as `No open focus item yet`.
- If reveal state is active but data is missing, render the same empty state in the drawer without crashing.

## Testing

Add tests for:

- Safe Home view model does not include sensitive task titles or card titles in default display fields.
- Reveal drawer view model includes top task details only for revealed state.
- Default shortcuts are created for new or migrated data.
- Unsafe shortcut URLs are rejected or skipped.
- Backlog remains hidden by default.
- Focus drawer closes on timer, `Escape`, and tab blur.
- `Done` still records behavior events and updates snapshots after reveal.

Manual browser verification should cover:

- Fresh setup still works.
- Default new tab does not expose actual priority text.
- Reveal shows Top 3 and can complete a task.
- Reveal auto-hides.
- Shortcuts open expected destinations.
- Manage can edit shortcuts.

## Initial Product Decisions

- Exact reveal duration: start with 20 seconds unless dogfooding shows it is too short.
- Shortcut defaults: Gmail, Calendar, Drive, Maps, Search, and Lark are the first recommended set.
- `Quick Add` remains visible in Safe Home, but visually secondary to `Reveal focus`.
- Focus Peek may show category words such as `Project`, `Routine`, `Ad hoc`, and `Date check` because they do not reveal work specifics.
