import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

if (process.env.SKIP_MIGRATIONS !== "1") {
  execSync("node scripts/migrate.mjs", {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
}

const port = process.env.PORT ?? "3001";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const standaloneServer = path.join(rootDir, "server.js");
const useStandalone = fs.existsSync(standaloneServer);

const command = useStandalone ? "node" : "npx";
const args = useStandalone
  ? ["server.js"]
  : ["next", "start", "-H", hostname, "-p", port];

const child = spawn(command, args, {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
