import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Purchases, { PURCHASES_ERROR_CODE } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { useAuth } from "./AuthContext";
import { REVENUECAT_ENTITLEMENT_PRO } from "../lib/revenuecatConstants";
import { hasActiveEntitlement } from "../lib/revenuecatEntitlements";
import {
  getRevenueCatApiKey,
  hasPurchasesBeenConfigured,
  isPurchasesSupportedPlatform,
  markPurchasesConfigured,
  shouldConfigurePurchases,
} from "../lib/revenuecatPurchases";

const PurchasesContext = createContext(null);

function getAppUserIdFromSession(session) {
  const u = session?.user;
  if (!u || typeof u !== "object") return null;
  const raw = u.id ?? u.user_id ?? u.sub ?? u.email ?? u.username;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

function isPurchasesCancelledError(error) {
  if (!error) return false;
  if (error.userCancelled === true) return true;
  return error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

function isLogoutAnonymousError(error) {
  return error?.code === PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR;
}

export function PurchasesProvider({ children }) {
  const { session } = useAuth();
  const [customerInfo, setCustomerInfo] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);
  const hadAuthenticatedUser = useRef(false);
  const listenerRef = useRef(null);

  useEffect(() => {
    if (!isPurchasesSupportedPlatform()) {
      setSdkReady(false);
      return;
    }
    if (!shouldConfigurePurchases()) {
      setSdkError(
        new Error(
          "Missing RevenueCat API key. Set EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY and EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY (or EXPO_PUBLIC_REVENUECAT_API_KEY) in .env.",
        ),
      );
      setSdkReady(false);
      return;
    }
    if (hasPurchasesBeenConfigured()) {
      setSdkReady(true);
      return;
    }
    try {
      const apiKey = getRevenueCatApiKey().trim();
      Purchases.configure({ apiKey });
      markPurchasesConfigured();
      setSdkReady(true);
      setSdkError(null);
    } catch (e) {
      setSdkError(e);
      setSdkReady(false);
    }
  }, []);

  useEffect(() => {
    if (!sdkReady) return undefined;
    const onUpdate = (info) => setCustomerInfo(info);
    listenerRef.current = onUpdate;
    Purchases.addCustomerInfoUpdateListener(onUpdate);
    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [sdkReady]);

  const appUserId = useMemo(() => getAppUserIdFromSession(session), [session]);

  useEffect(() => {
    if (!sdkReady) return undefined;
    let cancelled = false;

    async function syncUser() {
      try {
        if (appUserId) {
          hadAuthenticatedUser.current = true;
          const { customerInfo: info } = await Purchases.logIn(appUserId);
          if (!cancelled) setCustomerInfo(info);
          return;
        }
        if (hadAuthenticatedUser.current) {
          hadAuthenticatedUser.current = false;
          try {
            const info = await Purchases.logOut();
            if (!cancelled) setCustomerInfo(info);
          } catch (e) {
            if (!isLogoutAnonymousError(e)) throw e;
            const info = await Purchases.getCustomerInfo();
            if (!cancelled) setCustomerInfo(info);
          }
          return;
        }
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) setCustomerInfo(info);
      } catch (e) {
        if (!cancelled) setSdkError(e);
      }
    }

    syncUser();
    return () => {
      cancelled = true;
    };
  }, [sdkReady, appUserId]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!sdkReady || !isPurchasesSupportedPlatform()) return null;
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return info;
    } catch (e) {
      setSdkError(e);
      return null;
    }
  }, [sdkReady]);

  const isProActive = useMemo(
    () => hasActiveEntitlement(customerInfo, REVENUECAT_ENTITLEMENT_PRO),
    [customerInfo],
  );

  const restorePurchases = useCallback(async () => {
    if (!sdkReady || !isPurchasesSupportedPlatform()) {
      return { ok: false, error: new Error("Purchases not available on this platform.") };
    }
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return { ok: true, customerInfo: info };
    } catch (error) {
      if (isPurchasesCancelledError(error)) {
        return { ok: false, cancelled: true, error };
      }
      return { ok: false, error };
    }
  }, [sdkReady]);

  const presentPaywall = useCallback(async () => {
    if (!sdkReady || !isPurchasesSupportedPlatform()) {
      return { ok: false, result: null, error: new Error("Purchases not available.") };
    }
    try {
      const result = await RevenueCatUI.presentPaywall();
      await refreshCustomerInfo();
      return { ok: true, result };
    } catch (error) {
      return { ok: false, result: null, error };
    }
  }, [sdkReady, refreshCustomerInfo]);

  const presentPaywallIfNeeded = useCallback(async () => {
    if (!sdkReady || !isPurchasesSupportedPlatform()) {
      return { ok: false, result: null, error: new Error("Purchases not available.") };
    }
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_PRO,
      });
      const customerInfoAfter = await refreshCustomerInfo();
      return { ok: true, result, customerInfo: customerInfoAfter };
    } catch (error) {
      return { ok: false, result: null, error, customerInfo: null };
    }
  }, [sdkReady, refreshCustomerInfo]);

  const presentCustomerCenter = useCallback(async () => {
    if (!sdkReady || !isPurchasesSupportedPlatform()) {
      return { ok: false, error: new Error("Customer Center requires an iOS/Android build with native modules.") };
    }
    try {
      await RevenueCatUI.presentCustomerCenter();
      await refreshCustomerInfo();
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }, [sdkReady, refreshCustomerInfo]);

  const value = useMemo(
    () => ({
      sdkReady,
      sdkError,
      customerInfo,
      refreshCustomerInfo,
      isProActive,
      entitlementId: REVENUECAT_ENTITLEMENT_PRO,
      restorePurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
      paywallResultEnum: PAYWALL_RESULT,
      purchasesErrorEnum: PURCHASES_ERROR_CODE,
      isNativePurchasesPlatform: isPurchasesSupportedPlatform(),
    }),
    [
      sdkReady,
      sdkError,
      customerInfo,
      refreshCustomerInfo,
      isProActive,
      restorePurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
    ],
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchasesContext() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error("usePurchasesContext must be used within PurchasesProvider");
  }
  return ctx;
}

/** Safe hook for screens that may render outside PurchasesProvider (e.g. tests). */
export function usePurchasesOptional() {
  return useContext(PurchasesContext);
}

export { getAppUserIdFromSession, isPurchasesCancelledError, REVENUECAT_ENTITLEMENT_PRO };
