import { config } from "../config";
import { error as logError, action } from "../logger";
import type { Decision, ExecutionResult } from "@/types";
import {
  Args,
  CasperNetwork,
  CLValue,
  HttpHandler,
  KeyAlgorithm,
  PrivateKey,
  PublicKey,
  RpcClient,
} from "casper-js-sdk";

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 120_000;
const DEPLOY_COST = 5_000_000_000;
const STAKE_AMOUNT_MOTES = "1000000000";

function loadPrivateKey(secretKey: string): PrivateKey {
  if (secretKey.includes("BEGIN")) {
    const algorithm = secretKey.includes("ED25519")
      ? KeyAlgorithm.ED25519
      : KeyAlgorithm.SECP256K1;
    return PrivateKey.fromPem(secretKey, algorithm);
  }

  try {
    return PrivateKey.fromHex(secretKey, KeyAlgorithm.ED25519);
  } catch {
    return PrivateKey.fromHex(secretKey, KeyAlgorithm.SECP256K1);
  }
}

function loadPublicKey(): PublicKey {
  try {
    return PublicKey.fromHex(config.casper.accountPublicKey);
  } catch {
    return loadPrivateKey(config.casper.accountSecretKey).publicKey;
  }
}

function packageHashFromConfig(): string {
  return config.casper.wiseLendingContractHash.replace(/^hash-/, "");
}

function entryPointForDecision(decision: Decision): string {
  return decision.to === "liquid_staking" ? "stake" : "unstake";
}

function runtimeArgsForDecision(decision: Decision): Args {
  if (decision.to === "liquid_staking") {
    return Args.fromMap({});
  }

  return Args.fromMap({
    scspr_amount: CLValue.newCLUInt256(STAKE_AMOUNT_MOTES),
  });
}

function parseDeployStatus(result: {
  executionResultsV1?: Array<{ result: { success?: unknown; failure?: unknown } }>;
  executionInfo?: {
    executionResult: {
      originExecutionResultV1?: { success?: unknown; failure?: unknown };
      errorMessage?: string;
      consumed: number;
    };
  };
  rawJSON?: { execution_results?: Array<{ result?: { Success?: unknown; Failure?: unknown } }> };
}): "Success" | "Failed" | null {
  if (result.executionResultsV1?.length) {
    const execution = result.executionResultsV1[0].result;
    if (execution.success) return "Success";
    if (execution.failure) return "Failed";
  }

  if (result.executionInfo) {
    const execution = result.executionInfo.executionResult;
    if (execution.originExecutionResultV1?.success) return "Success";
    if (execution.originExecutionResultV1?.failure) return "Failed";
    if (execution.errorMessage) return "Failed";
    if (execution.consumed > 0) return "Success";
  }

  const rawResults = result.rawJSON?.execution_results;
  if (Array.isArray(rawResults) && rawResults.length > 0) {
    const outcome = rawResults[0]?.result;
    if (outcome?.Success) return "Success";
    if (outcome?.Failure) return "Failed";
  }

  return null;
}

async function waitForDeployConfirmation(
  client: RpcClient,
  deployHash: string
): Promise<"Success" | "Pending" | "Failed"> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const deployResult = await client.getDeploy(deployHash);
      const status = parseDeployStatus(deployResult);

      if (status === "Success" || status === "Failed") {
        return status;
      }
    } catch {
      // Deploy may not be indexed yet — keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return "Pending";
}

export async function executeRebalance(
  decision: Decision
): Promise<ExecutionResult> {
  const timestamp = Date.now();

  try {
    const privateKey = loadPrivateKey(config.casper.accountSecretKey);
    const publicKey = loadPublicKey();
    const entryPoint = entryPointForDecision(decision);
    const runtimeArgs = runtimeArgsForDecision(decision);

    const handler = new HttpHandler(config.casper.rpcUrl);
    const client = new RpcClient(handler);
    const network = await CasperNetwork.create(client);

    const transaction = network.createContractPackageCallTransaction(
      publicKey,
      packageHashFromConfig(),
      entryPoint,
      "casper-test",
      DEPLOY_COST,
      runtimeArgs,
      1_800_000
    );

    transaction.sign(privateKey);

    const deploy = transaction.getDeploy();
    if (!deploy) {
      logError("Failed to build deploy from transaction");
      return { deployHash: "", status: "Failed", timestamp };
    }

    const deployHash = deploy.hash.toHex();
    await network.putTransaction(transaction);

    action(
      `Submitted ${entryPoint} rebalance deploy to Wise Lending`,
      deployHash
    );

    const status = await waitForDeployConfirmation(client, deployHash);

    return { deployHash, status, timestamp };
  } catch (err) {
    logError(`Rebalance execution failed: ${String(err)}`);
    return { deployHash: "", status: "Failed", timestamp };
  }
}
