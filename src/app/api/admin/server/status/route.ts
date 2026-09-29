import { NextResponse } from "next/server";

export async function GET() {
  const agentUrl = process.env.ADMIN_AGENT_URL;
  const agentToken = process.env.ADMIN_AGENT_TOKEN;

  if (!agentUrl || !agentToken) {
    return NextResponse.json(
      { error: "Admin agent is not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${agentUrl}/status`, {
      headers: {
        "X-Agent-Token": agentToken,
      },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Admin agent is unreachable" },
      { status: 502 },
    );
  }
}