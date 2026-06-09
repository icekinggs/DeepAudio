import fs from "node:fs/promises";
import path from "node:path";
import { config, paths } from "../config/env.js";
import { logger } from "../config/logger.js";

const storageFolders = [
  config.storageDir,
  paths.original,
  paths.converted,
  paths.processed,
  paths.logs,
];

let writeQueue = Promise.resolve();

export async function ensureStorage() {
  await Promise.all(
    storageFolders.map((folder) => fs.mkdir(folder, { recursive: true })),
  );

  const probePath = path.join(config.storageDir, `.write-test-${process.pid}`);
  await fs.writeFile(probePath, "ok");
  await fs.unlink(probePath);

  try {
    await fs.access(paths.metadata);
  } catch {
    await fs.writeFile(paths.metadata, "[]", "utf8");
  }
}

async function readAllUnsafe() {
  try {
    const content = await fs.readFile(paths.metadata, "utf8");
    const records = JSON.parse(content);
    return Array.isArray(records) ? records : [];
  } catch (error) {
    logger.error({ err: error }, "Falha ao ler histórico; usando lista vazia");
    return [];
  }
}

async function writeAllUnsafe(records) {
  const temporaryPath = `${paths.metadata}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(temporaryPath, paths.metadata);
}

function scheduleWrite(operation) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => {});
  return result;
}

export async function createRecord(record) {
  return scheduleWrite(async () => {
    const records = await readAllUnsafe();
    records.unshift(record);
    await writeAllUnsafe(records.slice(0, config.historyLimit));
    return record;
  });
}

export async function updateRecord(id, updates) {
  return scheduleWrite(async () => {
    const records = await readAllUnsafe();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) return null;

    records[index] = {
      ...records[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await writeAllUnsafe(records);
    return records[index];
  });
}

export async function getRecord(id) {
  await writeQueue;
  const records = await readAllUnsafe();
  return records.find((record) => record.id === id) || null;
}

export async function listRecords() {
  await writeQueue;
  return readAllUnsafe();
}

export async function removeRecord(id) {
  return scheduleWrite(async () => {
    const records = await readAllUnsafe();
    const nextRecords = records.filter((record) => record.id !== id);
    await writeAllUnsafe(nextRecords);
  });
}

export async function removeFilesForRecord(record) {
  const filePaths = [
    record.originalPath,
    record.convertedPath,
    record.processedPath,
  ].filter(Boolean);

  await Promise.all(
    filePaths.map(async (filePath) => {
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(`${config.storageDir}${path.sep}`)) return;
      await fs.rm(resolved, { force: true });
    }),
  );

  const workDirectory = path.join(paths.processed, `.work-${record.id}`);
  await fs.rm(workDirectory, { recursive: true, force: true });
}

export async function cleanupOldRecords(maxAgeHours = config.cleanupMaxAgeHours) {
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  const records = await listRecords();
  const expired = records.filter(
    (record) =>
      !["uploaded", "converting", "processing"].includes(record.status) &&
      new Date(record.createdAt).getTime() < cutoff,
  );

  for (const record of expired) {
    await removeFilesForRecord(record);
    await removeRecord(record.id);
  }

  return expired.length;
}
