import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { NAAR_HEADERS } from "@/lib/api-headers";

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const res = await fetch(`${ENV.API_URL_COMMERCIAL}/addresses`, {
    headers: { Authorization: token, ...NAAR_HEADERS },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${ENV.API_URL_COMMERCIAL}/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...NAAR_HEADERS,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
