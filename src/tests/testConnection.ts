import { config } from "../lib/config";
import { HttpHandler, PublicKey, PurseIdentifier, RpcClient } from "casper-js-sdk";

async function testConnection(): Promise<void> {
  try {
    console.log("Connecting to Casper Testnet...");
    console.log(`RPC URL: ${config.casper.rpcUrl}`);

    const handler = new HttpHandler(config.casper.rpcUrl);
    const client = new RpcClient(handler);

    const publicKey = PublicKey.fromHex(config.casper.accountPublicKey);
    const accountHash = publicKey.accountHash().toHex();

    console.log(`Account hash: ${accountHash}`);

    const purseId = PurseIdentifier.fromPublicKey(publicKey);
    const balanceResult = await client.queryLatestBalance(purseId);
    const balanceMotes = balanceResult.balance.toNumber();
    const balanceCSPR = balanceMotes / 1_000_000_000;

    console.log(`Account balance: ${balanceCSPR} CSPR`);
    console.log("Connection test passed!");
  } catch (err) {
    console.error("Connection test failed:", err);
    process.exit(1);
  }
}

testConnection();
