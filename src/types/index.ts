export type Position = "liquid_staking" | "pool";

export interface YieldData {
  liquidStakingAPY: number;
  poolAPY: number;
  timestamp: number;
  source: string;
}

export interface AgentState {
  currentPosition: Position;
  entryAPY: number;
  lastRebalanceTime: number | null;
  totalRebalances: number;
}

export type DecisionAction = "REBALANCE" | "HOLD";

export interface Decision {
  action: DecisionAction;
  from: Position;
  to: Position;
  reason: string;
  currentAPY: number;
  targetAPY: number;
  gain: number;
}

export type ExecutionStatus = "Success" | "Failed" | "Pending";

export interface ExecutionResult {
  deployHash: string;
  status: ExecutionStatus;
  timestamp: number;
}

export type LogLevel = "INFO" | "WARN" | "ERROR" | "ACTION";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  deployHash?: string;
}
