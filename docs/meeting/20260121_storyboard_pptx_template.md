# Storyboard PPTX Template Definition (2026-01-21)

## Purpose and outcome
This template standardizes storyboard slides for the 2026-01-21 kickoff scope so reviewers can quickly scan screen intent, layout, and key UI elements. Use it to create consistent, review-ready PPTX decks across Admin, Tenant, and Mobile flows.

## Slide types
- Meta: cover, agenda, and section divider slides.
- Revision: change log and decisions for each iteration.
- Page design: the primary slide type for screen-level storyboards.

## Header fields (required on Page design slides)
- Screen name: human-readable name (ex: `SA.TENANTS`).
- Page ID: unique ID or route (ex: `/sa/tenants`).
- Date: last updated date (YYYY-MM-DD).

## Layout rules
- Canvas: 16:9 (1920x1080).
- Grid: 12-column with 64px outer margins; align all blocks to the grid.
- Header bar: fixed height 64px with the required fields in a single row.
- Content area: place the main wireframe on the left, notes or annotations on the right.
- Spacing: use 8px increments; keep 24px minimum between blocks.
- Status states: include placeholders for Loading, Empty, and Error states when relevant.

## Color palette
- Primary accent: `#D54029` (headings, callouts, active state).
- Primary text: `#000000`.
- Neutrals:
  - Background: `#FFFFFF`
  - Subtle panel: `#F5F5F5`
  - Border: `#E0E0E0`
  - Secondary text: `#666666`

## Typography
- Font family: Arial (all text).
- Title: 28pt, bold.
- Section header: 18pt, bold.
- Body: 12pt, regular.
- Caption/metadata: 10pt, regular.

## Usage instructions
1. Duplicate the slide you need (Meta, Revision, or Page design).
2. Replace all placeholders in brackets (ex: `[SCREEN NAME]`, `[PAGE ID]`).
3. Keep header fields on a single line and do not resize the header bar.
4. Add wireframe blocks using the neutral palette; use the accent color only for emphasis.
5. Add annotations in the notes column with short, action-oriented labels.

## Troubleshooting and common pitfalls
- Missing fields: every Page design slide must include Screen name, Page ID, and Date.
- Overuse of accent color: limit `#D54029` to headings or one key callout per slide.
- Inconsistent spacing: snap blocks to the 8px grid to avoid misalignment.
- Placeholder text left behind: remove brackets after replacing values.
- Mixed fonts: keep all text in Arial to maintain consistency.
