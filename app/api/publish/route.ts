import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getDoc, putDoc, delDoc } from "@/lib/store";
import type { Page } from "@/lib/notion/pages";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
/** Public copy of a page. Keyed by the page id; only the owner (session or guest id) can update or unpublish. */
export type PublishedDoc = { ownerId: string; page: Pick<Page, "id" | "title" | "icon" | "blocks" | "cover" | "coverY" | "font" | "smallText" | "fullWidth">; indexable: boolean; duplicable: boolean; publishedAt: string; updatedAt: string };
const COL = "published"; const MAX = 900_000;
const ok = (id: unknown): id is string => typeof id === "string" && /^pg_[a-z0-9]{6,40}$/.test(id);
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id"); if (!ok(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const d = await getDoc<PublishedDoc>(COL, id); if (!d) return NextResponse.json({ error: "not published" }, { status: 404 });
  const u = await currentUser(); const { ownerId, ...pub } = d; return NextResponse.json({ ...pub, mine: u?.id === ownerId });
}
export async function POST(req: NextRequest) {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const body = await req.json().catch(() => null) as Partial<PublishedDoc> | null; const page = body?.page;
  if (!page || !ok(page.id) || !Array.isArray(page.blocks)) return NextResponse.json({ error: "page required" }, { status: 400 });
  if (JSON.stringify(page).length > MAX) return NextResponse.json({ error: "Page is too large to publish (uploaded files count). Embed media by link instead." }, { status: 413 });
  const prev = await getDoc<PublishedDoc>(COL, page.id); if (prev && prev.ownerId !== u.id) return NextResponse.json({ error: "not yours" }, { status: 403 });
  const now = new Date().toISOString();
  const doc: PublishedDoc = { ownerId: u.id, page: { id: page.id, title: String(page.title ?? ""), icon: String(page.icon ?? "📄"), blocks: page.blocks, cover: page.cover, coverY: page.coverY, font: page.font, smallText: page.smallText, fullWidth: page.fullWidth }, indexable: !!(body?.indexable ?? prev?.indexable), duplicable: !!(body?.duplicable ?? prev?.duplicable), publishedAt: prev?.publishedAt ?? now, updatedAt: now };
  await putDoc(COL, page.id, doc); return NextResponse.json({ publishedAt: doc.publishedAt, updatedAt: doc.updatedAt, indexable: doc.indexable, duplicable: doc.duplicable });
}
export async function DELETE(req: NextRequest) {
  const u = await currentUser(); if (!u) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id"); if (!ok(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const prev = await getDoc<PublishedDoc>(COL, id); if (prev && prev.ownerId !== u.id) return NextResponse.json({ error: "not yours" }, { status: 403 });
  if (prev) await delDoc(COL, id); return new NextResponse(null, { status: 204 });
}
