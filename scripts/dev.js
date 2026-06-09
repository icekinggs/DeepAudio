import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npmCommand, ["run", "dev", "--workspace", "backend"], {
    stdio: "inherit",
    shell: false,
  }),
  spawn(npmCommand, ["run", "dev", "--workspace", "frontend"], {
    stdio: "inherit",
    shell: false,
  }),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(
        `Um processo de desenvolvimento encerrou (${signal || code}).`,
      );
      shutdown(code || 1);
    }
  });
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
