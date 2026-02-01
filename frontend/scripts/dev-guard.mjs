#!/usr/bin/env node
/**
 * dev-guard.mjs
 *
 * Pre-dev script to check and clean up stale processes on dev ports.
 * Prevents EADDRINUSE errors by ensuring ports are free before starting.
 *
 * Only kills processes that match our sigongOn project path.
 */

import { execSync } from "child_process";

const DEV_PORTS = [3033, 3034]; // admin, mobile
const PROJECT_IDENTIFIER = "sigongOn-dev/frontend";

/**
 * Get process info using a port
 * @param {number} port
 * @returns {{ pid: number, command: string } | null}
 */
function getProcessOnPort(port) {
  try {
    // Try lsof first (macOS/Linux)
    const output = execSync(`lsof -i :${port} -t 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    if (output) {
      const pid = parseInt(output.split("\n")[0], 10);
      // Get command info for this PID
      try {
        const cmdline = execSync(`ps -p ${pid} -o args= 2>/dev/null`, {
          encoding: "utf-8",
        }).trim();
        return { pid, command: cmdline };
      } catch {
        return { pid, command: "unknown" };
      }
    }
  } catch {
    // lsof failed, try ss (Linux)
    try {
      const ssOutput = execSync(`ss -tlnp 2>/dev/null | grep :${port}`, {
        encoding: "utf-8",
      });
      const pidMatch = ssOutput.match(/pid=(\d+)/);
      if (pidMatch) {
        const pid = parseInt(pidMatch[1], 10);
        try {
          const cmdline = execSync(`ps -p ${pid} -o args= 2>/dev/null`, {
            encoding: "utf-8",
          }).trim();
          return { pid, command: cmdline };
        } catch {
          return { pid, command: "unknown" };
        }
      }
    } catch {
      // No process on port
    }
  }
  return null;
}

/**
 * Check if process belongs to our project
 * @param {{ pid: number, command: string }} processInfo
 * @returns {boolean}
 */
function isOurProcess(processInfo) {
  if (!processInfo) return false;

  // Check if the command contains our project identifier
  if (processInfo.command.includes(PROJECT_IDENTIFIER)) {
    return true;
  }

  // Also check /proc/cwd for the process (Linux)
  try {
    const cwd = execSync(`readlink /proc/${processInfo.pid}/cwd 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    return cwd.includes(PROJECT_IDENTIFIER);
  } catch {
    // /proc not available (macOS) - check via lsof
    try {
      const lsofOutput = execSync(
        `lsof -p ${processInfo.pid} 2>/dev/null | grep cwd`,
        { encoding: "utf-8" },
      );
      return lsofOutput.includes(PROJECT_IDENTIFIER);
    } catch {
      return false;
    }
  }
}

/**
 * Safely kill a process
 * @param {number} pid
 * @returns {boolean}
 */
function killProcess(pid) {
  try {
    execSync(`kill ${pid} 2>/dev/null`);
    // Wait a moment for process to terminate
    execSync("sleep 0.5");
    // Verify it's dead
    try {
      execSync(`kill -0 ${pid} 2>/dev/null`);
      // Still alive, try SIGKILL
      execSync(`kill -9 ${pid} 2>/dev/null`);
      execSync("sleep 0.3");
    } catch {
      // Process is dead, good
    }
    return true;
  } catch {
    return false;
  }
}

// Main execution
console.log("\x1b[36m[dev-guard]\x1b[0m Checking dev ports...");

let hasErrors = false;

for (const port of DEV_PORTS) {
  const processInfo = getProcessOnPort(port);

  if (!processInfo) {
    console.log(`  \x1b[32m[OK]\x1b[0m Port ${port} is free`);
    continue;
  }

  if (isOurProcess(processInfo)) {
    console.log(
      `  \x1b[33m[CLEANING]\x1b[0m Port ${port} has stale sigongon process (PID ${processInfo.pid})`,
    );
    if (killProcess(processInfo.pid)) {
      console.log(
        `    \x1b[32m[KILLED]\x1b[0m Successfully cleaned up PID ${processInfo.pid}`,
      );
    } else {
      console.log(
        `    \x1b[31m[FAILED]\x1b[0m Could not kill PID ${processInfo.pid}`,
      );
      hasErrors = true;
    }
  } else {
    console.log(
      `  \x1b[31m[BLOCKED]\x1b[0m Port ${port} is in use by another process:`,
    );
    console.log(`    PID: ${processInfo.pid}`);
    console.log(`    Command: ${processInfo.command}`);
    console.log(`  \x1b[33m[TIP]\x1b[0m Run: kill ${processInfo.pid}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log(
    "\n\x1b[31m[dev-guard]\x1b[0m Some ports are blocked. Please resolve manually.\n",
  );
  process.exit(1);
}

console.log("\x1b[36m[dev-guard]\x1b[0m All ports ready!\n");
