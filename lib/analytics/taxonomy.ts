// Analytics taxonomy for the shared IsDead PostHog project 666931 (contract: yourappisdead/ANALYTICS.md, see docs/ANALYTICS.md).
// Super properties: product (this app's slug), surface ("landing" = logged-out marketing pages, "app" = the working product
// and anything it publishes), platform ("web"). Page views are PostHog's built-in $pageview.
// Events are `app_<object>_<action>` (or `landing_<object>_<action>` for marketing CTAs); the product name lives in
// `product`, never in an event name. Never send user content (titles, URLs, emails, text) as properties.
export const APP = "notionisdead" as const;
export type Surface = "landing" | "app";
export const EVENTS = {
  app_signed_up: "app_signed_up",       // method ("password" | "google")
  app_signed_in: "app_signed_in",       // method ("password" | "google")
  app_signed_out: "app_signed_out",
  // ---- pages (properties are kinds/booleans/counts only, never titles or block text) ----
  app_page_created: "app_page_created",         // via ("sidebar" | "subpage" | "home" | "search"), nested (bool)
  app_page_duplicated: "app_page_duplicated",
  app_page_moved: "app_page_moved",             // to_top_level (bool)
  app_page_favorited: "app_page_favorited",     // on (bool)
  app_page_trashed: "app_page_trashed",
  app_page_restored: "app_page_restored",
  app_page_deleted: "app_page_deleted",         // permanent delete from Trash
  app_trash_emptied: "app_trash_emptied",       // count
  app_page_exported: "app_page_exported",       // format ("markdown")
  app_page_imported: "app_page_imported",       // format ("markdown"), blocks (count)
  app_shared: "app_shared",                     // method ("copy_link" | "share_menu")
  app_search_opened: "app_search_opened",       // via ("button" | "shortcut")
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export const EVENT_PREFIXES = ["app_", "landing_"] as const;
/** Super properties every event carries (yourappisdead/ANALYTICS.md §1). */
export const superProps = (surface: Surface) => ({ product: APP, surface, platform: "web" as const });
/** Super properties older IsDead taxonomies persisted in the shared yourappisdead.com cookie. Unregistered at boot. */
export const LEGACY_PROPS = ["app", "app_family", "base_path", "suite_id", "app_id", "schema_version", "source", "site_id", "environment", "ads_blocked", "account_type"] as const;
