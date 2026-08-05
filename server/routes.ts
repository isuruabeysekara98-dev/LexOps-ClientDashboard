import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import adminRoutes from "./routes/admin";
import proposalRoutes from "./routes/proposal";
import proposalsV2Routes from "./routes/proposalsV2";
import livingProposalRoutes from "./routes/livingProposal";
import livingProposalReviewRoutes from "./routes/livingProposalReview";
import notifyRoutes from "./routes/notify";
import moduleRoutes from "./routes/modules";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.use("/api/admin", adminRoutes);
  app.use("/api/proposals/v2", proposalsV2Routes);
  app.use("/api/lp", livingProposalRoutes);
  // Internal graph review harness. Dev-only — it prints recipient tokens, and
  // the router 404s itself when NODE_ENV is production.
  app.use("/review", livingProposalReviewRoutes);
  app.use("/api/proposal", proposalRoutes);
  app.use("/api/notify", notifyRoutes);
  app.use("/api/modules", moduleRoutes);
  // Password reset is under /api/auth but uses notify router
  app.post("/api/auth/send-password-reset", (req, res, next) => {
    req.url = "/send-password-reset";
    notifyRoutes(req, res, next);
  });

  return httpServer;
}
