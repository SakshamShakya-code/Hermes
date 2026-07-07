import { getCurrentYields } from "../lib/data/fetchYield";

async function testFetch(): Promise<void> {
  try {
    console.log("Fetching yield data with x402 payment...");
    const yields = await getCurrentYields();
    console.log("Yield data received:");
    console.log(JSON.stringify(yields, null, 2));
    console.log("Fetch test passed!");
  } catch (err) {
    console.error("Fetch test failed:", err);
    process.exit(1);
  }
}

testFetch();
