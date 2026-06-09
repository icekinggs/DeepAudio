import fs from "node:fs/promises";
import path from "node:path";
import { config, paths } from "../config/env.js";
import { logger } from "../config/logger.js";
import { runProcess } from "../utils/processRunner.js";
import {
  removeFilesForRecord,
  updateRecord,
} from "./storageService.js";

async function convertToCompatibleWav(inputPath, outputPath) {
  await runProcess(config.ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "48000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

async function findGeneratedAudio(workDirectory) {
  const entries = await fs.readdir(workDirectory, { withFileTypes: true });
  const candidate = entries.find(
    (entry) =>
      entry.isFile() &&
      [".wav", ".flac"].includes(path.extname(entry.name).toLowerCase()),
  );

  if (!candidate) {
    throw new Error("O DeepFilterNet não gerou um arquivo de áudio.");
  }

  return path.join(workDirectory, candidate.name);
}

async function runDeepFilter(convertedPath, processedPath, id) {
  const workDirectory = path.join(paths.processed, `.work-${id}`);
  await fs.rm(workDirectory, { recursive: true, force: true });
  await fs.mkdir(workDirectory, { recursive: true });

  try {
    try {
      const result = await runProcess(config.deepFilterCommand, [
        convertedPath,
        "--pf",
        "--output-dir",
        workDirectory,
      ]);

      const gitWarning = `${result.stdout}\n${result.stderr}`.includes(
        "fatal: not a git repository",
      );
      if (gitWarning) {
        logger.warn(
          { processingId: id },
          "DeepFilterNet exibiu aviso de repositório Git; processamento continuou",
        );
      }
    } catch (error) {
      const output = `${error.details?.stdout || ""}\n${
        error.details?.stderr || ""
      }`;
      if (!output.includes("fatal: not a git repository")) {
        throw error;
      }

      logger.warn(
        { processingId: id },
        "DeepFilterNet retornou aviso Git; verificando se a saída foi gerada",
      );
    }

    const generatedPath = await findGeneratedAudio(workDirectory);
    await fs.rm(processedPath, { force: true });
    await fs.rename(generatedPath, processedPath);
  } finally {
    await fs.rm(workDirectory, { recursive: true, force: true });
  }
}

export async function processAudio(record) {
  const convertedPath = path.join(paths.converted, `${record.id}.wav`);
  const processedPath = path.join(paths.processed, `${record.id}.wav`);

  try {
    await updateRecord(record.id, {
      status: "converting",
      convertedPath,
    });
    logger.info({ processingId: record.id }, "Convertendo áudio com FFmpeg");
    await convertToCompatibleWav(record.originalPath, convertedPath);

    await updateRecord(record.id, {
      status: "processing",
      processedPath,
    });
    logger.info(
      { processingId: record.id },
      "Removendo ruído com DeepFilterNet",
    );
    await runDeepFilter(convertedPath, processedPath, record.id);

    const fileStats = await fs.stat(processedPath);
    await updateRecord(record.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      outputSize: fileStats.size,
      error: null,
    });
    logger.info({ processingId: record.id }, "Processamento finalizado");
  } catch (error) {
    logger.error(
      { err: error, processingId: record.id },
      "Falha no processamento do áudio",
    );
    await updateRecord(record.id, {
      status: "failed",
      error: "Não foi possível processar este áudio.",
    });
    await removeFilesForRecord({
      ...record,
      convertedPath,
      processedPath,
    }).catch((cleanupError) => {
      logger.error(
        { err: cleanupError, processingId: record.id },
        "Falha ao remover arquivos após erro",
      );
    });
  }
}
