import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

const healthUrl = "http://127.0.0.1:3000/api/health";

export default async function globalSetup() {
  if (await isHealthy()) return;

  const nextEntry = path.resolve("node_modules", "next", "dist", "bin", "next");
  const server = spawn(process.execPath, [nextEntry, "dev"], {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env: process.env,
    stdio: "ignore",
    windowsHide: true,
  });
  server.unref();

  try {
    await waitForHealth(server, 120_000);
  } catch (error) {
    stopProcessTree(server);
    throw error;
  }

  return () => {
    stopProcessTree(server);
  };
}

async function waitForHealth(server: ChildProcess, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(
        `E2E server exited before becoming ready (${server.exitCode}).`,
      );
    }
    if (await isHealthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`E2E server did not become healthy within ${timeoutMs}ms.`);
}

async function isHealthy() {
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(1_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopProcessTree(server: ChildProcess) {
  if (!server.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // The server may already have stopped between the health check and teardown.
  }
}
