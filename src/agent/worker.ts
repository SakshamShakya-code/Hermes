import { runAgentCycle } from "../lib/agentCycle";
import { config } from "../lib/config";
import { info, error } from "../lib/logger";
import cron from "node-cron";

async function main(): Promise<void> {
  info("Yield Agent worker starting");

  try {
    await runAgentCycle();
  } catch (err) {
    error(`Initial agent cycle failed: ${String(err)}`);
  }

  const cronExpression = `*/${config.agent.intervalMinutes} * * * *`;
  info(`Scheduling agent cycles every ${config.agent.intervalMinutes} minutes`);

  cron.schedule(cronExpression, async () => {
    try {
      await runAgentCycle();
    } catch (err) {
      error(`Agent cycle failed: ${String(err)}`);
    }
  });
}

main();
