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
