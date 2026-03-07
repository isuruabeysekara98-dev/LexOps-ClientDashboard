import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./routes/admin";
import proposalRoutes from "./routes/proposal";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.use("/api/admin", adminRoutes);
  app.use("/api/proposal", proposalRoutes);

  return httpServer;
}
