import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { presentNativeTree, createNativePresetComponent } from '../adapter.js';
import TestRenderer, { act } from 'react-test-renderer';

const h = React.createElement;
const Menu = () => null;
const Dialog = () => null;
const ids = menu => menu.props.items.map(item => item.id);
function menuFixture() {
  const icon = h('svg', { 'aria-hidden': true });
  const label = h('span', { className: 'native-label' }, 'Hidden current name');
  const anchor = h('button', {
    className: 'native-seat', 'aria-haspopup': 'menu', 'aria-expanded': true,
    disabled: false, onClick() {}, children: [icon, label],
  });
  return h(Menu, { open: true, items: ['a', 'b', 'c'].map(id => ({ id, label: h('span', null, id) })),
    selectedId: 'a', onSelect() {}, onClose() {}, anchor, portal: true });
}
function cardsFixture() {
  const card = id => h('li', { key: id, 'data-agent-preset-id': id, className: 'native-card' },
    h('button', { onClick() {}, 'aria-pressed': id === 'a' }, id),
    h('button', { onClick() {}, 'aria-label': 'Mode explanation' }, 'Help'));
  const builtIn = h('section', { key: 'true' }, h('h3', null, 'Built-in'), h('ul', null, ['a','b'].map(card)), null);
  const creator = h('button', { onClick() {} }, 'Create preset');
  const custom = h('section', { key: 'false' }, h('h3', null, 'Custom'), h('ul', null, ['c','d'].map(card)), creator);
  const dialog = h(Dialog, { open: true, onClose() {}, title: 'Original current view' });
  return h('section', { className: 'native-section' }, h('h2', null, 'Presets'), [builtIn,custom], dialog);
}

test('empty policy returns the exact native tree, not a recreated UI', () => {
  for (const [surface, tree] of [['newSession', menuFixture()], ['settings', cardsFixture()]]) {
    assert.equal(presentNativeTree(tree, {}, surface), tree);
  }
});

test('hero only projects menu candidates and preserves current label, icons and callbacks', () => {
  const menu = menuFixture();
  const toast = h('aside', { role: 'alert' }, 'Native refusal');
  const tree = h(React.Fragment, null, menu, toast);
  const result = presentNativeTree(tree, { hiddenNewSession: ['a'], newSessionOrder: ['c','b'] }, 'newSession');
  const filtered = result.props.children[0];
  assert.deepEqual(ids(filtered), ['c','b']);
  assert.equal(filtered.type, menu.type);
  assert.equal(filtered.props.items[0], menu.props.items[2]);
  assert.equal(filtered.props.anchor.props.children, menu.props.anchor.props.children);
  assert.equal(filtered.props.anchor.props.onClick, menu.props.anchor.props.onClick);
  assert.equal(filtered.props.anchor.props.className, menu.props.anchor.props.className);
  assert.equal(filtered.props.selectedId, 'a');
  assert.equal(filtered.props.onSelect, menu.props.onSelect);
  assert.equal(filtered.props.onClose, menu.props.onClose);
  assert.equal(result.props.children[1], toast);
  assert.deepEqual(ids(menu), ['a','b','c']);
});

test('all-hidden keeps the native current label but closes and disables the menu', () => {
  const original = menuFixture();
  const result = presentNativeTree(original, { hiddenNewSession: ['a','b','c'] }, 'newSession');
  assert.deepEqual(ids(result), []);
  assert.equal(result.props.open, false);
  assert.equal(result.props.anchor.props.disabled, true);
  assert.equal(result.props.anchor.props['aria-expanded'], false);
  assert.equal(result.props.anchor.props.children, original.props.anchor.props.children);
  assert.equal(original.props.anchor.props.disabled, false);
  assert.equal(presentNativeTree(original, {}, 'newSession'), original);
});

test('busy state and coding-tools filtering supplied by native UI are not relaxed', () => {
  const original = menuFixture();
  const gated = React.cloneElement(original, { items: original.props.items.slice(0,2),
    anchor: React.cloneElement(original.props.anchor, { disabled: true }) });
  const result = presentNativeTree(gated, { globalOrder: ['c','b'] }, 'newSession');
  assert.deepEqual(ids(result), ['b','a']);
  assert.equal(result.props.anchor.props.disabled, true);
});

test('settings preserve native groups, cards, help buttons, creator and dialogs', () => {
  const original = cardsFixture();
  const groups = original.props.children[1];
  const result = presentNativeTree(original, { globalOrder: ['d','b','c','a'], hiddenSettings: ['a'] }, 'settings');
  const nextGroups = result.props.children[1];
  assert.equal(result.props.className, original.props.className);
  assert.equal(result.props.children[0], original.props.children[0]);
  assert.equal(nextGroups[0].props.children[0], groups[0].props.children[0]);
  assert.deepEqual(nextGroups[0].props.children[1].props.children, [groups[0].props.children[1].props.children[1]]);
  const customCards = groups[1].props.children[1].props.children;
  assert.deepEqual(nextGroups[1].props.children[1].props.children, [customCards[1], customCards[0]]);
  assert.equal(nextGroups[1].props.children[2], groups[1].props.children[2]);
  assert.equal(result.props.children[2], original.props.children[2]);
  assert.equal(groups[0].props.children[1].props.children.length, 2);
});

test('all-hidden removes empty groups but keeps native creator and any open dialog', () => {
  const original = cardsFixture();
  const result = presentNativeTree(original, { hiddenSettings: ['a','b','c','d'] }, 'settings');
  assert.equal(result.props.children[1][0], null);
  assert.deepEqual(result.props.children[1][1].props.children[1].props.children, []);
  assert.equal(result.props.children[1][1].props.children[2], original.props.children[1][1].props.children[2]);
  assert.equal(result.props.children[2], original.props.children[2]);
});

test('native hooks persist; policy changes close real menu state before restoring candidates', () => {
  let snapshot = { status: 'ready', value: { policy: {} } };
  const listeners = new Set();
  const form = { getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  const publish = policy => act(() => {
    snapshot = { status: 'ready', value: { policy } };
    for (const listener of listeners) listener();
  });
  let mounted = 0; let disposed = 0; let received;
  function Native(props) {
    received = props;
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => { mounted++; return () => { disposed++; }; }, []);
    const original = menuFixture();
    return React.cloneElement(original, { open, onClose: () => setOpen(false),
      anchor: React.cloneElement(original.props.anchor, { 'aria-expanded': open, onClick: () => setOpen(!open) }) });
  }
  const Wrapped = createNativePresetComponent(Native, form, 'newSession');
  const originalProps = { select() {}, load() {}, sessionId: 'same-session' };
  let renderer;
  act(() => { renderer = TestRenderer.create(h(Wrapped, originalProps)); });
  const menu = () => renderer.root.findByType(Menu).props;
  try {
    assert.equal(received.select, originalProps.select);
    assert.equal(received.sessionId, originalProps.sessionId);
    act(() => menu().anchor.props.onClick());
    assert.equal(menu().open, true);
    publish({ hiddenNewSession: ['a','b','c'] });
    assert.equal(menu().open, false);
    assert.equal(menu().anchor.props.disabled, true);
    publish({});
    assert.equal(menu().open, false, 'restoring candidates must not reopen the native menu');
    assert.equal(menu().anchor.props.disabled, false);
    act(() => menu().anchor.props.onClick());
    publish({ newSessionOrder: ['c','b'] });
    assert.equal(menu().open, false, 'reordering closes stale keyboard focus');
    assert.deepEqual(menu().items.map(row => row.id), ['c','b','a']);
    assert.equal(mounted, 1, 'policy changes do not remount native controls');
    assert.equal(disposed, 0);
  } finally { act(() => renderer.unmount()); }
  assert.equal(disposed, 1);
  assert.equal(listeners.size, 0);
});

test('surface policies and non-preset nodes remain independent', () => {
  const menu = menuFixture();
  assert.equal(presentNativeTree(menu, { hiddenSettings: ['a'] }, 'newSession'), menu);
  const cards = cardsFixture();
  assert.equal(presentNativeTree(cards, { hiddenNewSession: ['a'] }, 'settings'), cards);
  const unrelated = h('ul', null, h('li', null, 'Unrelated'));
  assert.equal(presentNativeTree(unrelated, { hiddenSettings: ['a'] }, 'settings'), unrelated);
  assert.equal(presentNativeTree(null, {}, 'settings'), null);
});
