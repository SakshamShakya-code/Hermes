import { NextResponse } from "next/server";
import { loadAgentState } from "@/lib/agentState";

export async function GET() {
  try {
    const state = loadAgentState();
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load agent state: ${String(err)}` },
      { status: 500 }
    );
  }
}
