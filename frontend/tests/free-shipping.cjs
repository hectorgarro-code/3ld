const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function compile(file, imports = {}) {
  const scope = { exports: {}, require: name => imports[name] || require(name), localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  vm.createContext(scope);
  vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.exports;
}
const pricing = compile('lib/pricing.ts');
const { projectFreeShipping } = compile('lib/freeShipping.ts', { './pricing': pricing });
const { useCartStore } = compile('store/cartStore.ts', { '@/lib/pricing': pricing });
const product = { id: 114, price: 2500, basePrice: 2500, precios_cantidad: [{ cantidad: 10, precio: 2000 }, { cantidad: 20, precio: 1500 }] };
let goal = projectFreeShipping([], product, 1, 'Estándar');
assert.equal(goal.projectedSubtotal, 2500);
assert.equal(goal.targetQuantity, 20); // 15 y 20 cuestan $30.000: ofrecer más por el mismo importe.
assert.equal(goal.targetSubtotal, 30000);
assert.equal(projectFreeShipping([], product, 20, 'Estándar').targetQuantity, null);
const existing = [{ ...product, qty: 9, color: 'Estándar' }];
goal = projectFreeShipping(existing, product, 1, 'Estándar');
assert.equal(goal.projectedSubtotal, 20000); // La décima unidad repricia las nueve anteriores.
assert.equal(goal.unitPrice, 2000);
assert.equal(goal.targetQuantity, 11); // Nueve existentes + once nuevas = veinte.
assert.equal(projectFreeShipping(existing, product, 1, 'Blanco').targetQuantity, 3);
assert.equal(projectFreeShipping([{ id: 7, qty: 1, price: 5000, color: 'Estándar' }], product, 1, 'Estándar').targetQuantity, 13);
const drop = { id: 3, price: 20000, precios_cantidad: [{ cantidad: 2, precio: 1000 }] };
assert.equal(projectFreeShipping([], drop, 1, 'Estándar').targetQuantity, 30);
assert.equal(projectFreeShipping([], { id: 0, price: 0 }, 1, 'Estándar').targetQuantity, null);
assert.equal(projectFreeShipping([], { ...product, precios_cantidad: [{ cantidad: 20, precio: 0 }] }, 21, 'Estándar').targetQuantity, null);
const pieceCart = [{ id: 114, price: 2500, qty: 9, color: 'Estándar', selectedPieceIds: ['a'], precios_cantidad: [] }];
assert.equal(projectFreeShipping(pieceCart, { ...product, selectedPieceIds: ['b'], precios_cantidad: [] }, 1, 'Estándar').targetQuantity, 3);
for (const cart of [[], existing, pieceCart]) {
 for (const color of ['Estándar', 'Blanco']) {
  for (const qty of [1, 9, 10, 19, 20]) {
   const projected = projectFreeShipping(cart, product, qty, color);
   useCartStore.getState().clearCart();
   for (const item of cart) useCartStore.getState().addToCart(item, item.qty, item.color);
   useCartStore.getState().addToCart(product, qty, color);
   const actual = useCartStore.getState().cart.reduce((sum, item) => sum + item.price * item.qty, 0);
   assert.equal(projected.projectedSubtotal, actual);
   if (projected.targetQuantity !== null) assert.ok(projectFreeShipping(cart, product, projected.targetQuantity, color).projectedSubtotal >= 30000);
  }
 }
}
console.log('OK: meta exacta, mejor cantidad por igual importe, repricing de unidades previas, colores, piezas, importes cero y 30 comparaciones contra el carrito real.');
