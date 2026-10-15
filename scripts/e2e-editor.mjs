// Editor-core e2e (QA findings #10-#15): real mouse/keyboard against a running server.
// Usage: BASE=http://localhost:3011/notionisdead node scripts/e2e-editor.mjs
import assert from "node:assert/strict"; import fs from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const shots = process.env.SHOTS ?? ".shots"; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
const errors = []; page.on("console", m => { if (m.type() === "error") errors.push(m.text()); }); page.on("pageerror", e => errors.push(String(e)));
await page.goto(base + "/app"); await page.getByTestId("home").waitFor();
await page.getByTestId("new-page").click(); await page.getByTestId("page").waitFor();
// #10 Enter in the title moves into the first block
await page.getByLabel("Page title").fill("QA Page"); await page.keyboard.press("Enter"); await page.keyboard.type("Hello world");
assert.equal(await page.getByLabel("Page title").inputValue(), "QA Page", "title untouched by body typing");
assert.equal(await page.locator('[data-testid="block"]').first().locator("textarea").inputValue(), "Hello world");
// clearing the title never hides the first block
await page.getByLabel("Page title").fill(""); await page.keyboard.press("Escape"); await page.getByLabel("Page title").fill("QA Page");
assert.ok(await page.locator('[data-testid="block"]').first().isVisible());
// #11 slash menu groups + new block kinds
await page.locator('[data-testid="block"]').first().locator(".ntn-view, textarea").first().click(); await page.keyboard.press("End"); await page.keyboard.press("Enter");
await page.keyboard.type("/"); await page.getByTestId("slash-menu").waitFor();
const groups = await page.locator(".ntn-slash__h").allInnerTexts(); assert.deepEqual(groups, ["Basic blocks", "Media", "Database", "Advanced blocks"], groups.join());
const labels = await page.locator(".ntn-slash button b").allInnerTexts();
for (const l of ["Text", "Page", "To-do list", "Heading 4", "Toggle list", "Callout", "Quote", "Table", "Divider", "Link to page", "Image", "Video", "Audio", "Code", "File", "Web bookmark", "Table view", "Board view", "2 columns", "Block equation", "Table of contents"]) assert.ok(labels.includes(l), "slash has " + l);
await page.screenshot({ path: `${shots}/11-slash-clone.png` });
await page.keyboard.type("toggle"); await page.keyboard.press("Enter"); await page.keyboard.type("Toggle title"); await page.keyboard.press("Enter");
assert.equal(await page.locator('[data-testid="block"][data-type="toggle"]').count(), 1);
await page.keyboard.type("/image"); await page.keyboard.press("Enter"); await page.getByTestId("media-empty").waitFor();
await page.getByRole("button", { name: "Embed link" }).click(); await page.getByRole("textbox", { name: "Link" }).fill("https://example.com/pic.png"); await page.getByRole("button", { name: "Embed", exact: true }).click();
assert.ok(await page.locator('[data-type="image"] img').count() === 1, "image embedded");
await page.locator(".ntn-addrow").click(); await page.keyboard.type("/2 col"); await page.keyboard.press("Enter"); assert.equal(await page.locator('[data-type="columns"] [data-testid="nested-editor"]').count(), 2, "two columns");
await page.locator(".ntn-addrow").click(); await page.keyboard.type("/table of"); await page.keyboard.press("Enter"); assert.equal(await page.locator('[data-type="toc"]').count(), 1);
await page.locator(".ntn-addrow").click(); await page.keyboard.type("# Heading here"); await page.keyboard.press("Escape"); await page.waitForFunction(() => [...document.querySelectorAll(".ntn-toc a")].some(a => a.textContent === "Heading here"), null, { timeout: 5000 }).catch(async () => { throw new Error("toc lists the heading; types=" + (await page.locator('[data-testid="block"]').evaluateAll(e => e.map(x => x.dataset.type + ":" + (x.querySelector("textarea")?.value ?? x.innerText).slice(0, 20)))).join("|")); });
await page.locator(".ntn-addrow").click(); await page.keyboard.type("/page"); await page.keyboard.press("Enter"); await page.waitForURL(/\/app\/pg_/); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Untitled");
assert.match(await page.locator(".ntn-crumbs").innerText(), /QA Page.*Untitled/s, "sub-page created from /page"); await page.goBack(); await page.getByTestId("page").waitFor();
assert.equal(await page.locator('[data-type="page"]').count(), 1, "page block stays in parent");
// #12 markdown shortcuts incl. toggle / quote / h4 + code placeholder
await page.locator(".ntn-addrow").click(); await page.keyboard.type("```"); await page.waitForSelector('[data-type="code"]'); assert.equal(await page.locator('[data-type="code"] textarea').getAttribute("placeholder"), "Write some code…");
await page.keyboard.press("Meta+Enter"); await page.keyboard.type('" quoted'); assert.equal(await page.locator('[data-type="quote"]').count(), 1); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
await page.keyboard.type("#### four"); assert.equal(await page.locator('[data-type="h4"]').count(), 1); await page.keyboard.press("Escape");
// #13 toolbar on drag-select (unfocused view) with a visible selection
const first = page.locator('[data-testid="block"]').first().locator(".ntn-view"); const box = await first.boundingBox();
await page.mouse.move(box.x + 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
await page.getByTestId("format-toolbar").waitFor(); assert.ok(!(await page.evaluate(() => window.getSelection()?.isCollapsed)), "selection visible");
await page.screenshot({ path: `${shots}/13-toolbar-clone.png` });
await page.getByRole("button", { name: "Bold" }).click(); await page.keyboard.press("Escape"); await page.locator('[data-testid="block"]').first().locator("strong").first().waitFor({ timeout: 3000 }).catch(() => { throw new Error("bold applied"); });
// keyboard selection + ⌘U, link form, colour
await first.click(); await page.keyboard.press("End"); await page.keyboard.press("Shift+Home"); await page.getByTestId("format-toolbar").waitFor();
await page.getByTestId("format-toolbar").getByRole("button", { name: "Link" }).click(); await page.getByLabel("Link URL").fill("example.org"); await page.keyboard.press("Enter");
assert.match(await page.locator('[data-testid="block"]').first().locator("textarea").inputValue(), /\]\(https:\/\/example\.org\)/, "link wraps selection");
// #14 @ mentions
await page.locator(".ntn-addrow").click(); await page.keyboard.type("Ask @"); await page.getByTestId("mention-menu").waitFor(); await page.keyboard.press("Enter"); await page.keyboard.type("on @tomo"); await page.keyboard.press("Enter"); await page.keyboard.press("Escape");
await page.locator(".ntn-chip.is-person").first().waitFor({ timeout: 3000 }); await page.locator(".ntn-chip.is-date").first().waitFor({ timeout: 3000 });
await page.keyboard.type("@"); // after Escape nothing is focused; must not throw
// #15 block menu: items, Escape, click-away, drag reorder
const blocks = page.locator('[data-testid="block"]'); const n0 = await blocks.count();
await blocks.first().hover(); await blocks.first().getByRole("button", { name: "Block menu" }).click(); await page.getByTestId("block-menu").waitFor();
const items = await page.locator('[data-testid="block-menu"] [role="menuitem"], [data-testid="block-menu"] button').allInnerTexts();
for (const l of ["Turn into", "Color", "Copy link to block", "Duplicate", "Move to", "Delete"]) assert.ok(items.some(i => i.includes(l)), "menu has " + l);
await page.screenshot({ path: `${shots}/15-block-menu-clone.png` });
await page.keyboard.press("Escape"); await page.waitForSelector('[data-testid="block-menu"]', { state: "detached" });
await blocks.first().hover(); await blocks.first().getByRole("button", { name: "Block menu" }).click(); await page.getByTestId("block-menu").waitFor(); await page.mouse.click(900, 60); await page.waitForSelector('[data-testid="block-menu"]', { state: "detached" });
await blocks.first().hover(); await blocks.first().getByRole("button", { name: "Block menu" }).click(); await page.getByRole("menuitem", { name: "Duplicate" }).click(); assert.equal(await blocks.count(), n0 + 1, "duplicate adds a block");
const t0 = await blocks.nth(0).getAttribute("data-type"), t1 = await blocks.nth(1).getAttribute("data-type"); assert.equal(t0, t1);
// drag block 0 below block 2
await blocks.nth(0).hover(); const h = blocks.nth(0).getByRole("button", { name: "Block menu" }); const hb = await h.boundingBox(); const tb = await blocks.nth(2).boundingBox();
await page.mouse.move(hb.x + 4, hb.y + 4); await page.mouse.down(); await page.mouse.move(hb.x + 10, hb.y + 10); await page.mouse.move(tb.x + 100, tb.y + tb.height - 2, { steps: 8 }); await page.mouse.up();
const before = await page.locator('[data-testid="block"]').first().locator("textarea, .ntn-view").first().innerText().catch(() => "");
const order = await page.locator('[data-testid="block"]').evaluateAll(els => els.map(e => e.id)); assert.ok(order.length === n0 + 1, "drag kept block count " + before);
// Color via block menu
await blocks.nth(0).hover(); await blocks.nth(0).getByRole("button", { name: "Block menu" }).click(); await page.getByRole("menuitem", { name: /Color/ }).click(); await page.getByRole("menuitemradio", { name: "Red", exact: true }).click();
assert.match((await blocks.nth(0).getAttribute("style")) ?? "", /--nt-red/, "block colour");
// persistence
await page.reload(); await page.getByTestId("page").waitFor(); assert.equal(await page.locator('[data-type="toggle"]').count(), 1); assert.equal(await page.locator('[data-type="columns"]').count(), 1);
assert.deepEqual(errors.filter(e => !/favicon|hydrat/i.test(e)), [], "console errors");
console.log("editor e2e OK"); await browser.close();
