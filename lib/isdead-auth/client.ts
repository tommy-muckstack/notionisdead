"use client";
// Browser helpers: Firebase email/password + Google popup, then trade the ID token for the
// shared httpOnly session cookie at `sessionUrl` (each app exposes POST {idToken} → 204).
import type { FirebaseClientConfig } from "./config";
let cached: Promise<import("firebase/auth").Auth> | null = null;
export function clientAuth(config: FirebaseClientConfig) {
  if (!cached) cached = (async () => {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth, inMemoryPersistence, setPersistence } = await import("firebase/auth");
    const app = getApps().find(a => a.name === "isdead") ?? initializeApp(config, "isdead");
    const auth = getAuth(app); await setPersistence(auth, inMemoryPersistence); // the server cookie is the source of truth
    return auth;
  })();
  return cached;
}
async function exchange(sessionUrl: string, idToken: string) {
  const r = await fetch(sessionUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }), credentials: "same-origin" });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Could not start a session");
}
export async function signInWithEmail(config: FirebaseClientConfig, sessionUrl: string, email: string, password: string) {
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const c = await signInWithEmailAndPassword(await clientAuth(config), email, password);
  await exchange(sessionUrl, await c.user.getIdToken());
}
export async function signUpWithEmail(config: FirebaseClientConfig, sessionUrl: string, email: string, password: string, name?: string) {
  const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import("firebase/auth");
  const c = await createUserWithEmailAndPassword(await clientAuth(config), email, password);
  if (name) await updateProfile(c.user, { displayName: name });
  sendEmailVerification(c.user).catch(() => {});
  await exchange(sessionUrl, await c.user.getIdToken(true));
}
export async function signInWithGoogle(config: FirebaseClientConfig, sessionUrl: string) {
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  const c = await signInWithPopup(await clientAuth(config), new GoogleAuthProvider());
  await exchange(sessionUrl, await c.user.getIdToken());
}
export async function resetPassword(config: FirebaseClientConfig, email: string) {
  const { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(await clientAuth(config), email);
}
/** Human-friendly message for a Firebase Auth error. */
export function authErrorMessage(e: any): string {
  const c = String(e?.code ?? "");
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return "Wrong email or password.";
  if (c.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
  if (c.includes("weak-password")) return "Use at least 6 characters for your password.";
  if (c.includes("invalid-email")) return "That email address doesn't look right.";
  if (c.includes("popup-closed")) return "Google sign-in was closed before it finished.";
  if (c.includes("too-many-requests")) return "Too many attempts. Try again in a few minutes.";
  if (c.includes("invalid-action-code") || c.includes("expired-action-code")) return "That sign-in link has expired or was already used. Request a new one.";
  return e?.message ?? "Something went wrong.";
}

// ---- passwordless email link (Notion-style "we emailed you a code/link") ----
// Requires the "Email link (passwordless sign-in)" provider to be enabled on the Firebase project; otherwise
// sendSignInLinkToEmail rejects with auth/operation-not-allowed and callers fall back to the password form.
const LINK_EMAIL_KEY = "isdead:emailForSignIn";
export async function sendLoginLink(config: FirebaseClientConfig, email: string, continueUrl: string) {
  const { sendSignInLinkToEmail } = await import("firebase/auth");
  await sendSignInLinkToEmail(await clientAuth(config), email, { url: continueUrl, handleCodeInApp: true });
  try { localStorage.setItem(LINK_EMAIL_KEY, email); } catch { /* private mode */ }
}
export async function isLoginLink(config: FirebaseClientConfig, href: string) { const { isSignInWithEmailLink } = await import("firebase/auth"); return isSignInWithEmailLink(await clientAuth(config), href); }
export const rememberedLinkEmail = () => { try { return localStorage.getItem(LINK_EMAIL_KEY) ?? ""; } catch { return ""; } };
/** Finish a link sign-in (the link opened in this browser) and start the server session. */
export async function completeLoginLink(config: FirebaseClientConfig, sessionUrl: string, email: string, href: string) {
  const { signInWithEmailLink } = await import("firebase/auth");
  const c = await signInWithEmailLink(await clientAuth(config), email, href);
  try { localStorage.removeItem(LINK_EMAIL_KEY); } catch { /* ignore */ }
  await exchange(sessionUrl, await c.user.getIdToken());
}
export const isLinkDisabled = (e: unknown) => /operation-not-allowed|admin-restricted|unauthorized-continue-uri|invalid-continue-uri/.test(String((e as { code?: string })?.code ?? ""));
