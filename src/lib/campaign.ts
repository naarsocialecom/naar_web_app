const CAMPAIGN_KEYS = ["source", "medium", "campaignId", "campaignName", "platform", "deepLink", "attributionType"];
const STORAGE_KEY = "naar_device_id";
const ONBOARDING_KEY = "naar_onboarding_data";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function getParamsFromUrl(url: string): URLSearchParams {
  try {
    const ref = new URL(url, "https://naar.io").searchParams.get("referrer");
    if (ref) return new URLSearchParams(ref);
    return new URL(url, "https://naar.io").searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function getCampaignFromURL(url?: string): Record<string, string> {
  const src = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const params = getParamsFromUrl(src);
  const out: Record<string, string> = {};
  for (const k of CAMPAIGN_KEYS) {
    out[k] = params.get(k) ?? "";
  }
  return out;
}

export function hasCampaignInfo(campaign: Record<string, string>): boolean {
  return Object.values(campaign).some((v) => v !== "");
}

export function storeOnboardingData(): void {
  if (typeof window === "undefined") return;
  const campaign = getCampaignFromURL();
  if (!hasCampaignInfo(campaign)) return;
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(campaign));
  } catch {}
}

export function getStoredOnboardingData(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(ONBOARDING_KEY);
    if (!s) return null;
    return JSON.parse(s) as Record<string, string>;
  } catch {
    return null;
  }
}

export function clearStoredOnboardingData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_KEY);
}
