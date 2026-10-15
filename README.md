# NotionIsDead

Free, open-source Notion alternative. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/notionisdead`.

**Status: open source, not deployed yet**. Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- **Pages:** nested page tree, icons, favorites, sub-pages, move-to, duplicate (deep), Trash with restore / delete forever / empty, breadcrumbs, recent pages, home screen.
- **Block editor:** 11 block types (text, H1-3, bulleted/numbered lists, to-do, quote, callout, code, divider). Markdown shortcuts (`# `, `- `, `1. `, `[] `, `> `, ````, `---`), slash menu, Enter/Backspace list behaviour, ⌘⇧↑/↓ to move blocks, ⌘B/I/E on a selection, paste Markdown into blocks, block menu (turn into, duplicate, delete).
- **Inline:** **bold**, *italic*, `code`, ~~strike~~, links, and [[page links]] with backlinks.
- **Search:** ⌘K across titles and body text, with create-from-search.
- **Markdown:** export any page, import a .md file; the block↔Markdown round trip is covered by a golden corpus in the tests.
- 36 unit tests; `npm run shots` runs a Playwright editor smoke test.

## Known gaps
- Data lives in the browser (localStorage, per user); no sharing, real-time collaboration or sync yet.
- No databases/tables, images, embeds, drag-handle reordering by mouse (use ⌘⇧↑/↓ or the block menu), nested/indented lists, AI or comments.
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
