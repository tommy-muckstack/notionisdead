// Comments + templates e2e (QA #27, #28).
import assert from "node:assert/strict"; import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(base + "/app"); await page.getByTestId("home").waitFor();
// templates: card -> gallery -> real page with sub-pages
await page.getByTestId("template-card").first().click(); await page.getByTestId("template-gallery").waitFor(); await page.getByRole("button", { name: "Use this template" }).click();
await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Life Wiki"); assert.ok(await page.locator('[data-testid="block"]').count() > 5, "template blocks created");
assert.ok(await page.locator(".ntn-subpage", { hasText: "Goals" }).count() === 1, "sub-pages created");
await page.getByRole("link", { name: "Home" }).click(); await page.getByTestId("home").waitFor(); await page.getByRole("button", { name: "Browse all" }).click(); await page.getByTestId("template-gallery").waitFor();
await page.getByRole("button", { name: "Work", exact: true }).click(); await page.getByRole("option", { name: /Project Tracker/ }).click(); await page.getByRole("button", { name: "Use this template" }).click();
await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Project Tracker"); assert.equal(await page.locator('[data-testid="database"][data-view="board"]').count(), 1, "board from template");
// comments on a block via toolbar
await page.getByTestId("new-page").click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === ""); await page.locator(".ntn-title").fill("Comments"); await page.keyboard.press("Enter"); await page.keyboard.type("A sentence to discuss"); await page.keyboard.press("Enter"); await page.keyboard.type("Second block"); await page.keyboard.press("Escape");
const v = page.locator('[data-testid="block"]').first().locator(".ntn-view"); const box = await v.boundingBox(); await page.mouse.move(box.x + 2, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + 70, box.y + 10, { steps: 5 }); await page.mouse.up();
await page.getByTestId("format-toolbar").getByRole("button", { name: "Comment" }).click(); await page.getByTestId("comment-draft").waitFor();
await page.getByTestId("comment-draft").locator("textarea").fill("Looks good @"); await page.getByTestId("mention-menu").waitFor(); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
await page.locator('[data-testid="thread"]').first().waitFor(); assert.equal(await page.locator(".ntn-chip.is-person").count(), 1, "mention chip in comment");
await page.locator(".ntn-cbadge").first().waitFor(); assert.match(await page.locator(".ntn-cbadge").first().innerText(), /1/);
assert.match(await page.locator(".ntn-cbtn").innerText(), /1/, "top bar count");
// block menu -> Comment, then ⌘⇧M
await page.locator('[data-testid="block"]').nth(1).hover(); await page.locator('[data-testid="block"]').nth(1).getByRole("button", { name: "Block menu" }).click(); await page.getByRole("menuitem", { name: /Comment/ }).click(); await page.getByTestId("comment-draft").waitFor(); await page.getByTestId("comment-draft").locator("textarea").fill("From the block menu"); await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelectorAll('[data-testid="thread"]').length === 2);
await page.locator('[data-testid="block"]').nth(1).locator(".ntn-view").click(); await page.keyboard.press("Meta+Shift+m"); await page.getByTestId("comment-draft").waitFor(); await page.keyboard.press("Escape"); await page.waitForSelector('[data-testid="comment-draft"]', { state: "detached" });
// reply, resolve -> Resolved tab, reopen
await page.locator('[data-testid="thread"]').first().getByRole("button", { name: "Reply" }).click(); await page.locator('[data-testid="thread"]').first().locator("textarea").fill("Agreed"); await page.keyboard.press("Enter"); await page.locator('[data-testid="thread"]').first().getByText("Agreed").waitFor();
await page.locator('[data-testid="thread"]').first().getByRole("button", { name: "Resolve thread" }).click(); await page.waitForFunction(() => document.querySelectorAll('[data-testid="thread"]').length === 1);
await page.getByRole("button", { name: "Resolved" }).click(); await page.locator('[data-testid="thread"][data-resolved="true"]').waitFor(); await page.getByRole("button", { name: "Reopen thread" }).click(); await page.getByRole("button", { name: "Open", exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll('[data-testid="thread"]').length === 2);
// page-level comment from the hover row
await page.locator(".ntn-page").hover(); await page.getByRole("button", { name: "Add comment" }).click(); await page.getByTestId("page-comments").locator("textarea").fill("Page-level note"); await page.keyboard.press("Enter"); await page.getByTestId("page-comments").getByText("Page-level note").waitFor();
// persistence + close pane
await page.reload(); await page.getByTestId("page").waitFor(); await page.getByTestId("page-comments").getByText("Page-level note").waitFor(); assert.equal(await page.locator(".ntn-cbadge").count(), 2, "badges persist");
await page.getByRole("button", { name: "Comments", exact: true }).click(); await page.getByTestId("comments-pane").waitFor(); await page.getByRole("button", { name: "Close comments" }).click(); await page.waitForSelector('[data-testid="comments-pane"]', { state: "detached" });
assert.deepEqual(errors, []); console.log("comments e2e OK"); await browser.close();
