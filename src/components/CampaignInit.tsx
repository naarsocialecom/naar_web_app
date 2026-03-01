"use client";

import { useEffect } from "react";
import { storeOnboardingData } from "@/lib/campaign";
import { logLinkClick } from "@/lib/api-client";

export default function CampaignInit() {
  useEffect(() => {
    storeOnboardingData();
    logLinkClick();
  }, []);
  return null;
}
