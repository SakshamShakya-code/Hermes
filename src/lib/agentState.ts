import fs from "fs";
import path from "path";
import type { AgentState } from "@/types";

const STATE_FILE = path.resolve(process.cwd(), "logs", "agent-state.json");

const DEFAULT_STATE: AgentState = {
  currentPosition: "pool",
  entryAPY: 8,
  lastRebalanceTime: null,
  totalRebalances: 0,
};

function ensureLogDir(): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadAgentState(): AgentState {
  try {
    ensureLogDir();
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
  } catch {
    // Fall back to default state
  }
  return { ...DEFAULT_STATE };
}

export function saveAgentState(state: AgentState): void {
  ensureLogDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}
