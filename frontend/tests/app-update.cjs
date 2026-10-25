const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('public/registerSW.js', 'utf8');
async function run({ controlled, waiting }) {
 const events={}, nodes=new Map(), regEvents={}, workerEvents={}; let reloads=0, activationRequests=0, options;
 function element(){return {style:{},children:[],events:{},setAttribute(){},addEventListener(n,fn){this.events[n]=fn},append(...children){this.children.push(...children);for(const child of children)if(child.id)nodes.set(child.id,child)}}}
 const registration={waiting:waiting?{postMessage(body){assert.equal(body.type,'SKIP_WAITING');activationRequests++}}:null,installing:{state:'installing',addEventListener(n,fn){workerEvents[n]=fn}},update:()=>Promise.resolve(),addEventListener(n,fn){regEvents[n]=fn}};
 const context={navigator:{serviceWorker:{controller:controlled?{}:null,addEventListener(n,fn,opts){if(opts?.once)events.clickChange=fn;else events[n]=fn},register(url,opts){assert.equal(url,'/sw.js');options=opts;return Promise.resolve(registration)}}},document:{body:element(),getElementById:id=>nodes.get(id),createElement:element},window:{location:{reload(){reloads++}},addEventListener(){}},Date,Object};
 vm.runInNewContext(source,context);await Promise.resolve();
 assert.equal(options.updateViaCache,'none');
 if(!waiting){regEvents.updatefound();registration.installing.state='installed';workerEvents.statechange();}
 events.controllerchange();events.controllerchange();
 assert.equal(reloads,0,'nunca recarga sin clic');assert.equal(activationRequests,0,'nunca activa worker sin clic');
 assert.equal(nodes.size,controlled?1:0,'sin avisos duplicados ni en primera instalación');
 if(controlled){nodes.get('3ld-update-notice').children[1].events.click();if(waiting){assert.equal(activationRequests,1);assert.equal(reloads,0);events.clickChange();}assert.equal(reloads,1);}
}
(async()=>{await run({controlled:true,waiting:true});await run({controlled:true,waiting:false});await run({controlled:false,waiting:false});console.log('OK: aviso de versión instalada/en espera; activación y recarga solo después de clic; primera instalación y deduplicación.');})().catch(e=>{console.error(e);process.exitCode=1});
