"use client";
import { useRef, useState } from "react";
import type { Block } from "@/lib/notion/blocks";
import { useEnv } from "./editorEnv";

const MAX_UPLOAD = 1_500_000; // data URLs live in localStorage; keep uploads small
const KIND: Record<string, { label: string; accept: string; hint: string }> = {
  image: { label: "Add an image", accept: "image/*", hint: "Upload or embed with a link" }, video: { label: "Embed or upload a video", accept: "video/*", hint: "Works with YouTube, Vimeo and video files" },
  audio: { label: "Embed or upload audio", accept: "audio/*", hint: "Works with Spotify, SoundCloud and audio files" }, file: { label: "Upload or embed a file", accept: "*/*", hint: "Any file type, up to 1.5 MB" }, bookmark: { label: "Create a web bookmark", accept: "", hint: "Paste a link" },
};
const youtube = (u: string) => { const m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/); return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null; };
const vimeo = (u: string) => { const m = u.match(/vimeo\.com\/(\d+)/); return m ? `https://player.vimeo.com/video/${m[1]}` : null; };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/** Image / video / audio / file / bookmark: an empty block shows the Upload | Embed link chooser; a filled one renders the media with a caption. */
export function MediaBlock({ block, onChange, onDelete }: { block: Block; onChange: (patch: Partial<Block>) => void; onDelete: () => void }) {
  const env = useEnv(); const k = KIND[block.type]; const [tab, setTab] = useState<"upload" | "embed">(block.type === "bookmark" ? "embed" : "upload"); const [url, setUrl] = useState(""); const fileRef = useRef<HTMLInputElement>(null);
  const embed = (e: React.FormEvent) => { e.preventDefault(); const u = url.trim(); if (!u) return; onChange({ url: /^https?:\/\//.test(u) ? u : `https://${u}`, text: block.type === "bookmark" ? host(u) : block.text }); };
  const upload = async (f: File | undefined) => { if (!f) return; if (f.size > MAX_UPLOAD) { env.notify?.("Keep uploads under 1.5 MB (files are stored in your browser)."); return; } const r = new FileReader(); r.onload = () => onChange({ url: String(r.result), text: block.type === "file" ? f.name : block.text }); r.readAsDataURL(f); };
  if (!block.url) return <div className="ntn-media ntn-media--empty" data-testid="media-empty">
    <div className="ntn-media__tabs">{block.type !== "bookmark" && <button type="button" className={tab === "upload" ? "on" : ""} onClick={() => setTab("upload")}>Upload</button>}<button type="button" className={tab === "embed" ? "on" : ""} onClick={() => setTab("embed")}>Embed link</button><button type="button" className="x" aria-label="Remove block" onClick={onDelete}>✕</button></div>
    {tab === "upload" ? <div className="ntn-media__body"><button type="button" className="ntn-media__btn" onClick={() => fileRef.current?.click()}>{k.label}</button><small>{k.hint}</small><input ref={fileRef} type="file" accept={k.accept || undefined} hidden aria-label="Upload file" onChange={e => upload(e.target.files?.[0])} /></div>
      : <form className="ntn-media__body" onSubmit={embed}><input autoFocus aria-label="Link" placeholder={block.type === "bookmark" ? "Paste a link…" : "Paste the link…"} value={url} onChange={e => setUrl(e.target.value)} /><button type="submit" className="ntn-media__btn">{block.type === "bookmark" ? "Create bookmark" : "Embed"}</button><small>{k.hint}</small></form>}
  </div>;
  const cap = <input className="ntn-media__cap" aria-label="Caption" placeholder="Write a caption…" value={block.text} onChange={e => onChange({ text: e.target.value })} />;
  if (block.type === "image") return <figure className="ntn-media"><img src={block.url} alt={block.text || "Image"} />{cap}</figure>;
  if (block.type === "video") { const em = youtube(block.url) ?? vimeo(block.url); return <figure className="ntn-media">{em ? <iframe src={em} title={block.text || "Video"} allow="encrypted-media; picture-in-picture" allowFullScreen /> : <video src={block.url} controls />}{cap}</figure>; }
  if (block.type === "audio") return <figure className="ntn-media"><audio src={block.url} controls />{cap}</figure>;
  if (block.type === "file") return <a className="ntn-file" href={block.url} download={block.text || true} target="_blank" rel="noreferrer"><span>📎</span><b>{block.text || "File"}</b><small>{block.url.startsWith("data:") ? "uploaded" : host(block.url)}</small></a>;
  return <a className="ntn-bookmark" href={block.url} target="_blank" rel="noreferrer noopener"><span><b>{block.text || host(block.url)}</b><small>{block.url}</small></span><i>🌐</i></a>;
}
