/** Header label from TxnTable → modal route (expo-router pathname). */
export const TXN_FILTER_MODAL_ROUTE_BY_HEADER = {
  Fecha: "/txn-modals/filter-date",
  Descripción: "/txn-modals/filter-description",
  Monto: "/txn-modals/filter-amount",
  Categoria: "/txn-modals/filter-category",
  Subcategoria: "/txn-modals/filter-subcategory",
  Cuenta: "/txn-modals/filter-bank",
};

export function getTxnFilterModalPathname(headerLabel) {
  return TXN_FILTER_MODAL_ROUTE_BY_HEADER[String(headerLabel)] ?? null;
}
