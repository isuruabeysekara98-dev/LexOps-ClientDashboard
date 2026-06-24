---
name: adminFetch session handling
description: Why getSession() alone isn't enough and how to get a reliable token for backend requests
---

## Rule
Always call `supabase.auth.getSession()` first, and if the result has no session, fall back to `supabase.auth.refreshSession()` before making the fetch.

## Why
`getSession()` returns the locally-cached session, which may have an expired `access_token` (Supabase tokens expire after 1 hour). If the token is expired, `requireAuth` on the backend calls `adminSupabase.auth.getUser(token)` which returns an error, the middleware returns 401, and `adminFetch` throws — but the request never appears in server logs since it was rejected immediately. This makes failures completely invisible without console logging.

## How to apply
In `adminFetch` (Dashboard.jsx module scope):
1. Get session via `getSession()`
2. If `session` is null/undefined, call `refreshSession()` as fallback
3. Log a warning if still no token
4. Wrap the `fetch()` call in try/catch to surface network errors (vs server errors)

The backend `requireAuth` middleware validates via `adminSupabase.auth.getUser(token)` — this always does a server-side check, so a stale token will always fail there.
