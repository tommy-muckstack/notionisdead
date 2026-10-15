import Link from "next/link";
import { NtMark } from "@/components/NtHome";
/** Branded 404 (QA #31): same wording as the app's, with a way back to your content. */
export default function NotFound() {
  return <main className="nt-404"><NtMark s={40} /><h1>This page couldn&apos;t be found.</h1><p>It may have been moved, unpublished, or the link is wrong.</p><div><Link className="nt-b" href="/app">Back to my content</Link><Link className="nt-b2" href="/">Go to the homepage</Link></div></main>;
}
