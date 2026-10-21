import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const artifact = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
function environment(language = 'en') {
  let client;
  vm.runInNewContext(artifact, {
    window: { confirm: () => true, __ModuleLoader__: { load({ factory }) {
      client = factory(name => { assert.equal(name, 'react'); return React; });
    } } }, console,
  });
  const registrations = new Map(); const subscriptions = new Map();
  const disposers = []; const dictionaries = new Map(); const formListeners = new Set();
  const events = new Set(); const writes = [];
  let snapshot = { status: 'ready', writable: true, revision: 7, value: { policy: {
    globalOrder: ['b', 'a'], newSessionOrder: ['b', 'a'], hiddenNewSession: [],
    settingsOrder: ['retained-custom', 'a'], hiddenSettings: ['retained-hidden'],
  } } };
  const slots = {
    entries: name => registrations.get(name) ?? [],
    register(options, component) {
      const entry = { options, component, locale: options.locale, inject: options.inject };
      registrations.set(options.name, [...slots.entries(options.name), entry]);
      notify(options.name);
      return () => {
        registrations.set(options.name, slots.entries(options.name).filter(row => row !== entry));
        notify(options.name);
      };
    },
    subscribe(name, listener) {
      const listeners = subscriptions.get(name) ?? new Set();
      listeners.add(listener); subscriptions.set(name, listeners);
      return () => listeners.delete(listener);
    },
    inject(name, callback) { const stop = callback(); disposers.push(stop); return stop; },
  };
  function notify(name) { for (const fn of [...(subscriptions.get(name) ?? [])]) fn(); }
  const form = {
    getSnapshot: () => snapshot,
    subscribe(fn) { formListeners.add(fn); return () => formListeners.delete(fn); },
    async mutate(operations, revision) {
      assert.equal(revision, snapshot.revision);
      assert.equal(operations.length, 1);
      assert.deepEqual(copy(operations[0].path), ['policy']);
      writes.push(copy(operations[0].value));
      snapshot = { ...snapshot, revision: revision + 1, value: { policy: writes.at(-1) } };
      for (const fn of [...formListeners]) fn();
      return true;
    },
  };
  const localeSnapshot = { revision: 0 };
  const ctx = {
    slots,
    effect(fn) { const stop = fn(); disposers.push(stop); return stop; },
    locale: {
      register(ns, lang, text) { dictionaries.set(ns + ':' + lang, text); return () => dictionaries.delete(ns + ':' + lang); },
      bind: ns => key => dictionaries.get(ns + ':' + language)?.[key] ?? key,
      getSnapshot: () => localeSnapshot, subscribe: () => () => {},
    },
    configForms: { get: () => form, describe: () => ({ ensure: async () => {} }) },
    remote: { agentPresets: { list: async () => ({ ok: true, value: { presets: [
      { id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' },
    ] } }) } },
    on(event, fn) { assert.equal(event, 'connection/reset'); events.add(fn); return () => events.delete(fn); },
  };
  const registerNative = (name, id) => slots.register({
    name, id, locale: 'settings.agentPreset', priority: 0, order: 20,
    label: 'Agent presets', inject: () => ({}),
  }, () => null);
  registerNative('conversation.hero.agentPreset');
  const removePage = registerNative('settings.section', 'agent-presets');
  const nativePage = slots.entries('settings.section')[0];
  const originalPolicy = copy(snapshot.value.policy);
  client.apply(ctx);
  return { slots, form, formListeners, events, writes, originalPolicy, nativePage, removePage,
    registerNative, dispose() { for (const stop of disposers.reverse()) stop?.(); },
  };
}

test('generated plugin leaves one native preset navigation entry across reload and disposal', () => {
  const env = environment();
  try {
    // rc.2 settings shell projects EVERY registration, not just the active cell.
    const rows = () => env.slots.entries('settings.section').map(e => e.options.id);
    assert.deepEqual(rows(), ['agent-presets']);
    assert.equal(env.slots.entries('settings.section')[0], env.nativePage);
    assert.equal(env.slots.entries('conversation.hero.agentPreset').length, 2);
    env.removePage();
    assert.deepEqual(rows(), []);
    env.registerNative('settings.section', 'agent-presets');
    assert.deepEqual(rows(), ['agent-presets']);
  } finally { env.dispose(); }
  assert.equal(env.slots.entries('settings.section').length, 1);
  assert.equal(env.slots.entries('conversation.hero.agentPreset').length, 1);
  assert.equal(env.slots.entries('plugins.bundle.config').length, 0);
  assert.equal(env.formListeners.size, 0);
});

for (const language of ['en', 'zh']) test('manager explains paused settings integration in ' + language, async () => {
  const env = environment(language);
  const Manager = env.slots.entries('plugins.bundle.config')[0].component;
  let renderer;
  try {
    await act(async () => { renderer = TestRenderer.create(React.createElement(Manager, { view: 'detail' })); });
    const text = JSON.stringify(renderer.toJSON());
    assert.ok(text.includes(language === 'en' ? 'Presets page integration is paused' : '预设页面适配已停用'));
    const scopes = renderer.root.findByProps({ role: 'group' }).findAllByType('button');
    assert.equal(scopes.length, 2);
    assert.equal(renderer.root.findAllByProps({ type: 'checkbox' }).length, 2, 'only New chat controls remain');
    assert.ok(text.includes(language === 'en' ? 'Connected to New chat' : '已接入新对话'));
  } finally {
    if (renderer) act(() => renderer.unmount());
    env.dispose();
  }
  assert.equal(env.formListeners.size, 0);
  assert.equal(env.events.size, 0);
});

test('saving and resetting New chat preserve paused settings policy', async () => {
  const env = environment();
  const Manager = env.slots.entries('plugins.bundle.config')[0].component;
  let renderer;
  const button = label => renderer.root.findAllByType('button').find(node => node.children.includes(label));
  try {
    await act(async () => { renderer = TestRenderer.create(React.createElement(Manager, { view: 'detail' })); });
    act(() => renderer.root.findAllByProps({ type: 'checkbox' })[0].props.onChange({ target: { checked: true } }));
    await act(async () => { await button('Save changes').props.onClick(); });
    assert.deepEqual(env.writes[0], { ...env.originalPolicy, hiddenNewSession: ['b'] });
    act(() => button('Reset New chat display').props.onClick());
    await act(async () => { await button('Save changes').props.onClick(); });
    assert.deepEqual(env.writes[1], {
      ...env.originalPolicy, globalOrder: [], newSessionOrder: [], hiddenNewSession: [],
    });
  } finally {
    if (renderer) act(() => renderer.unmount());
    env.dispose();
  }
});
