"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";

export const GH = "https://github.com/tommy-muckstack/notionisdead";
type Item = { label: string; href: string; d?: string; ext?: boolean };
const MENUS: Record<"Product" | "Resources", Item[]> = {
  Product: [
    { label: "Editor", href: "/#editor", d: "Blocks, slash menu, formatting toolbar, mentions" }, { label: "Databases", href: "/#databases", d: "Properties, filters, sorts and seven layouts" },
    { label: "Templates", href: "/app", d: "Start from an original template" }, { label: "Publish to the web", href: "/#publish", d: "Read-only public pages" }, { label: "Import & export", href: "/#export", d: "Markdown, HTML, PDF, CSV" }, { label: "Pricing", href: "/pricing", d: "Free, forever" },
  ],
  Resources: [
    { label: "Help center", href: "/help", d: "Guides, shortcuts and FAQ" }, { label: "Keyboard shortcuts", href: "/help#shortcuts" }, { label: "Security & data", href: "/security", d: "Where your pages live" },
    { label: "Source code", href: GH, ext: true, d: "Apache-2.0 on GitHub" }, { label: "What's new", href: GH + "/commits/main", ext: true }, { label: "More IsDead apps", href: "https://yourappisdead.com", ext: true },
  ],
};
/** Product / Resources mega-menus in the marketing nav: every item is a real destination. */
export function NtNavMenus() {
  const [open, setOpen] = useState<null | keyof typeof MENUS>(null); const ref = useRef<HTMLDivElement>(null); useDismiss(ref, () => setOpen(null), !!open);
  return <div ref={ref} className="nt-menus">{(Object.keys(MENUS) as (keyof typeof MENUS)[]).map(k => <span key={k} className="nt-mwrap">
    <button type="button" aria-haspopup="menu" aria-expanded={open === k} onClick={() => setOpen(o => (o === k ? null : k))}>{k} <i>⌄</i></button>
    {open === k && <div className="nt-mega" role="menu" aria-label={k}>{MENUS[k].map(i => i.ext ? <a key={i.label} role="menuitem" href={i.href} target="_blank" rel="noreferrer noopener"><b>{i.label} ↗</b>{i.d && <small>{i.d}</small>}</a> : <Link key={i.label} role="menuitem" href={i.href} onClick={() => setOpen(null)}><b>{i.label}</b>{i.d && <small>{i.d}</small>}</Link>)}</div>}
  </span>)}</div>;
}
