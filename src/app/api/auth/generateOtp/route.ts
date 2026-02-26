import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET(request: NextRequest) {
  let phoneNumber = request.nextUrl.searchParams.get("phoneNumber");
  if (!phoneNumber) {
    return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
  }
  if (phoneNumber.startsWith(" ") && /^\d+$/.test(phoneNumber.slice(1))) {
    phoneNumber = "+" + phoneNumber.trim();
  }
  const res = await fetch(
    `${ENV.API_URL_SOCIAL}/generateOtp?phoneNumber=${encodeURIComponent(phoneNumber)}`
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
