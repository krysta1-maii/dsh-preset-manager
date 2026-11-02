import Schema from '@deepseek-ai/schemastery';
import { DEFAULT_POLICY, POLICY_FIELDS, normalizePolicy } from './policy.js';

export const SETTINGS_NAMESPACE = 'dsh-preset-manager';
export const inject = ['settings'];

const PolicyConfig = Schema.object(Object.fromEntries(POLICY_FIELDS.map((field) => [
  field, Schema.array(Schema.string().min(1)).default([]),
])));

/** One volatile object makes a complete policy one live, revision-checked edit. */
export const Config = Schema.object({
  policy: PolicyConfig.default(normalizePolicy(DEFAULT_POLICY)).volatile()
    .description('Preset visibility and ordering by Web surface. Does not disable presets or change defaults.'),
});

/** The Web panel edits this volatile field through configForms; the Host only owns the schema. */
export function apply(ctx) {
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber));
}
