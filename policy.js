/** Presentation-only policy; ids remain intact when presets are temporarily absent. */
export const POLICY_FIELDS = Object.freeze([
  'globalOrder', 'newSessionOrder', 'settingsOrder', 'hiddenNewSession', 'hiddenSettings',
]);

export const DEFAULT_POLICY = Object.freeze(Object.fromEntries(
  POLICY_FIELDS.map((field) => [field, Object.freeze([])]),
));

function ids(value, name) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new TypeError(name + ' must be an array of non-empty preset ids');
  }
  return [...new Set(value)];
}

/** Fill missing fields and remove duplicates, without dropping unavailable preset ids. */
export function normalizePolicy(value = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('policy must be an object');
  }
  return Object.fromEntries(POLICY_FIELDS.map((field) => [
    field, ids(value[field] === undefined ? [] : value[field], field),
  ]));
}

/** Listed ids first; all other rows retain their original relative order. */
export function orderPresets(rows, order = []) {
  const priority = new Map(ids(order, 'order').map((id, index) => [id, index]));
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => (priority.get(a.row.id) ?? Infinity) - (priority.get(b.row.id) ?? Infinity)
      || a.index - b.index)
    .map(({ row }) => row);
}

/** Project one surface without changing the roster, default, or preset definitions. */
export function presentPresets(rows, value, surface, { includeHidden = false } = {}) {
  const policy = normalizePolicy(value);
  if (!['global', 'newSession', 'settings'].includes(surface)) {
    throw new TypeError('surface must be global, newSession, or settings');
  }
  const local = surface === 'global' ? [] : policy[surface + 'Order'];
  const order = local.length ? local : policy.globalOrder;
  const hidden = new Set(surface === 'newSession' ? policy.hiddenNewSession
    : surface === 'settings' ? policy.hiddenSettings : []);
  return orderPresets(rows, order).filter((row) => includeHidden || !hidden.has(row.id));
}

/** Move an existing id to a zero-based, clamped destination; an absent id is unchanged. */
export function movePreset(order, id, targetIndex) {
  if (!Number.isSafeInteger(targetIndex)) throw new TypeError('targetIndex must be an integer');
  const next = ids(order, 'order');
  const from = next.indexOf(id);
  if (from === -1) return next;
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, id);
  return next;
}
