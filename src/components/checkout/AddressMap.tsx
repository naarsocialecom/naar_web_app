"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { searchAddress, reverseGeocode } from "@/lib/geocode";
import { ENV } from "@/lib/env";
import type { Address } from "@/types/api";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 14;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

interface AddressMapProps {
  userPhone: string;
  userName?: string;
  onAddressCreated: (address: Address) => void;
  onBack?: () => void;
}

export default function AddressMap({
  userPhone,
  userName = "",
  onAddressCreated,
  onBack,
}: AddressMapProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lon: number; display_name: string }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [houseNumber, setHouseNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [geoData, setGeoData] = useState<{
    city: string;
    state: string;
    pincode: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
    },
    [map]
  );

  useEffect(() => {
    if (!markerPos || !showBottomSheet) return;
    setLoading(true);
    setError("");
    reverseGeocode(markerPos.lat, markerPos.lng)
      .then((d) => setGeoData({ city: d.city, state: d.state, pincode: d.pincode }))
      .catch(() => setGeoData({ city: "", state: "", pincode: "" }))
      .finally(() => setLoading(false));
  }, [markerPos, showBottomSheet]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowSearchResults(true);
    try {
      const results = await searchAddress(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (lat: number, lon: number) => {
    setMarkerPos({ lat, lng: lon });
    setShowSearchResults(false);
    setSearchQuery("");
    updateMarkerAndMap(lat, lon);
    setShowBottomSheet(true);
  };

  const hasNumber = (s: string) => /\d/.test(s);

  const handleCreateAddress = async () => {
    setError("");
    const addressLine1 = [houseNumber.trim(), streetName.trim()].filter(Boolean).join(", ");
    if (!addressLine1.trim()) {
      setError("Enter house/flat number and street");
      return;
    }
    if (!hasNumber(houseNumber)) {
      setError("House/flat number must contain a number (e.g. 12, A-101, Flat 5)");
      return;
    }
    if (!markerPos || !geoData) {
      setError("Please select a location on the map");
      return;
    }
    setLoading(true);
    try {
      const { createAddress } = await import("@/lib/api-client");
      const addr = await createAddress({
        addressNickName: "Home",
        fullName: userName || "Customer",
        addressLine1,
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
        addressLine1,
        city: geoData.city || "N/A",
        state: geoData.state || "N/A",
        pincode: geoData.pincode || "N/A",
        fullName: userName || "Customer",
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
    }),
    []
  );

  if (!ENV.GOOGLE_MAPS_API_KEY) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-light)] items-center justify-center p-4">
        <p className="text-[var(--text-muted)]">Google Maps API key not configured</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-full bg-[var(--accent)] text-black font-bold"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-light)]">
      <div className="flex-shrink-0 p-4 flex items-center gap-3 bg-white border-b border-[var(--border-light)]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            placeholder="Search area, landmark..."
            className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border-light)] focus:border-black outline-none transition-colors"
          />
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--border-light)] shadow-lg max-h-60 overflow-auto z-10">
              {searching ? (
                <div className="p-4 text-[var(--text-muted)] text-sm">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-[var(--text-muted)] text-sm">No results</div>
              ) : (
                searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectResult(r.lat, r.lon)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--bg-card)] transition-colors border-b border-[var(--border-light)] last:border-0"
                  >
                    <p className="text-sm text-black font-medium truncate">{r.display_name}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-3 rounded-xl bg-[var(--accent)] text-black font-bold text-sm"
        >
          Search
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]">
            <span className="text-[var(--text-muted)]">Loading map...</span>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={markerPos || DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
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
        <div
          className="flex-shrink-0 p-4 pb-8 bg-white border-t border-[var(--border-light)]"
          onClick={() => showSearchResults && setShowSearchResults(false)}
        >
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Confirm your location on the map, then add details below
          </p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                House / Flat number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="e.g. 12, A-101, Flat 5"
                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border-light)] focus:border-black outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Street name</label>
              <input
                type="text"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="e.g. Main Road, Sector 5"
                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border-light)] focus:border-black outline-none transition-colors"
              />
            </div>
            {geoData && (
              <p className="text-xs text-[var(--text-muted)]">
                {[geoData.city, geoData.state, geoData.pincode].filter(Boolean).join(", ") || "Detecting..."}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <button
            type="button"
            onClick={handleCreateAddress}
            disabled={loading || !hasNumber(houseNumber)}
            className="w-full py-3 rounded-full bg-[var(--accent)] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Saving..." : "Confirm & continue"}
          </button>
        </div>
      )}
    </div>
  );
}
