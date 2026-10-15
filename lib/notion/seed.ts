import { markdownToBlocks } from "./blocks";
import { createPage, emptyWorkspace, updatePage, type Workspace } from "./pages";
import { createFromTemplate, TEMPLATES } from "./templates";
const GETTING_STARTED = `Welcome! This page is a real document: click any line and type.

## Try these
- Type \`/\` on an empty line to pick a block type
- Start a line with \`# \`, \`- \`, \`1. \`, \`[] \` or \`> \` to turn it into a heading, list, to-do or quote
- Select text? Wrap it in **double stars** for bold, *single stars* for italic, \`backticks\` for code
- Link to another page with [[Weekly planning]]
- Move a block with ⌘⇧↑ / ⌘⇧↓, and search everything with ⌘K

## Your first to-dos
- [x] Open the demo
- [ ] Add a page from the sidebar
- [ ] Export this page as Markdown

> 💡 Everything is stored as plain Markdown, so you can take it with you.
`;
const PLANNING = `## This week
- [ ] Draft the launch post
- [ ] Review pricing page copy
- [x] Book the design review

## Notes
Back to [[Getting started]]. The roadmap lives in [[Roadmap]].
`;
const ROADMAP = `# Roadmap

1. Ship the editor
2. Add page sharing
3. Write the docs

\`\`\`ts
const status = "in progress";
\`\`\`

---

Questions? Add them under **Notes** in [[Weekly planning]].
`;
export function seedWorkspace(now = new Date()): Workspace {
  let ws = emptyWorkspace();
  const a = createPage(ws, { title: "Getting started", icon: "👋", blocks: markdownToBlocks(GETTING_STARTED) }, now); ws = a.ws;
  const b = createPage(ws, { title: "Weekly planning", icon: "🗓️", blocks: markdownToBlocks(PLANNING) }, now); ws = b.ws;
  const c = createPage(ws, { title: "Roadmap", icon: "🧭", parentId: b.page.id, blocks: markdownToBlocks(ROADMAP) }, now); ws = c.ws;
  ws = updatePage(ws, a.page.id, { favorite: true }, now);
  return { ...ws, recent: [a.page.id] };
}

const WELCOME = `👋 This is your workspace. Everything here is a real page you can edit, move or delete.

## What is a block?
Every line on a page is a block: a paragraph, a heading, a list item, an image, a database. Hover a block to see its ⋮⋮ handle; drag it to move it, or click it for options.

## Create your first page
Click **＋ Add new** in the sidebar, give the page a title and press Enter. Your cursor lands in the body.

## Create a subpage
Type \`/page\` inside any page, or hover a page in the sidebar and press its ＋.

## Customize & style your content
- Type \`/\` for headings, lists, to-dos, toggles, callouts, images, databases and more
- Select text to format it, add a link or change its colour
- Type \`@\` to mention a person, a page or a date
- Hover above the title to add an icon, a cover or a comment

## Keep your data
Open the ••• menu to export any page as Markdown, HTML or PDF, publish it to the web, or look at its history. Your pages live in this browser; export or publish to take them anywhere.

> 💡 Press ⌘K (or Ctrl+K / Ctrl+P) to search everything.
`;
/** A brand-new (non-demo) workspace: a welcome page and a to-do list, like Notion's "Welcome to Notion" + "To Do List". */
export function starterWorkspace(me = "You", now = new Date()): Workspace {
  let ws = emptyWorkspace();
  const a = createPage(ws, { title: "Welcome to NotionIsDead", icon: "👋", blocks: markdownToBlocks(WELCOME) }, now); ws = a.ws;
  const todo = TEMPLATES.find(t => t.id === "todo")!; ws = createFromTemplate(ws, todo, me, null, now).ws;
  return { ...ws, recent: [a.page.id], visits: { [a.page.id]: now.toISOString() } };
}
