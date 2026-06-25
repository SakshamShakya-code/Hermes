# Yield Agent — Cursor AI Build Instructions

## Project Summary

Build an autonomous DeFi yield agent on the Casper blockchain.
The agent watches yield rates on Wise Lending (a real Casper ecosystem partner),
automatically moves funds when a better rate is found,
and pays for every data API call using x402 micropayments.
Show everything on a live Next.js dashboard.

---

## Tech Stack

- Framework: Next.js 14 with App Router
- Language: TypeScript (all files must be .ts or .tsx — no .js inside src/)
- Blockchain: casper-js-sdk (Casper Testnet only — never Mainnet)
- HTTP requests: axios
- Payments: x402 npm package
- Agent loop: node-cron + ts-node (runs as a separate process from Next.js)
- Styling: Tailwind CSS
- Config: dotenv via .env.local

---

## Folder Structure to Create

```
yield-agent/
├── .env.local
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
│
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── lib/
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── data/
│   │   │   └── fetchYield.ts
│   │   ├── payments/
│   │   │   └── x402Client.ts
│   │   ├── brain/
│   │   │   └── decisionEngine.ts
│   │   └── executor/
│   │       └── casperExecutor.ts
│   ├── agent/
│   │   └── worker.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── logs/route.ts
│   │       ├── yields/route.ts
│   │       └── agent/run/route.ts
│   └── tests/
│       ├── mockX402Server.ts
│       ├── testConnection.ts
│       ├── testFetch.ts
│       ├── testDecision.ts
│       └── testExecutor.ts
│
└── logs/
    └── agent.log
```

---

## Environment Variables

Create .env.local with these keys:

- CASPER_RPC_URL — Casper Testnet RPC endpoint
- CASPER_ACCOUNT_SECRET_KEY — Testnet account secret key
- CASPER_ACCOUNT_PUBLIC_KEY — Testnet account public key
- WISE_LENDING_CONTRACT_HASH — Wise Lending contract hash on testnet
- X402_PAYMENT_AMOUNT — Amount to pay per API call (e.g. 0.001)
- X402_WALLET_PRIVATE_KEY — Wallet key for x402 payments
- REBALANCE_THRESHOLD_PERCENT — Minimum APY gain to trigger rebalance (e.g. 2)
- AGENT_INTERVAL_MINUTES — How often agent runs (e.g. 5)
- NEXT_PUBLIC_APP_TITLE — Dashboard title shown in browser

---

## Important Rules for Cursor

- Build one phase at a time — do not start the next phase until the current one passes its test
- The agent worker (src/agent/worker.ts) runs as a separate terminal process using ts-node — it is NOT a Next.js API route
- Never hardcode secret keys — always read from process.env
- Always use async/await — no .then() chains
- Always wrap casper-js-sdk calls in try/catch
- If Wise Lending has no live x402 endpoint, use the mock x402 server from Phase 2 as the data source — this is intentional
- Use Casper Testnet only

---

## Phase 1 — Project Setup and Casper Connection

### What to build
- Initialize Next.js 14 project with TypeScript, Tailwind, App Router, and src/ directory
- Install dependencies: casper-js-sdk, axios, node-cron, x402, express, dotenv, and their TypeScript types
- Create the full folder structure listed above (empty files are fine for now)
- Create .env.local with all variables listed above using placeholder values
- Create src/types/index.ts first — define TypeScript interfaces for: YieldData, AgentState, Decision, ExecutionResult, and LogEntry
- Create src/lib/config.ts — reads all env variables and exports them as a typed config object
- Create src/lib/logger.ts — exports info(), warn(), error(), and action() functions that log to console and append entries to logs/agent.log as newline-delimited JSON
- Create src/tests/testConnection.ts — connects to Casper Testnet RPC using casper-js-sdk, reads the account balance of the configured public key, and logs it

### Test to pass before moving on
- Run: npx ts-node src/tests/testConnection.ts
- Expected result: account balance is printed to the console without errors
- If it fails: check CASPER_RPC_URL and CASPER_ACCOUNT_PUBLIC_KEY in .env.local

---

## Phase 2 — Yield Data Fetcher with x402 Payment

### What to build
- Create src/lib/payments/x402Client.ts — a function called payAndFetch() that attaches an x402 payment header to every API request before sending it, and logs the payment amount and destination before each call
- Create src/lib/data/fetchYield.ts — a function called getCurrentYields() that calls payAndFetch() to request yield data and returns a YieldData object containing liquidStakingAPY, poolAPY, timestamp, and source
- Create src/tests/mockX402Server.ts — a standalone Express server running on localhost:3001 with one endpoint: GET /api/yield. If the request has the X-402-Payment header, return mock yield JSON with liquidStakingAPY: 14.2 and poolAPY: 8.1. If the header is missing, return HTTP 402 with a payment required message
- Create src/tests/testFetch.ts — runs getCurrentYields() and logs the result

### Test to pass before moving on
- Run mock server in one terminal: npx ts-node src/tests/mockX402Server.ts
- Run fetch test in another terminal: npx ts-node src/tests/testFetch.ts
- Expected result: logs show "payment sent" before the yield data is returned
- Confirm: calling the mock server without the payment header returns a 402 response

---

## Phase 3 — Decision Brain

### What to build
- Create src/lib/brain/decisionEngine.ts — a function called makeDecision() that takes the current YieldData and AgentState, and returns a Decision object
- The decision logic must follow these rules:
  - If the last rebalance was less than 30 minutes ago, return HOLD with reason "Cooldown active"
  - Find the best available APY between liquidStakingAPY and poolAPY
  - Calculate the gain: best available APY minus the current position APY
  - If gain is greater than the configured threshold, return REBALANCE with full reasoning
  - Otherwise return HOLD with reasoning showing the gain was below threshold
- The Decision object must include: action, from, to, reason, currentAPY, targetAPY, and gain
- Create src/tests/testDecision.ts with exactly 3 scenarios:
  - Scenario A: liquidStakingAPY 15%, currentAPY 8% — must return REBALANCE
  - Scenario B: liquidStakingAPY 8.5%, currentAPY 8% — must return HOLD (gain too small)
  - Scenario C: same as A but last rebalance was 10 minutes ago — must return HOLD (cooldown)

### Test to pass before moving on
- Run: npx ts-node src/tests/testDecision.ts
- Expected result: all 3 scenarios log the correct decision with clear reasoning
- All 3 must pass — no unexpected results

---

## Phase 4 — Casper Transaction Executor

### What to build
- Create src/lib/executor/casperExecutor.ts — a function called executeRebalance() that takes a Decision object and submits a real transaction to Casper Testnet
- The function must:
  - Load the secret key from config
  - Build a Casper Deploy that calls the Wise Lending contract — use the "stake" entry point when moving into liquid staking, and "unstake" when moving out
  - Sign the deploy with the account secret key
  - Submit the deploy to Casper Testnet RPC
  - Poll the RPC every 10 seconds to check if the deploy status is "Success"
  - Timeout after 2 minutes and return status "Pending" if not confirmed
  - On any error, return status "Failed" — never throw an unhandled exception
- Return an ExecutionResult object containing: deployHash, status, and timestamp
- Create src/tests/testExecutor.ts — builds a mock REBALANCE decision, calls executeRebalance(), and logs the result

### Test to pass before moving on
- Run: npx ts-node src/tests/testExecutor.ts
- Expected result: a deploy hash is returned and logged
- Go to https://testnet.cspr.live, search the deploy hash — status must show "Success"
- If "Failed": check the Wise Lending contract hash and account balance in .env.local

---

## Phase 5 — Agent Loop and Dashboard

### What to build

**Agent Worker (src/agent/worker.ts)**
- This is a standalone script that runs with ts-node — it is not part of Next.js
- On startup: run one agent cycle immediately
- Then: schedule recurring cycles using node-cron at the configured interval
- Each cycle must do these steps in order:
  - Call getCurrentYields() to fetch yield data (x402 payment happens here)
  - Call makeDecision() with the yield data and current agent state
  - If decision is REBALANCE: call executeRebalance() and update agent state on success
  - If decision is HOLD: log the reason, do nothing
  - Log every step via logger
- Agent state must track: currentPosition, entryAPY, lastRebalanceTime, totalRebalances
- Wrap the entire cycle in try/catch — a failed cycle must log the error and wait for the next cycle, not crash the process

**Next.js API Routes**
- Create src/app/api/logs/route.ts — GET endpoint that reads logs/agent.log, parses the newline-delimited JSON, and returns the last 50 entries in reverse order (most recent first)
- Create src/app/api/yields/route.ts — GET endpoint that calls getCurrentYields() and returns the result as JSON
- Create src/app/api/agent/run/route.ts — POST endpoint that manually triggers one agent cycle and returns the decision made

**Dashboard (src/app/page.tsx)**
- Dark background, white text, Tailwind styling
- Auto-refreshes all data every 30 seconds using useEffect and setInterval
- Must show these sections:
  - Header: title "Yield Agent — Casper DeFi", agent status badge (RUNNING in green or STOPPED in red), total rebalances count
  - Current State card: current position (Liquid Staking or Pool), current APY, last rebalance timestamp
  - Activity Log table with columns: Timestamp, Level, Message, Deploy Hash — deploy hashes must be clickable links to https://testnet.cspr.live/deploy/{hash}
  - Color code log rows: ACTION rows in green, ERROR rows in red, INFO rows in grey
  - "Run Agent Cycle Now" button that calls POST /api/agent/run and shows the decision result inline on the page

**Layout (src/app/layout.tsx)**
- Set dark theme, add basic metadata with the app title from env

### How to run everything

- Terminal 1: npm run dev (starts Next.js dashboard at localhost:3000)
- Terminal 2: npx ts-node src/tests/mockX402Server.ts (starts mock x402 data server)
- Terminal 3: npx ts-node src/agent/worker.ts (starts the autonomous agent loop)

### Final test — all of these must be true before the project is complete

- localhost:3000 loads the dashboard with dark theme
- Activity log table shows agent log entries
- "Run Agent Cycle Now" button triggers a cycle and shows the decision on screen
- x402 payment is logged before yield data is returned in every cycle
- If a REBALANCE happens: deploy hash appears in the log table as a clickable link to testnet.cspr.live
- Waiting 5 minutes causes the agent to automatically run another cycle with no manual input
- No crashes or unhandled errors in any of the three terminals
