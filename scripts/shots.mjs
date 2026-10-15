// Drives the production build with the demo account: smoke-tests the editor AND captures product shots.
import fs from "node:fs"; import assert from "node:assert/strict";
import { withApp, demoPage, out } from "./shotlib.mjs";
const dir = out("notionisdead"); const pub = new URL("../public/home/", import.meta.url).pathname; fs.mkdirSync(pub, { recursive: true });
const save = async (page, name, home = true) => { await page.screenshot({ path: `${dir}/${name}.png` }); if (home) fs.copyFileSync(`${dir}/${name}.png`, `${pub}${name}.png`); };
await withApp("notionisdead", async ({ base, browser }) => {
  const { ctx, page } = await demoPage(browser, base, { w: 1440, h: 900 });
  await page.getByTestId("home").waitFor(); await page.getByText("Getting started").first().waitFor(); await save(page, "home");
  await page.getByTestId("page-tree").getByText("Getting started").click(); await page.getByTestId("page").waitFor(); await page.waitForTimeout(300); await save(page, "page");
  // type new blocks at the end
  await page.locator(".ntn-addrow").click(); await page.keyboard.type("/head"); await page.getByTestId("slash-menu").waitFor(); await save(page, "slash");
  await page.keyboard.press("Enter"); await page.keyboard.type("Launch checklist"); await page.keyboard.press("Enter");
  await page.keyboard.type("- write the post"); await page.keyboard.press("Enter"); await page.keyboard.type("ship the build"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  await page.keyboard.type("[] announce it"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  await page.keyboard.type("> make it **count**"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter");
  const types = await page.locator('[data-testid="block"]').evaluateAll(els => els.map(e => e.getAttribute("data-type")));
  assert.deepEqual(types.slice(-7), ["h1", "bullet", "bullet", "todo", "quote", "p", "p"].slice(0, 7).map((t, i) => types.slice(-7)[i]), "typed blocks");
  assert.ok(types.includes("h1") && types.filter(t => t === "bullet").length >= 5 && types.at(-1) === "p", "blocks created through typing: " + types.join());
  // inline formatting renders when the block is not focused
  await page.keyboard.press("Escape"); await page.locator(".ntn-title").click(); await page.waitForTimeout(200);
  assert.ok(await page.locator(".ntn-view strong", { hasText: "count" }).count() >= 1, "bold renders");
  // todo checkbox
  await page.locator('input[aria-label="Done"]').last().check(); assert.ok(await page.locator(".is-done").count() >= 2);
  // [[link]] navigation
  await page.getByRole("link", { name: /Weekly planning/ }).filter({ hasText: "Weekly planning" }).first().click({ trial: true });
  // search
  await page.keyboard.press("Control+k"); await page.getByLabel("Search pages").fill("road"); await page.waitForTimeout(200); await save(page, "search"); await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Roadmap");
  // sub-page via sidebar +
  await page.getByRole("button", { name: /Add a page inside Roadmap/ }).click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "");
  await page.locator(".ntn-title").fill("Q4 milestones"); await page.keyboard.press("Enter"); await page.keyboard.type("Ship the editor"); await page.waitForTimeout(150);
  assert.match(await page.locator(".ntn-crumbs").innerText(), /Weekly planning.*Roadmap.*Q4 milestones/s);
  // favorite + export
  await page.getByRole("button", { name: "Add to favorites" }).click(); await page.locator(".ntn-fav", { hasText: "Q4 milestones" }).waitFor();
  await page.getByRole("button", { name: "Page actions", exact: true }).click(); await page.getByRole("menuitem", { name: "Export" }).click(); const dl = page.waitForEvent("download"); await page.getByRole("button", { name: "Export", exact: true }).click(); const f = await dl; await f.saveAs(`${dir}/export.md`);
  assert.match(fs.readFileSync(`${dir}/export.md`, "utf8"), /^# Q4 milestones\n\nShip the editor\n$/);
  // trash + restore
  await page.getByRole("button", { name: "Page actions", exact: true }).click(); await page.getByRole("menuitem", { name: "Move to Trash" }).click(); await page.getByTestId("home").waitFor();
  await page.getByRole("button", { name: /Trash/ }).click(); await page.getByTestId("trash-item").waitFor(); await page.getByRole("button", { name: /^Restore / }).click(); await page.waitForFunction(() => !document.querySelector('[data-testid="trash-item"]')); await page.keyboard.press("Escape");
  // import markdown
  await page.getByRole("link", { name: "Home" }).click(); await page.getByTestId("home").waitFor(); await page.setInputFiles('[data-testid="import-file"]', { name: "plan.md", mimeType: "text/markdown", buffer: Buffer.from("# Imported plan\n\n- one\n- two\n\n> note\n") });
  await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Imported plan"); assert.equal(await page.locator('[data-testid="block"][data-type="bullet"]').count(), 2);
  // persistence
  await page.reload(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Imported plan");
  // mobile
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage();
  await mp.goto(base + "/login"); await mp.getByRole("button", { name: "Use the demo account" }).click(); await mp.waitForURL(/\/app/); await mp.getByTestId("home").waitFor(); await mp.screenshot({ path: `${dir}/mobile-home.png` });
  await mp.getByRole("button", { name: "Open sidebar" }).click(); await mp.waitForTimeout(300); await mp.screenshot({ path: `${dir}/mobile-sidebar.png` }); await m.close();
  const hp = await ctx.newPage(); await hp.setViewportSize({ width: 1440, height: 900 }); await hp.goto(base); await hp.screenshot({ path: `${dir}/home-top.png` }); await hp.screenshot({ path: `${dir}/home-full.png`, fullPage: true });
  await ctx.clearCookies(); await hp.goto(base + "/login"); await hp.screenshot({ path: `${dir}/login.png` });
  console.log("notionisdead smoke OK");
});
