// Hygiene: console errors/warnings across the main surfaces, 390px layouts (no horizontal scroll), /app guard.
import assert from "node:assert/strict"; import fs from "node:fs"; import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const out = process.env.OUT ?? ".shots/mobile"; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(); const ignore = /favicon|Download the React DevTools|HMR|Fast Refresh|hydrat|\[Fast Refresh\]|preload|was preloaded/i;
async function sweep(viewport, label) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true }); const page = await ctx.newPage(); const log = [];
  page.on("console", m => { if ((m.type() === "error" || m.type() === "warning") && !ignore.test(m.text())) log.push(`[${m.type()}] ${m.text().slice(0, 200)}`); }); page.on("pageerror", e => log.push("[pageerror] " + String(e)));
  const shot = (n) => page.screenshot({ path: `${out}/${label}-${n}.png`, fullPage: false });
  const noHScroll = async (n) => { const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); assert.ok(w[0] <= w[1] + 1, `${label} ${n}: horizontal overflow ${w[0]} > ${w[1]}`); };
  await page.goto(base + "/"); await page.waitForTimeout(400); await shot("landing"); await noHScroll("landing");
  await page.goto(base + "/pricing"); await page.waitForTimeout(400); await shot("pricing"); await noHScroll("pricing");
  await page.goto(base + "/login"); await page.waitForTimeout(400); await shot("login"); await noHScroll("login");
  await page.goto(base + "/help"); await page.waitForTimeout(300); await noHScroll("help");
  await page.goto(base + "/app"); await page.getByTestId("home").waitFor(); await page.waitForTimeout(400); await shot("app-home"); await noHScroll("app-home");
  await page.getByTestId("new-page").click().catch(async () => { await page.getByRole("button", { name: "Open sidebar" }).click(); await page.getByTestId("new-page").click(); });
  await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === ""); await page.locator(".ntn-title").fill("Mobile page"); await page.keyboard.press("Enter"); await page.keyboard.type("Some text"); await page.keyboard.press("Enter"); await page.keyboard.type("/table view"); await page.keyboard.press("Enter"); await page.getByTestId("database").waitFor(); await page.keyboard.press("Escape");
  await page.waitForTimeout(300); await shot("app-page"); await noHScroll("app-page");
  if (viewport.width < 500) { await page.getByRole("button", { name: "Open sidebar" }).click(); await page.waitForTimeout(300); await shot("app-sidebar"); await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.querySelector(".ntn-side.is-open")); await page.getByRole("button", { name: "Open sidebar" }).click(); await page.locator(".ntn-scrim").click({ position: { x: 340, y: 400 } }); await page.waitForFunction(() => !document.querySelector(".ntn-side.is-open")); }
  await page.getByRole("button", { name: "Page actions", exact: true }).click(); await page.getByTestId("page-menu").waitFor(); await shot("app-menu"); await page.keyboard.press("Escape");
  await page.locator(".ntn-sharebtn").click(); await page.getByRole("dialog", { name: "Share" }).waitFor(); await shot("app-share"); await page.keyboard.press("Escape");
  await page.locator(".ntn-page").hover().catch(() => {}); await page.getByRole("button", { name: "Add comment" }).click(); await page.waitForTimeout(200); await shot("app-comment"); await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k"); await page.getByRole("dialog", { name: "Search" }).waitFor(); await shot("app-search"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /⚙ Settings/ }).click().catch(async () => { await page.getByRole("button", { name: "Open sidebar" }).click(); await page.getByRole("button", { name: /⚙ Settings/ }).click(); }); await page.getByRole("dialog", { name: "Settings" }).waitFor(); await shot("app-settings"); await page.keyboard.press("Escape");
  await ctx.close(); return log;
}
const desk = await sweep({ width: 1280, height: 800 }, "desktop"); const mob = await sweep({ width: 390, height: 844 }, "mobile");
const all = [...new Set([...desk, ...mob])]; if (all.length) { console.log("CONSOLE:\n" + all.join("\n")); }
assert.deepEqual(all, [], "console is clean"); console.log("hygiene e2e OK"); await browser.close();
