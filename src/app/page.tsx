"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentState, Decision, LogEntry, YieldData } from "@/types";

function formatPosition(position: string): string {
  return position === "liquid_staking" ? "Liquid Staking" : "Pool";
}

function formatTimestamp(ts: string | number | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString();
}

function logRowClass(level: string): string {
  switch (level) {
    case "ACTION":
      return "text-green-400";
    case "ERROR":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [yields, setYields] = useState<YieldData | null>(null);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, yieldsRes, stateRes] = await Promise.all([
        fetch("/api/logs"),
        fetch("/api/yields"),
        fetch("/api/state"),
      ]);

      if (stateRes.ok) {
        setAgentState(await stateRes.json());
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);

        const recentActivity = logsData.some(
          (entry: LogEntry) =>
            Date.now() - new Date(entry.timestamp).getTime() < 15 * 60 * 1000
        );
        setWorkerRunning(recentActivity);
      }

      if (yieldsRes.ok) {
        const yieldsData = await yieldsRes.json();
        setYields(yieldsData);
        setError(null);
      } else {
        const errData = await yieldsRes.json();
        setError(errData.error ?? "Failed to fetch yields");
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleRunCycle() {
    setRunningCycle(true);
    setLastDecision(null);
    try {
      const res = await fetch("/api/agent/run", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLastDecision(data.decision);
        await fetchData();
      } else {
        setError(data.error ?? "Agent cycle failed");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunningCycle(false);
    }
  }

  const title =
    process.env.NEXT_PUBLIC_APP_TITLE ?? "Yield Agent — Casper DeFi";

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-gray-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-1 text-gray-400">
              Autonomous DeFi yield agent on Casper Testnet
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                workerRunning
                  ? "bg-green-900 text-green-300"
                  : "bg-red-900 text-red-300"
              }`}
            >
              {workerRunning ? "RUNNING" : "STOPPED"}
            </span>
            <span className="text-sm text-gray-400">
              Total rebalances: {agentState?.totalRebalances ?? 0}
            </span>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Current State</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Position</dt>
                <dd className="font-medium">
                  {formatPosition(agentState?.currentPosition ?? "pool")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Current APY</dt>
                <dd className="font-medium">
                  {agentState?.entryAPY?.toFixed(1) ?? "—"}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Liquid Staking APY</dt>
                <dd>{yields?.liquidStakingAPY?.toFixed(1) ?? "—"}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Pool APY</dt>
                <dd>{yields?.poolAPY?.toFixed(1) ?? "—"}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Last Rebalance</dt>
                <dd>{formatTimestamp(agentState?.lastRebalanceTime ?? null)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Manual Control</h2>
            <button
              onClick={handleRunCycle}
              disabled={runningCycle}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {runningCycle ? "Running..." : "Run Agent Cycle Now"}
            </button>
            {lastDecision && (
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-950 p-4 text-sm">
                <p className="font-semibold text-blue-300">
                  Decision: {lastDecision.action}
                </p>
                <p className="mt-2 text-gray-300">{lastDecision.reason}</p>
                <p className="mt-1 text-gray-500">
                  Gain: {lastDecision.gain.toFixed(1)}% | Current:{" "}
                  {lastDecision.currentAPY}% → Target:{" "}
                  {lastDecision.targetAPY}%
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Activity Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Level</th>
                  <th className="pb-3 pr-4">Message</th>
                  <th className="pb-3">Deploy Hash</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No log entries yet. Start the agent worker to see activity.
                    </td>
                  </tr>
                ) : (
                  logs.map((entry, i) => (
                    <tr
                      key={`${entry.timestamp}-${i}`}
                      className={`border-b border-gray-800/50 ${logRowClass(entry.level)}`}
                    >
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="py-3 pr-4">{entry.level}</td>
                      <td className="py-3 pr-4">{entry.message}</td>
                      <td className="py-3">
                        {entry.deployHash ? (
                          <a
                            href={`https://testnet.cspr.live/deploy/${entry.deployHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline hover:text-blue-300"
                          >
                            {entry.deployHash.slice(0, 12)}...
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
