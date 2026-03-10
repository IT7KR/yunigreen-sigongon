#!/usr/bin/env node

import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const env = { ...process.env };

// Linux/WSL environments can exhaust inotify watchers in this monorepo.
// Polling avoids EMFILE errors without requiring a global sysctl change.
if (process.platform === "linux" && !env.WATCHPACK_POLLING) {
  env.WATCHPACK_POLLING = "true";
}

const child = spawn(
  process.execPath,
  [nextBin, "dev", "--webpack", "--port", "3033"],
  {
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
