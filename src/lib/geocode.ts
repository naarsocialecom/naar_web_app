import { ENV } from "./env";

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: Record<string, string>;
}

interface GoogleGeocodeResult {
  results?: Array<{
    geometry: { location: { lat: number; lng: number } };
    formatted_address: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
  }>;
}

function getComponent(
  components: Array<{ long_name: string; types: string[] }> | undefined,
  type: string
): string {
  const c = components?.find((x) => x.types.includes(type));
  return c?.long_name || "";
}

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const key = ENV.GOOGLE_MAPS_API_KEY;
  if (!key) return [];
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
  );
  const data: GoogleGeocodeResult = await res.json();
  const results = data.results || [];
  return results.map((r) => ({
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
    display_name: r.formatted_address,
    address: undefined,
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<{
  city: string;
  state: string;
  pincode: string;
  displayName: string;
  address?: { road?: string; suburb?: string; village?: string };
}> {
  const key = ENV.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return { city: "", state: "", pincode: "", displayName: "" };
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}`
  );
  const data: GoogleGeocodeResult = await res.json();
  const r = data.results?.[0];
  if (!r) return { city: "", state: "", pincode: "", displayName: "" };
  const comp = r.address_components;
  return {
    city:
      getComponent(comp, "locality") ||
      getComponent(comp, "sublocality") ||
      getComponent(comp, "administrative_area_level_2") ||
      "",
    state: getComponent(comp, "administrative_area_level_1"),
    pincode: getComponent(comp, "postal_code"),
    displayName: r.formatted_address || "",
    address: undefined,
  };
}
