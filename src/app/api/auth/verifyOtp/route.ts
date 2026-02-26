import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET(request: NextRequest) {
  let phoneNumber = request.nextUrl.searchParams.get("phoneNumber");
  const otp = request.nextUrl.searchParams.get("otp");
  if (!phoneNumber || !otp) {
    return NextResponse.json({ error: "phoneNumber and otp required" }, { status: 400 });
  }
  if (phoneNumber.startsWith(" ") && /^\d+$/.test(phoneNumber.slice(1))) {
    phoneNumber = "+" + phoneNumber.trim();
  }
  const res = await fetch(
    `${ENV.API_URL_SOCIAL}/verifyOtp?phoneNumber=${encodeURIComponent(phoneNumber)}&otp=${encodeURIComponent(otp)}`
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
