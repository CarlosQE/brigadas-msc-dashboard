// ─── core.js — Filtros temporales, cálculos y navegación ──────────────────
// ═══════════════════════════════════════════════════════════════════════════
// TIME FILTER
// ═══════════════════════════════════════════════════════════════════════════
function setTPill(mode){
  document.querySelectorAll('.pb-btn').forEach(b=>b.classList.remove('active'));
  const map={todo:'pb-todo','2024':'pb-2024','2025':'pb-2025','2026':'pb-2026',mes:'pb-mes',trim:'pb-trim',sem:'pb-sem'};
  if(map[mode]) el(map[mode])?.classList.add('active');
  el('t-from').value=''; el('t-to').value='';
  TIME_FILTER=buildTF(mode==='todo'?'all':mode==='mes'?'last30':mode==='trim'?'last90':mode==='sem'?'last180':'y'+mode);
  updateTBarRange(); renderCurrentTab();
}
function setCustomRange(){
  const f=el('t-from').value,t=el('t-to').value; if(!f&&!t) return;
  document.querySelectorAll('.tpill').forEach(b=>b.classList.remove('active'));
  TIME_FILTER={mode:'custom',from:f?new Date(f):null,to:t?new Date(t+'T23:59:59'):null};
  updateTBarRange(); renderCurrentTab();
}
function buildTF(mode){
  const now=new Date(),D=86400000;
  function d0(y,m,day){return new Date(y,m-1,day,0,0,0,0);}  // local midnight
  function d23(y,m,day){return new Date(y,m-1,day,23,59,59,999);}
  if(mode==='all')    return{mode,from:null,to:null};
  if(mode==='y2024')  return{mode,from:d0(2024,1,1), to:d23(2024,12,31)};
  if(mode==='y2025')  return{mode,from:d0(2025,1,1), to:d23(2025,12,31)};
  if(mode==='y2026')  return{mode,from:d0(2026,1,1), to:d23(2026,12,31)};
  if(mode==='last30') return{mode,from:new Date(now-30*D),to:now};
  if(mode==='last90') return{mode,from:new Date(now-90*D),to:now};
  if(mode==='last180')return{mode,from:new Date(now-180*D),to:now};
  return{mode,from:null,to:null};
}
function applyTF(data){
  const{from,to}=TIME_FILTER; if(!from&&!to) return data;
  return data.filter(d=>{if(!d.fecha)return false;if(from&&d.fecha<from)return false;if(to&&d.fecha>to)return false;return true;});
}
function fd(){return applyTF(RAW);}
function updateTBarRange(){
  const cnt=fd().length;
  const txt=TIME_FILTER.from||TIME_FILTER.to?`${cnt} registros en el período`:`${RAW.length} registros totales`;
  const rc=el('reg-count');
  if(rc) rc.textContent=txt;
}
function periodLabel(){
  const f=TIME_FILTER;
  if(f.mode==='all') return 'Historial completo (2024–2026)';
  if(f.mode==='y2024') return 'Año 2024'; if(f.mode==='y2025') return 'Año 2025'; if(f.mode==='y2026') return 'Año 2026';
  if(f.mode==='last30') return 'Último mes'; if(f.mode==='last90') return 'Último trimestre'; if(f.mode==='last180') return 'Último semestre';
  if(f.from||f.to) return`${f.from?f.from.toLocaleDateString('es-BO'):'—'} → ${f.to?f.to.toLocaleDateString('es-BO'):'—'}`;
  return 'Período personalizado';
}

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATION — cumplimiento basado en horas de _tbl2
// FIX: filteredRows se pasa como argumento para respetar filtro temporal
// ═══════════════════════════════════════════════════════════════════════════
function aggregate(filteredRows) {
  // Returns ci -> {lecs_done:Set, hrs_real, notas[], mods:{}}
  const res={};
  for(const d of filteredRows){
    if(!d.ci) continue;
    if(!res[d.ci]) res[d.ci]={lecs_done:new Set(),hrs_real:0,notas:[],mods:{}};
    const a=res[d.ci];
    if(d.asistio){a.hrs_real+=d.hrs; if(d.lecKey) a.lecs_done.add(d.lecKey);}
    if(d.nota!==null) a.notas.push(d.nota);
    if(d.modulo){
      if(!a.mods[d.modulo]) a.mods[d.modulo]={lecs_done:new Set(),hrs:0,notas:[]};
      if(d.asistio&&d.lecKey){a.mods[d.modulo].lecs_done.add(d.lecKey);a.mods[d.modulo].hrs+=d.hrs;}
      if(d.nota!==null) a.mods[d.modulo].notas.push(d.nota);
    }
  }
  return res;
}

function cumpl(lecsDone, tipo) {
  // Total cumplimiento: hrs_done_in_program / hrs_required_for_type
  const col=TIPO_COL[tipo]||'hrs_BVM';
  const hrs_req=PROGRAMA.reduce((s,l)=>s+(l[col]||0),0);
  if(!hrs_req) return{pct:0,hrs_req:0,hrs_done:0};
  const hrs_done=PROGRAMA.reduce((s,l)=>{
    const k=`${l.modulo}|${l.unidad}|${l.leccion}`;
    return s+(lecsDone.has(k)?(l[col]||0):0);
  },0);
  return{pct:Math.round(hrs_done/hrs_req*100),hrs_req,hrs_done};
}

function cumplMod(modulo, lecsDone, tipo) {
  const col=TIPO_COL[tipo]||'hrs_BVM';
  const lm=PROGRAMA.filter(l=>l.modulo===modulo);
  const hrs_req=lm.reduce((s,l)=>s+(l[col]||0),0);
  if(!hrs_req) return{pct:0,hrs_req:0,hrs_done:0,na:true};
  const hrs_done=lm.reduce((s,l)=>{
    const k=`${l.modulo}|${l.unidad}|${l.leccion}`;
    return s+(lecsDone.has(k)?(l[col]||0):0);
  },0);
  return{pct:Math.round(hrs_done/hrs_req*100),hrs_req,hrs_done,na:false};
}

function getModulos(tipo) {
  const col=TIPO_COL[tipo]||'hrs_BVM';
  return [...new Set(PROGRAMA.map(l=>l.modulo))].filter(m=>PROGRAMA.some(l=>l.modulo===m&&l[col]>0));
}


// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
function goTab(t){
  ACTIVE_TAB=t;
  ALL_TABS.forEach(id=>{
    document.getElementById('tab-'+id).style.display=id===t?'block':'none';
    document.getElementById('nb-'+id)?.classList.toggle('active',id===t);
  });
  destroyAll();
  if(t==='individual') renderIndividual();
  else if(t==='grupo') renderGrupoShell();
  else if(t==='bvb') renderNivel('BV-B');
  else if(t==='bvm') renderNivel('BV-M');
  else if(t==='ure') renderNivel('URE-M');
  else if(t==='grupomods') renderGrupoModulosShell();
  else if(t==='sinclasif') renderSinClasif();
  else if(t==='organigrama') renderOrgShell();
  else if(t==='plansemanal') renderPlanSemanal();
  else if(t==='indicadores') renderIndicadoresShell();
  else if(t==='verificar') renderVerificar();
}
function renderCurrentTab(){goTab(ACTIVE_TAB);}

