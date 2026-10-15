"use client";
import { useEffect, useState } from "react";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, authErrorMessage, sendLoginLink, isLoginLink, completeLoginLink, rememberedLinkEmail, isLinkDisabled } from "@/lib/isdead-auth/client";
import Link from "next/link";
import { BP } from "@/lib/basepath";
import { NtMark } from "@/components/NtHome";
import "./ntlogin.css";

const G = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3A6.9 6.9 0 0112 5.4z" /></svg>;
const MS = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#f25022" d="M2 2h9.5v9.5H2z" /><path fill="#7fba00" d="M12.5 2H22v9.5h-9.5z" /><path fill="#00a4ef" d="M2 12.5h9.5V22H2z" /><path fill="#ffb900" d="M12.5 12.5H22V22h-9.5z" /></svg>;
const Ic = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const off = "Not available yet in the open-source version";
export function NtLogin({ config, demo, to, mode: initialMode = "signin" }: { config: FirebaseClientConfig | null; demo: boolean; to: string; mode?: "signin" | "signup" | "reset" | "link" }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "link">(initialMode);
  // signin: 1 = email, 2 = "check your email" (link sent), 3 = password fallback. signup: 1 = email, 3 = password.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState(""); const [linkEmail, setLinkEmail] = useState("");
  const session = `${BP}/api/session`;
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); setNote(""); try { await f(); } catch (e) { setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const go = (m: typeof mode, st: 1 | 2 | 3 = 1) => { setMode(m); setStep(st); setErr(""); setNote(""); };
  // Finish a passwordless link: /login?mode=link&…oobCode=… (opened from the email).
  useEffect(() => { if (initialMode !== "link" || !config) return; (async () => { if (!(await isLoginLink(config, window.location.href))) { setErr("That sign-in link isn't valid any more. Request a new one."); setMode("signin"); return; } const remembered = rememberedLinkEmail(); if (remembered) run(async () => { await completeLoginLink(config, session, remembered, window.location.href); window.location.assign(to); }); })(); }, [initialMode]); // eslint-disable-line
  const submit = (e: React.FormEvent) => { e.preventDefault();
    if (!config) { setErr("Sign-in isn't configured on this deployment yet."); return; }
    if (mode === "link") return run(async () => { await completeLoginLink(config, session, linkEmail || email, window.location.href); window.location.assign(to); });
    if (mode === "reset") return run(async () => { await resetPassword(config, email); setNote("If that email has an account, a reset link is on its way."); go("signin"); });
    if (step === 1) {
      if (mode === "signup") { setStep(3); return; }
      // Notion signs in with an emailed code; here it's an emailed link (free, built into Firebase). Password stays as the fallback.
      return run(async () => { try { await sendLoginLink(config, email, `${window.location.origin}${BP}/login?mode=link&callbackUrl=${encodeURIComponent(to)}`); setStep(2); } catch (ex) { if (isLinkDisabled(ex)) { setNote("Email links aren't enabled on this deployment; use your password instead."); setStep(3); } else throw ex; } });
    }
    if (step === 2) { setStep(3); return; }
    run(async () => { if (mode === "signup") await signUpWithEmail(config, session, email, password); else await signInWithEmail(config, session, email, password); window.location.assign(to); }); };
  const su = mode === "signup";
  const google = () => run(async () => { await signInWithGoogle(config!, session); window.location.assign(to); });
  const form = <div className="ntl-card" data-testid="login-card" data-mode={mode} data-step={step}>
    <div className="ntl-mk"><NtMark s={22} /></div>
    <h1>{su ? "Your workspace, your browser." : mode === "reset" ? "Reset your password" : mode === "link" ? "Finishing sign-in…" : "Think it. Make it."}<span>{su ? "Sign up with your email" : mode === "reset" ? "We'll email you a reset link" : mode === "link" ? "Confirm the email you used" : "Log in to your NotionIsDead account"}</span></h1>
    <form onSubmit={submit}>
      {mode === "link" ? <><label htmlFor="nt-email">Email</label><input id="nt-email" type="email" required autoComplete="email" placeholder="The email you entered…" value={linkEmail || rememberedLinkEmail()} onChange={e => setLinkEmail(e.target.value)} /></>
        : <><label htmlFor="nt-email">{su ? "Work email" : "Email"}</label>
          <input id="nt-email" type="email" required autoComplete="email" placeholder={su ? "name@company.com" : "Enter your email address..."} value={email} onChange={e => setEmail(e.target.value)} readOnly={step !== 1 && mode !== "reset"} />
          {step === 2 && <div className="ntl-sent" role="status" data-testid="link-sent"><b>Check your email</b><p>We sent a sign-in link to <b>{email}</b>. Open it on this device to finish. Links expire after an hour.</p><button type="button" className="lnk" onClick={() => run(async () => { await sendLoginLink(config!, email, `${window.location.origin}${BP}/login?mode=link&callbackUrl=${encodeURIComponent(to)}`); setNote("Sent again."); })}>Resend link</button></div>}
          {step === 3 && mode !== "reset" && <><label htmlFor="nt-pass">Password</label><input id="nt-pass" type="password" required minLength={6} autoFocus autoComplete={su ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></>}
          {step === 1 && (su ? <p className="tip"><b>Tip:</b> Any email works. Your pages stay in this browser and are attached to the account on first sign-in.</p> : mode === "signin" && <p className="hint">We&apos;ll email you a sign-in link. No password needed.</p>)}</>}
      <button className="ntl-go" disabled={busy}>{mode === "reset" ? "Email me a reset link" : mode === "link" ? "Continue" : step === 3 && su ? "Create account" : step === 2 ? "Use password instead" : step === 3 ? "Log in" : "Continue"}</button>
    </form>
    {err && <p role="alert" className="err">{err}</p>}{note && <p role="status" className="hint">{note}</p>}
    {mode === "signin" && step === 2 && <p className="sw"><a href="/login" onClick={e => { e.preventDefault(); go("signin", 1); }}>Use a different email</a></p>}
    {mode !== "reset" && mode !== "link" && <><div className="or"><i /><span>or continue with</span><i /></div>
      <div className="prov">
        <button type="button" disabled={busy || !config} onClick={google}>{G}Google</button>
        {su ? <><button type="button" disabled title={off}>{MS}Microsoft</button><button type="button" disabled title={off}><Ic d="M12 3a4 4 0 00-4 4v2m8 0V7a4 4 0 00-4-4M5 11h14v10H5z" />ChatGPT</button></>
          : <><button type="button" disabled title={off}><Ic d="M12 3a4 4 0 00-4 4v2m8 0V7a4 4 0 00-4-4M5 11h14v10H5z" />ChatGPT</button><button type="button" disabled title={off}><Ic d="M16 3c0 2-1.5 3.5-3.5 3.5C12.5 4.5 14 3 16 3zM12 7c2 0 3-1 4.5-1 1.5 0 2.5.7 3 1.5-2.5 1.5-2 5 .5 6-1 2.5-2.5 5.5-4.5 5.5-1 0-1.500-.5-3-.5s-2 .5-3 .5c-2.500 0-5-4-5-8 0-3 2-5 4.500-5 1.500 0 2.500 1 3 1z" />Apple</button>
            <button type="button" disabled title={off}>{MS}Microsoft</button><button type="button" disabled title={off}><Ic d="M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-2a5 5 0 015-5h4M18 14v7M15 17h6" />Passkey</button><button type="button" disabled title={off}><Ic d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" />SSO</button></>}
      </div><p className="hint prov-note">Google is the only provider configured. Apple, Microsoft, passkeys and SSO need their own developer accounts, so they are shown greyed out rather than pretending to work.</p></>}
    <p className="sw">{su ? <>Existing user? <a href={`${BP}/login`} onClick={e => { e.preventDefault(); go("signin"); }}>Log in</a></> : mode === "reset" || mode === "link" ? <a href={`${BP}/login`} onClick={e => { e.preventDefault(); go("signin"); }}>Back to log in</a> : <>New user? <a href={`${BP}/login?mode=signup`} onClick={e => { e.preventDefault(); go("signup"); }}>Sign up</a>{(step === 3 || step === 2) && <> · <a href={`${BP}/login?mode=reset`} onClick={e => { e.preventDefault(); go("reset"); }}>Forgot password?</a></>}</>}</p>
    <p className="tos">By continuing, you acknowledge that you understand and agree to the <Link href="/legal#terms">Terms &amp; Conditions</Link> and <Link href="/legal#privacy">Privacy Policy</Link></p>
    {!config && <p role="status" className="hint cfg">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
    {demo && <button type="button" className="ntl-demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
    <p className="sw"><Link href="/app">Continue as a guest instead →</Link></p>
  </div>;
  return su
    ? <main className="ntl ntl-su"><div className="bk"><div className="sb">{Array.from({ length: 11 }).map((_, i) => <i key={i} />)}</div><div className="cv"><div className="cov" /></div></div><div className="ov" /><div className="md">{form}</div></main>
    : <main className="ntl"><div className="ntl-col">{form}</div><div className="lang">🌐 Language: English (US) ⌄</div></main>;
}
