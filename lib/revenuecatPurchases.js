import { Platform } from "react-native";

let configureCalled = false;

/**
 * Public SDK keys from env (Expo: EXPO_PUBLIC_* are inlined at build time).
 * Use the Apple key on iOS and the Google key on Android.
 */
export function getRevenueCatApiKey() {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
  const android = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
  const fallback = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  return Platform.select({
    ios: ios || fallback || "",
    android: android || fallback || "",
    default: "",
  });
}

export function isPurchasesSupportedPlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export function shouldConfigurePurchases() {
  return isPurchasesSupportedPlatform() && !!getRevenueCatApiKey().trim();
}

export function markPurchasesConfigured() {
  configureCalled = true;
}

export function hasPurchasesBeenConfigured() {
  return configureCalled;
}
