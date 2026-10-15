import { BP } from "@/lib/basepath";
export default function NotFound() {
  return <main style={{ maxWidth: 520, margin: "20vh auto", padding: 24, textAlign: "center", fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif", color: "#37352f" }}>
    <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>This page isn&apos;t published</h1>
    <p style={{ color: "#787774", margin: "0 0 20px" }}>It may have been unpublished, or the link is wrong.</p>
    <a href={`${BP}/app`} style={{ color: "#2383e2" }}>Back to my content</a>
  </main>;
}
