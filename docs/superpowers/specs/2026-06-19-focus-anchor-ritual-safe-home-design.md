# Focus Anchor Ritual Safe Home Design

## Status

Approved direction: Ritual Safe Home + Calm Workbench.

This design updates the visual direction for the existing local-first Chrome New Tab extension. It is a UI/UX redesign spec only. It does not add external integrations, data sync, authentication, or new storage behavior.

## Visual Thesis

Focus Anchor should feel like a private desk lamp switching on before work: warm, deliberate, quiet, and premium on the Safe Home, then crisp and operational once focus is revealed.

The new front door should feel more special than a plain dashboard, but it must remain calm enough to open dozens of times per day.

## Content Plan

1. Safe Home: private summary, Google shortcut dock, focus peek, and one primary reveal action.
2. Reveal Workbench: Top 3 Today Items, Focus Lane, Backlog, and Parking with dense but calm hierarchy.
3. Manage: local control surface for cards, shortcuts, rules, and data.
4. Setup and empty states: same visual language as Safe Home, but utility-first.

## Interaction Thesis

1. Safe Home enters like a workspace settling into focus: background atmosphere first, product identity and summary second, shortcuts and reveal third.
2. The Google shortcut dock is available before reveal and stays visibly distinct from focus content.
3. Reveal is a deliberate state change. It should feel continuous with Safe Home, not like a page jump.
4. Completion motion remains tactile and compact: check, warm pulse, toast, settle.

## Product Principles

- Preserve privacy-first behavior. Task titles, card titles, sort reasons, and URLs must not render in Safe Home before reveal.
- Keep Maps, Gmail, and Drive visible on Safe Home by default.
- Treat shortcuts as first-class utility, not secondary settings chrome.
- Keep Reveal focus as the only primary action on the default new-tab screen.
- Use visual richness through composition, material, spacing, and restrained motion, not decorative clutter.
- Avoid a generic SaaS card grid.
- Avoid making the default new tab feel like a marketing landing page.

## Safe Home

### Structure

The Safe Home first viewport should contain:

1. Top bar
   - Focus Anchor brand and anchor mark.
   - Date.
   - Snapshot state.
   - Manage.
   - Quick Add.

2. Ritual summary area
   - Privacy label: "Private by default".
   - Main summary, such as "3 anchors ready".
   - Small operational details, such as hidden ready item count and backlog state.
   - No task titles, card titles, sort reasons, project names, or link URLs.

3. Google shortcut dock
   - Default visible entries: Maps, Gmail, Drive.
   - The dock sits before Reveal focus in the reading order.
   - Each shortcut is a button using slot-based data attributes.
   - The dock uses subtle icon-like marks or monograms only when labels remain visible.
   - The dock should look refined and intentional, not like plain form buttons.
   - The dock must not overpower Reveal focus.

4. Focus Peek
   - Abstract, non-sensitive preview of hidden focus items.
   - May show rank, type, and a visual bar.
   - Must not include title-derived IDs, task text, card text, URLs, or sort reasons.

5. Reveal focus
   - One dominant action.
   - It should feel like opening a private workbench.
   - It remains the main CTA on Safe Home.

### Safe Home Layout Direction

The recommended layout is a full-width warm stage with a darker visual anchor on one side and a calm text/action column on the other. The stage should feel more immersive than the current rectangular warm panel, while still fitting within a new-tab viewport.

The Google shortcut dock should sit in the safe text/action column, between the summary and Reveal focus. It should be visually grouped as utility, not as focus content.

### Safe Home Copy

Keep copy operational:

- Good: "Private by default", "3 anchors ready", "3 ready items hidden".
- Good: "Maps", "Gmail", "Drive".
- Avoid motivational lines, abstract slogans, or design-explaining text.

## Reveal Workbench

### Structure

When focus is revealed, the workbench shows:

1. Drawer header
   - "Focus revealed".
   - Summary sentence from the ranking model.
   - Auto-hide state.

2. Top 3 Today Items
   - Primary execution surface.
   - Three compact action tiles or rows.
   - Each item shows task title, parent card, type, reason, and Done.
   - Completion reward is tactile but compact.

3. Focus Lane
   - Three goal cards.
   - Cards remain the primary interaction card type.
   - Collapsed by default.
   - Expanded state reveals Today Items and links.

4. Backlog and Parking
   - Secondary and quiet.
   - Backlog collapsed by default.
   - Parking remains low emphasis.

### Reveal Visual Direction

The revealed workbench should be calmer and denser than Safe Home. Safe Home can be more atmospheric; Reveal should feel like a serious workspace.

Use:

- clearer grid alignment
- fewer shadows
- tighter typography
- compact rows
- one primary accent for action and completion

Do not make every region a floating card. Use cards only where the card is the interaction: Top Tasks and Goal Cards. Backlog and Parking can use bands, rows, or subtle dividers.

## Manage

### Structure

The Manage page should feel like a local control panel, not a decorative settings page.

Recommended structure:

1. Sidebar
   - Brand.
   - Section nav: Cards, Shortcuts, Rules, Data.
   - Calm selected state.

2. Main header
   - "Manage Focus Anchor".
   - Local-only status.
   - Short operational summary.

3. Work areas
   - Cards list and selected card editor.
   - Shortcuts editor with Maps, Gmail, Drive visible and easy to edit.
   - Rules.
   - Data import/export/reset.

### Manage Visual Direction

Use the same material system as the workbench, but with even less ceremony. Manage is for repeated editing and inspection, so density and clear controls matter more than atmosphere.

## Setup And Empty States

Setup should inherit the Safe Home mood without becoming a landing page.

It should:

- Start directly with the setup task.
- Show template options clearly.
- Use the same warm material language.
- Keep preview content compact.
- Make completion requirements visible without promotional copy.

## Visual System

### Palette

The base evolves from current V2 warm neutrals:

- background: warm off-white
- raised surface: near-white with a paper feel
- dark anchor plane: deep green-black or ink
- text: deep green-black
- muted text: warm gray
- primary accent: burnt amber
- completion: calm green
- project tag: muted blue
- routine tag: muted ochre
- ad hoc tag: clay
- deadline tag: quiet plum

Avoid a one-note beige/orange palette. The dark anchor plane and project blue should keep the design from reading as a soft planner.

### Typography

- Use system sans-serif as the default implementation path.
- Optional display serif can be used only for the Safe Home summary if it improves the ritual feeling.
- Product and utility labels should remain sans-serif.
- Letter spacing remains 0.
- Text must fit on desktop and narrow widths without overlap.

### Motion

Required motion:

1. Safe Home entrance
   - Background stage settles quickly.
   - Summary and shortcut dock enter with a slight stagger.
   - Reveal button enters last.

2. Reveal transition
   - Focus Peek and Reveal button transition into the workbench drawer.
   - No large layout jump.
   - Auto-hide state remains visible.

3. Completion reward
   - Check mark confirms.
   - Task surface gets a short warm pulse.
   - Toast confirms, then fades.
   - Completed item settles without shifting the whole page.

Motion must respect reduced-motion settings.

## Privacy And Data Constraints

Safe Home may render:

- date label
- snapshot status
- non-sensitive counts
- shortcut labels
- shortcut slots
- abstract focus peek rank/type

Safe Home must not render:

- task titles
- card titles
- sort reasons
- shortcut URLs
- link URLs
- title-derived IDs
- project-specific text

Reveal may render sensitive focus details because the user intentionally asked to show them.

## Implementation Boundaries

Primary implementation files:

- `src/styles.css`
- `src/ui/render.js`
- `src/ui/manageRender.js`

Conditional implementation files:

- `src/ui/setupRender.js` only if setup visual consistency requires markup class changes.
- view-model or render tests when markup structure changes.

The redesign should not change:

- storage schema
- ranking behavior
- shortcut URL safety validation
- reveal/hide timing behavior
- Chrome extension manifest behavior
- import/export semantics

## Testing Requirements

Automated tests should verify:

- Safe Home renders Maps, Gmail, and Drive.
- Safe Home does not render Search as the default third shortcut.
- Safe Home does not render shortcut URLs.
- Safe Home does not render task titles, card titles, or title-derived peek IDs.
- Reveal still shows Top 3 details only after intentional reveal.
- Reveal/hide controls keep the same `data-action` behavior.
- Manage still renders shortcut editor and can edit/reset shortcuts.
- Existing full test suite remains green.

Rendered frontend verification should check:

- Safe Home first viewport is not blank.
- Maps/Gmail/Drive are visible before reveal.
- Reveal focus remains the most prominent action.
- No text overlaps at desktop and narrow widths.
- Reduced-motion mode does not depend on animations for meaning.

## Out Of Scope

- New integrations with Google APIs.
- Calendar syncing.
- Opening Drive folders based on task context.
- Authentication.
- Cloud sync.
- AI prioritization changes.
- New shortcut types beyond the existing local shortcut model.

## Acceptance Criteria

- The default new-tab Safe Home visibly includes Maps, Gmail, and Drive.
- The new Safe Home feels more ceremonial and premium than the current warm panel.
- The revealed workbench remains calm, dense, and operational.
- The Manage page remains efficient for editing local data.
- Privacy-first DOM constraints are preserved.
- No new dependency is required unless implementation discovers a strong reason and the user approves it.
