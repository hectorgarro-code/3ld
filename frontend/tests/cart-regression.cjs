const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('typescript');
const storage=new Map();
function compile(file,requireFn=require){
 const scope={exports:{},require:requireFn,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 vm.createContext(scope);
 vm.runInContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
 return scope.exports;
}
const pricing=compile('lib/pricing.ts');
const {useCartStore}=compile('store/cartStore.ts',name=>name==='@/lib/pricing'?pricing:require(name));
const product={id:113,title:'Pieza A',price:2000,image:'/test.png',selectedPieceIds:['a']};
useCartStore.getState().addToCart(product,1,'Blanco');
useCartStore.getState().addToCart({...product,title:'Pieza B',price:3000,selectedPieceIds:['b']},1,'Blanco');
assert.equal(useCartStore.getState().cart.length,2);
useCartStore.getState().updateCartQty(113,'Blanco',1,['a']);
assert.equal(useCartStore.getState().cart[0].qty,2);
assert.equal(useCartStore.getState().cart[1].qty,1);
useCartStore.getState().removeCartItem(113,'Blanco',['a']);
assert.equal(useCartStore.getState().cart.length,1);
assert.equal(useCartStore.getState().cart[0].selectedPieceIds[0],'b');
useCartStore.getState().clearCart();
useCartStore.getState().addToCart({...product,selectedPieceIds:undefined,precios_cantidad:[{cantidad:3,precio:1500}]},2,'Blanco');
useCartStore.getState().updateCartQty(113,'Blanco',1);
assert.equal(useCartStore.getState().cart[0].price,1500);
useCartStore.getState().updateCartQty(113,'Blanco',-1);
assert.equal(useCartStore.getState().cart[0].price,2000);
console.log('OK: selecciones del mismo producto/color permanecen separadas; cantidades y eliminación afectan solo su variante; escalas se aplican y revierten.');

// Cantidades elegidas en el detalle: aplicar el tramo y conservar el precio base al bajar.
const volumen={id:114,title:'Llavero 2026',price:2500,image:'/test.png',precios_cantidad:[{cantidad:10,precio:2000},{cantidad:20,precio:1500}]};
for(const [qty,unit] of [[1,2500],[9,2500],[10,2000],[19,2000],[20,1500]]){
 useCartStore.getState().clearCart();useCartStore.getState().addToCart(volumen,qty,'Estándar');
 const item=useCartStore.getState().cart[0];assert.equal(item.qty,qty);assert.equal(item.price,unit);assert.equal(item.basePrice,2500);
}
useCartStore.getState().updateCartQty(114,'Estándar',-11);
assert.equal(useCartStore.getState().cart[0].price,2500);
useCartStore.getState().addToCart(volumen,1,'Estándar');
assert.equal(useCartStore.getState().cart[0].qty,10);assert.equal(useCartStore.getState().cart[0].price,2000);
console.log('OK: compra directa de 1, 9, 10, 19 y 20 unidades, reversión y combinación de cantidades conservan la escala y precio base.');

useCartStore.getState().clearCart();
useCartStore.getState().addToCart({...volumen,price:1500,basePrice:2500},20,'Estándar');
assert.equal(useCartStore.getState().cart[0].price,1500);
useCartStore.getState().updateCartQty(114,'Estándar',-11);
assert.equal(useCartStore.getState().cart[0].price,2500);
console.log('OK: detalle envía el precio descontado para seguimiento y conserva el precio original al reducir cantidades.');
