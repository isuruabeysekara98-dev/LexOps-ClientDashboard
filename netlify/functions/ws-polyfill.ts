// Must be imported before anything that reaches @supabase/supabase-js.
//
// `createClient()` constructs a RealtimeClient eagerly, and that asks for a
// WebSocket constructor while the module is still loading. Node 20 has no
// global WebSocket (it arrived in 22), so on that runtime the function throws
// at import time and every /api/* request returns a 502 before Express sees it.
//
// netlify.toml asks for Node 22, which would also solve this — but the runtime
// a host actually gives you is not something the code should depend on, and the
// failure mode when it guesses differently is a total outage rather than a
// degraded one. This makes the function correct on 18, 20 and 22 alike.
//
// Nothing here uses realtime; the client just refuses to be built without a
// constructor available. `ws` is already a dependency.
import ws from "ws";

const g = globalThis as any;
if (typeof g.WebSocket === "undefined") {
  g.WebSocket = ws;
}

export {};
