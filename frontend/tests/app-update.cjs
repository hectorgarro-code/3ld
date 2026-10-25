const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('public/registerSW.js', 'utf8');
async function run(hasController) {
  const events = {}, nodes = new Map(); let reloads = 0, registration;
  function element() { return { style: {}, children: [], events: {}, setAttribute() {}, addEventListener(name, fn) { this.events[name] = fn }, append(...children) { this.children.push(...children); for (const child of children) if (child.id) nodes.set(child.id, child) } } }
  const body = element();
  const context = { navigator: { serviceWorker: { controller: hasController ? {} : null, addEventListener(name, fn) { events[name] = fn }, register(url, options) { registration = {url, options}; return Promise.resolve({update: () => Promise.resolve()}) } } }, document: { body, getElementById: id => nodes.get(id), createElement: element }, window: { location: {reload() { reloads++ }}, addEventListener() {} }, Date, Object, Boolean };
  vm.runInNewContext(source, context); await Promise.resolve();
  assert.equal(registration.url, '/sw.js'); assert.equal(registration.options.updateViaCache, 'none');
  if (!hasController) { events.controllerchange(); assert.equal(nodes.size, 0, 'primera instalación sin aviso'); }
  events.controllerchange(); events.controllerchange();
  assert.equal(nodes.size, 1, 'un solo aviso ante varias activaciones');
  assert.equal(reloads, 0, 'no recarga formularios ni pagos automáticamente');
  nodes.get('3ld-update-notice').children[1].events.click();
  assert.equal(reloads, 1, 'solo actualiza por acción del usuario');
}
(async () => { await run(true); await run(false); console.log('OK: actualización sin caché de script, aviso único, primera instalación y recarga solo con clic.'); })().catch(error => { console.error(error); process.exitCode = 1 });
