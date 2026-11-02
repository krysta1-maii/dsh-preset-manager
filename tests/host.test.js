import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, Config, SETTINGS_NAMESPACE, inject } from '../index.js';
import { normalizePolicy } from '../policy.js';

function fixture() {
  const configured = [], disposed = [], effects = [];
  const ctx = {
    fiber: { id: 'owner' },
    effect(fn) { const dispose = fn(); effects.push(dispose); return dispose; },
    settings: {
      configure(policy, owner) { configured.push({ policy, owner }); return () => disposed.push('settings'); },
    },
    get tools() { throw new Error('the host must not register a model tool'); },
    get approval() { throw new Error('the host must not request approval'); },
    get agentPresets() { throw new Error('the host must not read the preset registry'); },
    get provide() { throw new Error('the host must not provide a service'); },
  };
  apply(ctx, Config({}));
  return { ctx, configured, disposed, effects };
}

test('real Schemastery defaults resolve to a volatile get() reference', () => {
  const config = Config({});
  assert.equal(SETTINGS_NAMESPACE, 'dsh-preset-manager');
  assert.deepEqual(inject, ['settings']);
  assert.equal(typeof config.policy.get, 'function');
  assert.equal(config.policy.value, undefined);
  assert.deepEqual(config.policy.get(), normalizePolicy());
  const explicit = Config({ policy: { globalOrder: ['custom'] } });
  assert.deepEqual(explicit.policy.get(), normalizePolicy({ globalOrder: ['custom'] }));
  const serialized = Config.toJSON();
  const policyId = serialized.refs[serialized.uid].dict.policy;
  assert.equal(serialized.refs[policyId].meta.volatile, true);
  assert.throws(() => Config({ policy: { globalOrder: 2 } }));
  assert.throws(() => Config({ policy: { hiddenNewSession: [''] } }));
});

test('apply owns only the settings policy and exposes no model surface', () => {
  const f = fixture();
  assert.deepEqual(f.configured, [{ policy: { auto: false }, owner: f.ctx.fiber }]);
  assert.equal(f.ctx.presetManager, undefined);
  assert.equal(f.effects.length, 1);
  f.effects[0]();
  assert.deepEqual(f.disposed, ['settings']);
});
