import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { paramOne, submitTxnFilterApply } from "../lib/txnFilterModalParams";

export function useTxnFilterModalSubmit() {
  const params = useLocalSearchParams();

  const parsedFilterValue = useMemo(() => {
    const s = paramOne(params.filterValue);
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, [params.filterValue]);

  const parsedFilterDescription = useMemo(
    () => paramOne(params.filterDescription),
    [params.filterDescription],
  );

  const [filterValue, setFilterValue] = useState(parsedFilterValue);
  const [filterDescription, setFilterDescription] = useState(
    parsedFilterDescription,
  );

  useEffect(() => {
    setFilterValue(parsedFilterValue);
    setFilterDescription(parsedFilterDescription);
  }, [parsedFilterValue, parsedFilterDescription]);

  const closeModal = useCallback(() => {
    router.back();
  }, []);

  const submit = useCallback(
    (headerDropdownLabel, item) => {
      submitTxnFilterApply(params, {
        headerDropdownLabel,
        item,
        filterValue,
        filterDescription,
      });
    },
    [params, filterValue, filterDescription],
  );

  return {
    filterValue,
    setFilterValue,
    filterDescription,
    setFilterDescription,
    closeModal,
    submit,
  };
}
