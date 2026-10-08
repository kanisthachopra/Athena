---
name: MIRA
description: Studio in Plum & Porcelain, a calm spatial workspace for parents.
colors:
  primary: "hsl(283 22% 25%)"
  background: "hsl(280 33% 98%)"
  foreground: "hsl(280 9% 19%)"
  paper: "#ffffff"
  secondary: "hsl(280 27% 94%)"
  muted-foreground: "hsl(280 9% 39%)"
  border: "hsl(284 15% 86%)"
  input: "hsl(284 15% 73%)"
  workspace-plum: "#49334f"
  workspace-wash: "#f1eaf3"
  workspace-muted: "#716275"
  workspace-border: "#ded6e1"
typography:
  display:
    fontFamily: "Lato, Aptos, Segoe UI, sans-serif"
    fontSize: "clamp(40px, 6vw, 68px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Lato, Aptos, Segoe UI, sans-serif"
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Lato, Aptos, Segoe UI, sans-serif"
    fontSize: "20px"
    lineHeight: 1.4
  body:
    fontFamily: "Lato, Aptos, Segoe UI, sans-serif"
    fontSize: "16px"
  label:
    fontFamily: "Lato, Aptos, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  navigation: "8px"
  item: "10px"
  surface: "12px"
  composer: "14px"
spacing:
  small: "8px"
  compact: "12px"
  medium: "16px"
  workspace: "20px"
  section: "24px"
  roomy: "32px"
  desktop: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "8px 16px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "12px 16px"
  navigation-active:
    backgroundColor: "{colors.workspace-plum}"
    textColor: "{colors.paper}"
    rounded: "{rounded.navigation}"
    padding: "12px"
  spatial-item:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.item}"
    padding: "20px"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.item}"
    padding: "2px 10px"
---

# Design System: MIRA

## Overview

**Creative North Star: "Studio — Spatial Workspace"**

Studio gives parents clearly named places to arrange optional experiences. Plum & Porcelain uses restrained plum controls, pale work surfaces, white content and Lato throughout. The owner selected this direction and the left navigation; no new visual direction is implied by this documentation.

This is a scan of the implemented foundation, subordinate to `MIRA_SOURCE_OF_TRUTH.md`. Shared typography and theme reach the application; Today, Week, Guide, public/auth surfaces and settings/help/memory received implementation work. Other existing surfaces retain portions of their earlier composition. This document does not certify whole-app redesign completion, canonical requirement completion or release readiness. The surface contract is `.impeccable/spatial-implementation-brief.md`; implementation evidence belongs in `docs/PROJECT_STATUS.md`.

**Key Characteristics:**

- Persistent left navigation and a restrained family/page breadcrumb.
- Pale named spaces, white content, readable separation and optional detail.
- Lato typography with quiet headings and labelled operational controls.
- No illustration assets; public home, login and email confirmation omit added visuals.

## Colors

Plum provides orientation and action; porcelain and white give content room to breathe.

### Primary

The semantic primary drives shared controls. Workspace Plum drives the rail selection, wordmark and focus outline. Both observed representations are retained in the frontmatter because the source currently uses HSL theme variables alongside literal workspace colors; they are not exact aliases.

### Neutral

Background is the page canvas; Paper is the content surface. Secondary and Workspace Wash provide gentle grouping. Foreground carries core text, the two muted roles support descriptions, and border/input roles distinguish dividers from editable fields. Workspace Border is the literal line used in the new shell and board.

**The Meaning Before Color Rule.** Pair status and selection color with readable labels or native state attributes; color alone must not communicate outcome.

The retained Tailwind compatibility names such as coral, sage and cream are implementation history, not a second approved palette. Semantic destructive red remains available for actual errors and destructive actions.

The sidecar's eight-step OKLCH strips are synthesized display aids, not additional implemented color tokens or approved application shades.

## Typography

Display, headings, body and controls use Lato with Aptos, Segoe UI and sans-serif fallbacks. Regular and Bold font files are locally served through `next/font/local` in `app/layout.tsx`. Weights requested between those files may be synthesized by the browser; no separate 500 or 600 file is bundled.

The display role belongs to the public hero. Workspace headings use the responsive headline role; experience titles use the title role. Descriptions typically use a relaxed line height (1.65); Guide answers use 1.8 and preserve whitespace. Workspace descriptions are bounded at 65ch. Small metadata uses 13px, ordinary labels 14px and navigation 15px.

Font provenance: `app/fonts/Lato-Regular.ttf`, `app/fonts/Lato-Bold.ttf` and `app/fonts/OFL.txt` were obtained from the official Google Fonts repository at `https://github.com/google/fonts/tree/main/ofl/lato`. No new raster assets or generated illustrations were introduced in this implementation. The textual MIRA wordmark is code, not a separate image asset.

## Layout

The desktop rail is fixed at 224px with matching content offset. A contextual header is at least 72px tall. The workspace content is centered within 1200px, with 42px top, 40px horizontal and 64px bottom padding. It is a breadcrumb header, not app-wide top navigation.

At 900px and below, the rail narrows to 190px, workspace padding becomes 30px 24px and Week's two-column board becomes one column. At 640px and below, the rail is hidden until the labelled menu is opened. The opened menu occupies normal flow; a sticky 65px header and 30px 20px workspace padding remain. These are implemented breakpoints, not proof of every mobile interaction.

Week uses named day spaces with a 20px grid gap. Guide has a 740px thread and a question bubble bounded to 85% of its width. Public content uses an 1120px container; its three-column explanation becomes one column on phones. Authentication uses two columns on desktop and one on phones; the introductory heading and prose are hidden at the phone breakpoint.

## Elevation & Depth

The new workspace uses tonal layering and fine borders instead of decorative shadows. The pale day spaces hold white experience surfaces. Authentication suppresses inherited shadows. Some retained UI-library buttons and badges still have Tailwind shadows; the application is not uniformly shadow-free, and those legacy variants are not evidence that every screen has been re-composed.

Focus is an explicit outline (2px, 4px offset) in Workspace Plum. Existing UI-library components can supply their own focus ring. Verify the resulting focus treatment when changing a component rather than assuming the global rule wins.

## Shapes

Navigation uses softly curved corners; cards, fields and actions use restrained rounded rectangles. The frontmatter records observed radii. Tailwind `rounded-lg` resolves through the project's radius configuration to the surface radius, while explicit workspace navigation remains at the smaller navigation radius. Guide uses a 14px composer and a question shape with one 2px corner. Retained auth controls still include pill treatments; do not describe the transition as complete.

## Components

### Buttons and fields

Primary actions use plum, white text, semibold 14px type and a minimum 44px height. Hover reduces primary background opacity; ghost actions gain Secondary. Fields have a minimum 48px height, Paper background, an input border and a primary focus border. Disabled global buttons reduce opacity and show an unavailable cursor. The older `components/ui/button.tsx` remains a separate variant API with different sizing; use the appropriate actual primitive rather than claiming a unified component migration.

### Navigation and labels

The active rail destination uses a filled plum background and `aria-current="page"`. Labels accompany icons. Account and support navigation form a separate group. The mobile toggle reports its expanded state; Escape closes the menu and returns focus. A skip link targets the content anchor. The existing Badge component remains available for short labels; it is not a child score or achievement treatment.

### Spatial workspace

Day containers and white experience items form the signature system. Preparation links, expandable selection reasons, explicit Move/Replace controls and an open-time state describe the parent's options. The move chooser names its destination and any swap, then requires confirmation. A successful server response updates the board and offers Undo. A failed request preserves the shown arrangement and provides recovery wording.

Week's finite FLIP animation is 420ms with `cubic-bezier(.16,1,.3,1)`, starts only after confirmed server success, and cancels on visibility/preference changes. Both the local Animate changes setting and OS reduced motion disable the transition. Migration `202610010001` is now user-reported applied. The owner explicitly requested that existing plans remain unchanged, so live move, swap and undo were not tested and must not be called operationally verified.

### Guide

The current session displays complete returned answers, options and boundary text. The composer preserves failed input and prevents editing while a request is pending. Each question is answered separately; previous messages are not sent as context, and the session is not durable chat history. Existing AI provider/runtime behavior is unchanged. Styling does not establish broader assistant capability or safety verification.

### Library and preparation

The Library now uses compact, bordered rows with a title, summary, materials, duration/preparation metadata and explicit content status. Search matches title, summary and materials. A labelled native Area select and All ideas/Saved links keep filtering compact on phones. Search, collection and replacement context travel through the relevant links and forms. Read preparation is the primary row action; save and an explicit replacement action remain secondary. Filtering describes its age/time/screen scope without promising a complete safety assessment.

Rows use 28px vertical padding, a 32px gap and a content/action grid; at 900px the gap becomes 24px, and at 640px the layout becomes one column with 16px separation and wrapping actions. Row titles are 22px; descriptions remain bounded to 65ch. The search region is bounded to 700px. This extends Studio's existing typography and surfaces without introducing a new visual identity.

The shared preparation component keeps materials, supervision, safety notes, hazards and stop signals expanded. Instructions and the adult's role lead into optional native disclosures for adaptation, noticing and purpose/source. The source disclosure identifies the current template version; it is not an immutable historical activity snapshot. Safety and content status are visible guidance, not certification of suitability.

The pale preparation opening uses a two-column materials/safety region with 28px padding, becoming one column below 900px and 20px padding on phones. Reading and disclosure regions are bounded to 760px; instructions use 18px type with preserved whitespace. Disclosure bodies reveal over 220ms with `cubic-bezier(.16,1,.3,1)`, moving from -4px to their resting position while opacity changes from .6 to 1. The existing global local-preference and OS reduced-motion rules suppress this finite reveal.

### Research provenance

The Library research subpage extends the existing reading and disclosure patterns. It presents a source register, bounded claims and draft interaction primitives, with visible review limits. Native details keep evidence and constraints inspectable; a nested owner-only disclosure separates rejected AI output and its generation record from the main reading flow. This is a research workspace, not a ready-to-use activity collection, and it offers no scheduling or publication action.

Research sections use 32px vertical spacing, 26px section headings and bordered disclosure rows with 20px titles and 24px vertical padding. Prose is bounded to 75ch with a 1.75 line height. The existing pale surface and 12px corners group rejected drafts in two columns with a 24px gap; below 900px this becomes one column, with 20px internal padding on phones. Source links remain underlined and external links include a new-tab label.

The established ChevronDown icon rotates 180 degrees with a 180ms `cubic-bezier(.16,1,.3,1)` transition when a primitive disclosure opens. The existing global local-preference and OS reduced-motion rules suppress the transition. No new raster assets, palette or font roles are introduced. The scoped finish reviewer accepted the glyph correction; full source appraisal, content approval and whole-product readiness remain separate work recorded in `docs/RESEARCH_FOUNDATION_2026-10-01.md`.

### Verification boundary

The implementation agent reports passing build, lint, TypeScript and pure tests. The finish reviewer accepted all four code corrections with no remaining material defect in the scoped re-review; the Today DOM also confirms the optional noticing prompt. Browser controls for a mobile iframe were unavailable, so expanded-menu keyboard behavior and end-to-end success must not be inferred. This design record describes inspected code, not executed database or full accessibility acceptance.

For the subsequent Library/preparation increment, the reviewer accepted the final scoped implementation after tall mobile filter chips were replaced with the native Area select. Final build (including TypeScript), lint, library search/preparation tests, Week helper tests and profile-proposal tests passed. Read-only browser checks confirmed matching and empty searches, keyboard disclosure, and scheduled activity preparation with existing feedback controls. This increment does not establish whole-app completion or execution of plan mutations.

## Do's and Don'ts

### Do:

- Do preserve Studio, Plum & Porcelain, Lato and left navigation.
- Do use named spaces, labelled controls and optional detail to reduce planning effort.
- Do respect local motion preference and OS reduced motion.
- Do distinguish implemented UI from verified persistence and release acceptance.

### Don't:

- Don't add illustrations or decorative connector diagrams to this direction.
- Don't add scores, streaks, completion pressure or invented family facts.
- Don't replace the approved rail with app-wide top navigation.
- Don't describe session Guide as contextual persistent chat or call untested move/undo live-verified.
