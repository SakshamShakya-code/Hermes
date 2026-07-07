import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  casper: {
    rpcUrl: requireEnv("CASPER_RPC_URL"),
    accountSecretKey: requireEnv("CASPER_ACCOUNT_SECRET_KEY"),
    accountPublicKey: requireEnv("CASPER_ACCOUNT_PUBLIC_KEY"),
    wiseLendingContractHash: requireEnv("WISE_LENDING_CONTRACT_HASH"),
  },
  x402: {
    paymentAmount: parseFloat(requireEnv("X402_PAYMENT_AMOUNT")),
    walletPrivateKey: requireEnv("X402_WALLET_PRIVATE_KEY"),
    yieldApiUrl: optionalEnv("X402_YIELD_API_URL", "http://localhost:3001/api/yield"),
  },
  agent: {
    rebalanceThresholdPercent: parseFloat(
      requireEnv("REBALANCE_THRESHOLD_PERCENT")
    ),
    intervalMinutes: parseInt(requireEnv("AGENT_INTERVAL_MINUTES"), 10),
  },
  app: {
    title: optionalEnv("NEXT_PUBLIC_APP_TITLE", "Yield Agent — Casper DeFi"),
  },
} as const;

export type Config = typeof config;
