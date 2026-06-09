import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";
import { config, paths } from "../config/env.js";
import { uploadAudio } from "../middleware/upload.js";
import {
  enqueueJob,
  getJobQueueInfo,
  getQueueState,
} from "../services/queueService.js";
import {
  cleanupExpiredJobs,
  createRecord,
  getRecord,
  getStorageSummary,
  listRecords,
  removeFilesForRecord,
  removeRecord,
} from "../services/storageService.js";

export const audioRouter = express.Router();

function publicRecord(record) {
  return {
    id: record.id,
    status: record.status,
    originalExtension: record.originalExtension,
    inputSize: record.inputSize,
    outputSize: record.outputSize || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt || null,
    error: record.status === "failed" ? record.error : null,
    queue: getJobQueueInfo(record.id),
    downloadUrl:
      record.status === "completed" ? `/api/audio/download/${record.id}` : null,
  };
}

audioRouter.post("/upload", (request, response, next) => {
  uploadAudio(request, response, async (error) => {
    if (error) {
      next(error);
      return;
    }

    if (!request.file || !request.processingId) {
      response.status(400).json({ message: "Selecione um arquivo de audio." });
      return;
    }

    const record = {
      id: request.processingId,
      status: "queued",
      originalExtension: request.safeExtension,
      inputSize: request.file.size,
      originalPath: request.file.path,
      convertedPath: null,
      processedPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };

    try {
      await createRecord(record);
      response.status(202).json({
        message: "Upload concluido. O processamento entrou na fila.",
        ...publicRecord(record),
        statusUrl: `/api/audio/status/${record.id}`,
      });

      enqueueJob(record.id);
    } catch (recordError) {
      await fs.rm(request.file.path, { force: true }).catch(() => {});
      next(recordError);
    }
  });
});

audioRouter.get("/status/:id", async (request, response, next) => {
  try {
    const record = await getRecord(request.params.id);
    if (!record) {
      response.status(404).json({ message: "Processamento nao encontrado." });
      return;
    }
    response.json(publicRecord(record));
  } catch (error) {
    next(error);
  }
});

audioRouter.get("/download/:id", async (request, response, next) => {
  try {
    const record = await getRecord(request.params.id);
    if (!record || record.status !== "completed" || !record.processedPath) {
      response.status(404).json({ message: "Audio processado nao encontrado." });
      return;
    }

    const resolvedPath = path.resolve(record.processedPath);
    const processedRoot = `${path.resolve(paths.processed)}${path.sep}`;
    if (!resolvedPath.startsWith(processedRoot)) {
      response.status(404).json({ message: "Audio processado nao encontrado." });
      return;
    }

    await fs.access(resolvedPath);
    response.download(resolvedPath, `audio-limpo-${record.id}.wav`);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.status(404).json({ message: "Audio processado nao encontrado." });
      return;
    }
    next(error);
  }
});

audioRouter.get("/history", async (_request, response, next) => {
  try {
    const records = await listRecords();
    response.json(records.map(publicRecord));
  } catch (error) {
    next(error);
  }
});

audioRouter.delete("/:id", async (request, response, next) => {
  try {
    const record = await getRecord(request.params.id);
    if (!record) {
      response.status(404).json({ message: "Processamento nao encontrado." });
      return;
    }

    if (["queued", "converting", "processing"].includes(record.status)) {
      response.status(409).json({
        message: "Aguarde o processamento terminar antes de remover.",
      });
      return;
    }

    await removeFilesForRecord(record);
    await removeRecord(record.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

audioRouter.post("/cleanup", async (_request, response, next) => {
  try {
    const removedCount = await cleanupExpiredJobs();
    response.json({
      message: `${removedCount} arquivo(s) ou job(s) antigo(s) removido(s).`,
      removedCount,
      maxAgeHours: config.cleanupMaxAgeHours,
    });
  } catch (error) {
    next(error);
  }
});

audioRouter.get("/admin/summary", async (_request, response, next) => {
  try {
    response.json({
      queue: getQueueState(),
      storage: await getStorageSummary(),
      limits: {
        maxFileSizeMb: config.maxFileSizeMb,
        cleanupMaxAgeHours: config.cleanupMaxAgeHours,
        uploadRateLimitMax: config.uploadRateLimitMax,
        uploadRateLimitWindowMs: config.uploadRateLimitWindowMs,
        accessTokenEnabled: Boolean(config.accessToken),
      },
    });
  } catch (error) {
    next(error);
  }
});

export function handleUploadError(error, _request, response, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        message: `O arquivo excede o limite de ${config.maxFileSizeMb} MB.`,
      });
      return;
    }

    response.status(400).json({
      message: "Formato de arquivo nao permitido.",
    });
    return;
  }

  if (error.code === "INVALID_AUDIO_TYPE") {
    response.status(415).json({
      message: "A extensao e o tipo do arquivo de audio nao sao compativeis.",
    });
    return;
  }

  next(error);
}
