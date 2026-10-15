import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDoc } from "@/lib/store";
import { blocksToHtml, coverCss, EXPORT_CSS, esc } from "@/lib/notion/export";
import type { PublishedDoc } from "@/app/api/publish/route";
import { BP } from "@/lib/basepath";
export const dynamic = "force-dynamic";
const load = async (id: string) => (/^pg_[a-z0-9]{6,40}$/.test(id) ? getDoc<PublishedDoc>("published", id) : null);
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const d = await load(id);
  return { title: d ? `${d.page.title || "Untitled"} · NotionIsDead` : "Page not found", robots: d?.indexable ? undefined : { index: false, follow: false } };
}
/** Public, read-only view of a published page (Share → Publish). Same renderer as HTML export. */
export default async function PublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const d = await load(id); if (!d) notFound();
  const p = d.page; const cls = ["page", p.font === "serif" ? "serif" : p.font === "mono" ? "mono" : "", p.smallText ? "small" : "", p.fullWidth ? "wide" : ""].filter(Boolean).join(" ");
  return <>
    <style dangerouslySetInnerHTML={{ __html: EXPORT_CSS + ".pub-bar{position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:8px 16px;background:#fff;border-bottom:1px solid #e9e8e6;font-size:13px;color:#787774}.pub-bar a{color:#37352f;text-decoration:none;font-weight:500}.pub-bar .dup{margin-left:auto;border:1px solid #e3e2e0;border-radius:6px;padding:4px 10px}" }} />
    <div className="pub-bar"><a href={`${BP}/`}>NotionIsDead</a><span>Published page</span>{d.duplicable && <a className="dup" href={`${BP}/app?dup=${p.id}`}>Duplicate into your workspace</a>}</div>
    {p.cover && <div className="cover" style={{ background: coverCss(p.cover), ["--y" as string]: `${p.coverY ?? 50}%` }} />}
    <main className={cls}>
      {p.icon && p.icon !== "📄" && <div className="icon">{p.icon}</div>}
      <h1 className="title">{p.title || "Untitled"}</h1>
      <div dangerouslySetInnerHTML={{ __html: blocksToHtml(p.blocks, { media: true, headingIds: true }) }} />
      <p className="foot">Built with <a href={`${BP}/`}>NotionIsDead</a>, an independent open-source project not affiliated with Notion Labs, Inc. Last updated {esc(new Date(d.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}.</p>
    </main>
  </>;
}
