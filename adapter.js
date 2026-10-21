import React from 'react';
import { presentPresets } from './policy.js';

const sameItems = (a, b) => a.length === b.length && a.every((item, i) => item === b[i]);
const isPresetMenu = node => React.isValidElement(node) && Array.isArray(node.props.items)
  && typeof node.props.selectedId === 'string' && typeof node.props.onSelect === 'function'
  && React.isValidElement(node.props.anchor) && node.props.anchor.type === 'button'
  && node.props.anchor.props['aria-haspopup'] === 'menu';
const isPresetCard = node => React.isValidElement(node) && node.type === 'li'
  && typeof node.props['data-agent-preset-id'] === 'string';
const isPresetList = node => React.isValidElement(node) && node.type === 'ul'
  && Array.isArray(node.props.children) && node.props.children.length > 0
  && node.props.children.every(isPresetCard);

/** Adapt only the inspected rc.2 list elements, leaving native controls and callbacks intact.
 * The controller keeps its complete roster, including hidden current/default presets.
 * No DOM/CSS edits, component imports, or changes to another plugin's objects. */
export function presentNativeTree(tree, policy, surface) {
  function visit(node) {
    if (Array.isArray(node)) {
      const children = node.map(visit);
      return sameItems(children, node) ? node : children;
    }
    if (!React.isValidElement(node)) return node;
    const props = node.props;
    if (surface === 'newSession' && isPresetMenu(node)) {
      const items = presentPresets(props.items, policy, surface);
      if (sameItems(items, props.items)) return node;
      // Preserve the current label, icon, handlers, focus behavior and error toast.
      // An empty menu leaves the native anchor visible but disabled.
      return React.cloneElement(node, {
        items, open: props.open && items.length > 0,
        anchor: React.cloneElement(props.anchor, {
          disabled: props.anchor.props.disabled || items.length === 0,
          'aria-expanded': props.anchor.props['aria-expanded'] && items.length > 0,
        }),
      });
    }
    if (surface === 'settings' && isPresetList(node)) {
      const rows = props.children.map(element => ({ id: element.props['data-agent-preset-id'], element }));
      const children = presentPresets(rows, policy, surface).map(row => row.element);
      return sameItems(children, props.children) ? node : React.cloneElement(node, { children });
    }
    // Only visit already-created children; do not execute nested components or inspect DOM.
    const children = visit(props.children);
    if (children === props.children) return node;
    if (surface === 'settings' && node.type === 'section' && Array.isArray(props.children)) {
      const index = props.children.findIndex(isPresetList);
      if (index >= 0 && children[index].props.children.length === 0) {
        // rc.2 groups are [heading, cards, creatorButton]. Keep the native creator entry.
        const hasOtherContent = children.some((child, i) => i !== index && child
          && !(React.isValidElement(child) && child.type === 'h3'));
        if (!hasOtherContent) return null;
      }
    }
    return React.cloneElement(node, { children });
  }
  return visit(tree);
}

function findPresetMenu(node) {
  if (isPresetMenu(node)) return node;
  if (Array.isArray(node)) {
    for (const child of node) { const menu = findPresetMenu(child); if (menu) return menu; }
  } else if (React.isValidElement(node)) return findPresetMenu(node.props.children);
}

/** The rc.2 native entries are plain function components. A fixed original
 * function runs unconditionally with its original props and hooks on every render. */
export function createNativePresetComponent(nativeRender, form, surface) {
  return function NativePresetSurface(props) {
    const subscribe = React.useCallback(listener => form.subscribe(listener), []);
    const snapshot = React.useCallback(() => form.getSnapshot(), []);
    const config = React.useSyncExternalStore(subscribe, snapshot, snapshot);
    const tree = nativeRender(props);
    const projected = config.status === 'ready' ? presentNativeTree(tree, config.value?.policy, surface) : tree;
    const menu = surface === 'newSession' ? findPresetMenu(projected) : undefined;
    const ids = JSON.stringify(menu?.props.items.map(item => item.id) ?? []);
    const previousIds = React.useRef(ids);
    React.useLayoutEffect(() => {
      if (previousIds.current === ids) return;
      previousIds.current = ids;
      // Close the original state too: all-hidden → restored must not reopen the
      // menu, and reordered/removed items must not retain a stale focus target.
      menu?.props.onClose();
    }, [ids, menu]);
    return projected;
  };
}

/** Bind to one exact native registration for its lifetime. Each new native render
 * function gets a new wrapper identity, so its hooks cannot leak across reloads.
 * makeComponent must render that fixed function unconditionally, never swap it. */
export function attachPresetSurface(ctx, { name, id, makeComponent, form, report = () => {} }) {
  return ctx.slots.inject(name, () => {
    let source;
    let remove;
    let active = true;
    let updating = false;
    const reconcile = () => {
      if (!active || updating) return;
      updating = true;
      try {
        const next = form.getSnapshot().status === 'ready' ? ctx.slots.entries(name).find(entry =>
          entry.locale === 'settings.agentPreset' &&
          entry.options.id === id && (entry.options.priority ?? 0) === 0 &&
          typeof entry.inject === 'function' && typeof entry.component === 'function') : undefined;
        if (next === source) return;
        remove?.();
        remove = undefined;
        source = next;
        if (!next) { report(false); return; }
        // These exact native registrations have no store or child declarations.
        if (next.store || next.children) { report(false); return; }
        remove = ctx.slots.register({
          ...next.options, name, locale: next.locale,
          priority: (next.options.priority ?? 0) - 10,
          inject: next.inject,
        }, makeComponent(next.component));
        report(true);
      } finally { updating = false; }
    };
    const stop = ctx.slots.subscribe(name, reconcile);
    const stopForm = form.subscribe(reconcile);
    try { reconcile(); } catch (error) { stop(); stopForm(); remove?.(); throw error; }
    return () => { active = false; stop(); stopForm(); remove?.(); report(false); };
  });
}
