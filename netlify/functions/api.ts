// Every /api/* request on Netlify lands here.
//
// Netlify has no long-lived process, so `server/index.ts` — which binds a port
// — never runs in production. This wraps the same Express app in a Lambda
// handler instead, which is why `createApp()` was split out of that file: the
// routes are defined once and both runtimes mount the identical set. If a route
// works locally it exists here too, by construction.
import serverlessHttp from "serverless-http";
import type { Handler } from "@netlify/functions";
import { createApp } from "../../server/app";

// Built once and reused. A Lambda container survives between invocations, so
// paying for route registration and the Supabase client on every request would
// add latency for nothing — but the promise has to be cached, not the app, or
// concurrent cold-start requests each kick off their own build.
let cached: Promise<ReturnType<typeof serverlessHttp>> | null = null;

function getHandler() {
  if (!cached) {
    cached = createApp().then((app) =>
      serverlessHttp(app, {
        // Netlify delivers the invocation path in full, so a request the
        // browser made to /api/lp/x arrives here as
        // /.netlify/functions/api/api/lp/x. Express mounts its routers at
        // /api/*, so without stripping this prefix every route 404s while the
        // function itself reports a clean 200 — the redirect in netlify.toml
        // adds the second /api back on purpose so what's left after the strip
        // matches the mounts exactly.
        basePath: "/.netlify/functions/api",
        // PDFs move through here in both directions: multer parses uploads from
        // the admin editor, and proposal downloads stream back. Without these
        // listed, Netlify hands Express base64 text and multer sees a corrupt
        // multipart body — a 20MB PDF that uploads clean locally fails in
        // production with no useful error.
        binary: [
          "application/pdf",
          "application/octet-stream",
          "multipart/form-data",
          "image/*",
          "font/*",
        ],
      }),
    );
  }
  return cached;
}

export const handler: Handler = async (event, context) => {
  // Without this the function waits on an empty event loop before returning,
  // which turns every response into a timeout-length hang.
  context.callbackWaitsForEmptyEventLoop = false;
  const h = await getHandler();
  return h(event, context) as any;
};
