import { executeRebalance } from "../lib/executor/casperExecutor";
import type { Decision } from "@/types";

async function testExecutor(): Promise<void> {
  const mockDecision: Decision = {
    action: "REBALANCE",
    from: "pool",
    to: "liquid_staking",
    reason: "Test rebalance from pool to liquid staking",
    currentAPY: 8,
    targetAPY: 15,
    gain: 7,
  };

  try {
    console.log("Executing mock REBALANCE decision on Casper Testnet...");
    console.log(`Decision: ${mockDecision.reason}`);

    const result = await executeRebalance(mockDecision);

    console.log("\nExecution result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.deployHash) {
      console.log(
        `\nView deploy: https://testnet.cspr.live/deploy/${result.deployHash}`
      );
    }

    if (result.status === "Failed" && !result.deployHash) {
      process.exit(1);
    }

    console.log("\nExecutor test completed.");
  } catch (err) {
    console.error("Executor test failed:", err);
    process.exit(1);
  }
}

testExecutor();
