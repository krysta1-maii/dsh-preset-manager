import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, Config, inject, SETTINGS_NAMESPACE, createPresetManagerService } from '../index.js';
import { normalizePolicy, POLICY_FIELDS } from '../policy.js';

function fixture({ outcome = 'allowed-once', onApproval } = {}) {
  let revision = 3;
  let value = { policy: normalizePolicy() };
  const roster = { presets: [
    { id: 'standard', isDefault: true },
    { id: 'custom', name: 'Custom', description: 'Own tools', isDefault: false },
    { id: 'broken', isDefault: false, broken: 'Unavailable module' },
  ] };
  const approvals = [], writes = [], disposed = [], configured = [], effects = [];
  const ctx = {
    fiber: { id: 'owner' },
    effect(fn) { const dispose = fn(); effects.push(dispose); return dispose; },
    provide(key, service) { this[key] = service; },
    settings: {
      configure(policy, owner) { configured.push({ policy, owner }); return () => disposed.push('settings'); },
      describe() { return [{ ns: SETTINGS_NAMESPACE, value: structuredClone(value), revision }]; },
      async update(ns, patch, expectedRevision) {
        assert.equal(ns, SETTINGS_NAMESPACE);
        assert.deepEqual(Object.keys(patch), ['policy']);
        assert.deepEqual(Object.keys(patch.policy), POLICY_FIELDS);
        if (expectedRevision !== revision) throw new Error('Settings revision conflict');
        writes.push({ ns, patch: structuredClone(patch), expectedRevision });
        value = structuredClone(patch);
        revision++;
      },
    },
    agentPresets: new Proxy({ remoteExportList: async () => structuredClone(roster) }, {
      get(target, key) {
        if (!(key in target)) throw new Error('Must not mutate registry or defaults: ' + String(key));
        return target[key];
      },
    }),
    tools: { register(tool) { ctx.tool = tool; return () => disposed.push('tool'); } },
    approval: { async request(request) { approvals.push(request); await onApproval?.(request); return outcome; } },
  };
  apply(ctx, Config({}));
  const abort = new AbortController();
  const exec = { agent: { id: 'session-test' }, callId: 'call-test', signal: abort.signal };
  return { ctx, exec, abort, approvals, writes, disposed, configured, effects, roster,
    advance() { revision++; }, read: () => structuredClone(value) };
}

test('real Schemastery defaults resolve to a volatile get() reference', () => {
  const config = Config({});
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
  assert.deepEqual(inject, ['settings', 'agentPresets', 'tools', 'approval']);
});

test('apply owns configuration and tool disposers and provides one service', () => {
  const f = fixture();
  assert.deepEqual(f.configured, [{ policy: { auto: false }, owner: f.ctx.fiber }]);
  assert.equal(typeof f.ctx.presetManager.snapshot, 'function');
  assert.equal(f.ctx.tool.name, 'preset_manager');
  assert.match(f.ctx.tool.description, /Presets page integration is paused/);
  assert.match(f.ctx.tool.parameters.properties.policy.description, /Preserve settingsOrder and hiddenSettings/);
  f.effects.slice().reverse().forEach((dispose) => dispose());
  assert.deepEqual(f.disposed, ['tool', 'settings']);
});

test('get is read-only and returns complete JSON roster, policy and revision', async () => {
  const f = fixture();
  const result = await f.ctx.tool.execute({ action: 'get' }, f.exec);
  assert.deepEqual(result, { namespace: SETTINGS_NAMESPACE, revision: 3, policy: normalizePolicy(), presets: f.roster.presets });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.deepEqual(f.approvals, []);
  assert.deepEqual(f.writes, []);
  const rendered = f.ctx.tool.output.render({ action: 'get' }, result);
  assert.deepEqual(JSON.parse(rendered[0].text), result);
  assert.deepEqual(f.ctx.tool.output.schema.required, ['namespace', 'revision', 'policy', 'presets']);
  assert.equal(f.ctx.tool.isConcurrencySafe({ action: 'get' }), true);
  assert.equal(f.ctx.tool.isConcurrencySafe({ action: 'set' }), false);
});

test('set requests approval and atomically writes only policy with revision fence', async () => {
  const f = fixture();
  const policy = normalizePolicy({ globalOrder: ['custom', 'unknown'], hiddenSettings: ['standard'] });
  const result = await f.ctx.tool.execute({ action: 'set', policy, expectedRevision: 3 }, f.exec);
  assert.equal(f.approvals.length, 1);
  assert.equal(f.approvals[0].agent, f.exec.agent);
  assert.equal(f.approvals[0].callId, f.exec.callId);
  assert.equal(f.approvals[0].signal, f.exec.signal);
  assert.match(f.approvals[0].reason, /unknown/);
  assert.deepEqual(f.writes, [{ ns: SETTINGS_NAMESPACE, patch: { policy }, expectedRevision: 3 }]);
  assert.equal(result.revision, 4);
  assert.deepEqual(result.policy, policy);
  assert.deepEqual(result.presets, f.roster.presets);
  assert.deepEqual(Object.keys(f.read()), ['policy']);
});

for (const outcome of ['rejected', 'cancelled', 'unavailable']) {
  test('non-grant approval outcome does not write: ' + outcome, async () => {
    const f = fixture({ outcome });
    await assert.rejects(f.ctx.tool.execute({ action: 'set', policy: normalizePolicy(), expectedRevision: 3 }, f.exec), /not approved/);
    assert.equal(f.writes.length, 0);
  });
}

test('abort during approval prevents a subsequently allowed write', async () => {
  let f;
  f = fixture({ onApproval: () => f.abort.abort(new Error('cancelled while waiting')) });
  await assert.rejects(f.ctx.tool.execute({ action: 'set', policy: normalizePolicy(), expectedRevision: 3 }, f.exec), /cancelled while waiting/);
  assert.equal(f.writes.length, 0);
});

test('stale revision, including a race during approval, never overwrites newer edits', async () => {
  let f;
  f = fixture({ onApproval: () => f.advance() });
  await assert.rejects(f.ctx.tool.execute({ action: 'set', policy: normalizePolicy({ globalOrder: ['custom'] }), expectedRevision: 3 }, f.exec), /revision conflict/);
  assert.equal(f.writes.length, 0);
  assert.deepEqual(f.read(), { policy: normalizePolicy() });
});

test('bad set input fails before approval and cannot write partial policy', async () => {
  const f = fixture();
  for (const args of [
    { action: 'set', policy: normalizePolicy() },
    { action: 'set', policy: normalizePolicy(), expectedRevision: -1 },
    { action: 'set', policy: { globalOrder: [] }, expectedRevision: 3 },
    { action: 'set', policy: { ...normalizePolicy(), extra: [] }, expectedRevision: 3 },
    { action: 'set', policy: { ...normalizePolicy(), hiddenSettings: [1] }, expectedRevision: 3 },
    { action: 'get', policy: normalizePolicy() },
    { action: 'delete' },
  ]) await assert.rejects(f.ctx.tool.execute(args, f.exec), TypeError);
  assert.equal(f.approvals.length, 0);
  assert.equal(f.writes.length, 0);
});

test('set without Agent or with an already aborted call cannot request approval', async () => {
  const f = fixture();
  const args = { action: 'set', policy: normalizePolicy(), expectedRevision: 3 };
  await assert.rejects(f.ctx.tool.execute(args, { ...f.exec, agent: undefined }), /requesting Agent/);
  f.abort.abort(new Error('already cancelled'));
  await assert.rejects(f.ctx.tool.execute(args, f.exec), /already cancelled/);
  assert.equal(f.approvals.length, 0);
  assert.equal(f.writes.length, 0);
});

test('missing configurable entry reports unavailable instead of fabricating revision', async () => {
  const f = fixture();
  f.ctx.settings.describe = () => [];
  await assert.rejects(createPresetManagerService(f.ctx).snapshot(), /settings are not available/);
});
