"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { ENV } from "@/lib/env";
import type { Address } from "@/types/api";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 14;
const MAP_HEIGHT = 260;

interface AddressMapProps {
  userPhone: string;
  hasUserRecord?: boolean;
  userName?: string;
  onAddressCreated: (address: Address) => void;
  onBack?: () => void;
  onUserCreated?: () => Promise<void>;
}

async function searchAddress(query: string): Promise<Array<{ lat: number; lon: number; display_name: string }>> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; state: string; pincode: string; area: string }> {
  const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lon}`);
  const data = await res.json();
  return { city: data.city || "", state: data.state || "", pincode: data.pincode || "", area: data.area || "" };
}

export default function AddressMap({
  userPhone,
  hasUserRecord = false,
  userName = "",
  onAddressCreated,
  onBack,
  onUserCreated,
}: AddressMapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lon: number; display_name: string }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [nameInput, setNameInput] = useState(userName || "");
  const [geoData, setGeoData] = useState<{ city: string; state: string; pincode: string; area: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLDivElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: ENV.GOOGLE_MAPS_API_KEY,
  });

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat != null && lng != null) {
      setMarkerPos({ lat, lng });
      setShowBottomSheet(true);
      setShowSearchResults(false);
    }
  }, []);

  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat != null && lng != null) {
      setMarkerPos({ lat, lng });
      setShowBottomSheet(true);
    }
  }, []);

  const updateMarkerAndMap = useCallback(
    (lat: number, lng: number) => {
      setMarkerPos({ lat, lng });
      map?.panTo({ lat, lng });
      map?.setZoom(16);
    },
    [map]
  );

  useEffect(() => {
    if (!markerPos || !showBottomSheet) return;
    setLoading(true);
    setError("");
    reverseGeocode(markerPos.lat, markerPos.lng)
      .then(setGeoData)
      .catch(() => setGeoData({ city: "", state: "", pincode: "", area: "" }))
      .finally(() => setLoading(false));
  }, [markerPos, showBottomSheet]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddress(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleSelectResult = useCallback(
    (lat: number, lon: number) => {
      setMarkerPos({ lat, lng: lon });
      setShowSearchResults(false);
      setSearchQuery("");
      updateMarkerAndMap(lat, lon);
      setShowBottomSheet(true);
    },
    [updateMarkerAndMap]
  );

  const hasNumber = (s: string) => /\d/.test(s);
  const showNameField = !hasUserRecord;
  const needsNumberHint = addressLine.trim().length > 0 && !hasNumber(addressLine.trim());

  const handleCreateAddress = async () => {
    setError("");
    const line1 = addressLine.trim();
    const fullName = hasUserRecord ? (userName || "Customer") : nameInput.trim();
    if (showNameField && !nameInput.trim()) {
      setError("Enter your name");
      return;
    }
    if (!line1) {
      setError("Enter your address");
      return;
    }
    if (!hasNumber(line1)) {
      setError("Please add door number or flat no. (e.g. 12, A-101, Villa 14)");
      return;
    }
    if (!markerPos || !geoData) {
      setError("Please select a location on the map");
      return;
    }
    if (!userPhone || !userPhone.trim()) {
      setError("Phone number is required. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      const { createUser, createAddress } = await import("@/lib/api-client");
      if (showNameField && nameInput.trim()) {
        await createUser({ name: nameInput.trim() });
        await onUserCreated?.();
      }
      const addr = await createAddress({
        addressNickName: "Home",
        fullName: fullName || "Customer",
        addressLine1: line1,
        addressLine2: geoData.area || geoData.city || "N/A",
        city: geoData.city || "N/A",
        state: geoData.state || "N/A",
        pincode: geoData.pincode || "N/A",
        location: { type: "Point", coordinates: [markerPos.lng, markerPos.lat] },
        plusCode: "N/A",
        isDefault: true,
        phone: userPhone,
      });
      onAddressCreated({
        ...addr,
        addressLine1: line1,
        addressLine2: geoData.area || geoData.city || "N/A",
        city: geoData.city || "N/A",
        state: geoData.state || "N/A",
        pincode: geoData.pincode || "N/A",
        fullName: fullName || "Customer",
        addressNickName: "Home",
        phone: userPhone,
      } as Address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    }),
    []
  );

  if (!ENV.GOOGLE_MAPS_API_KEY) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/90 items-center justify-center p-4">
        <p className="text-white/70 text-sm">Google Maps API key not configured</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-5 py-2.5 rounded-full bg-[rgb(63,240,255)] text-black font-semibold text-sm"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-md flex flex-col gap-4 my-auto">
        {/* Header — inside-out: dark bar, minimal */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-white font-semibold text-lg tracking-tight">Add address</h2>
        </div>

        {/* Card container — light inner content */}
        <div className="bg-[#f8f8f8] rounded-2xl overflow-hidden shadow-xl">
          {/* Search */}
          <div ref={searchRef} className="p-3 relative border-b border-black/5">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1a1] pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                placeholder="Search area, landmark, address..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-black/8 text-black placeholder:text-[#a1a1a1] text-sm outline-none focus:border-[rgb(63,240,255)] focus:ring-1 focus:ring-[rgb(63,240,255)]/40 transition-all"
              />
            </div>
            {showSearchResults && (searchQuery || searchResults.length > 0) && (
              <div className="absolute top-full left-3 right-3 mt-1.5 bg-white rounded-xl shadow-lg max-h-48 overflow-auto z-30 border border-black/5">
                {searching ? (
                  <div className="px-4 py-4 text-[#787878] text-sm">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-4 text-[#787878] text-sm">No results found</div>
                ) : (
                  searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectResult(r.lat, r.lon)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f8f8f8] transition-colors border-b border-black/5 last:border-0 text-sm text-black truncate"
                    >
                      {r.display_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Map — compact, fixed height */}
          <div className="relative" style={{ height: MAP_HEIGHT }}>
            {!isLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#ececea]">
                <span className="text-[#787878] text-sm">Loading map...</span>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={markerPos || DEFAULT_CENTER}
                zoom={markerPos ? 16 : DEFAULT_ZOOM}
                onLoad={onMapLoad}
                onClick={onMapClick}
                options={mapOptions}
              >
                {markerPos && (
                  <Marker position={markerPos} draggable onDragEnd={onMarkerDragEnd} />
                )}
              </GoogleMap>
            )}
            <p className="absolute bottom-2 left-3 text-[10px] text-black/50 bg-white/90 px-2 py-1 rounded">
              Tap or drag pin to set location
            </p>
          </div>

          {/* Address form — inline or bottom sheet */}
          {showBottomSheet && markerPos ? (
            <div className="p-4 pt-3 border-t border-black/5">
              <div className="space-y-3 mb-4">
                {showNameField && (
                  <div>
                    <label className="block text-xs font-medium text-black/70 mb-1">Name</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-black/10 text-black placeholder:text-[#a1a1a1] text-sm outline-none focus:border-[rgb(63,240,255)] focus:ring-1 focus:ring-[rgb(63,240,255)]/40 transition-all"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-black/70 mb-1">Address</label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="e.g. 12, Main Road or A-101, Palm Residency"
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-black/10 text-black placeholder:text-[#a1a1a1] text-sm outline-none focus:border-[rgb(63,240,255)] focus:ring-1 focus:ring-[rgb(63,240,255)]/40 transition-all"
                  />
                  {needsNumberHint && (
                    <p className="mt-1 text-xs text-amber-700">
                      Please add door number or flat no. if not already included
                    </p>
                  )}
                </div>
                {geoData && (
                  <p className="text-xs text-[#787878]">
                    {[geoData.city, geoData.state, geoData.pincode].filter(Boolean).join(", ") || "Detecting..."}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              <button
                type="button"
                onClick={handleCreateAddress}
                disabled={loading || (showNameField && !nameInput.trim()) || !addressLine.trim() || !hasNumber(addressLine)}
                className="w-full py-3 rounded-full bg-[rgb(63,240,255)] text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
              >
                {loading ? "Saving..." : "Confirm & continue"}
              </button>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-[#787878]">Tap on the map to drop a pin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
