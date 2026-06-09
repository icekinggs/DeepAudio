import { constants } from "node:fs";
import fs from "node:fs/promises";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { runProcess } from "../utils/processRunner.js";
import { ensureStorage } from "./storageService.js";

async function verifyCommand(command, args, installMessage) {
  try {
    const result = await runProcess(command, args);
    return { available: true, detail: result.stdout || result.stderr };
  } catch (error) {
    const output = `${error.details?.stdout || ""}\n${error.details?.stderr || ""}`;
    if (output.includes("fatal: not a git repository")) {
      logger.warn({ command }, "Aviso Git ignorado durante verificação");
      return { available: true, detail: output };
    }

    logger.error(
      { err: error, command },
      `Dependência ausente. ${installMessage}`,
    );
    return { available: false, detail: installMessage };
  }
}

export async function runStartupChecks() {
  const result = {
    storage: false,
    ffmpeg: false,
    deepFilter: false,
    uploadLimit: config.maxFileSizeMb > 0,
  };

  try {
    await ensureStorage();
    await fs.access(config.storageDir, constants.W_OK);
    result.storage = true;
    logger.info({ storageDir: config.storageDir }, "Storage pronto para escrita");
  } catch (error) {
    logger.error(
      { err: error, storageDir: config.storageDir },
      "Storage indisponível. Verifique caminho e permissão de escrita.",
    );
  }

  const [ffmpeg, deepFilter] = await Promise.all([
    verifyCommand(
      config.ffmpegPath,
      ["-version"],
      "Instale o FFmpeg com: winget install Gyan.FFmpeg",
    ),
    verifyCommand(
      config.deepFilterCommand,
      ["--help"],
      "Instale Python 3.11 e execute: pip install deepfilternet soundfile",
    ),
  ]);

  result.ffmpeg = ffmpeg.available;
  result.deepFilter = deepFilter.available;

  logger.info(
    { maxFileSizeMb: config.maxFileSizeMb },
    "Limite de upload configurado",
  );

  return result;
}
