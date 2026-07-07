import fs from "fs";
import path from "path";
import type { LogEntry, LogLevel } from "@/types";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "agent.log");

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeLog(level: LogLevel, message: string, deployHash?: string): void {
  ensureLogDir();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(deployHash ? { deployHash } : {}),
  };

  const consolePrefix = `[${entry.timestamp}] [${level}]`;
  console.log(`${consolePrefix} ${message}${deployHash ? ` (deploy: ${deployHash})` : ""}`);

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
}

export function info(message: string): void {
  writeLog("INFO", message);
}

export function warn(message: string): void {
  writeLog("WARN", message);
}

export function error(message: string): void {
  writeLog("ERROR", message);
}

export function action(message: string, deployHash?: string): void {
  writeLog("ACTION", message, deployHash);
}
