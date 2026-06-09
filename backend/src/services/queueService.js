import { logger } from "../config/logger.js";
import { processAudio } from "./audioProcessor.js";
import { getRecord, listRecords, updateRecord } from "./storageService.js";

const queue = [];
let running = false;
let currentJobId = null;

function queuedIndex(id) {
  return queue.findIndex((jobId) => jobId === id);
}

async function runNext() {
  if (running) return;

  const nextId = queue.shift();
  if (!nextId) return;

  running = true;
  currentJobId = nextId;

  try {
    const record = await getRecord(nextId);
    if (!record || record.status !== "queued") return;

    await processAudio(record);
  } catch (error) {
    logger.error(
      { err: error, processingId: nextId },
      "Erro inesperado ao executar job da fila",
    );
    await updateRecord(nextId, {
      status: "failed",
      error: "Nao foi possivel processar este audio.",
    });
  } finally {
    running = false;
    currentJobId = null;
    setImmediate(runNext);
  }
}

export function enqueueJob(id) {
  if (currentJobId === id || queue.includes(id)) {
    return getQueueState();
  }

  queue.push(id);
  setImmediate(runNext);
  return getQueueState();
}

export async function enqueuePendingJobs() {
  const records = await listRecords();
  const pending = records
    .filter((record) => record.status === "queued")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const record of pending) {
    enqueueJob(record.id);
  }

  return pending.length;
}

export function getJobQueueInfo(id) {
  if (currentJobId === id) {
    return {
      isCurrent: true,
      position: 0,
      pendingBefore: 0,
    };
  }

  const index = queuedIndex(id);
  if (index === -1) return null;

  return {
    isCurrent: false,
    position: index + 1,
    pendingBefore: index,
  };
}

export function getQueueState() {
  return {
    running,
    currentJobId,
    queuedIds: [...queue],
    queuedCount: queue.length,
  };
}
