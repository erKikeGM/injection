#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawnSync } = require("node:child_process");

const PROJECT_NAME = "AI Ethical Immune Layer Lab";
const COMPOSE_PROJECT_NAME = "ethical-immune-layer";
const DEFAULT_PORT = process.env.APP_PORT || "4173";

const state = {
  action: "start",
  port: "",
  noOpen: false,
  noPause: false
};

function banner() {
  console.log(`+------------------------------------------------+
|  AI ETHICAL IMMUNE LAYER LAB                   |
|  one-click Docker launcher                     |
+------------------------------------------------+`);
}

function usage() {
  console.log(`Usage:
  EthicalImmuneLayerRunner.exe [options]

Options:
  --port <number>    Browser port to use, default 4173
  --port=<number>    Same as --port <number>
  --no-open          Start without opening the browser
  --no-pause         Do not pause before closing on Windows
  --stop             Stop the Docker stack
  --logs             Show service logs
  --help             Show this help`);
}

function parseArgs(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--port") {
      index += 1;
      if (!argv[index]) throw new Error("--port requires a value");
      state.port = argv[index];
    } else if (arg.startsWith("--port=")) {
      state.port = arg.slice("--port=".length);
    } else if (arg === "--no-open") {
      state.noOpen = true;
    } else if (arg === "--no-pause") {
      state.noPause = true;
    } else if (arg === "--stop") {
      state.action = "stop";
    } else if (arg === "--logs") {
      state.action = "logs";
    } else if (arg === "--help" || arg === "-h") {
      state.action = "help";
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
}

function projectRoot() {
  const candidates = [
    process.cwd(),
    path.dirname(process.execPath),
    path.resolve(__dirname, "..", "..")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "docker-compose.yml")) && fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("Could not locate project root. Run this launcher from the repository root or place the EXE in the repository root.");
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    shell: false
  });
}

function detectCompose(root) {
  const dockerVersion = run("docker", ["--version"], { cwd: root });
  if (dockerVersion.error || dockerVersion.status !== 0) {
    throw new Error("Docker is not installed. Install Docker Desktop, then run this launcher again.");
  }

  const dockerInfo = run("docker", ["info"], { cwd: root });
  if (dockerInfo.error || dockerInfo.status !== 0) {
    throw new Error("Docker is installed but not running. Start Docker Desktop, then run this launcher again.");
  }

  const composePlugin = run("docker", ["compose", "version"], { cwd: root });
  if (!composePlugin.error && composePlugin.status === 0) {
    return { command: "docker", baseArgs: ["compose"] };
  }

  const composeLegacy = run("docker-compose", ["version"], { cwd: root });
  if (!composeLegacy.error && composeLegacy.status === 0) {
    return { command: "docker-compose", baseArgs: [] };
  }

  throw new Error("Docker Compose is not available. Update Docker Desktop or install Docker Compose.");
}

function validatePort(value) {
  if (!/^\d+$/.test(String(value))) throw new Error(`Port must be numeric: ${value}`);
  const port = Number(value);
  if (port < 1024 || port > 65535) throw new Error(`Port must be between 1024 and 65535: ${value}`);
  return port;
}

function portBusy(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port, "127.0.0.1");
  });
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function choosePort(preferred) {
  const port = validatePort(preferred);
  if (!(await portBusy(port))) return port;

  const suggestions = [];
  for (const candidate of [4174, 4175, 4180, 4200, 4300, 4500]) {
    if (!(await portBusy(candidate))) suggestions.push(candidate);
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    console.log(`Port ${port} is already in use.`);
    console.log("Choose a free port:");
    suggestions.forEach((candidate, index) => console.log(`  ${index + 1}) ${candidate}`));
    console.log("  c) custom port");
    const selection = await prompt("Selection: ");
    if (selection.toLowerCase() === "c") {
      const custom = validatePort(await prompt("Custom port: "));
      if (await portBusy(custom)) throw new Error(`Port ${custom} is also busy.`);
      return custom;
    }
    const selectedIndex = Number(selection) - 1;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= suggestions.length) {
      throw new Error("Invalid port selection.");
    }
    return suggestions[selectedIndex];
  }

  if (suggestions.length) return suggestions[0];
  throw new Error(`Port ${port} is busy. Re-run with --port <free-port>.`);
}

function composeRun(compose, root, args, env, stdio = "inherit") {
  const result = run(compose.command, [...compose.baseArgs, ...args], {
    cwd: root,
    env,
    stdio
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${compose.command} ${[...compose.baseArgs, ...args].join(" ")} failed.`);
  return result;
}

function waitForReady(url) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    process.stdout.write(`Waiting for ${url}`);
    const timer = setInterval(() => {
      attempts += 1;
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          clearInterval(timer);
          process.stdout.write("\n");
          resolve();
        } else {
          process.stdout.write(".");
        }
      });
      request.on("error", () => {
        process.stdout.write(".");
        if (attempts >= 90) {
          clearInterval(timer);
          reject(new Error(`The app did not become ready at ${url}`));
        }
      });
      request.setTimeout(1000, () => request.destroy());
    }, 1000);
  });
}

function openBrowser(url) {
  if (state.noOpen) return;
  if (process.platform === "win32") {
    spawnSync("cmd", ["/c", "start", "", url], { stdio: "ignore", shell: false });
    return;
  }
  if (process.platform === "darwin") {
    spawnSync("open", [url], { stdio: "ignore", shell: false });
    return;
  }
  spawnSync("xdg-open", [url], { stdio: "ignore", shell: false });
}

async function pauseIfWindows() {
  if (state.noPause || process.platform !== "win32" || !process.stdin.isTTY) return;
  await prompt("Press Enter to close this launcher...");
}

async function main() {
  parseArgs(process.argv.slice(2));
  banner();
  if (state.action === "help") {
    usage();
    return;
  }

  const root = projectRoot();
  const compose = detectCompose(root);
  const env = {
    ...process.env,
    COMPOSE_PROJECT_NAME,
    APP_PORT: String(state.port || DEFAULT_PORT)
  };

  if (state.action === "stop") {
    composeRun(compose, root, ["down"], env);
    console.log(`Stopped ${PROJECT_NAME}.`);
    return;
  }

  if (state.action === "logs") {
    composeRun(compose, root, ["logs", "-f", "--tail=120"], env);
    return;
  }

  const port = await choosePort(state.port || DEFAULT_PORT);
  env.APP_PORT = String(port);
  const url = process.env.APP_URL || `http://localhost:${port}/platform/`;

  console.log(`Starting ${PROJECT_NAME} on ${url}`);
  composeRun(compose, root, ["up", "--build", "-d"], env);
  await waitForReady(url);
  openBrowser(url);

  console.log(`
${PROJECT_NAME} is running.
URL:  ${url}
Stop: EthicalImmuneLayerRunner.exe --stop
Logs: EthicalImmuneLayerRunner.exe --logs`);
}

main()
  .then(pauseIfWindows)
  .catch(async (error) => {
    console.error(`Error: ${error.message || error}`);
    process.exitCode = 1;
    await pauseIfWindows();
  });
