import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_POLICY, POLICY_FIELDS, normalizePolicy, orderPresets, presentPresets, movePreset,
} from '../policy.js';

const rows = Object.freeze([
  Object.freeze({ id: 'standard', isDefault: true }),
  Object.freeze({ id: 'ptc' }),
  Object.freeze({ id: 'custom', name: 'My preset' }),
  Object.freeze({ id: 'broken', broken: 'Missing plugin' }),
]);
const names = (items) => items.map((row) => row.id);

test('normalization fills all fields, deduplicates, and retains unknown ids', () => {
  const policy = normalizePolicy({ globalOrder: ['custom', 'gone', 'custom'] });
  assert.deepEqual(Object.keys(policy), POLICY_FIELDS);
  assert.deepEqual(policy.globalOrder, ['custom', 'gone']);
  assert.deepEqual(policy.hiddenSettings, []);
  assert.deepEqual(normalizePolicy(), DEFAULT_POLICY);
  policy.hiddenSettings.push('ptc');
  assert.deepEqual(DEFAULT_POLICY.hiddenSettings, []);
});

test('invalid policy values fail instead of silently corrupting saved state', () => {
  for (const value of [null, false, [], 'text', { settingsOrder: null },
    { hiddenNewSession: [''] }, { globalOrder: [1] }, { hiddenSettings: 'ptc' }]) {
    assert.throws(() => normalizePolicy(value), TypeError);
  }
});

test('explicit ordering is stable, nonmutating, and ignores unknown ids', () => {
  const result = orderPresets(rows, ['gone', 'custom', 'ptc', 'custom']);
  assert.deepEqual(names(result), ['custom', 'ptc', 'standard', 'broken']);
  assert.equal(result[0], rows[2]);
  assert.deepEqual(names(rows), ['standard', 'ptc', 'custom', 'broken']);
  assert.deepEqual(orderPresets(rows, []), rows);
  assert.notEqual(orderPresets(rows, []), rows);
});

test('each surface overrides order independently and inherits only when empty', () => {
  const policy = normalizePolicy({ globalOrder: ['custom', 'ptc'], settingsOrder: ['broken'] });
  assert.deepEqual(names(presentPresets(rows, policy, 'newSession')), ['custom', 'ptc', 'standard', 'broken']);
  assert.deepEqual(names(presentPresets(rows, policy, 'settings')), ['broken', 'standard', 'ptc', 'custom']);
  assert.deepEqual(names(presentPresets(rows, policy, 'global')), ['custom', 'ptc', 'standard', 'broken']);
});

test('hidden lists are surface-local; includeHidden keeps them editable', () => {
  const policy = normalizePolicy({ globalOrder: ['custom'], hiddenNewSession: ['standard'], hiddenSettings: ['ptc'] });
  assert.deepEqual(names(presentPresets(rows, policy, 'newSession')), ['custom', 'ptc', 'broken']);
  assert.deepEqual(names(presentPresets(rows, policy, 'settings')), ['custom', 'standard', 'broken']);
  assert.equal(presentPresets(rows, policy, 'settings')[1].isDefault, true);
  assert.deepEqual(names(presentPresets(rows, policy, 'newSession', { includeHidden: true })), ['custom', 'standard', 'ptc', 'broken']);
  assert.deepEqual(names(presentPresets(rows, policy, 'global')), ['custom', 'standard', 'ptc', 'broken']);
  assert.throws(() => presentPresets(rows, policy, 'other'), TypeError);
});

test('all presets may be hidden without changing the roster or default', () => {
  const policy = normalizePolicy({ hiddenNewSession: names(rows), hiddenSettings: names(rows) });
  assert.deepEqual(presentPresets(rows, policy, 'newSession'), []);
  assert.deepEqual(presentPresets(rows, policy, 'settings'), []);
  assert.equal(rows[0].isDefault, true);
  assert.equal(rows.length, 4);
});

test('stale ids resume their configured position when their preset returns', () => {
  const policy = normalizePolicy({ globalOrder: ['gone', 'custom'], hiddenSettings: ['gone'] });
  assert.deepEqual(names(presentPresets(rows, policy, 'global')), ['custom', 'standard', 'ptc', 'broken']);
  const restored = [...rows, { id: 'gone' }];
  assert.equal(presentPresets(restored, policy, 'newSession')[0].id, 'gone');
  assert.ok(!names(presentPresets(restored, policy, 'settings')).includes('gone'));
  assert.deepEqual(policy.globalOrder, ['gone', 'custom']);
});

test('movePreset moves both directions, clamps destinations, and preserves source', () => {
  const order = Object.freeze(['a', 'b', 'c']);
  assert.deepEqual(movePreset(order, 'a', 2), ['b', 'c', 'a']);
  assert.deepEqual(movePreset(order, 'c', 0), ['c', 'a', 'b']);
  assert.deepEqual(movePreset(order, 'b', -5), ['b', 'a', 'c']);
  assert.deepEqual(movePreset(order, 'b', 100), ['a', 'c', 'b']);
  assert.deepEqual(movePreset(order, 'absent', 0), order);
  assert.deepEqual(order, ['a', 'b', 'c']);
  assert.throws(() => movePreset(order, 'a', 1.2), TypeError);
});
