import { supabase } from "@/lib/supabase.js";

const SESSION_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 12000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function adminFetch(path, options = {}) {
  let token;
  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_TIMEOUT_MS,
      "getSession"
    );
    token = session?.access_token;
  } catch {
    token = null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let resp;
  try {
    resp = await fetch(`/api/admin${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body !== undefined
        ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body))
        : undefined,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function dbWrite(table, operation, data, match) {
  return adminFetch("/db", { method: "POST", body: { table, operation, data: data ?? null, match: match ?? null } });
}
