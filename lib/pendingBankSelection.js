import AsyncStorage from "@react-native-async-storage/async-storage";

/** Lets manage-banks modal tell Input which bank to select after add + dismiss. */
let pending = null;

export function setPendingBankSelection(bank) {
  pending = bank;
}

export function takePendingBankSelection() {
  const b = pending;
  pending = null;
  return b;
}

function storageKey(tenantId) {
  return `@last_selected_bank_id:${tenantId}`;
}

export async function loadLastSelectedBankId(tenantId) {
  if (!tenantId) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(tenantId));
    if (raw == null || raw === "") return null;
    const asNumber = Number(raw);
    return Number.isFinite(asNumber) ? asNumber : raw;
  } catch (error) {
    console.error("Error loading last selected bank:", error);
    return null;
  }
}

export async function saveLastSelectedBankId(tenantId, value) {
  if (!tenantId || value == null) return;
  try {
    await AsyncStorage.setItem(storageKey(tenantId), String(value));
  } catch (error) {
    console.error("Error saving last selected bank:", error);
  }
}
