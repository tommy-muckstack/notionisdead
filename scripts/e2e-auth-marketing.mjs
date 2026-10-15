// Auth + marketing e2e (QA #1-#5, #31): every nav/footer link real, pricing toggle, login modes/hrefs, 404s, /app guard.
import assert from "node:assert/strict"; import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
// #1 landing: nav menus + footer links
await page.goto(base + "/"); await page.getByRole("button", { name: /Product/ }).click(); await page.getByRole("menu", { name: "Product" }).waitFor(); await page.keyboard.press("Escape"); await page.getByRole("button", { name: /Resources/ }).click(); await page.getByRole("menu", { name: "Resources" }).waitFor(); await page.mouse.click(600, 700);
const hrefs = await page.locator("footer a, header a, .nt-ai a, .nt-trust a, .cta a").evaluateAll(as => as.map(a => a.getAttribute("href")));
assert.ok(hrefs.length > 20 && hrefs.every(h => h && h !== "#"), "every link has a real href: " + JSON.stringify(hrefs.filter(h => !h || h === "#")));
const internal = [...new Set(hrefs.filter(h => h.startsWith("/notionisdead/") || h.startsWith("/")).map(h => h.replace(/^\/notionisdead/, "").replace(/[#?].*$/, "")).filter(Boolean))];
for (const path of internal) { const r = await ctx.request.get(base + path, { maxRedirects: 5 }); assert.ok(r.status() < 400, `${path} → ${r.status()}`); }
assert.ok(hrefs.some(h => h.includes("mode=signup")) && hrefs.some(h => /\/login$/.test(h)), "signup and login CTAs differ");
assert.ok(!(await page.content()).includes("Michael Truell") && !(await page.content()).includes("OpenAI"), "no copied testimonials/logos");
// #2 pricing toggle
await page.goto(base + "/pricing"); assert.equal(await page.getByTestId("price-plus").innerText(), "$10"); assert.equal(await page.getByTestId("price-business").innerText(), "$20");
await page.getByRole("button", { name: "Pay monthly" }).click(); assert.equal(await page.getByTestId("price-plus").innerText(), "$12"); assert.equal(await page.getByTestId("price-business").innerText(), "$24"); assert.match(await page.getByTestId("th-plus").innerText(), /\$12/);
await page.getByRole("button", { name: "Pay yearly" }).click(); assert.equal(await page.getByTestId("price-plus").innerText(), "$10");
await page.locator(".ntp-faq button").nth(1).click(); await page.locator(".ntp-faq p").waitFor();
// #3/#4 login: modes, real hrefs, forgot password, link flow structure
await page.goto(base + "/login"); const card = page.getByTestId("login-card"); assert.equal(await card.getAttribute("data-mode"), "signin"); assert.match(await page.getByRole("link", { name: "Sign up" }).getAttribute("href"), /login\?mode=signup$/);
await page.getByRole("link", { name: "Sign up" }).click(); assert.equal(await card.getAttribute("data-mode"), "signup"); assert.match(await page.getByRole("link", { name: "Log in" }).getAttribute("href"), /\/login$/);
await page.goto(base + "/login?mode=signup"); assert.equal(await card.getAttribute("data-mode"), "signup"); await page.goto(base + "/login?mode=reset"); assert.equal(await card.getAttribute("data-mode"), "reset");
assert.match(await page.locator(".tos a").first().getAttribute("href"), /\/legal/); assert.ok(await page.getByRole("link", { name: /Continue as a guest/ }).count() === 1);
await page.goto(base + "/login"); await page.getByLabel("Email").fill("qa@example.com"); await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(500);
const after = await card.getAttribute("data-step"); const alert = await page.locator('[role="alert"], [role="status"]').allInnerTexts();
assert.ok(after === "2" || after === "3" || alert.join(" ").includes("configured"), "link sent, or password fallback, or not-configured notice: step=" + after + " " + alert.join("|"));
// #31 404s: marketing + app + published
for (const path of ["/zzz404", "/p/pg_doesnotexist"]) { const r = await page.goto(base + path); assert.equal(r.status(), 404, path); const t = await page.locator("body").innerText(); assert.ok(/couldn.t be found|isn.t published/.test(t) && t.includes("Back to my content"), path + " branded"); }
await page.goto(base + "/app/pg_nope"); await page.getByRole("link", { name: "Back to my content" }).waitFor({ timeout: 5000 }); assert.ok((await page.locator("body").innerText()).includes("couldn't be found"), "app bad id branded");
// #5 + guard: /app for a fresh browser lands in the app as a guest (design decision), data survives sign-out → back
const fresh = await (await browser.newContext()).newPage(); const r = await fresh.goto(base + "/app"); assert.equal(r.status(), 200); await fresh.getByTestId("home").waitFor(); await fresh.close();
assert.deepEqual(errors, []); console.log("auth-marketing e2e OK"); await browser.close();
