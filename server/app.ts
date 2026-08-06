// The Express app, built but never listening.
//
// Split out of index.ts so two very different runtimes can share one definition
// of the API: `server/index.ts` binds it to a port for local dev and for any
// host that runs a long-lived process, and `netlify/functions/api.ts` hands the
// same app to serverless-http. Anything registered here is guaranteed to exist
// in both — which is the whole point, because a route that works locally and
// 404s in production is the failure this file prevents.
import "dotenv/config";
import express, { type Express, type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

/** Builds the app and registers every route. Does not listen. */
export async function createApp(): Promise<Express> {
  const app = express();

  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        log(logLine);
      }
    });

    next();
  });

  // `registerRoutes` takes an http.Server only to hand it back — nothing in it
  // binds or upgrades. Passing an unlistened server keeps the signature honest
  // without opening a socket a serverless function has no use for.
  await registerRoutes(createServer(), app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  return app;
}
