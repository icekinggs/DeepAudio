import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import { runStartupChecks } from "./services/dependencyService.js";
import { cleanupExpiredJobs } from "./services/storageService.js";

async function start() {
  let dependencyHealth;

  try {
    dependencyHealth = await runStartupChecks();
  } catch (error) {
    logger.fatal({ err: error }, "Falha nas verificações de startup");
    process.exitCode = 1;
    return;
  }

  const app = createApp(dependencyHealth);
  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        ffmpeg: dependencyHealth.ffmpeg,
        deepFilter: dependencyHealth.deepFilter,
      },
      `Backend disponível em http://localhost:${config.port}`,
    );
  });

  cleanupExpiredJobs()
    .then((removedCount) => {
      if (removedCount > 0) {
        logger.info({ removedCount }, "Limpeza inicial concluída");
      }
    })
    .catch((error) => {
      logger.error({ err: error }, "Falha na limpeza inicial");
    });

  const cleanupInterval = setInterval(
    () => {
      cleanupExpiredJobs()
        .then((removedCount) => {
          if (removedCount > 0) {
            logger.info({ removedCount }, "Limpeza automática concluída");
          }
        })
        .catch((error) => {
          logger.error({ err: error }, "Falha na limpeza automática");
        });
    },
    60 * 60 * 1000,
  );
  cleanupInterval.unref();

  function shutdown(signal) {
    logger.info({ signal }, "Encerrando servidor");
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
