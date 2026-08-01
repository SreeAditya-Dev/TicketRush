import express from "express";
import cors from "cors";
import { bookingRouter } from "./routes/booking";
import { paymentRouter } from "./routes/payment";
import { eventsRouter } from "./routes/events";
import { metricsRegistry } from "./metrics";
import { config } from "./config";
import { prisma } from "./prisma";
import { redis } from "./redis";

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", bookingRouter);
app.use("/api/v1", paymentRouter);
app.use("/api/v1", eventsRouter);

app.get("/metrics", async (_req, res) => {
  const metrics = await metricsRegistry.metrics();
  res.set("Content-Type", metricsRegistry.contentType);
  res.send(metrics);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Internal server error" });
});

const server = app.listen(config.port, () => {
  console.log(`API running on port ${config.port}`);
});

const shutdown = async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  await redis.quit();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
