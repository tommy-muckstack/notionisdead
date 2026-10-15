"use client";
import { useCallback, useEffect, useRef, useState } from "react";
/** localStorage-backed state, namespaced per app + user. `ready` flips true after the first read (avoids hydration flashes). */
export function useLocal<T>(ns: string, key: string, initial: T) {
  const k = `notionisdead:${ns}:${key}`;
  const [v, setV] = useState<T>(initial); const [ready, setReady] = useState(false); const loaded = useRef<string | null>(null);
  // Read on mount and whenever the key changes; a missing key resets to `initial` (never leaks the previous key's value into the new one).
  useEffect(() => { let next = initial; try { const raw = localStorage.getItem(k); if (raw) next = JSON.parse(raw); } catch { /* ignore */ } setV(next); loaded.current = k; setReady(true); }, [k]); // eslint-disable-line
  useEffect(() => { if (!ready || loaded.current !== k) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } }, [v, ready, k]);
  const set = useCallback((f: T | ((p: T) => T)) => setV(f as any), []);
  return [v, set, ready] as const;
}
