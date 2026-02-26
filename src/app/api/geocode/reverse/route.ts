import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

function getComponent(
  components: Array<{ long_name: string; types: string[] }> | undefined,
  type: string
): string {
  const c = components?.find((x) => x.types.includes(type));
  return c?.long_name || "";
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ city: "", state: "", pincode: "" });
  }
  const key = ENV.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ city: "", state: "", pincode: "" });
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
  );
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) return NextResponse.json({ city: "", state: "", pincode: "" });
  const comp = r.address_components;
  return NextResponse.json({
    city:
      getComponent(comp, "locality") ||
      getComponent(comp, "sublocality") ||
      getComponent(comp, "administrative_area_level_2") ||
      "",
    state: getComponent(comp, "administrative_area_level_1"),
    pincode: getComponent(comp, "postal_code"),
  });
}
