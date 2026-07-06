// Shared loading-reliability helpers.
// Goal: no page-blocking load can hang forever, and slow loads always reassure the user.
import { useState, useEffect } from "react";

export const LOAD_TIMEOUT_MS = 12000; // hard cap for a page-blocking load
export const SLOW_HINT_MS = 5000;     // after this, tell the user it's "taking longer than usual"

// Race any thenable (fetch, Supabase query builder, Promise.all, …) against a timeout.
// If it doesn't settle in `ms`, reject with a timeout Error so the UI can show an error
// state instead of spinning indefinitely.
export function withTimeout(promise, ms = LOAD_TIMEOUT_MS, label = "This is taking too long") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} (timed out after ${Math.round(ms / 1000)}s)`)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// fetch() that aborts itself after `ms` so a hung request never blocks the UI forever.
export async function fetchWithTimeout(url, opts = {}, ms = LOAD_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// True once `active` has stayed truthy for `delay` ms — used to reveal a
// "taking longer than usual" reassurance under a spinner.
export function useSlowHint(active, delay = SLOW_HINT_MS) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
  return slow;
}
