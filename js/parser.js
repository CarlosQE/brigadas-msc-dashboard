// ─── parser.js — Carga y parseo del Excel ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// FILE HANDLING
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const dz2 = el('dz');
  dz2.addEventListener('click', () => el('fi').click());
  dz2.addEventListener('dragover', e => { e.preventDefault(); dz2.classList.add('over'); });
  dz2.addEventListener('dragleave', () => dz2.classList.remove('over'));
  dz2.addEventListener('drop', e => { e.preventDefault(); dz2.classList.remove('over'); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); });
  el('fi').addEventListener('change', e => { if(e.target.files[0]) processFile(e.target.files[0]); });
});

function processFile(file) {
  if (!file.name.match(/\.xlsx?$/i)) { toast('Solo se aceptan archivos .xlsx'); return; }
  showLd(true);
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const wb = XLSX.read(ev.target.result, { type:'array', cellDates:true });
      const missing = ['BD_personal','BD_seg','_tbl2'].filter(s => !wb.Sheets[s]);
      if (missing.length) { showLd(false); toast('Faltan hojas: '+missing.join(', ')); return; }
      parseTbl2(wb); parsePersonal(wb); parseSeg(wb);
      el('tbf').textContent = file.name;
      el('up').style.display = 'none';
      el('app').style.display = 'flex'; el('app').style.flexDirection = 'column';
      showLd(false);
      initGroupFilters();
      goTab('individual');
      const sinTipo = Object.values(PERSONAL).filter(p=>!p.tipo_bv).length;
      toast(`✓ ${RAW.length} registros · ${Object.keys(PERSONAL).length} brigadistas · ${PROGRAMA.length} lecciones del programa${sinTipo?` · ⚠ ${sinTipo} sin clasificar`:''}`);
    } catch(err) { showLd(false); toast('Error: '+err.message); console.error(err); }
  };
  reader.readAsArrayBuffer(file);
}


// ═══════════════════════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════════════════════
function parseTbl2(wb) {
  PROGRAMA = []; LEC_LOOKUP = {};
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['_tbl2'], { header:1, defval:null });
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (!r[0]) continue;
    const lec = {
      modulo:r[0]?.toString().trim(), tema_mod:r[1]?.toString().trim()||'',
      unidad:r[2]?.toString().trim(), tema_unidad:r[3]?.toString().trim()||'',
      leccion:r[4]?.toString().trim(), tema_lec:(r[5]?.toString().trim()||'').replace(/\n/g,' '),
      carga:n(r[6]), hrs_BVB:n(r[7]), hrs_BVM:n(r[8]),
      hrs_GPR:n(r[9]), hrs_LE:n(r[10]), hrs_UREM:n(r[11])
    };
    PROGRAMA.push(lec);
    LEC_LOOKUP[`${lec.modulo}|${lec.unidad}|${lec.leccion}`] = lec;
  }
}

function normalizeOrg(v) {
  if (!v) return '';
  return v.toString().trim()
    // Normalize vicepresidencias
    .replace(/Vicepresidencia de operaciones/i, 'Vicepresidencia de Operaciones')
    .replace(/Vicepresidencia de servicios generales/i, 'Vicepresidencia de Servicios Generales')
    .replace(/Vicepresidencia corporativa/i, 'Vicepresidencia Corporativa')
    .replace(/Vicepresidencia de finanzas/i, 'Vicepresidencia de Finanzas');
}

function parsePersonal(wb) {
  PERSONAL = {};
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['BD_personal'], { header:1, defval:null });
  // Detect layout: check if row[1][3] looks like an org field (VP) or a status field
  // New layout: r[3]=VP, r[4]=GER, r[5]=SUP, r[6]=SUPERVISOR, r[7]=Estado_AP
  // Old layout: r[3]=Estado_AP, r[6]=tipo_bv, r[11]=grupo, r[12]=area_2
  const header = rows[0] || [];
  const hasOrgCols = header[3] && String(header[3]).toLowerCase().includes('vicepresidencia');

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const ci = s(r[1]);
    if (!ci) continue;

    let vp, gerencia, superintendencia, supervisor, estado, tipo_bv, nivel, area, grupo, area_2;

    if (hasOrgCols) {
      // NEW layout (4 org cols inserted at 3-6)
      // r[0]=nro, r[1]=CI, r[2]=nombre
      // r[3]=VICEPRESIDENCIA, r[4]=GERENCIA, r[5]=SUPERINTENDENCIA, r[6]=SUPERVISOR
      // r[7]=Estado_AP, r[8]=Fecha_AC, r[9]=Motivo_AC
      // r[10]=BV-GPR-LE, r[11]=tipo, r[12]=nivel, r[13]=Area
      // r[14]=NUMERO CELULAR, r[15]=GRUPO DE TRABAJO, r[16]=Area_2
      vp             = normalizeOrg(r[3]);
      gerencia       = normalizeOrg(r[4]);
      superintendencia = normalizeOrg(r[5]);
      supervisor     = s(r[6]);
      estado         = s(r[7]);
      tipo_bv        = s(r[10]);
      nivel          = s(r[12]);
      area           = s(r[13]);
      grupo          = s(r[15]);
      area_2         = s(r[16]);
    } else {
      // OLD layout (no org cols)
      // r[3]=Estado_AP, r[6]=BV-GPR-LE, r[8]=nivel, r[9]=area
      // r[11]=GRUPO DE TRABAJO, r[12]=Area_2, r[17]=supervisor
      estado    = s(r[3]);
      tipo_bv   = s(r[6]);
      nivel     = s(r[8]);
      area      = s(r[9]);
      grupo     = s(r[11]);
      area_2    = s(r[12]);
      supervisor = s(r[17]);
      vp = gerencia = superintendencia = '';
    }

    // Normalize dirty data
    if (area_2 === 'CAMPAMENTO')        area_2 = 'Campamento';
    if (grupo  === 'CAMPAMENTO')        grupo  = 'Campamento';
    if (area_2 === 'Planta')            area_2 = 'Operaciones Planta';
    if (grupo  === 'Seguridad Fisica')  grupo  = 'Seguridad Física';

    PERSONAL[ci] = {
      nombre: s(r[2]), estado, tipo_bv, nivel,
      area, grupo, area_2, supervisor,
      vp, gerencia, superintendencia
    };
  }
}

function parseSeg(wb) {
  RAW = [];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['BD_seg'], { header:1, defval:null, raw:false });
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if(r[0]===null||r[0]===undefined) continue;
    let hrs=0; try { hrs=parseFloat(String(r[11]||'0').replace(',','.'))||0; } catch{}
    let nota=null; try { if(r[9]!==null&&s(r[9])) nota=parseFloat(r[9]); } catch{}
    let fecha=null;
    const fraw=r[12];
    if(fraw instanceof Date) fecha=fraw;
    else if(fraw){try{const d=new Date(String(fraw).trim());if(!isNaN(d))fecha=d;}catch{}}
    const cod=s(r[16]);
    let lecKey=null;
    const m=cod.match(/M(\d+)-U(\d+)-L(\d+)/);
    if(m){
      const k=`MODULO ${m[1].padStart(2,'0')}|UNIDAD ${m[2].padStart(2,'0')}|LECCION ${m[3].padStart(2,'0')}`;
      if(LEC_LOOKUP[k]) lecKey=k;
    }
    RAW.push({ci:s(r[1]),modulo:s(r[4]),nota,hrs,fecha,tipo:s(r[17]),area_seg:s(r[18]),asistio:hrs>0,lecKey});
  }
}
