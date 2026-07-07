import { getCurrentYields } from "./data/fetchYield";
import { makeDecision } from "./brain/decisionEngine";
import { executeRebalance } from "./executor/casperExecutor";
import { loadAgentState, saveAgentState } from "./agentState";
import { info, warn, error, action } from "./logger";
import type { AgentState, Decision } from "@/types";

export async function runAgentCycle(): Promise<Decision> {
  const state = loadAgentState();

  info("Agent cycle started");

  const yields = await getCurrentYields();
  info(
    `Yield data fetched — Liquid Staking: ${yields.liquidStakingAPY}% | Pool: ${yields.poolAPY}%`
  );

  const decision = makeDecision(yields, state);
  info(`Decision: ${decision.action} — ${decision.reason}`);

  if (decision.action === "REBALANCE") {
    action(`Executing rebalance: ${decision.from} → ${decision.to}`);
    const result = await executeRebalance(decision);

    if (result.status === "Success") {
      const updatedState: AgentState = {
        currentPosition: decision.to,
        entryAPY: decision.targetAPY,
        lastRebalanceTime: Date.now(),
        totalRebalances: state.totalRebalances + 1,
      };
      saveAgentState(updatedState);
      action(`Rebalance confirmed on-chain`, result.deployHash);
    } else if (result.status === "Pending") {
      warn(`Rebalance deploy pending: ${result.deployHash}`);
    } else {
      error(`Rebalance failed for deploy ${result.deployHash || "unknown"}`);
    }
  } else {
    info(`Holding position — ${decision.reason}`);
  }

  info("Agent cycle completed");
  return decision;
}
