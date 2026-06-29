import { type Plugin } from "vite";
import { spawn, type ChildProcess } from "child_process";
import http from "http";
import path from "path";

const BACKEND_URL = "http://localhost:8000/health";

function getRootDir(): string {
  return path.resolve(process.cwd(), "..");
}

function getVenvPython(): string {
  return path.join(getRootDir(), ".venv", "Scripts", "python.exe");
}

function getBackendDir(): string {
  return path.join(getRootDir(), "backend");
}

let backendProcess: ChildProcess | null = null;
let isStarting = false;

function checkBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(BACKEND_URL, { timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

function startBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    if (backendProcess || isStarting) {
      resolve(false);
      return;
    }
    isStarting = true;

    const args = ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"];
    const python = getVenvPython();
    const cwd = getBackendDir();

    backendProcess = spawn(python, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const onOutput = (data: Buffer) => {
      if (data.toString().includes("Uvicorn running on")) {
        isStarting = false;
        resolve(true);
      }
    };

    backendProcess.stdout?.on("data", onOutput);
    backendProcess.stderr?.on("data", onOutput);

    backendProcess.on("error", () => {
      isStarting = false;
      backendProcess = null;
      resolve(false);
    });

    backendProcess.on("exit", () => {
      backendProcess = null;
      isStarting = false;
    });

    setTimeout(() => {
      if (isStarting) {
        isStarting = false;
        resolve(false);
      }
    }, 15000);
  });
}

export function backendLauncher(): Plugin {
  return {
    name: "backend-launcher",

    configureServer(server) {
      server.middlewares.use("/__backend", async (req, res, next) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const pathname = url.pathname;

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");

        if (pathname === "/__backend/status") {
          const alive = await checkBackend();
          res.end(JSON.stringify({ alive, starting: isStarting }));
          return;
        }

        if (pathname === "/__backend/start" && req.method === "POST") {
          if (isStarting) {
            res.statusCode = 409;
            res.end(JSON.stringify({ error: "Already starting" }));
            return;
          }
          const ok = await startBackend();
          if (ok) {
            res.end(JSON.stringify({ success: true }));
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Failed to start backend" }));
          }
          return;
        }

        next();
      });
    },
  };
}
