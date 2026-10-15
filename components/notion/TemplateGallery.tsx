"use client";
import { useRef, useState } from "react";
import { useDismiss } from "@/lib/useDismiss";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/lib/notion/templates";

/** Template gallery: pick a category, preview the structure, "Use this template" creates a real page. */
export function TemplateGallery({ onUse, onClose, initial }: { onUse: (t: Template) => void; onClose: () => void; initial?: string }) {
  const box = useRef<HTMLDivElement>(null); useDismiss(box, onClose);
  const [cat, setCat] = useState<Template["category"] | "All">("All"); const [sel, setSel] = useState<Template>(TEMPLATES.find(t => t.id === initial) ?? TEMPLATES[0]);
  const list = TEMPLATES.filter(t => cat === "All" || t.category === cat);
  return <div className="ntn-overlay ns-ov"><div ref={box} className="ntn-tpl" role="dialog" aria-label="Templates" data-testid="template-gallery">
    <nav><h6>Templates</h6>{(["All", ...TEMPLATE_CATEGORIES] as const).map(c => <button key={c} type="button" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}
      <p className="ids-muted">Every template is original NotionIsDead content and creates a real, editable page in your workspace.</p></nav>
    <div className="list" role="listbox" aria-label="Template list">{list.map(t => <button key={t.id} type="button" role="option" aria-selected={sel.id === t.id} className={"ntn-tpl__card" + (sel.id === t.id ? " on" : "")} onClick={() => setSel(t)}><span className="ic">{t.icon}</span><b>{t.title}</b><small>{t.blurb}</small></button>)}</div>
    <section className="prev"><button type="button" className="x" aria-label="Close" onClick={onClose}>✕</button>
      <div className="hd"><span className="ic">{sel.icon}</span><div><h2>{sel.title}</h2><small>{sel.category} · {sel.blurb}</small></div><button type="button" className="use" onClick={() => onUse(sel)}>Use this template</button></div>
      <pre className="md" aria-label="Template preview">{sel.md.replace(/<!--.*?-->\n?/g, "").replace(/<\/?details( open)?>\n?/g, "").replace(/<\/?summary>/g, "▸ ").replace(/@\[TODAY\]/g, "@Today").replace(/@\[ME\]/g, "@You")}</pre>
      {sel.children && <p className="ids-muted">Also creates sub-pages: {sel.children.map(c => `${c.icon} ${c.title}`).join(", ")}</p>}
    </section>
  </div></div>;
}
