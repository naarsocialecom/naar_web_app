import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET(request: NextRequest) {
  let phoneNumber = request.nextUrl.searchParams.get("phoneNumber")?.trim();
  const otp = request.nextUrl.searchParams.get("otp");
  if (!phoneNumber || !otp) {
    return NextResponse.json({ error: "phoneNumber and otp required" }, { status: 400 });
  }
  if (phoneNumber.startsWith("91") && !phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
  }
  const targetUrl = `${ENV.API_URL_SOCIAL}/verifyOtp?phoneNumber=${phoneNumber}&otp=${otp}`;
  const res = await fetch(targetUrl);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
