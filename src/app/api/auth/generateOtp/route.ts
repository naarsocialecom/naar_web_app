import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";
import { NAAR_HEADERS } from "@/lib/api-headers";

export async function GET(request: NextRequest) {
  let phoneNumber = request.nextUrl.searchParams.get("phoneNumber")?.trim();
  if (!phoneNumber) {
    return NextResponse.json({ error: "phoneNumber required" }, { status: 400 });
  }
  if (phoneNumber.startsWith("91") && !phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
  }
  const url = new URL(`${ENV.API_URL_SOCIAL}/generateOtp`);
  url.searchParams.set("phoneNumber", phoneNumber);
  const res = await fetch(url.toString(), { headers: NAAR_HEADERS });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
