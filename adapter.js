/** Bind a replacement only while the original 0.2.1-rc.2 entry exists.
 * No DOM access, registration mutation, or service method patching. */
export function attachPresetSurface(ctx, { name, id, component, form, report = () => {} }) {
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
          entry.component !== component && entry.locale === 'settings.agentPreset' &&
          entry.options.id === id && (entry.options.priority ?? 0) === 0 &&
          typeof entry.inject === 'function') : undefined;
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
          inject: (...args) => {
            const original = next.inject(...args);
            return { ...original, hooks: { ...original.hooks, presetManager: form } };
          },
        }, component);
        report(true);
      } finally { updating = false; }
    };
    const stop = ctx.slots.subscribe(name, reconcile);
    const stopForm = form.subscribe(reconcile);
    try { reconcile(); } catch (error) { stop(); stopForm(); remove?.(); throw error; }
    return () => { active = false; stop(); stopForm(); remove?.(); report(false); };
  });
}
