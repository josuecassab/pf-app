import { REVENUECAT_PRODUCT_IDS } from "./revenuecatConstants";

/**
 * Finds a subscription package on an offering by store product identifier.
 * Prefer RevenueCat dashboard packages ($rc_monthly / $rc_annual) when possible;
 * this helper matches on underlying `product.identifier`.
 */
export function findPackageByProductId(offering, productIdentifier) {
  const packages = offering?.availablePackages;
  if (!Array.isArray(packages)) return null;
  return (
    packages.find((p) => p?.product?.identifier === productIdentifier) ?? null
  );
}

export function getDefaultMonthlyPackage(offering) {
  return findPackageByProductId(offering, REVENUECAT_PRODUCT_IDS.MONTHLY);
}
