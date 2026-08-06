// Long-lived server entry: local dev, and any host that runs a real process.
//
// The app itself now lives in ./app so the Netlify function can mount the same
// routes without this file's port binding. What stays here is everything that
// only makes sense when there *is* a process: the HTTP server, Vite's dev
// middleware and its HMR socket, static file serving, and listen().
import { createServer } from "http";
import { createApp, log } from "./app";

(async () => {
  const app = await createApp();
  const httpServer = createServer(app);

  // Vite only in development, and only after the API routes are registered, so
  // its catch-all doesn't swallow them.
  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || "5000", 10);
  // reusePort is not supported on Windows (throws ENOTSUP); only set it off-Windows.
  const listenOptions: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
