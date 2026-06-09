import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import {
  audioRouter,
  handleUploadError,
} from "./routes/audioRoutes.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(currentDirectory, "../../frontend/dist");

export function createApp(dependencyHealth) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: config.corsOrigin.split(",").map((origin) => origin.trim()),
      methods: ["GET", "POST"],
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(pinoHttp({ logger }));

  app.get("/api/health", (_request, response) => {
    const healthy = Object.values(dependencyHealth).every(Boolean);
    response.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      dependencies: dependencyHealth,
      maxFileSizeMb: config.maxFileSizeMb,
    });
  });

  app.use("/api/audio", (request, response, next) => {
    if (!dependencyHealth.storage) {
      response.status(503).json({
        message: "O armazenamento não está disponível.",
      });
      return;
    }

    if (
      request.method === "POST" &&
      request.path === "/upload" &&
      (!dependencyHealth.ffmpeg || !dependencyHealth.deepFilter)
    ) {
      response.status(503).json({
        message:
          "O servidor não possui FFmpeg ou DeepFilterNet configurado. Consulte o administrador.",
      });
      return;
    }

    next();
  });

  app.use("/api/audio", audioRouter);
  app.use(handleUploadError);

  app.use(express.static(frontendDist));
  app.use((request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(path.join(frontendDist, "index.html"), (error) => {
      if (error) next();
    });
  });

  app.use((_request, response) => {
    response.status(404).json({ message: "Rota não encontrada." });
  });

  app.use((error, request, response, _next) => {
    request.log?.error({ err: error }, "Erro não tratado");
    response.status(500).json({
      message: "Ocorreu um erro interno. Tente novamente.",
    });
  });

  return app;
}
