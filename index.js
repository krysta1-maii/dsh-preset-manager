import Schema from '@deepseek-ai/schemastery';
import { DEFAULT_POLICY, POLICY_FIELDS, normalizePolicy } from './policy.js';

export const SETTINGS_NAMESPACE = 'dsh-preset-manager';
export const inject = ['settings', 'agentPresets', 'tools', 'approval'];

const PolicyConfig = Schema.object(Object.fromEntries(POLICY_FIELDS.map((field) => [
  field, Schema.array(Schema.string().min(1)).default([]),
])));

/** One volatile object makes a complete policy one live, revision-checked edit. */
export const Config = Schema.object({
  policy: PolicyConfig.default(normalizePolicy(DEFAULT_POLICY)).volatile()
    .description('Preset visibility and ordering by Web surface. Does not disable presets or change defaults.'),
});

export const POLICY_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(POLICY_FIELDS.map((field) => [field, {
    type: 'array', items: { type: 'string' },
  }])),
  required: [...POLICY_FIELDS],
  additionalProperties: false,
};

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    namespace: { type: 'string' },
    revision: { type: 'integer' },
    policy: POLICY_SCHEMA,
    presets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, isDefault: { type: 'boolean' },
          name: { type: 'string' }, description: { type: 'string' }, broken: { type: 'string' },
        },
        required: ['id', 'isDefault'],
        additionalProperties: false,
      },
    },
  },
  required: ['namespace', 'revision', 'policy', 'presets'],
  additionalProperties: false,
};

function assertRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new TypeError('expectedRevision must be a non-negative safe integer from preset_manager get');
  }
}

function completePolicy(policy) {
  if (policy === null || typeof policy !== 'object' || Array.isArray(policy)
    || POLICY_FIELDS.some((field) => !Object.hasOwn(policy, field))
    || Object.keys(policy).some((field) => !POLICY_FIELDS.includes(field))) {
    throw new TypeError('set requires the complete policy with exactly its five array fields');
  }
  return normalizePolicy(policy);
}

/** The existing Settings service remains the single persistence and concurrency authority. */
export function createPresetManagerService(ctx) {
  const describe = () => {
    const descriptor = ctx.settings.describe().find((item) => item.ns === SETTINGS_NAMESPACE);
    if (!descriptor) throw new Error('Preset Manager settings are not available; mount the dsh-preset-manager Loader entry');
    return descriptor;
  };
  return {
    async snapshot() {
      const roster = await ctx.agentPresets.remoteExportList();
      const descriptor = describe();
      return {
        namespace: SETTINGS_NAMESPACE,
        revision: descriptor.revision,
        policy: normalizePolicy(descriptor.value?.policy),
        presets: roster.presets.map((row) => ({
          id: row.id, isDefault: row.isDefault,
          ...(row.name === undefined ? {} : { name: row.name }),
          ...(row.description === undefined ? {} : { description: row.description }),
          ...(row.broken === undefined ? {} : { broken: row.broken }),
        })),
      };
    },
    async update(policy, expectedRevision) {
      assertRevision(expectedRevision);
      const next = completePolicy(policy);
      // All five arrays are supplied, so merging replaces the entire known policy atomically.
      // UI configForms.mutate([{ op: 'set', path: ['policy'], value: next }], revision)
      // reaches the same Settings.write transaction and revision check.
      await ctx.settings.update(SETTINGS_NAMESPACE, { policy: next }, expectedRevision);
      return this.snapshot();
    },
  };
}

export function apply(ctx) {
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber));
  const manager = createPresetManagerService(ctx);
  ctx.provide('presetManager', manager);
  ctx.effect(() => ctx.tools.register({
    name: 'preset_manager',
    description: 'Read or replace New chat preset visibility and order for this profile. Presets page integration is paused. Hiding does not disable presets or change session/default selections. Changes affect all browsers using this profile and require approval.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'set'], description: 'get returns the full roster, policy and revision; set replaces the policy.' },
        policy: { ...POLICY_SCHEMA, description: 'Required for set: all five arrays. Preserve settingsOrder and hiddenSettings from get; both are retained but inactive. Empty newSessionOrder inherits globalOrder. Unlisted ids follow roster order; unavailable ids remain saved.' },
        expectedRevision: { type: 'integer', description: 'Required for set: revision from the latest get. A stale revision fails without writing; read again before retrying.' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: {
      schema: RESULT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: (args) => args?.action === 'get',
    presentCall: (args) => ({
      card: 'generic', title: args?.action === 'get' ? 'Read preset presentation' : 'Update preset presentation',
      kind: args?.action === 'get' ? 'read' : 'edit', rawInput: args,
    }),
    async execute(args, exec) {
      if (!args || typeof args !== 'object' || Array.isArray(args)
        || !['get', 'set'].includes(args.action)
        || Object.keys(args).some((key) => !['action', 'policy', 'expectedRevision'].includes(key))) {
        throw new TypeError('Expected action get or set');
      }
      if (args.action === 'get') {
        if (args.policy !== undefined || args.expectedRevision !== undefined) {
          throw new TypeError('get accepts only action');
        }
        return manager.snapshot();
      }
      assertRevision(args.expectedRevision);
      const policy = completePolicy(args.policy);
      if (!exec.agent) throw new Error('Changing preset presentation requires a requesting Agent');
      exec.signal.throwIfAborted();
      const reason = 'Replace this profile’s Web preset display policy only. Preset definitions and default/session selections stay unchanged. Policy: ' + JSON.stringify(policy);
      const outcome = await ctx.approval.request({
        agent: exec.agent, toolName: 'preset_manager', callId: exec.callId,
        signal: exec.signal, reason,
        displayReason: {
          en: reason,
          zh: '替换当前 profile 的 Web 预设显示策略，不禁用预设、不更改默认模式或现有会话。策略：' + JSON.stringify(policy),
        },
      });
      exec.signal.throwIfAborted();
      if (outcome !== 'allowed-once') throw new Error('Preset presentation update was not approved: ' + outcome);
      return manager.update(policy, args.expectedRevision);
    },
  }));
}
