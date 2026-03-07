import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./routes/admin";
import proposalRoutes from "./routes/proposal";
import notifyRoutes from "./routes/notify";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.use("/api/admin", adminRoutes);
  app.use("/api/proposal", proposalRoutes);
  app.use("/api/notify", notifyRoutes);
  // Password reset is under /api/auth but uses notify router
  app.post("/api/auth/send-password-reset", (req, res, next) => {
    req.url = "/send-password-reset";
    notifyRoutes(req, res, next);
  });

  return httpServer;
}
