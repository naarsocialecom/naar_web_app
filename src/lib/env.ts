export const ENV = {
  API_URL_COMMERCIAL:
    process.env.NEXT_PUBLIC_API_URL_COMMERCIAL ||
    "https://devapi-commerce.naar.io/v1",
  API_URL_SOCIAL:
    process.env.NEXT_PUBLIC_API_URL_SOCIAL || "https://devapi-social.naar.io/v1",
  GOOGLE_MAPS_API_KEY:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  RAZORPAY_KEY: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "",
} as const;
