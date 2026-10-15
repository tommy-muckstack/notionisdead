# NotionIsDead

Free, open-source Notion alternative. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/notionisdead`.

**Status: open source, not deployed yet**. Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- **Pages:** nested page tree, icons, covers (gallery / upload / link, reposition), favorites, sub-pages, move-to, duplicate (deep), page font / small text / full width / lock, page history, comments, Trash popover with search + restore / delete forever / empty, breadcrumbs, recent pages with real visit times, teamspaces, home screen (starter pages, upcoming dates from your databases), template gallery, inbox of comments/mentions, settings (preferences, workspace name/icon, export all, public pages, teamspaces), several local workspaces per user.
- **Block editor:** 25 block types (text, H1-4, bulleted/numbered/toggle lists, to-do, quote, callout, code, divider, page, link to page, image, video, audio, file, web bookmark, equation, table of contents, columns, inline databases). Markdown shortcuts (`# `, `- `, `1. `, `[] `, `> ` toggle, `" ` quote, ````, `---`, `$$`), grouped slash menu (anywhere in a line), floating formatting toolbar on selection (turn into, bold/italic/underline/strike/code, link, colour), `@` mentions (people, pages, dates), Enter/Backspace list behaviour, drag handle to reorder or ⌘⇧↑/↓, ⌘B/I/U/E/K and ⌘⇧S on a selection, ⌘D duplicate, paste Markdown into blocks, block menu (turn into, colour, copy link, duplicate, move to, delete).
- **Databases:** typed properties (text, number, select, multi-select, status, date, checkbox, URL, email, phone), filters, sorts, search, multiple views per database (Table, Board with configurable grouping and drag, List, Calendar, Gallery, Timeline, Chart), rows open as pages with their own content; CSV import/export.
- **Inline:** **bold**, *italic*, underline, `code`, ~~strike~~, colours/highlights, links, @mentions and [[page links]] with backlinks.
- **Search:** ⌘K / ⌘P across titles and body text with Title only / In / Date filters, recents, and create-from-search.
- **Export / import / publish:** export as Markdown & CSV, HTML or PDF (with sub-pages as a zip); import Markdown, HTML, plain text or CSV; publish a read-only copy of a page to the web at `/p/<id>` (server-stored, unpublish any time). The block↔Markdown round trip is covered by a golden corpus in the tests.
- 43 unit tests; `npm run shots` runs a Playwright editor smoke test; `BASE=http://localhost:3000/notionisdead node scripts/e2e-editor.mjs` drives the editor with real mouse/keyboard events.

## Known gaps
- Data lives in the browser (localStorage, per user); no sharing, real-time collaboration or sync yet.
- Uploaded media lives in the browser as data URLs (1.5 MB cap per file); no nested/indented lists, AI or comments yet. See `docs/PARITY_REPORT.md` for the QA-driven parity status.
- Brainz (Rust/GPUI) code isn't reusable on the web; only its design cues (slash menu, round-trip-clean Markdown) were used.
- Notion's brand fonts are approximated with Host Grotesk.

## Auth
Shared Firebase project `yourappisdead` (email/password + Google), helpers in `lib/isdead-auth` (vendored from `isdead-design/auth`). The session cookie `isdead_session` has path `/`, so one sign-in covers every IsDead app. Env: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`. Without them, `/login` shows "Sign-in not configured". The single demo account ("Use the demo account") is available outside production or with `DEMO_MODE=1`.

## Develop
```
npm install
npm run dev        # http://localhost:3000/notionisdead
npm test           # unit tests
npm run typecheck
npm run build && npm run shots   # product screenshots + end-to-end smoke test (Playwright)
```
Theme and font: `vendor/isdead-design` (OFL fonts, see `fonts/*/OFL-*.txt`). Not affiliated with Notion; all trademarks belong to their owners. Apache-2.0.
