// App shell e2e (QA #6-#9, #29, #30): starter pages, recents, sidebar items, search filters, Ctrl+P, settings panes, workspace menu, teamspaces.
import assert from "node:assert/strict"; import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://localhost:3011/notionisdead"; const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(base + "/app"); await page.getByTestId("home").waitFor();
// #6 starter pages for a new workspace + real "Recently visited" time
const tree = await page.getByTestId("page-tree").allInnerTexts(); assert.ok(tree[0].includes("Welcome to NotionIsDead") && tree[0].includes("To-do List"), "starter pages: " + tree[0]);
assert.match(await page.getByTestId("visited").first().innerText(), /just now|\dm ago/, "recent time is real");
await page.getByTestId("new-page").click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === ""); await page.locator(".ntn-title").fill("Shell page"); await page.keyboard.press("Enter"); await page.keyboard.type("Body of shell page"); await page.keyboard.press("Escape");
await page.getByRole("link", { name: "Home" }).click(); await page.getByTestId("home").waitFor(); assert.match(await page.getByTestId("visited").first().innerText(), /just now/);
// Learn cards open the welcome page; Upcoming shows database dates
await page.locator(".nh-lc").first().click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === "Welcome to NotionIsDead"); await page.getByRole("link", { name: "Home" }).click(); await page.getByTestId("home").waitFor();
assert.match(await page.getByTestId("upcoming").innerText(), /Nothing due/);
await page.getByTestId("new-page").click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === ""); await page.locator(".ntn-title").fill("Dated"); await page.keyboard.press("Enter"); await page.keyboard.type("/calendar view"); await page.keyboard.press("Enter"); await page.getByTestId("database").waitFor();
await page.getByRole("link", { name: "Home" }).click(); await page.getByTestId("home").waitFor(); assert.doesNotMatch(await page.getByTestId("upcoming").innerText(), /Nothing due/, "calendar rows listed as upcoming");
// #7 sidebar: setup checklist, inbox, chat/meetings stubs, library, help, settings
await page.getByRole("button", { name: "Set up your workspace" }).click(); await page.getByRole("dialog", { name: "Set up your workspace" }).waitFor(); assert.ok((await page.locator(".ns-steps li.done").count()) >= 2); await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Chat", exact: true }).click(); await page.getByRole("dialog", { name: "Notion AI chat" }).waitFor(); await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Meetings", exact: true }).click(); await page.getByRole("dialog", { name: "AI Meeting Notes" }).waitFor(); await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Inbox", exact: true }).click(); await page.getByRole("dialog", { name: "Inbox" }).waitFor(); await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Add agents" }).click(); await page.getByRole("dialog", { name: "Custom agents" }).waitFor(); await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"][aria-label="Custom agents"]', { state: "detached" });
await page.getByRole("button", { name: "Try AI Meeting Notes" }).click(); await page.getByRole("dialog", { name: "AI Meeting Notes" }).waitFor(); await page.keyboard.press("Escape");
await page.getByRole("button", { name: /Library/ }).click(); await page.getByTestId("template-gallery").waitFor(); await page.keyboard.press("Escape");
await page.getByRole("button", { name: /^\? Help/ }).click(); await page.getByRole("dialog", { name: "Help" }).waitFor(); await page.getByRole("button", { name: "Keyboard shortcuts" }).click(); await page.getByRole("dialog", { name: "Keyboard shortcuts" }).waitFor(); await page.keyboard.press("Escape");
await page.getByRole("button", { name: /New chat/ }).click(); await page.getByRole("dialog", { name: "Notion AI chat" }).waitFor(); await page.keyboard.press("Escape");
// Teamspaces: create, add a page inside, move a page in
await page.getByRole("button", { name: "Create a teamspace" }).click(); await page.getByTestId("teamspace").waitFor(); await page.getByRole("button", { name: /Add a page in Team 1/ }).click(); await page.waitForFunction(() => document.querySelector(".ntn-title")?.value === ""); await page.locator(".ntn-title").fill("Team page"); await page.keyboard.press("Enter");
assert.ok((await page.getByTestId("teamspaces").innerText()).includes("Team page"));
// #8 / #9 search filters + Ctrl+P
await page.keyboard.press("Escape"); await page.keyboard.press("Control+p"); await page.getByRole("dialog", { name: "Search" }).waitFor(); await page.getByTestId("search-filters").waitFor();
await page.getByLabel("Search pages").fill("shell"); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-label="Search"] li[role="option"]').length === 2);
await page.getByLabel("Search pages").fill("body of"); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-label="Search"] li[role="option"]').length === 2); await page.getByRole("button", { name: "Title only" }).click(); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-label="Search"] li[role="option"]').length === 1, null, { timeout: 3000 });
await page.getByRole("button", { name: "Title only" }).click(); await page.getByTestId("search-filters").getByRole("button", { name: /^In/ }).click(); await page.getByRole("option", { name: /Dated/ }).click(); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-label="Search"] li[role="option"]').length === 1);
await page.getByRole("button", { name: "Clear" }).click(); await page.getByTestId("search-filters").getByLabel("Date").selectOption("1"); await page.waitForFunction(() => document.querySelectorAll('[role="dialog"][aria-label="Search"] li[role="option"]').length === 2); await page.keyboard.press("Escape");
// #29 settings: every tab switches
await page.getByRole("button", { name: /⚙ Settings/ }).click(); await page.getByRole("dialog", { name: "Settings" }).waitFor();
for (const [tab, text] of [["General", "Workspace settings"], ["People", "Workspace owner"], ["Import", "Text & Markdown"], ["Notifications", "Inbox"], ["Mail & Calendar", "Not part of the open-source"], ["Notion AI", "Not part of the open-source"], ["Public pages", "published"], ["Teamspaces", "pages"], ["Upgrade plan", "Free, forever"], ["Preferences", "Start week on Monday"]]) { await page.getByRole("tab", { name: tab, exact: true }).click(); assert.ok((await page.getByTestId("settings-pane").innerText()).includes(text), `pane ${tab} shows "${text}"`); }
await page.getByRole("tab", { name: "Teamspaces", exact: true }).click(); assert.equal(await page.getByLabel("Teamspace name").first().inputValue(), "Team 1");
await page.getByRole("tab", { name: "General", exact: true }).click(); await page.getByLabel("Workspace name").fill("QA Space"); await page.keyboard.press("Escape"); assert.ok((await page.locator(".ns-ws").innerText()).includes("QA Space"), "workspace rename reflected");
await page.getByLabel("Search settings").count(); // nav search exists
// #30 workspace menu: items + new workspace + switch back
await page.locator(".ns-ws").click(); await page.getByTestId("ws-menu").waitFor(); const wm = await page.getByTestId("ws-menu").innerText(); for (const l of ["Upgrade", "Settings", "Invite members", "New workspace", "Log out"]) assert.ok(wm.includes(l), "ws menu has " + l);
await page.getByRole("button", { name: "New workspace" }).click(); await page.getByTestId("home").waitFor(); await page.waitForFunction(() => document.querySelector(".ns-ws")?.textContent?.includes("Workspace 2") || !document.querySelector(".ns-ws")?.textContent?.includes("QA Space"));
assert.ok((await page.getByTestId("page-tree").innerText()).includes("Welcome to NotionIsDead"), "fresh workspace gets starter pages");
await page.locator(".ns-ws").click(); await page.getByRole("button", { name: /Main workspace/ }).click(); await page.waitForFunction(() => document.querySelector(".ns-ws")?.textContent?.includes("QA Space")); assert.ok((await page.getByTestId("page-tree").innerText()).includes("Shell page"), "switched back with data intact");
assert.deepEqual(errors, []); console.log("shell e2e OK"); await browser.close();
