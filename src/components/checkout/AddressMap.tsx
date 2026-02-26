"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { ENV } from "@/lib/env";
import type { Address } from "@/types/api";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 14;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

interface AddressMapProps {
  userPhone: string;
  /** When true, user record exists from getUserDetails - don't ask for name */
  hasUserRecord?: boolean;
  /** Pre-filled name when user exists */
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

  const handleCreateAddress = async () => {
    setError("");
    const line1 = addressLine.trim();
    const fullName = hasUserRecord ? (userName || "Customer") : nameInput.trim();
    if (!hasUserRecord && !nameInput.trim()) {
      setError("Enter your name");
      return;
    }
    if (!line1) {
      setError("Enter your address");
      return;
    }
    if (!hasNumber(line1)) {
      setError("Address must include a number (e.g. 12, A-101, Villa 14)");
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
      // Create user first via Social API if no user record exists
      if (!hasUserRecord && nameInput.trim()) {
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
      fullscreenControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    }),
    []
  );

  if (!ENV.GOOGLE_MAPS_API_KEY) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f8f8f8] items-center justify-center p-4">
        <p className="text-[#787878] text-sm">Google Maps API key not configured</p>
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f8f8f8]">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 p-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div ref={searchRef} className="flex-1 relative">
          <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a1a1] pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              placeholder="Search area, landmark, address..."
              className="w-full pl-12 pr-4 py-3.5 bg-transparent border-0 outline-none text-black placeholder:text-[#a1a1a1] text-[15px]"
            />
          </div>
          {showSearchResults && (searchQuery || searchResults.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl max-h-64 overflow-auto z-30">
              {searching ? (
                <div className="px-4 py-5 text-[#787878] text-sm">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-5 text-[#787878] text-sm">No results found</div>
              ) : (
                searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectResult(r.lat, r.lon)}
                    className="w-full text-left px-4 py-3.5 hover:bg-[#f8f8f8] transition-colors border-b border-[rgba(0,0,0,0.06)] last:border-0 first:rounded-t-2xl"
                  >
                    <p className="text-sm font-medium text-black truncate">{r.display_name}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#ececea]">
            <span className="text-[#787878] text-sm">Loading map...</span>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={markerPos || DEFAULT_CENTER}
            zoom={markerPos ? 16 : DEFAULT_ZOOM}
            onLoad={onMapLoad}
            onClick={onMapClick}
            options={mapOptions}
          >
            {markerPos && (
              <Marker
                position={markerPos}
                draggable
                onDragEnd={onMarkerDragEnd}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {showBottomSheet && markerPos && (
        <div className="flex-shrink-0 p-4 pb-8 pt-5 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <p className="text-xs text-[#787878] mb-4">Add your address</p>
          <div className="space-y-3 mb-4">
            {!hasUserRecord && (
              <div>
                <label className="block text-sm font-semibold text-black mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.12)] focus:border-black focus:ring-1 focus:ring-black outline-none transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="e.g. Villa 14, Palm Jumeirah or 12, Main Road"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.12)] focus:border-black focus:ring-1 focus:ring-black outline-none transition-colors"
              />
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
            disabled={loading || (!hasUserRecord && !nameInput.trim()) || !addressLine.trim() || !hasNumber(addressLine)}
            className="w-full py-3.5 rounded-full bg-[rgb(63,240,255)] text-black font-bold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Saving..." : "Confirm & continue"}
          </button>
        </div>
      )}
    </div>
  );
}
