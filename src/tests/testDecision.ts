import { makeDecision } from "../lib/brain/decisionEngine";
import type { AgentState } from "@/types";

function runScenario(
  name: string,
  yields: { liquidStakingAPY: number; poolAPY: number },
  state: AgentState,
  expectedAction: "REBALANCE" | "HOLD"
): boolean {
  const decision = makeDecision(
    {
      ...yields,
      timestamp: Date.now(),
      source: "test",
    },
    state
  );

  const passed = decision.action === expectedAction;
  const status = passed ? "PASS" : "FAIL";

  console.log(`\n--- Scenario ${name} [${status}] ---`);
  console.log(`Expected: ${expectedAction}`);
  console.log(`Action: ${decision.action}`);
  console.log(`Reason: ${decision.reason}`);
  console.log(
    `Current APY: ${decision.currentAPY}% | Target APY: ${decision.targetAPY}% | Gain: ${decision.gain}%`
  );

  return passed;
}

function main(): void {
  const baseState: AgentState = {
    currentPosition: "pool",
    entryAPY: 8,
    lastRebalanceTime: null,
    totalRebalances: 0,
  };

  const results = [
    runScenario(
      "A",
      { liquidStakingAPY: 15, poolAPY: 8 },
      baseState,
      "REBALANCE"
    ),
    runScenario(
      "B",
      { liquidStakingAPY: 8.5, poolAPY: 8 },
      baseState,
      "HOLD"
    ),
    runScenario(
      "C",
      { liquidStakingAPY: 15, poolAPY: 8 },
      {
        ...baseState,
        lastRebalanceTime: Date.now() - 10 * 60 * 1000,
      },
      "HOLD"
    ),
  ];

  const allPassed = results.every(Boolean);
  console.log(
    allPassed
      ? "\nAll decision tests passed!"
      : "\nSome decision tests failed!"
  );

  if (!allPassed) {
    process.exit(1);
  }
}

main();
