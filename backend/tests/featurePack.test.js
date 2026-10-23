
// deletes keys before import; no-provider offline gate
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const test=require('node:test'); const assert=require('node:assert/strict'); const express=require('express');
const fp=require('../routes/featurePack.js');
async function boot(){
  const app=express(); app.use(express.json());
  app.use((req,res,next)=>{ if(req.headers['x-user']) req.user={id:req.headers['x-user']}; next(); });
  app.use('/api', fp);
  const s=await new Promise(r=>{ const srv=app.listen(0,()=>r(srv)); }); return {base:'http://127.0.0.1:'+s.address().port, s};
}
const H={'Content-Type':'application/json','x-user':'u1'};
test('tasks auth, CRUD, search/filter, export, AI fallback preserve falsy', async (t)=>{
  const {base,s}=await boot(); t.after(()=>s.close());
  let r=await fetch(base+'/api/tasks'); assert.equal(r.status,401);
  r=await fetch(base+'/api/tasks',{method:'POST',headers:H,body:JSON.stringify({title:'Alpha capacity job',priority:'high',completed:false,estimateHours:0,notes:''})}); assert.equal(r.status,201);
  const created=await r.json(); assert.equal(created.completed,false); assert.equal(created.estimateHours,0); assert.equal(created.notes,'');
  r=await fetch(base+'/api/tasks',{method:'POST',headers:H,body:JSON.stringify({title:'Beta other',priority:'low'})}); assert.equal(r.status,201);
  r=await fetch(base+'/api/tasks?search=alpha',{headers:H}); let b=await r.json(); assert.equal(b.total,1); assert.equal(b.tasks[0].title.includes('Alpha'),true);
  assert.ok(Array.isArray(b.sections) && b.sections.some(x=>x.label==='Total tasks'));
  r=await fetch(base+'/api/tasks/'+created.id,{method:'PUT',headers:H,body:JSON.stringify({status:'done',completed:true})}); assert.equal(r.status,200); assert.equal((await r.json()).status,'done');
  r=await fetch(base+'/api/tasks/export?format=csv',{headers:H}); assert.match(r.headers.get('content-type'),/text\/csv/); assert.match(await r.text(),/Alpha/);
  r=await fetch(base+'/api/tasks/export?format=json',{headers:H}); b=await r.json(); assert.equal(b.format,'json'); assert.equal(b.total,2);
  r=await fetch(base+'/api/insights/capacity-hotspot-summary',{method:'POST',headers:H,body:JSON.stringify({})});
  b=await r.json(); assert.equal(b.aiGenerated,false); assert.equal(b.fallback,true); assert.equal(b.providerCalled,false);
  assert.ok(b.sections.some(x=>x.value===0)); assert.ok(b.sections.some(x=>x.value===false)); assert.ok(b.sections.some(x=>x.value===''));
  r=await fetch(base+'/api/tasks',{method:'POST',headers:H,body:JSON.stringify({})}); assert.equal(r.status,400);
});
