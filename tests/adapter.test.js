import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPresetSurface } from '../adapter.js';

function environment() {
  const lists = new Map(); const subscriptions = new Map(); const injections = new Map();
  const notify = name => { for (const fn of [...(subscriptions.get(name) ?? [])]) fn(); };
  const slots = {
    entries: name => lists.get(name) ?? [],
    register(options, component) {
      const entry = { options: Object.fromEntries(Object.entries(options).filter(([key]) => ['id','order','priority','label'].includes(key))), component, inject: options.inject, locale: options.locale };
      lists.set(options.name, [...slots.entries(options.name),entry]); notify(options.name);
      return () => { lists.set(options.name, slots.entries(options.name).filter(row => row !== entry)); notify(options.name); };
    },
    subscribe(name, listener) { const set = subscriptions.get(name) ?? new Set(); set.add(listener);subscriptions.set(name,set);return()=>set.delete(listener); },
    inject(name, callback) {
      const record = {callback, dispose:callback()}; injections.set(name,record);
      return () => {record.dispose();injections.delete(name);};
    },
  };
  return {ctx:{slots}, slots, subscriptions,
    collapse(name) { const record=injections.get(name);record.dispose();lists.set(name,[]); },
    declare(name) {const record=injections.get(name);record.dispose=record.callback();},
  };
}
const name='conversation.hero.agentPreset';
const originalComponent=()=>{};
const makeComponent=native=>Object.assign(function WrappedNative(){}, {native});
const replacementOf=env=>env.slots.entries(name).find(row=>row.options.priority===-10);
const form={getSnapshot:()=>({status:'ready'}),subscribe:()=>()=>{}};
function source(slots, id, extra={}) {
  const store={getSnapshot:()=>({options:[{id:'a'}],current:'a'}),subscribe:()=>()=>{}};
  const select=()=>{};
  const inject=(sessionId)=>({hooks:{agentPresetSeat:store},select,sessionId});
  const dispose=slots.register({name,id,locale:'settings.agentPreset',inject,...extra},originalComponent);
  return {store,select,dispose};
}
test('waits for native entry then forwards exact controller actions and snapshot',()=>{
  const env=environment();const statuses=[];
  const dispose=attachPresetSurface(env.ctx,{name,makeComponent,form,report:ready=>statuses.push(ready)});
  assert.equal(env.slots.entries(name).length,0);
  const original=source(env.slots);
  const wrapped=replacementOf(env);
  assert.equal(wrapped.component.native,originalComponent);
  assert.equal(wrapped.inject,env.slots.entries(name)[0].inject);
  assert.equal(wrapped.options.priority,-10);
  const value=wrapped.inject('session-1');
  assert.equal(value.hooks.agentPresetSeat,original.store);
  assert.equal(value.hooks.presetManager,undefined);
  assert.equal(value.select,original.select);
  assert.equal(value.sessionId,'session-1');
  assert.deepEqual(original.store.getSnapshot(),{options:[{id:'a'}],current:'a'});
  assert.equal(statuses.at(-1),true);
  dispose();assert.equal(env.slots.entries(name).length,1);
  assert.equal(env.subscriptions.get(name).size,0);
});
test('reloading native owner removes stale closure and installs only one replacement',()=>{
  const env=environment();const first=source(env.slots);
  const dispose=attachPresetSurface(env.ctx,{name,makeComponent,form});
  assert.equal(env.slots.entries(name).length,2);
  const firstWrapper=replacementOf(env).component;
  first.dispose();assert.equal(env.slots.entries(name).length,0);
  const second=source(env.slots);
  const entries=env.slots.entries(name);
  assert.equal(entries.length,2);
  assert.equal(replacementOf(env).inject().select,second.select);
  assert.notEqual(replacementOf(env).component,firstWrapper);
  dispose();second.dispose();
});
test('only matches the native namespace and exact list cell',()=>{
  const env=environment();source(env.slots,'other');
  env.slots.register({name,id:'agent-presets',locale:'foreign',inject:()=>({})},originalComponent);
  const dispose=attachPresetSurface(env.ctx,{name,id:'agent-presets',makeComponent,form});
  assert.equal(env.slots.entries(name).length,2);
  source(env.slots,'agent-presets');
  assert.equal(env.slots.entries(name).length,4);
  dispose();assert.equal(env.slots.entries(name).length,3);
});
test('unavailable settings keep native UI and recovery reattaches without stale closures',()=>{
  const env=environment();source(env.slots);
  let snapshot={status:'loading'};const subscribers=new Set();
  const settings={getSnapshot:()=>snapshot,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);}};
  const publish=status=>{snapshot={status};for(const fn of [...subscribers])fn();};
  const dispose=attachPresetSurface(env.ctx,{name,makeComponent,form:settings});
  assert.equal(env.slots.entries(name).length,1);
  publish('ready');assert.equal(env.slots.entries(name).length,2);
  publish('unavailable');assert.equal(env.slots.entries(name).length,1);
  assert.equal(env.slots.entries(name)[0].component,originalComponent);
  publish('ready');assert.equal(env.slots.entries(name).length,2);
  dispose();assert.equal(subscribers.size,0);
});

test('declaration collapse and redeclare clean subscriptions and reattach',()=>{
  const env=environment();source(env.slots);
  const dispose=attachPresetSurface(env.ctx,{name,makeComponent,form});
  env.collapse(name);assert.equal(env.subscriptions.get(name).size,0);
  env.declare(name);source(env.slots);
  assert.equal(env.slots.entries(name).length,2);
  dispose();assert.equal(env.subscriptions.get(name).size,0);
});
