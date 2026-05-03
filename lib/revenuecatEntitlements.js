import { REVENUECAT_ENTITLEMENT_PRO } from "./revenuecatConstants";

/** True if `customerInfo` has the given entitlement in `entitlements.active`. */
export function hasActiveEntitlement(
  customerInfo,
  entitlementId = REVENUECAT_ENTITLEMENT_PRO,
) {
  const active = customerInfo?.entitlements?.active;
  if (!active) return false;
  return Object.prototype.hasOwnProperty.call(active, entitlementId);
}
