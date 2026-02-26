import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }
  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }
  const res = await fetch(`${ENV.API_URL_COMMERCIAL}/order/${orderId}/cancel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
