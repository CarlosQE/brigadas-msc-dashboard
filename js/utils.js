// ─── utils.js — Constantes, estado global y helpers ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════
let RAW = [], PERSONAL = {}, PROGRAMA = [], CHARTS = {};
let LEC_LOOKUP = {};
let TIME_FILTER = { mode:'all', from:null, to:null };
let ACTIVE_TAB = 'individual';

const TIPO_COL   = {'BV-B':'hrs_BVB','BV-M':'hrs_BVM','GPR':'hrs_GPR','LE':'hrs_LE','URE-M':'hrs_UREM'};
const TIPO_LABEL = {'BV-B':'Nivel Inicial','BV-M':'Nivel Medio','URE-M':'URE','LE':'Líderes Evacuación','GPR':'GPR','':'Sin clasificar'};
const TIPO_BADGE = {'BV-M':'b-bvm','BV-B':'b-bvb','URE-M':'b-ure','LE':'b-le','GPR':'b-gpr','':'b-bvb'};
const ALL_TABS = ['individual','grupo','grupomods','bvb','bvm','ure','sinclasif','organigrama','plansemanal','indicadores','verificar'];

// Ground truth for verification panel
const GT = {
  total_rows:1965, cis_unicos:128, lecciones:188,
  matched_lecs:1942, hrs_BVB:95, hrs_BVM:128, lecs_BVB:41, lecs_BVM:54,
  bvm_2026_cis:55, bvm_2026_rows:261
};


// ═══════════════════════════════════════════════════════════════════════════
// CHART FACTORY & UTILS
// ═══════════════════════════════════════════════════════════════════════════
function mk(id,type,labels,data,colors,opts={}){
  if(!document.getElementById(id))return;
  if(CHARTS[id]){CHARTS[id].destroy();delete CHARTS[id];}
  const multi=Array.isArray(colors)&&colors.length>1;
  CHARTS[id]=new Chart(document.getElementById(id),{type,
    data:{labels,datasets:[{data,backgroundColor:multi?colors:colors[0]||'#78be44',borderRadius:type==='bar'?4:0,tension:.3,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{y:{max:opts.ymax,min:opts.ymin,grid:{color:'#dde2e4'},
               ticks:{color:'#6b7c82',callback:opts.ypct?v=>v+'%':undefined}},
              x:{grid:{display:false},ticks:{color:'#6b7c82',font:{size:10}}}}}});
}
function destroyCharts(ids){ids.forEach(id=>{if(CHARTS[id]){CHARTS[id].destroy();delete CHARTS[id];}});}
function destroyAll(){Object.values(CHARTS).forEach(c=>{try{c.destroy()}catch{}});CHARTS={};}
function s(v){return v===null||v===undefined?'':String(v).trim();}
function n(v){const r=parseFloat(v);return isNaN(r)?0:r;}
function el(id){return document.getElementById(id);}
function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;}
function f1(v){return v!==null&&v!==undefined?Number(v).toFixed(1):'—';}
function cp(p){return p>=80?'#78be44':p>=50?'#f0a500':'#d94f3d';}
function bdg(t){const cls=TIPO_BADGE[t]||'b-bvb';return t?`<span class="badge ${cls}">${t}</span>`:'<span class="badge b-bvb" style="opacity:.5">—</span>';}
function showLd(v){el('ld').style.display=v?'flex':'none';}
function toast(msg){const t=el('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}
function resetApp(){destroyAll();RAW=[];PERSONAL={};PROGRAMA=[];LEC_LOOKUP={};el('app').style.display='none';el('up').style.display='flex';el('fi').value='';}
