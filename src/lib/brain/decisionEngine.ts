import { config } from "../config";
import type { AgentState, Decision, Position, YieldData } from "@/types";

const COOLDOWN_MS = 30 * 60 * 1000;

function positionLabel(position: Position): string {
  return position === "liquid_staking" ? "Liquid Staking" : "Pool";
}

function apyForPosition(yields: YieldData, position: Position): number {
  return position === "liquid_staking"
    ? yields.liquidStakingAPY
    : yields.poolAPY;
}

function bestOpportunity(yields: YieldData): {
  position: Position;
  apy: number;
} {
  if (yields.liquidStakingAPY >= yields.poolAPY) {
    return { position: "liquid_staking", apy: yields.liquidStakingAPY };
  }
  return { position: "pool", apy: yields.poolAPY };
}

export function makeDecision(
  yields: YieldData,
  state: AgentState
): Decision {
  const currentAPY = apyForPosition(yields, state.currentPosition);

  if (
    state.lastRebalanceTime !== null &&
    Date.now() - state.lastRebalanceTime < COOLDOWN_MS
  ) {
    return {
      action: "HOLD",
      from: state.currentPosition,
      to: state.currentPosition,
      reason: "Cooldown active",
      currentAPY,
      targetAPY: currentAPY,
      gain: 0,
    };
  }

  const best = bestOpportunity(yields);
  const gain = best.apy - currentAPY;

  if (best.position === state.currentPosition) {
    return {
      action: "HOLD",
      from: state.currentPosition,
      to: state.currentPosition,
      reason: `Already in best position (${positionLabel(state.currentPosition)} at ${currentAPY}% APY)`,
      currentAPY,
      targetAPY: currentAPY,
      gain: 0,
    };
  }

  if (gain > config.agent.rebalanceThresholdPercent) {
    return {
      action: "REBALANCE",
      from: state.currentPosition,
      to: best.position,
      reason: `Rebalancing from ${positionLabel(state.currentPosition)} (${currentAPY}% APY) to ${positionLabel(best.position)} (${best.apy}% APY) — gain of ${gain.toFixed(1)}% exceeds ${config.agent.rebalanceThresholdPercent}% threshold`,
      currentAPY,
      targetAPY: best.apy,
      gain,
    };
  }

  return {
    action: "HOLD",
    from: state.currentPosition,
    to: state.currentPosition,
    reason: `Gain of ${gain.toFixed(1)}% is below ${config.agent.rebalanceThresholdPercent}% threshold — staying in ${positionLabel(state.currentPosition)}`,
    currentAPY,
    targetAPY: best.apy,
    gain,
  };
}
