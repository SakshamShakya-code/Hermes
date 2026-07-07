import { NextResponse } from "next/server";
import { getCurrentYields } from "@/lib/data/fetchYield";

export async function GET() {
  try {
    const yields = await getCurrentYields();
    return NextResponse.json(yields);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch yields: ${String(err)}` },
      { status: 500 }
    );
  }
}
