# Focus Anchor No-code Setup MVP Design

## Summary

This spec defines the next Focus Anchor iteration: a no-code setup and manage experience for a local-first Chrome New Tab extension.

The goal is to move from a developer-configured MVP to an internal beta that 3-5 friends or coworkers can install and use without editing code. Installation can still use Chrome Developer Mode and `Load unpacked`, but first use, ongoing configuration, reset, export, and import must be handled inside the product.

This is a productization step, not an AI integration step. It should preserve the current focus-home experience while removing the current `sampleData.js` setup burden.

## Goals

- Let a non-coding beta user configure Focus Anchor in 3-5 minutes.
- Avoid writing demo data into real local storage by default.
- Keep the New Tab page quiet and execution-focused after setup.
- Provide a separate no-code Manage page for structured configuration.
- Support local backup and migration through Export / Import JSON.
- Preserve the existing local-first privacy boundary.
- Continue recording behavior events and daily snapshots for future review/learning features.

## Non-goals

- Chrome Web Store packaging.
- Cloud sync, accounts, or remote storage.
- Lark, calendar, mail, or project-management integrations.
- AI ranking or self-improvement UI.
- Import merging or conflict resolution.
- A full project-management tool.
- Complex snooze scheduling beyond the current default "until tomorrow" behavior.

## Target User

The first no-code version targets 3-5 friends or coworkers in an internal beta.

Expected tolerance:

- They can follow a short install guide using `Load unpacked`.
- They should not need to edit source files.
- They should not need to open DevTools or run Console commands.
- They can tolerate local-only data and manual export/import.

## Product Decisions

Confirmed decisions:

- First-run setup depth: create a usable system in 3-5 minutes.
- First-run setup structure: setup form on the left, live New Tab preview on the right.
- Card count: recommend 3 cards, allow 1-5 cards.
- Setup completion: require at least 1 card and 1 today item overall.
- Templates: Project Progress, Routine Work, Ad Hoc Issue, Date Check.
- Routine support in setup: weekly / biweekly plus date reminders.
- Homepage behavior: execution-only surface, with `Quick Add` allowed.
- Manage page: separate page for structured configuration.
- Data portability: Export / Import JSON.
- Reset: dangerous action requiring the exact text `RESET`.
- Import: validate JSON, show summary, then overwrite current local data on confirmation.

## User Experience

### New Tab States

The New Tab page has three product states.

#### 1. Not Set Up

When no app data exists, the extension should not write demo cards. It should render a quiet empty state:

- Primary action: `Start setup`
- Secondary action: `Quick add one thing`
- Brief copy explaining that Focus Anchor needs anchors before it can protect today's focus.

If the user chooses `Quick add one thing`, the app may create a default active card and one open today item, then mark setup complete. This path exists for impatient users who want the product to become useful immediately.

#### 2. Setup In Progress

Setup runs inside the New Tab page. It uses a two-column layout:

- Left: configuration steps and form controls.
- Right: live preview of the New Tab home model that will be created.

The setup should feel like building a personal work cockpit, not filling out an admin form.

Recommended flow:

1. Choose a template or start from blank.
2. Create 1-5 cards, with copy nudging users toward 3.
3. Add today items and links.
4. Optionally add weekly/biweekly routines and date reminders.
5. Review and click `Start focusing`.

The final action stays disabled until the draft contains at least one card and at least one today item. Inline guidance should explain what is missing.

#### 3. Set Up

After setup, the current home behavior remains the dominant experience:

- Top 3 Today Items first.
- Three focus cards collapsed by default.
- Backlog collapsed by default.
- Parking / Paused remains quiet.

The homepage may expose a small `Manage` entry point, but it must not inline structured configuration controls.

Allowed homepage actions:

- `Done`
- `Quick Add`
- `Expand` / `Collapse`
- `Open all`
- `Pin`
- `Snooze`
- `Manage`

### Manage Page

Manage is a separate extension page and acts as the local configuration center.

Recommended layout:

- Left sidebar: `Cards`, `Rules`, `Data`
- Main panel: list/detail editor
- Default section: `Cards`

Capabilities:

- Cards: add, edit, pause, complete.
- Links: add, edit, delete.
- Today items: add, edit, mark complete.
- Routines: weekly and biweekly.
- Date reminders: generate a check item on a specific date.
- Data: export JSON, import JSON, reset local data.

Rules may appear both in a card detail area and in a `Rules` overview. The `Rules` overview is useful for scanning all recurring and date-triggered work; card detail is useful for local editing.

### Templates

Templates are setup accelerators, not demo data. They should not be written until the user chooses one.

Templates:

- Project Progress
  - Type: `project`
  - Default importance: 4
  - Helps model quarter projects, milestone work, and long-running goals.
- Routine Work
  - Type: `routine`
  - Default importance: 4
  - Prompts for weekly/biweekly cadence.
- Ad Hoc Issue
  - Type: `ad_hoc`
  - Default importance: 5
  - Helps capture interrupts, incidents, escalations, or urgent one-off problems.
- Date Check
  - Type: `deadline`
  - Default importance: 4
  - Prompts for a specific date and check item.

## Data Model

Continue using the current core shape:

- `goalCards`
- `behaviorEvents`
- `dailySnapshots`

Add a lightweight setup meta object:

```js
setup: {
  completedAt: string | null,
  skippedAt: string | null,
  draft: SetupDraft | null,
  version: 1
}
```

State interpretation:

- No stored data: render not-set-up state.
- Stored data exists and `setup.completedAt` is empty: render not-set-up, setup, or continue setup depending on `setup.skippedAt` and `setup.draft`.
- Stored data exists and `setup.completedAt` is set: render normal home.

`setup.draft` stores incomplete setup work so a beta user can close the tab and continue later. Draft data must not participate in ranking, rules, snapshots, or behavior events until setup is completed and converted into real `goalCards`.

The app should support migration from the current MVP data that lacks `setup`. Existing data with goal cards should be treated as already set up and saved with setup metadata on the next write.

## Data Flow

### First Open

```text
repo.load()
  -> no data
  -> create empty app shell
  -> render not-set-up state
```

The first open should not call `createInitialData()` to write sample cards.

The not-set-up state can render without saving immediately. If the user clicks `Start setup` or `Remind me later`, save an empty app shell with setup metadata so the extension can distinguish a brand-new install from a deliberately skipped setup.

### Setup Save

```text
setup draft
  -> save draft as the user edits
  -> validate at least 1 card and 1 today item
  -> convert draft to AppData
  -> set setup.completedAt
  -> clear setup.draft
  -> save to chrome.storage.local
  -> render normal home
```

### Manage Save

```text
load AppData
  -> edit structured forms
  -> validate
  -> save
  -> New Tab refresh picks up latest data
```

### Export

Export downloads the full local app data as JSON, including:

- cards
- today items
- links
- rules
- behavior events
- daily snapshots
- setup metadata

### Import

```text
select JSON file
  -> parse JSON
  -> validate AppData
  -> build summary
  -> user confirms overwrite
  -> save imported data
```

Summary should include counts for cards, open/done items, rules, links, behavior events, and daily snapshots.

Import does not merge.

### Reset

Reset lives in the Manage `Data` danger area.

Flow:

```text
click Reset local data
  -> modal explains what will be deleted
  -> recommends Export first
  -> user types RESET
  -> remove focus-anchor-data
  -> return New Tab to not-set-up state
```

Reset deletes all local cards, items, links, rules, behavior events, daily snapshots, and setup metadata.

## Architecture

Keep the existing vanilla JavaScript and domain-module architecture. Do not introduce a large framework for this iteration.

New or expanded modules:

- `src/domain/emptyData.js`
  - Creates an empty app shell.
  - Provides migration helpers for setup metadata.
- `src/domain/templates.js`
  - Defines setup templates.
  - Converts setup draft data into goal cards, rules, items, and links.
- `src/domain/importExport.js`
  - Serializes app data.
  - Parses and validates imported JSON.
  - Builds import summaries.
- `src/ui/setupViewModel.js`
  - Converts setup draft into renderable setup state and live preview state.
- `src/ui/setupRender.js`
  - Renders the setup experience.
- `src/ui/manageViewModel.js`
  - Converts app data into Manage page sections.
- `src/ui/manageRender.js`
  - Renders Manage page forms and lists.
- `src/ui/forms.js`
  - Small utilities for extracting and validating form inputs.
- `src/manage.html`
  - Extension page for Manage.
- `src/manage.js`
  - Manage page entry point.

Existing modules to preserve:

- `src/domain/ranking.js`
- `src/domain/rules.js`
- `src/domain/snapshots.js`
- `src/ui/actions.js`
- `src/storage/repository.js`

`src/newtab.js` should become a state router:

- load data
- migrate if needed
- render not-set-up / setup / home
- keep current homepage actions wired

## Error Handling

Setup:

- Invalid draft should not save.
- Missing required card or item should show inline guidance.

Storage:

- Save/load failures should show a toast or inline error.
- The UI must not claim success when storage fails.

Import:

- Invalid JSON: show a clear parse error.
- Schema validation failure: show the first few validation errors.
- Valid import: show summary before overwrite.
- Cancelled import: leave existing data unchanged.

Reset:

- Reset button disabled until input exactly equals `RESET`.
- Cancelled reset leaves data unchanged.

## Testing

Unit tests:

- Empty app shell does not include demo cards.
- Existing MVP data migrates to setup-completed data.
- Setup draft requires at least 1 card and 1 today item.
- Templates create correct card types and default importance.
- Routine templates create weekly/biweekly rules.
- Date Check template creates a date-triggered reminder.
- Setup completion creates AppData that validates.
- Import export round trip preserves app data.
- Import summary counts cards, links, rules, items, events, and snapshots.
- Invalid import does not overwrite current storage.
- Reset clears stored data.
- Existing ranking, routine, action, snapshot, and render tests remain green.

Browser verification:

- First open with no data shows setup empty state, not demo data.
- Start setup creates cards via templates and live preview updates.
- Setup cannot finish before at least one card and one today item.
- Finishing setup shows normal home with Top 3.
- Manage page edits a card/link/item/rule and persists changes.
- Export downloads JSON.
- Import validates and overwrites only after confirmation.
- Reset requires `RESET` and returns to not-set-up state.

## Documentation Updates

Update `docs/install-and-usage.md` after implementation:

- Replace source-code setup instructions with no-code setup instructions.
- Keep a small developer appendix for `Load unpacked`.
- Document Export / Import / Reset.
- Document current no-cloud-sync boundary.

## Open Questions

No open product questions remain for this MVP scope.

Future questions outside this MVP:

- Whether to package as a zip release or publish privately through Chrome Web Store.
- Whether review/learning UI should live in Manage or a separate Review page.
- Whether to support Lark or calendar imports.
- Whether to add cloud sync.
