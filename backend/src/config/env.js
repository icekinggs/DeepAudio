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

function parseNonNegativeNumber(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} deve ser um numero maior ou igual a zero.`);
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
  deepFilterCommand: process.env.DEEPFILTER_COMMAND || "deepFilter",
  storageDir: path.resolve(projectRoot, storageValue),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  cleanupMaxAgeHours: parsePositiveNumber(
    process.env.CLEANUP_MAX_AGE_HOURS,
    24,
    "CLEANUP_MAX_AGE_HOURS",
  ),
  accessToken: process.env.DEEPAUDIO_ACCESS_TOKEN || "",
  uploadRateLimitWindowMs: parsePositiveNumber(
    process.env.UPLOAD_RATE_LIMIT_WINDOW_MS,
    60 * 60 * 1000,
    "UPLOAD_RATE_LIMIT_WINDOW_MS",
  ),
  uploadRateLimitMax: parseNonNegativeNumber(
    process.env.UPLOAD_RATE_LIMIT_MAX,
    6,
    "UPLOAD_RATE_LIMIT_MAX",
  ),
};

export const paths = {
  original: path.join(config.storageDir, "original"),
  converted: path.join(config.storageDir, "converted"),
  processed: path.join(config.storageDir, "processed"),
  logs: path.join(config.storageDir, "logs"),
  metadata: path.join(config.storageDir, "jobs.json"),
};
