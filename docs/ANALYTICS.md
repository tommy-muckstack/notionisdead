# Analytics (PostHog)

One PostHog project (US cloud, project **666931**) collects the hub and every IsDead sub-app. The contract is the hub's
`yourappisdead/ANALYTICS.md`; this file is how NotionIsDead follows it.

## Setup
- `NEXT_PUBLIC_POSTHOG_KEY` = the project's publishable token (safe in the browser); `NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com`. Both are set on the Vercel project. No key → analytics is a no-op.
- Reverse proxy through the app's own origin: `/notionisdead/ingest/*` → `us.i.posthog.com` (rewrites in `next.config.mjs`, with `skipTrailingSlashRedirect: true`).
- `<Analytics />` is mounted once in `app/layout.tsx`; it boots the client and sends PostHog's `$pageview` per route change. Autocapture and session replay are off.
- posthog-js drops automated browsers. In dev, `localStorage.isdead_ph_debug = "1"` turns on verbose logs and lets Playwright capture (production keeps the bot filter).

## Super properties (every event)
| property | value | meaning |
| --- | --- | --- |
| `product` | `notionisdead` | the one property to filter by |
| `surface` | `landing` \| `app` | `landing` = home, pricing, login; `app` = the workspace under `/app` |
| `platform` | `web` | |
| `env` | `production` \| `development` | |
| `account_type` | `firebase` \| `guest` \| `demo` | |

## Privacy
`scrub` (the `before_send` hook in `lib/analytics/posthog.tsx`) cuts query strings and hashes from every URL property,
masks page ids (`/app/<id>` → `/app/:id`; `/app/trash` stays), and drops the page `title` (it can be a user's page name).
Heatmaps, web-vitals capture, autocapture and replay are off.

## Identity
Signed-in users are identified by Firebase uid (`identify(uid, "firebase")`, from `Workspace`). Guests and the demo account
are never identified; only `account_type` is registered. Sign-out sends `app_signed_out`, then `reset()` and re-registers the super properties.

## Events
`app_<object>_<action>`, snake_case, past tense; the product name is never in an event name. Properties are kinds, counts and
booleans only: never page titles, block text, URLs or emails.

| event | properties |
| --- | --- |
| `app_signed_up` | `method`: password |
| `app_signed_in` | `method`: password \| google |
| `app_signed_out` | |
| `app_page_created` | `via`: sidebar \| subpage \| home \| search, `nested` |
| `app_page_duplicated` | |
| `app_page_moved` | `to_top_level` |
| `app_page_favorited` | `on` |
| `app_page_trashed` / `app_page_restored` / `app_page_deleted` | |
| `app_trash_emptied` | `count` |
| `app_page_exported` | `format`: markdown |
| `app_page_imported` | `format`: markdown, `blocks` (count) |
| `app_shared` | `method`: copy_link \| share_menu |
| `app_search_opened` | `via`: button \| shortcut |

Adding an event = add it to `lib/analytics/taxonomy.ts` (the only place names are defined) and this table; `tests/unit/analytics.test.ts` checks the naming rules.
Avoid property names the hub treats as legacy super properties (`source`, `app`, `site_id`, ...; see `LEGACY_PROPS`).

## Where the calls live
`lib/analytics/` (client + taxonomy), `components/NtLogin.tsx` (sign-up/sign-in, sent with `trackNow` before the redirect),
`components/notion/Workspace.tsx` (identify, sign-out, page actions).
