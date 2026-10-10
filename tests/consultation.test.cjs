const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

// Load these small modules with explicit dependencies; no database or network access.
function load(file, dependencies) {
  const source = readFileSync(join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

test('WhatsApp enquiries include the correct number, outfit and shareable link', () => {
  const { consultationHref } = load('src/lib/consultation.ts', { './config': { SITE: { whatsapp: '254789249909' } } });
  const url = new URL(consultationHref('Blue & gold suit', 'blue-suit', 'https://shop.example'));
  assert.equal(url.pathname, '/254789249909');
  assert.match(url.searchParams.get('text'), /Blue & gold suit/);
  assert.match(url.searchParams.get('text'), /https:\/\/shop.example\/products\/blue-suit/);
});

test('an unconfigured contact does not create a broken WhatsApp link', () => {
  const { consultationHref } = load('src/lib/consultation.ts', { './config': { SITE: { whatsapp: '' } } });
  assert.equal(consultationHref('Sample'), '/contact');
});

test('checkout rejects unpriced samples while accepting priced products', async () => {
  const product = { id: 'sample', name: 'Sample suit', price: 0, sizes: 'M' };
  const { priceOrder } = load('src/lib/pricing.ts', {
    './db': { db: { product: { findMany: async () => [product] } } },
    './config': { ALWAYS_MEASURE: 'Height', CUSTOM_FEE: 800, deliveryFee: () => 0 },
    './format': { splitList: (value) => value.split(',') },
  });
  const items = [{ productId: 'sample', size: 'M', qty: 1 }];
  await assert.rejects(priceOrder(items, 'PICKUP'), /consult.*WhatsApp/);
  product.price = 1500;
  assert.equal((await priceOrder(items, 'PICKUP')).total, 1500);
});
