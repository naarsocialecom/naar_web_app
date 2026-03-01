import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { NAAR_HEADERS } from "@/lib/api-headers";

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = getToken(request);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...NAAR_HEADERS,
  };
  if (token) headers["Authorization"] = token;
  const res = await fetch(`${ENV.API_URL_SOCIAL}/linkClick`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
