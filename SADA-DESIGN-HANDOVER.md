# Sada Studio visual refinement handover — 9 September 2026

This branch implements the approved homepage opening, Gallery / Index work browser,
editorial copy and typography, original Echo appearances, navigation, footer, and filter cleanup.

## Exact rollback

Before these changes, main was `8211db147445051fe8809e7ca6a768cdbaf92584`.
The preserved branch is `backup/sada-before-studio-evolution-2026-09-09`.
Its tree is `d8080e50dd7d6320492aa5a558cdbb1f5e712ad6`.
The earlier `backup/echo-ai-before-2026-09-09` branch must also remain intact.
No R2 assets, project records, Worker configuration, D1 state, or admin application were changed.
To restore this pre-refinement website, create a new commit whose tree matches the backup;
do not rewrite main history or delete subsequent unrelated work. Check the live CMS state first.

## Preview and release

The design is prepared on `feat/sada-studio-evolution` for review before going live.
A separate private Sites preview includes an explicitly labelled UI preview of Ask Sada.
The live API accepts the production origin; preview chat and submission do not make API requests.
Preview-only files and preview SEO / analytics changes must never enter the GitHub Pages release.
The existing case-study content, routes, SEO metadata, preloader, media and core AI workflows are preserved.

## Echo

Keep the user's original artwork. The neutral folder contains files named `neurtal-1.png`
through `neurtal-5.png`. Preserve the shared sprite cache and high-resolution fallbacks.
Large faces have reserved layout space. Ambient Echo appearances use still frames and
share the same loader. They never create extra offscreen animation loops.
The AI's existing server-selected emotion handling is unchanged.

## Deferred: After Hours

When Hani says “After Hours”, he means a future experimental Sada playground:
posters, typography, motion and illustration experiments, possibly with an interactive
word-echo poster maker (repetitions, spacing and colour, optional original Echo stamp,
and a downloadable poster). This was deliberately excluded from this release.
Do not implement it until explicitly requested. Project case-study redesign was also excluded.

## CMS

The existing site-content.json structure and visual editing messages remain supported.
New hero fields are editable in the visual homepage editor with static fallbacks.
Services with no published projects remain services, but are not offered as empty filters.
Illustration and Illustrations normalize to one existing category; project records are not rewritten.
