import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { Context, Service } from '@deepseek-ai/cordis';
import React from 'react';

// Load the actual generated ModuleLoader artifact, not a duplicate inject list.
let client;
vm.runInNewContext(await readFile(new URL('../client.js', import.meta.url), 'utf8'), {
  window: { __ModuleLoader__: { load({ id, factory }) {
    assert.equal(id, 'dsh-preset-manager');
    client = factory(name => { assert.equal(name, 'react'); return React; });
  } } },
});

test('actual client artifact declares both Remote root and namespace dependencies', async () => {
  const root = new Context();
  let calls = 0;
  const roster = { ok: true, value: { presets: [{ id: 'standard', isDefault: true }] } };
  try {
    // Sibling providers are important: root.provide would mask missing inject.
    await root.plugin({ name: 'remote-provider', apply(ctx) { new Service(ctx, 'remote'); } });
    await root.plugin({ name: 'namespace-provider', apply(ctx) {
      const ns = new Service(ctx, 'remote.agentPresets');
      ns.list = async () => { calls++; return roster; };
    } });
    await root.plugin({ name: 'ui-provider', apply(ctx) {
      for (const name of client.inject.filter(name => !name.startsWith('remote'))) ctx.provide(name, {});
    } });
    for (const [inject, missing] of [
      [['remote.agentPresets'], 'remote'],
      [['remote'], 'remote.agentPresets'],
      [client.inject, null],
    ]) {
      let caller;
      const fiber = root.plugin({ inject, apply(ctx) { caller = ctx; } });
      await fiber;
      assert.ok(caller);
      if (missing) assert.throws(() => caller.remote.agentPresets.list(), {
        message: 'cannot get property "' + missing + '" without inject',
      });
      else assert.deepEqual(await caller.remote.agentPresets.list(), roster);
      await fiber.dispose();
    }
    assert.equal(calls, 1);
  } finally { await root.fiber.dispose(); }
});
