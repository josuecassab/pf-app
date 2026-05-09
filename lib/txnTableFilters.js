/** Sentinel for header filters: rows with null/empty categoría, subcategoría o banco. */
export const TXN_FILTER_NULL_VALUE = "__txn_filter_null__";

function txnFieldIsEmpty(v) {
  return v == null || String(v).trim() === "";
}

/**
 * @param {Array} txns
 * @param {{
 *   filterCategory?: { label?: string; value?: string } | null;
 *   filterSubcategory?: { label?: string; value?: string } | null;
 *   filterBank?: { label?: string; value?: string } | null;
 *   filterDate?: { year: number; month: number } | null;
 *   filterValue?: string | number | null;
 *   filterDescription?: string;
 * }} filters
 */
export function applyTxnFilters(txns, filters) {
  const {
    filterCategory,
    filterSubcategory,
    filterBank,
    filterDate,
    filterValue,
    filterDescription,
  } = filters;

  let list = txns;

  if (filterDate?.year && filterDate?.month) {
    const prefix = `${filterDate.year}-${String(filterDate.month).padStart(2, "0")}`;
    list = list.filter(
      (item) => item.date && String(item.date).startsWith(prefix),
    );
  }
  if (filterCategory) {
    if (filterCategory.value === TXN_FILTER_NULL_VALUE) {
      list = list.filter((item) => txnFieldIsEmpty(item.category));
    } else {
      list = list.filter(
        (item) =>
          item.category?.toLowerCase() ===
          filterCategory.label?.toLowerCase(),
      );
    }
  }
  if (filterSubcategory) {
    if (filterSubcategory.value === TXN_FILTER_NULL_VALUE) {
      list = list.filter((item) => txnFieldIsEmpty(item.subcategory));
    } else {
      list = list.filter(
        (item) =>
          item.subcategory?.toLowerCase() ===
          filterSubcategory.label?.toLowerCase(),
      );
    }
  }
  if (filterBank) {
    if (filterBank.value === TXN_FILTER_NULL_VALUE) {
      list = list.filter((item) => txnFieldIsEmpty(item.bank));
    } else {
      list = list.filter(
        (item) =>
          item.bank?.toLowerCase() === filterBank.label?.toLowerCase(),
      );
    }
  }
  const descQ = filterDescription?.trim();
  if (descQ) {
    const q = descQ.toLowerCase();
    list = list.filter((item) =>
      String(item.description ?? "")
        .toLowerCase()
        .includes(q),
    );
  }
  if (filterValue != null && filterValue !== "") {
    const target = Number(filterValue);
    list = list.filter((item) => Number(item.amount) === target);
  }
  return list;
}
