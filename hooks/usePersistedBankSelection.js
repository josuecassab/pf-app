import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  loadLastSelectedBankId,
  saveLastSelectedBankId,
  takePendingBankSelection,
} from "../lib/pendingBankSelection";

function findBank(list, id) {
  if (id == null) return null;
  return list.find((b) => String(b.value) === String(id)) ?? null;
}

/**
 * Keeps the Input screen bank dropdown on the last chosen bank across reloads
 * and after adding a bank from manage-banks.
 */
export function usePersistedBankSelection(bankList, tenantId) {
  const [selectedBank, setSelectedBank] = useState(null);
  const [savedBankId, setSavedBankId] = useState(undefined);

  useEffect(() => {
    if (!tenantId) {
      setSavedBankId(null);
      return;
    }
    loadLastSelectedBankId(tenantId).then(setSavedBankId);
  }, [tenantId]);

  useEffect(() => {
    if (savedBankId === undefined) return;
    setSelectedBank(
      (prev) =>
        findBank(bankList, prev?.value) ??
        findBank(bankList, savedBankId) ??
        bankList[0] ??
        null,
    );
  }, [bankList, savedBankId]);

  const selectBank = useCallback(
    (bank) => {
      setSelectedBank(bank);
      if (bank?.value == null) return;
      setSavedBankId(bank.value);
      saveLastSelectedBankId(tenantId, bank.value);
    },
    [tenantId],
  );

  useFocusEffect(
    useCallback(() => {
      const pending = takePendingBankSelection();
      if (pending) selectBank(pending);
    }, [selectBank]),
  );

  return { selectedBank, selectBank };
}
