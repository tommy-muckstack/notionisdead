// Databases e2e (QA #25, #26): properties, filter/sort, views, layouts, open row as page, board grouping, persistence, legacy migration.
import assert from "node:assert/strict"; import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(base + "/app"); await page.getByTestId("home").waitFor(); await page.getByTestId("new-page").click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === ""); await page.locator(".ntn-title").fill("DB"); await page.keyboard.press("Enter");
await page.keyboard.type("/table view"); await page.keyboard.press("Enter"); await page.getByTestId("database").waitFor();
const db = page.getByTestId("database"); const titles = db.locator('.row .c1 input[aria-label="Name"]');
assert.equal(await titles.count(), 3); await titles.nth(0).fill("Write post"); await titles.nth(1).fill("Ship build"); await titles.nth(2).fill("Announce");
// + Add property (types) and set cells
await page.getByRole("button", { name: "Add property" }).click(); await page.getByRole("menuitem", { name: "Number" }).click(); await page.getByRole("button", { name: "Add property" }).click(); await page.getByRole("menuitem", { name: "Date" }).click(); await page.getByRole("button", { name: "Add property" }).click(); await page.getByRole("menuitem", { name: "Select", exact: true }).click();
assert.deepEqual((await db.locator(".hdr .colbtn").allInnerTexts()).map(t => t.replace(/^\S+\s/, "")), ["Name", "Status", "Number", "Date", "Select"]);
const nums = db.locator('.row input[aria-label="Number"]'); await nums.nth(0).fill("3"); await nums.nth(1).fill("10"); await nums.nth(2).fill("1");
const dates = db.locator('.row input[aria-label="Date"]'); await dates.nth(0).fill("2026-10-20"); await dates.nth(1).fill("2026-10-05"); await dates.nth(2).fill("2026-11-02");
// status via select menu; select option creation
await db.locator('.row .cell-btn[aria-label="Status"]').nth(1).click(); await page.getByRole("option", { name: "Done" }).click(); assert.equal(await db.locator(".row").nth(1).locator(".ntn-chip2", { hasText: "Done" }).count(), 1);
await db.locator('.row .cell-btn[aria-label="Select"]').nth(0).click(); await page.getByLabel("Search Select options").fill("Urgent"); await page.keyboard.press("Enter"); assert.equal(await db.locator(".row").nth(0).locator(".ntn-chip2", { hasText: "Urgent" }).count(), 1);
// rename + change type via property menu
await db.locator(".hdr .colbtn", { hasText: "Number" }).click(); await page.getByTestId("prop-menu").waitFor(); await page.getByLabel("Property name").fill("Estimate"); await page.keyboard.press("Enter"); assert.ok((await db.locator(".hdr .colbtn").allInnerTexts()).some(t => t.includes("Estimate")));
// Filter: Status is Done
await page.getByRole("button", { name: "Filter" }).click(); await page.getByTestId("filter-bar").waitFor(); await page.getByRole("button", { name: "Add filter" }).click(); await page.getByLabel("Filter property").selectOption({ label: "Status" }); await page.getByLabel("Filter operator").selectOption("is"); await page.getByLabel("Filter value").selectOption("Done");
await page.waitForFunction(() => document.querySelectorAll('[data-testid="database"] .row').length === 1); assert.equal(await titles.first().inputValue(), "Ship build"); await page.getByRole("button", { name: "Remove filter" }).click(); await page.waitForFunction(() => document.querySelectorAll('[data-testid="database"] .row').length === 3);
// Sort: Estimate desc
await page.getByRole("button", { name: "Sort" }).click(); await page.getByTestId("sort-bar").waitFor(); await page.getByRole("button", { name: "Add sort" }).click(); await page.getByLabel("Sort property").selectOption({ label: "Estimate" }); await page.getByLabel("Sort direction").selectOption("desc");
assert.deepEqual(await titles.evaluateAll(els => els.map(e => e.value)), ["Ship build", "Write post", "Announce"]); await page.getByRole("button", { name: "Remove sort" }).click();
// Open row as page: properties + content, then close
await db.locator(".row").first().hover(); await db.getByRole("button", { name: /Open Write post/ }).click(); await page.getByTestId("row-peek").waitFor(); assert.equal(await page.getByTestId("row-peek").getByLabel("Title").inputValue(), "Write post");
await page.getByTestId("row-peek").locator('[data-testid="nested-editor"] .ntn-view, [data-testid="nested-editor"] textarea').first().click(); await page.keyboard.type("Notes inside the row"); await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForSelector('[data-testid="row-peek"]', { state: "detached" });
await db.locator(".row").first().hover(); await db.getByRole("button", { name: /Open Write post/ }).click(); await page.getByTestId("row-peek").getByText("Notes inside the row").waitFor(); await page.getByRole("button", { name: "Close" }).click();
// Views: + Add view for every layout; tabs switch
for (const l of ["Board", "List", "Calendar", "Gallery", "Timeline", "Chart"]) { await page.getByRole("button", { name: "Add view" }).click(); await page.getByTestId("add-view").getByRole("menuitem", { name: l, exact: true }).click(); assert.equal(await db.getAttribute("data-view"), l.toLowerCase(), "layout " + l); }
assert.deepEqual(await db.getByRole("tab").allInnerTexts().then(a => a.map(t => t.replace(/^\S+\s/, ""))), ["Table", "Board", "List", "Calendar", "Gallery", "Timeline", "Chart"]);
await db.getByRole("tab", { name: /Calendar/ }).click(); assert.equal(await db.locator(".ntn-db__cal .day:not(.out) .ev").count(), 2, "October events on calendar: " + await db.locator(".ntn-db__cal header b").innerText()); await db.locator(".ntn-db__cal .ev").first().click(); await page.getByTestId("row-peek").waitFor(); await page.keyboard.press("Escape"); await page.waitForSelector('[data-testid="row-peek"]', { state: "detached" });
await db.getByRole("tab", { name: /Timeline/ }).click(); assert.equal(await db.locator(".ntn-db__tl .bar").count(), 3);
await db.getByRole("tab", { name: /Chart/ }).click(); assert.equal(await db.locator(".ntn-db__chart .bar").count(), 4);
await db.getByRole("tab", { name: /Gallery/ }).click(); assert.equal(await db.locator(".ntn-db__gallery .card:not(.add)").count(), 3);
// Board: configurable grouping (by Select), drag a card between columns
await db.getByRole("tab", { name: /Board/ }).click(); await page.getByRole("button", { name: "View settings" }).click(); await page.getByLabel("Group by").selectOption({ label: "Select" }); await page.keyboard.press("Escape");
assert.ok((await db.locator(".ntn-bcol header .chip").allInnerTexts()).includes("Urgent"), "grouped by Select");
await page.getByRole("button", { name: "View settings" }).click(); await page.getByLabel("Group by").selectOption({ label: "Status" }); await page.keyboard.press("Escape");
const card = db.locator(".ntn-bcard", { hasText: "Announce" }); const target = db.locator(".ntn-bcol[aria-label='In progress']"); const cb = await card.boundingBox(); const tb = await target.boundingBox();
await page.mouse.move(cb.x + 20, cb.y + 10); await page.mouse.down(); await page.mouse.move(cb.x + 30, cb.y + 20); await page.mouse.move(tb.x + 60, tb.y + 80, { steps: 10 }); await page.mouse.up();
await target.locator(".ntn-bcard", { hasText: "Announce" }).waitFor({ timeout: 3000 });
// persistence + export/markdown still works + legacy migration
await page.reload(); await page.getByTestId("database").waitFor(); assert.equal(await db.getAttribute("data-view"), "board"); assert.equal(await db.getByRole("tab").count(), 7);
await page.evaluate(() => { const k = Object.keys(localStorage).find(k => k.endsWith(":ws")); const ws = JSON.parse(localStorage.getItem(k)); const p = ws.pages[ws.pages.length - 1]; p.blocks.push({ id: "b_legacy", type: "board", text: "", db: { title: "Old", rows: [{ id: "x", name: "Legacy row", status: "Done" }] } }); localStorage.setItem(k, JSON.stringify(ws)); });
await page.reload(); await page.getByTestId("database").nth(1).waitFor(); const old = page.getByTestId("database").nth(1); assert.equal(await old.getAttribute("data-view"), "board"); assert.equal(await old.locator(".ntn-bcard", { hasText: "Legacy row" }).count(), 1, "legacy db migrated");
assert.deepEqual(errors, []); console.log("databases e2e OK"); await browser.close();
