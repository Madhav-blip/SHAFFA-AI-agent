import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { apiRouter } from "./routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRouter);

app.get("/health", (_req, res) => res.json({ status: "nominal", ts: Date.now() }));

const PORT = Number(process.env.PORT ?? 4000);
const MONGO_URL = process.env.MONGO_URL ?? "mongodb://localhost:27017/jarvis";

async function boot() {
  await mongoose.connect(MONGO_URL);
  app.listen(PORT, () => console.log(`[jarvis-server] online :${PORT}`));
}

boot().catch((err) => {
  console.error("[jarvis-server] boot failure", err);
  process.exit(1);
});
