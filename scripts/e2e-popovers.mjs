// Popover stacking e2e (QA #16): one popover at a time; Escape and click-away close every one.
import assert from "node:assert/strict"; import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(base + "/app"); await page.getByTestId("home").waitFor(); await page.getByTestId("new-page").click(); await page.getByTestId("page").waitFor(); await page.getByLabel("Page title").fill("Popovers"); await page.keyboard.press("Enter"); await page.keyboard.type("/table"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape");
const open = async (name) => (name === "Share" ? page.locator(".ntn-sharebtn") : page.getByRole("button", { name })).click();
const icons = page.locator(".ntn-icons"), share = page.getByRole("dialog", { name: "Share" }), menu = page.getByRole("menu").filter({ hasText: "Move to Trash" }), wsm = page.locator(".ns-wsmenu");
await page.locator(".ntn-page").hover(); await open("Change icon"); await icons.waitFor();
await open("Share"); await share.waitFor(); assert.equal(await icons.count(), 0, "icon picker closed when Share opened");
await open("Page actions"); await menu.waitFor(); assert.equal(await share.count(), 0, "Share closed when page actions opened");
await page.locator(".ns-ws").click(); await wsm.waitFor(); assert.equal(await menu.count(), 0, "page actions closed when workspace menu opened");
await page.keyboard.press("Escape"); await page.waitForSelector(".ns-wsmenu", { state: "detached" });
await open("Share"); await share.waitFor(); await page.mouse.click(700, 600); await page.waitForSelector('[role="dialog"][aria-label="Share"]', { state: "detached" });
await open("Share"); await share.waitFor(); await open("Share"); assert.equal(await share.count(), 0, "trigger toggles");
await page.locator(".ntn-page").hover(); await open("Change icon"); await icons.waitFor(); await page.keyboard.press("Escape"); await page.waitForSelector(".ntn-icons", { state: "detached" });
// database view settings
await page.getByRole("button", { name: "View settings" }).click(); await page.locator(".ntn-db__menu").waitFor(); await page.keyboard.press("Escape"); await page.waitForSelector(".ntn-db__menu", { state: "detached" });
await page.getByRole("button", { name: "View settings" }).click(); await page.locator(".ntn-db__menu").waitFor(); await open("Share"); await share.waitFor(); assert.equal(await page.locator(".ntn-db__menu").count(), 0, "db menu closed by Share");
await page.keyboard.press("Escape");
// settings + search dialogs close on Escape / overlay click
await page.locator(".ns-ws").click(); await page.locator(".ns-wsmenu").waitFor().catch(async e => { await page.screenshot({ path: ".shots/pop-fail.png" }); throw e; }); await page.locator(".ns-wsmenu").getByRole("button", { name: "Settings", exact: true }).click(); await page.getByRole("dialog", { name: "Settings" }).waitFor(); await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"][aria-label="Settings"]', { state: "detached" });
await page.keyboard.press("Control+k"); await page.getByRole("dialog", { name: "Search" }).waitFor(); await page.mouse.click(20, 780); await page.waitForSelector('[role="dialog"][aria-label="Search"]', { state: "detached" });
// block menu vs page popovers
await page.locator('[data-testid="block"]').last().hover(); await page.locator('[data-testid="block"]').last().getByRole("button", { name: "Block menu" }).click(); await page.getByTestId("block-menu").waitFor();
await open("Share"); await share.waitFor(); assert.equal(await page.getByTestId("block-menu").count(), 0, "block menu closed by Share");
assert.deepEqual(errors, []); console.log("popovers e2e OK"); await browser.close();
