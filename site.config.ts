import type { Site } from "@/lib/site-types";
const GH = "https://github.com/tommy-muckstack/notionisdead";
export const site: Site = {
  slug: "notionisdead", name: "NotionIsDead", replaces: "Notion", theme: "notion",
  glyph: "M7 6 H17 M7 10 H17 M7 14 H13 M7 18 H15",
  nav: [{ label: "Product", id: "product" }, { label: "Use cases", id: "solutions" }, { label: "Resources", id: "resources" }, { label: "Pricing", id: "pricing" }],
  cta: "Get started free",
  hero: { variant: "center", eyebrow: "Free · Open source · Plain Markdown underneath", title: ["One workspace for", "every page you write."], subtitle: "Notes, docs, wikis and project pages in one tidy tree. Type a slash for any block, link pages together, and export everything as Markdown whenever you like.",
    primary: { label: "Open the demo", href: "/login" }, secondary: { label: "See pricing", href: "/#pricing" }, shot: "page.png", shotAlt: "A NotionIsDead page with a title, headings, a to-do list and a callout, with the page tree in the sidebar" },
  audience: "For writers, students, founders and small teams who want their notes in one calm place and their data in plain text",
  stepsTitle: "Start with a blank page, end with a wiki",
  steps: [{ t: "Write", d: "Click and type. Start a line with #, -, 1., [] or > and it becomes a heading, list, to-do or quote." }, { t: "Insert", d: "Type / for headings, lists, to-dos, quotes, callouts, code and dividers. Arrow keys and Enter, no mouse." }, { t: "Connect", d: "Nest pages inside pages, link them with [[double brackets]], and see what links back." }, { t: "Take it with you", d: "Export any page as clean Markdown, or import a .md file as a new page." }],
  rows: [
    { id: "product", k: "Editor", h: "A block editor that stays out of your way", p: "Every paragraph, heading, list item and to-do is its own block. Move blocks with ⌘⇧↑ and ⌘⇧↓, wrap text in stars for bold and italic, and paste Markdown to get real blocks.", img: "page.png", alt: "The block editor with a heading, bullets and to-dos", cta: "Open the editor" },
    { id: "slash", k: "Slash menu", h: "Type / and pick a block", p: "Filter as you type: head, check, quote, code. Press Enter and the line turns into the block you chose.", img: "slash.png", alt: "The slash menu open on an empty line showing block types", cta: "Try the slash menu" },
    { id: "solutions", k: "Pages", h: "A tree of pages, as deep as you need", p: "Create sub-pages, favorite the ones you use daily, move pages around, and search titles and text from one box with ⌘K. Deleted pages sit in the Trash until you empty it.", img: "search.png", alt: "The search dialog listing matching pages with snippets", cta: "Browse pages" },
    { id: "resources", k: "Home", h: "Pick up where you left off", p: "Your home screen shows what you opened recently, with the first lines of each page.", img: "home.png", alt: "The home screen with recently visited page cards", cta: "See the home screen" },
  ],
  statsTitle: "Real numbers, no fine print",
  stats: [{ b: "$0", s: "per person, per month, forever" }, { b: "0 limits", s: "pages, blocks and exports are unlimited" }, { b: "11 blocks", s: "text, headings, lists, to-dos, quote, callout, code, divider" }, { b: "Apache-2.0", s: "fork it, change it, ship it" }],
  integrations: { title: "Plain Markdown in, plain Markdown out", text: "Export a page and you get a .md file any editor, repo or static site can read. No lock-in and nothing to migrate." },
  pricing: { title: "What you'd pay for a workspace elsewhere", vendor: "Notion", asOf: "October 2026", plans: [{ name: "Plus", perSeatMonth: 10, note: "billed monthly, per member" }, { name: "Business", perSeatMonth: 20, note: "billed monthly, per member" }], seats: 6,
    footnote: "Notion's free plan limits blocks for teams and file uploads; paid plans lift the limits. We don't ship databases, sharing or AI yet, so compare features, not just price.", featuresTitle: "Every feature, no plan gates",
    features: [{ name: "Unlimited pages and blocks", plan: "Plus" }, { name: "Nested pages and favorites", plan: "Free" }, { name: "Page links and backlinks", plan: "Free" }, { name: "Trash with restore", plan: "Free (30 days)" }, { name: "Markdown export and import", plan: "Free" }, { name: "Search across every page", plan: "Free" }] },
  finalCta: { title: "Write it down. Keep it forever.", sub: "Open the demo and press the slash key." },
  footer: [
    { title: "Product", links: [{ label: "Editor", href: "/#product" }, { label: "Slash menu", href: "/#slash" }, { label: "Pages", href: "/#solutions" }, { label: "Pricing", href: "/#pricing" }] },
    { title: "Get started", links: [{ label: "Log in", href: "/login" }, { label: "Try the demo account", href: "/login" }, { label: "Price comparison", href: "/#pricing" }] },
    { title: "Open source", links: [{ label: "GitHub", href: GH }, { label: "Apache-2.0 license", href: GH + "/blob/main/LICENSE" }] },
    { title: "More IsDead apps", links: [{ label: "LinearIsDead", href: "/linearisdead" }, { label: "AirtableIsDead", href: "/airtableisdead" }, { label: "OtterIsDead", href: "/otterisdead" }, { label: "CalendlyIsDead", href: "/calendlyisdead" }] },
  ],
  trademark: "NotionIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by Notion Labs, Inc. Notion is a trademark of its owner.",
  repo: GH,
};
