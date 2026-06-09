import { spawn } from "node:child_process";

export class ProcessExecutionError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ProcessExecutionError";
    this.details = details;
  }
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      reject(
        new ProcessExecutionError(`Não foi possível executar ${command}.`, {
          command,
          code: error.code,
          stdout,
          stderr,
          cause: error.message,
        }),
      );
    });

    child.once("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }

      reject(
        new ProcessExecutionError(`${command} terminou com código ${code}.`, {
          command,
          code,
          stdout,
          stderr,
        }),
      );
    });
  });
}
