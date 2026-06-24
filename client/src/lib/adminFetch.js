import { supabase } from "@/lib/supabase.js";

export async function adminFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const resp = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function dbWrite(table, operation, data, match) {
  return adminFetch("/db", { method: "POST", body: { table, operation, data: data ?? null, match: match ?? null } });
}
