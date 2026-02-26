import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${ENV.API_URL_COMMERCIAL}/checkout/estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
