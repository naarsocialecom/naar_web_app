import { NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ results: [] });
  }
  const key = ENV.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ results: [] });
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`
  );
  const data = await res.json();
  const results = (data.results || []).map((r: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }) => ({
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
    display_name: r.formatted_address,
  }));
  return NextResponse.json({ results });
}
