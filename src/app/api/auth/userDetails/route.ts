import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const res = await fetch(`${ENV.API_URL_SOCIAL}/userDetails`, {
    headers: { Authorization: auth },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
