import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));

test('compatibility record matches the declared DSH range', () => {
  const pkg = read('package.json');
  const compatibility = read('compatibility.json');
  assert.equal(pkg.engines.dsh, '>=0.2.1-0 <0.2.3-0');
  assert.equal(compatibility.range, pkg.engines.dsh);
});
