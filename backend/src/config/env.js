import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "../../..");

dotenv.config({ path: path.join(projectRoot, ".env") });

function parsePositiveNumber(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} deve ser um número maior que zero.`);
  }
  return parsed;
}

function parseOptionalPositiveNumber(value, name) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} deve ser um numero maior que zero.`);
  }
  return parsed;
}

const storageValue = process.env.STORAGE_DIR || "./storage";

export const config = {
  projectRoot,
  port: parsePositiveNumber(process.env.PORT, 3001, "PORT"),
  maxFileSizeMb: parsePositiveNumber(
    process.env.MAX_FILE_SIZE_MB,
    200,
    "MAX_FILE_SIZE_MB",
  ),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
  deepFilterCommand: process.env.DEEPFILTER_COMMAND || "deepFilter",
  storageDir: path.resolve(projectRoot, storageValue),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  cleanupMaxAgeHours: parsePositiveNumber(
    process.env.CLEANUP_MAX_AGE_HOURS,
    24,
    "CLEANUP_MAX_AGE_HOURS",
  ),
  maxAudioDurationSeconds: parseOptionalPositiveNumber(
    process.env.MAX_AUDIO_DURATION_SECONDS,
    "MAX_AUDIO_DURATION_SECONDS",
  ),
};

export const paths = {
  original: path.join(config.storageDir, "original"),
  converted: path.join(config.storageDir, "converted"),
  processed: path.join(config.storageDir, "processed"),
  logs: path.join(config.storageDir, "logs"),
  metadata: path.join(config.storageDir, "jobs.json"),
};
