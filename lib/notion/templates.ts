// Template gallery: original content written for NotionIsDead (structure, prompts and empty rows; nothing copied from Notion's gallery).
import { markdownToBlocks } from "./blocks";
import { createPage, type Workspace, type Page } from "./pages";
export type Template = { id: string; title: string; icon: string; category: "Personal" | "Work" | "School"; blurb: string; md: string; children?: { title: string; icon: string; md: string }[] };
export const TEMPLATES: Template[] = [
  { id: "life-wiki", title: "Life Wiki", icon: "🧭", category: "Personal", blurb: "One home page that links to everything you keep track of.", md: `A single place for the pages you come back to. Replace the links below with your own.

## Areas
- 📄 [[Goals]]
- 📄 [[Habits]]
- 📄 [[Reading list]]

## This week
- [ ] Review goals
- [ ] Plan the week
- [ ] Clear the inbox

> 💡 Type / on any line to add a block, or @ to mention a page or date.
`, children: [{ title: "Goals", icon: "🎯", md: "## This year\n\n- [ ] \n\n## This quarter\n\n- [ ] \n" }, { title: "Habits", icon: "🔁", md: "| Name | Status |\n| --- | --- |\n| Morning walk | Not started |\n| Read 20 pages | Not started |\n" }, { title: "Reading list", icon: "📚", md: "| Name | Status |\n| --- | --- |\n|  | Not started |\n" }] },
  { id: "journal", title: "Journal", icon: "📓", category: "Personal", blurb: "A dated entry a day with three prompts.", md: `<details open>
<summary>How to use</summary>

Add a new toggle per day (type > then a space). Fill the three prompts, then collapse it.

</details>

<details open>
<summary>@[TODAY]</summary>

**What happened**

**What I'm grateful for**

**What I'll do differently**

</details>
` },
  { id: "todo", title: "To-do List", icon: "✅", category: "Personal", blurb: "Today, this week, later. Check things off as you go.", md: `## Today
- [ ] 

## This week
- [ ] 

## Later
- [ ] 

---

Done items can stay checked; drag the ⋮⋮ handle to reorder.
` },
  { id: "budget", title: "Simple Budget", icon: "💵", category: "Personal", blurb: "Income, fixed costs and savings as a table you can edit.", md: `## Monthly plan

Track each line as a row. Mark a line **Done** once it is paid for the month.

**Fixed costs**

| Name | Status |
| --- | --- |
| Rent or mortgage | Not started |
| Utilities | Not started |
| Phone and internet | Not started |

**Savings goals**

| Name | Status |
| --- | --- |
| Emergency fund | In progress |
` },
  { id: "meeting-notes", title: "Meeting Notes", icon: "🗓️", category: "Work", blurb: "Agenda, notes and action items with owners.", md: `**Date:** @[TODAY]
**Attendees:** @[ME]

## Agenda
1. 
2. 

## Notes


## Action items
- [ ] 
` },
  { id: "project-tracker", title: "Project Tracker", icon: "🚀", category: "Work", blurb: "A board of tasks grouped by status.", md: `## Tasks

| Name | Status |
| --- | --- |
| Define scope | In progress |
| Draft plan | Not started |
| Review | Not started |
<!-- board -->

## Decisions
- 
` },
  { id: "docs", title: "Team Docs", icon: "📘", category: "Work", blurb: "A wiki home with a table of contents and sections.", md: `<!-- toc -->

# Getting started
How we work, where things live, who to ask.

# Processes
<details>
<summary>How we ship</summary>

1. Write it down
2. Review
3. Ship

</details>

# Links
- 
` },
  { id: "class-notes", title: "Class Notes", icon: "🎓", category: "School", blurb: "Lecture notes with a summary and questions to revisit.", md: `**Course:** 
**Date:** @[TODAY]

## Key points
- 

## Summary


## Questions to ask
- [ ] 
` },
  { id: "reading-notes", title: "Reading Notes", icon: "📖", category: "School", blurb: "Quotes, ideas and your own take, chapter by chapter.", md: `## Chapter 1
> 

**My take**

## Chapter 2
> 

**My take**
` },
];
export const TEMPLATE_CATEGORIES: Template["category"][] = ["Personal", "Work", "School"];
const fill = (md: string, me: string, now: Date) => md.replace(/@\[TODAY\]/g, `@[${now.toISOString().slice(0, 10)}]`).replace(/@\[ME\]/g, `@[${me}]`);
/** Create a real page (plus sub-pages) from a template. */
export function createFromTemplate(ws: Workspace, t: Template, me: string, parentId: string | null = null, now = new Date()): { ws: Workspace; page: Page } {
  const r = createPage(ws, { title: t.title, icon: t.icon, parentId, blocks: markdownToBlocks(fill(t.md, me, now)) }, now); let cur = r.ws;
  for (const c of t.children ?? []) cur = createPage(cur, { title: c.title, icon: c.icon, parentId: r.page.id, blocks: markdownToBlocks(fill(c.md, me, now)) }, now).ws;
  return { ws: cur, page: r.page };
}
