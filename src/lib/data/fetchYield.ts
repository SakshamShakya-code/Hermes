import { config } from "../config";
import { payAndFetch } from "../payments/x402Client";
import type { YieldData } from "@/types";

interface YieldApiResponse {
  liquidStakingAPY: number;
  poolAPY: number;
}

export async function getCurrentYields(): Promise<YieldData> {
  const data = await payAndFetch<YieldApiResponse>(config.x402.yieldApiUrl);

  return {
    liquidStakingAPY: data.liquidStakingAPY,
    poolAPY: data.poolAPY,
    timestamp: Date.now(),
    source: config.x402.yieldApiUrl,
  };
}
