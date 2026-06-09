import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import { paths } from "./env.js";

fs.mkdirSync(paths.logs, { recursive: true });

const logFile = path.join(paths.logs, "app.log");

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie"],
      censor: "[REDACTED]",
    },
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: pino.destination({ dest: logFile, sync: false }) },
  ]),
);
