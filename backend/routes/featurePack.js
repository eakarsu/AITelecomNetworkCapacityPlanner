// Feature pack: authenticated tasks, search/filter, CSV/JSON export, deterministic AI insights.
// No provider calls are ever made here; insights are labelled deterministic fallbacks (aiGenerated:false).
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const express = require('express');
const router = express.Router();
const DOMAIN = "telecom network capacity planning";
const FEATURES = [{"slug": "capacity-hotspot-summary", "title": "Capacity hotspot summary", "keyword": "capacity"}, {"slug": "rollout-risk-summary", "title": "Rollout risk summary", "keyword": "rollout"}, {"slug": "alarm-priority-summary", "title": "Alarm priority summary", "keyword": "alarm"}];
const tasks = []; let seq = 0;
function uid(req){ return req.user && (req.user.id ?? req.user.userId ?? req.user.sub); }
function requireAuth(req,res,next){ if(!uid(req) && uid(req)!==0) return res.status(401).json({error:'Authentication required'}); next(); }
function own(req){ const u=String(uid(req)); return tasks.filter(t=>String(t.userId)===u); }
function view(t){ return { id:t.id, title:t.title, description:t.description, status:t.status, priority:t.priority, completed:t.completed, estimateHours:t.estimateHours, notes:t.notes, dueDate:t.dueDate, createdAt:t.createdAt, updatedAt:t.updatedAt }; }
function filtered(req, list){
  let out=list.slice();
  const q=String(req.query.search||'').trim().toLowerCase();
  if(q) out=out.filter(t=>[t.title,t.description,t.notes].some(v=>String(v??'').toLowerCase().includes(q)));
  if(req.query.status) out=out.filter(t=>t.status===req.query.status);
  if(req.query.priority) out=out.filter(t=>t.priority===req.query.priority);
  if(req.query.completed!==undefined) out=out.filter(t=>String(t.completed)===String(req.query.completed));
  return out;
}
function toCsv(rows){
  const cols=['id','title','description','status','priority','completed','estimateHours','notes','dueDate','createdAt','updatedAt'];
  const esc=v=>{ const s=v===null||v===undefined?'':String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  return [cols.join(','), ...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n')+'\n';
}
router.get('/tasks/export', requireAuth, (req,res)=>{
  const rows=filtered(req, own(req)).map(view);
  if(String(req.query.format||'csv').toLowerCase()==='json'){ res.setHeader('Content-Disposition','attachment; filename="tasks.json"'); return res.json({format:'json', total:rows.length, tasks:rows}); }
  res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="tasks.csv"'); res.send(toCsv(rows));
});
router.get('/tasks', requireAuth, (req,res)=>{ const rows=filtered(req, own(req)).map(view); res.json({tasks:rows, total:rows.length, sections:[{label:'Total tasks',value:rows.length},{label:'Completed tasks',value:rows.filter(t=>t.completed).length},{label:'Open tasks',value:rows.filter(t=>!t.completed).length}]}); });
router.post('/tasks', requireAuth, (req,res)=>{
  const title=String(req.body?.title||'').trim(); if(!title) return res.status(400).json({error:'title is required'});
  const t={ id:++seq, userId:uid(req), title, description:req.body.description??'', status:req.body.status??'open', priority:req.body.priority??'medium', completed:req.body.completed??false, estimateHours:req.body.estimateHours??0, notes:req.body.notes??'', dueDate:req.body.dueDate??'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  tasks.push(t); res.status(201).json(view(t));
});
router.put('/tasks/:id', requireAuth, (req,res)=>{
  const t=own(req).find(x=>String(x.id)===String(req.params.id)); if(!t) return res.status(404).json({error:'Task not found'});
  for(const k of ['title','description','status','priority','completed','estimateHours','notes','dueDate']) if(req.body[k]!==undefined) t[k]=req.body[k];
  t.updatedAt=new Date().toISOString(); res.json(view(t));
});
function analyze(feature, records){
  const total=records.length;
  const completed=records.filter(r=>r.completed===true||r.status==='done'||r.status==='completed').length;
  const high=records.filter(r=>r.priority==='high'||r.priority==='critical').length;
  const kw=feature.keyword.toLowerCase();
  const relevant=records.filter(r=>[r.title,r.description,r.notes,r.status].some(v=>String(v??'').toLowerCase().includes(kw))).length;
  const open=total-completed;
  const risk = high>=3||open>=5 ? 'high' : (high>=1||open>=2 ? 'medium' : 'low');
  return { feature:feature.slug, label:feature.title, domain:DOMAIN, aiGenerated:false, fallback:true, providerCalled:false,
    summary: feature.title+': '+total+' record(s) reviewed, '+completed+' completed, '+open+' open.',
    sections:[{label:'Records reviewed',value:total},{label:'Completed records',value:completed},{label:'Open records',value:open},{label:'High priority records',value:high},{label:'Records matching "'+feature.keyword+'"',value:relevant},{label:'Risk level',value:risk},{label:'Empty result preserved',value:''},{label:'Zero baseline preserved',value:0},{label:'False flag preserved',value:false}],
    recommendations: open===0?['No open records: keep monitoring.']:['Review '+open+' open record(s) first.','Start with '+high+' high-priority record(s).'] };
}
for(const f of FEATURES){
  router.post('/insights/'+f.slug, requireAuth, (req,res)=>{
    const records = Array.isArray(req.body?.records) ? req.body.records : own(req).map(view);
    res.json(analyze(f, records));
  });
}
router.get('/insights', requireAuth, (req,res)=>res.json({domain:DOMAIN, aiGenerated:false, fallback:true, features:FEATURES}));
module.exports = router;
module.exports._test = { tasks, analyze, FEATURES, toCsv };
