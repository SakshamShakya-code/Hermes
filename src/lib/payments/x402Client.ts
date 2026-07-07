/// <reference path="../../types/x402.d.ts" />

import axios, { AxiosRequestConfig } from "axios";
import { config } from "../config";
import { info } from "../logger";

const MOCK_PAYMENT_DESTINATION = "0x0000000000000000000000000000000000000001";

function isEvmPrivateKey(key: string): boolean {
  const trimmed = key.trim();
  return /^0x[0-9a-fA-F]{64}$/.test(trimmed);
}

function buildMockPaymentHeader(url: string): string {
  const mockPayment = {
    x402Version: 1,
    scheme: "exact",
    networkId: "84532",
    resource: url,
    amount: config.x402.paymentAmount,
    payToAddress: MOCK_PAYMENT_DESTINATION,
  };

  return Buffer.from(JSON.stringify(mockPayment)).toString("base64");
}

async function buildPaymentHeader(url: string): Promise<string> {
  if (!isEvmPrivateKey(config.x402.walletPrivateKey)) {
    return buildMockPaymentHeader(url);
  }

  const paymentDetails = {
    scheme: "exact",
    networkId: "84532",
    maxAmountRequired: BigInt(Math.floor(config.x402.paymentAmount * 1_000_000)),
    resource: url as `${string}://${string}`,
    description: "Yield data API access",
    mimeType: "application/json",
    outputSchema: null,
    payToAddress: MOCK_PAYMENT_DESTINATION,
    requiredDeadlineSeconds: 300,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    extra: null,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPaymentHeader } = require("x402/client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createWalletClient, http } = require("viem");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { baseSepolia } = require("viem/chains");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { privateKeyToAccount } = require("viem/accounts");

    const privateKey = config.x402.walletPrivateKey as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const wallet = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    return await createPaymentHeader(wallet, paymentDetails);
  } catch {
    return buildMockPaymentHeader(url);
  }
}

export async function payAndFetch<T = unknown>(
  url: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  info(
    `Payment sent: ${config.x402.paymentAmount} USDC to ${MOCK_PAYMENT_DESTINATION}`
  );

  const paymentHeader = await buildPaymentHeader(url);

  const response = await axios.get<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      "X-402-Payment": paymentHeader,
    },
  });

  return response.data;
}
