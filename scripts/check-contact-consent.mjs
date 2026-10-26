import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const analytics = readFileSync(new URL('../analytics.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function node() {
  return {hidden:false, listeners:{}, attrs:{}, dataset:{}, addEventListener(t,f){this.listeners[t]=f;},setAttribute(k,v){this.attrs[k]=v;},focus(){}};
}
function measurement(saved={}) {
  const nodes = {'.analytics-details-toggle':node(),'#analytics-details':node(),button:node()};
  nodes['#analytics-details'].hidden=true;
  const panel=node();panel.querySelector=s=>nodes[s];
  const preferences=node(); const sources=[]; const events={}; const storage=new Map(Object.entries(saved));
  const context={URL,URLSearchParams,Date,location:new URL('https://www.ammonlim.com/buy-hdb/'),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{referrer:'',cookie:'',createElement:t=>t==='section'?panel:t==='button'?preferences:{},body:{appendChild(){}},head:{appendChild(s){sources.push(s.src);}},querySelector:()=>null,addEventListener:(t,f)=>events[t]=f}};
  context.window=context;vm.createContext(context);vm.runInContext(analytics,context);
  return {context,panel,nodes,sources,storage,choose(choice){panel.listeners.click({target:{closest:()=>({dataset:{choice}})}});},click(place){const link={protocol:'https:',hostname:'wa.me',pathname:'/6580989441',matches:s=>s==='[data-send-brief]'?place==='buyer_brief':s==='.wa-float'&&place==='floating',closest:()=>place==='sticky'?{}:null};events.click({type:'click',button:0,target:{closest:()=>link}});}};
}
const m=measurement();
assert.equal(m.panel.hidden,false);assert.equal(m.sources.length,0);
m.nodes['.analytics-details-toggle'].listeners.click();assert.equal(m.nodes['#analytics-details'].hidden,false);assert.equal(m.sources.length,0);
m.choose('declined');assert.equal(m.panel.hidden,true);assert.equal(m.sources.length,0);m.click('sticky');assert.equal(m.context.dataLayer,undefined);
m.choose('accepted');assert.equal(m.sources.length,2);
for(const place of ['buyer_brief','floating','sticky']) m.click(place);
const clicks=m.context.dataLayer.filter(e=>e[0]==='event');assert.equal(clicks.length,3);
assert.deepEqual(Array.from(clicks,e=>e[2].cta_location),['buyer_brief','floating','sticky']);
for(const e of clicks)assert.deepEqual(Object.keys(e[2]),['cta_location']);
const count=m.context.oaiq.q.filter(e=>e[0]==='measure'&&e[1]==='lead_created').length;
assert.equal(count,3);m.choose('declined');m.click('sticky');assert.equal(m.context.oaiq.q.filter(e=>e[0]==='measure'&&e[1]==='lead_created').length,count);
const saved=choice=>JSON.stringify({choice,expires:Date.now()+86400000});
assert.equal(measurement({ammon_analytics_consent_v2:saved('declined')}).sources.length,0);
assert.equal(measurement({ammon_analytics_consent_v1:saved('declined')}).panel.hidden,true);
const accepted=measurement({ammon_analytics_consent_v2:saved('accepted')});assert.equal(accepted.sources.length,2);assert.equal(accepted.panel.hidden,true);assert.ok(!accepted.context.oaiq.q.some(e=>e[0]==='consent'&&e[1]===false));
// Exercise the real shared sticky-bar controller across scrolling and hero changes.
const stickyCode=app.slice(app.indexOf('const stickyBar ='));
function sticky(actions){
 const bar={hidden:true};const events={};
 const c={document:{querySelector:s=>s==='#stickybar'?bar:{getBoundingClientRect:()=>({bottom:70})},querySelectorAll:s=>{assert.ok(s.includes('.rv-page > .hero > .button'));return actions;}},requestAnimationFrame:f=>f()};
 c.window={addEventListener:(t,f)=>events[t]=f};vm.runInNewContext(stickyCode,c);return {bar,events};
}
const buyer={bottom:470,getClientRects:()=>[{}],getBoundingClientRect(){return {bottom:this.bottom};}};
const b=sticky([buyer]);assert.equal(b.bar.hidden,true);buyer.bottom=40;b.events.scroll();assert.equal(b.bar.hidden,false);buyer.bottom=470;b.events.pageshow();assert.equal(b.bar.hidden,true);
assert.equal(sticky([]).bar.hidden,false);
const hiddenHero={getClientRects:()=>[]};assert.equal(sticky([hiddenHero,buyer]).bar.hidden,true);
console.log('PASS: consent gating, disclosure, refusal, saved choices, withdrawal, all three contact placements, event privacy, buyer sticky reveal and fallback.');
