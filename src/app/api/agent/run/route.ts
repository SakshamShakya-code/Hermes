import { NextResponse } from "next/server";
import { runAgentCycle } from "@/lib/agentCycle";

export async function POST() {
  try {
    const decision = await runAgentCycle();
    return NextResponse.json({ decision });
  } catch (err) {
    return NextResponse.json(
      { error: `Agent cycle failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
