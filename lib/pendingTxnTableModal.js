/** Bridges txn table modal routes back to TxnTable (bulk selection). */

let postEffects = null;

export function setPendingTxnTablePostEffects(effects) {
  postEffects = effects;
}

export function consumePendingTxnTablePostEffects() {
  const p = postEffects;
  postEffects = null;
  return p;
}
