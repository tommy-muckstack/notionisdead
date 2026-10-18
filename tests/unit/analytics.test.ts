import { describe, it, expect } from "vitest";
import { EVENTS, EVENT_PREFIXES, APP, superProps } from "@/lib/analytics/taxonomy";
describe("analytics taxonomy", () => {
  it("uses the shared prefixes and snake_case", () => { for (const e of Object.values(EVENTS)) { expect(e, e).toMatch(/^[a-z]+(_[a-z]+)+$/); expect(EVENT_PREFIXES.some(p => e.startsWith(p)), e).toBe(true); } });
  it("never puts the product name in an event name", () => { for (const e of Object.values(EVENTS)) expect(e.includes(APP.replace(/isdead$/, ""))).toBe(false); });
  it("sends the hub's super properties", () => { expect(superProps("app")).toEqual({ product: APP, surface: "app", platform: "web" }); });
});
import { scrub } from "@/lib/analytics/posthog";
describe("analytics privacy", () => {
  it("strips query strings, hashes and titles", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/x/app?url=https://secret.example#frag", $referrer: "https://google.com/search?q=me", title: "My private doc" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/x/app"); expect(e.properties.$referrer).toBe("https://google.com/search"); expect("title" in e.properties).toBe(false);
  });
  it("masks page ids but keeps the Trash view", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/notionisdead/app/pg_abc123?x=1", $pathname: "/notionisdead/app/trash" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/notionisdead/app/:id"); expect(e.properties.$pathname).toBe("/notionisdead/app/trash");
  });
  it("cleans session-entry and every other URL-like key, in $set/$set_once too", () => {
    const u = "https://yourappisdead.com/notionisdead/app/pg_1?ref=me#h";
    const e = scrub({ event: "$pageview", properties: { $session_entry_url: u, $session_entry_referrer: "https://x.com/?q=1", $session_entry_pathname: "/notionisdead/app/pg_1", some_url: u, $set: { $current_url: u }, $set_once: { $initial_current_url: u } }, $set: { $current_url: u }, $set_once: { $initial_referrer: "https://x.com/a?b=c" } });
    const clean = "https://yourappisdead.com/notionisdead/app/:id";
    expect(e.properties.$session_entry_url).toBe(clean); expect(e.properties.$session_entry_referrer).toBe("https://x.com/"); expect(e.properties.$session_entry_pathname).toBe("/notionisdead/app/:id"); expect(e.properties.some_url).toBe(clean);
    expect(e.properties.$set.$current_url).toBe(clean); expect(e.properties.$set_once.$initial_current_url).toBe(clean); expect(e.$set.$current_url).toBe(clean); expect(e.$set_once.$initial_referrer).toBe("https://x.com/a");
  });
});
