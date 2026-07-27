// ─── views-organigrama.js — Reporte por organigrama ─────────────────────────

function renderOrgShell() {
  const org = buildOrgMap();
  window._ORG_MAP = org;
  const vps = Object.keys(org).sort();

  el('tab-organigrama').innerHTML = `
    <div class="shdr"><div>
      <div class="stitle">🏢 Reporte por Organigrama</div>
      <div class="ssub">Evidencia de cumplimiento del programa de capacitación por área responsable</div>
    </div></div>

    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;align-items:flex-end;padding:14px;background:#f4f6f7;border-radius:6px;border:1px solid #dde2e4">
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Vicepresidencia</span>
        <select class="fsel" id="org-vp" onchange="onOrgVpChange()" style="min-width:260px">
          <option value="">— Todas —</option>
          ${vps.map(v=>`<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Gerencia</span>
        <select class="fsel" id="org-ger" onchange="onOrgGerChange()" style="min-width:220px" disabled>
          <option value="">— Todas —</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Superintendencia</span>
        <select class="fsel" id="org-sup" onchange="onOrgSupChange()" style="min-width:200px" disabled>
          <option value="">— Todas —</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Supervisor</span>
        <select class="fsel" id="org-sv" onchange="renderOrg()" style="min-width:180px" disabled>
          <option value="">— Todos —</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="exportOrgPDF()" style="align-self:flex-end">⬇ PDF Formal</button>
    </div>

    <div id="org-content">
      <div class="empty"><div class="ei">🏢</div><p>Seleccioná una vicepresidencia para ver el reporte</p></div>
    </div>`;
}

function buildOrgMap() {
  const map = {};
  for (const p of Object.values(PERSONAL)) {
    const vp  = (p.vp  || '(Sin VP)').trim();
    const ger = (p.gerencia || '(Sin Gerencia)').trim();
    const sup = (p.superintendencia || '(Sin Superintendencia)').trim();
    const sv  = (p.supervisor || '(Sin Supervisor)').trim();
    if (!map[vp]) map[vp] = {};
    if (!map[vp][ger]) map[vp][ger] = {};
    if (!map[vp][ger][sup]) map[vp][ger][sup] = new Set();
    map[vp][ger][sup].add(sv);
  }
  return map;
}

function onOrgVpChange() {
  const vp  = el('org-vp')?.value || '';
  const org = window._ORG_MAP || {};
  const selGer = el('org-ger');
  const selSup = el('org-sup');
  const selSv  = el('org-sv');
  selGer.innerHTML = '<option value="">— Todas —</option>';
  selSup.innerHTML = '<option value="">— Todas —</option>';
  selSv.innerHTML  = '<option value="">— Todos —</option>';
  selSup.disabled = true; selSv.disabled = true;
  if (vp) {
    const gers = Object.keys(org[vp] || {}).sort();
    selGer.innerHTML += gers.map(g=>`<option value="${g}">${g}</option>`).join('');
    selGer.disabled = false;
  } else { selGer.disabled = true; }
  renderOrg();
}

function onOrgGerChange() {
  const vp  = el('org-vp')?.value  || '';
  const ger = el('org-ger')?.value || '';
  const org = window._ORG_MAP || {};
  const selSup = el('org-sup'); const selSv = el('org-sv');
  selSup.innerHTML = '<option value="">— Todas —</option>';
  selSv.innerHTML  = '<option value="">— Todos —</option>';
  selSv.disabled = true;
  if (vp && ger) {
    const sups = Object.keys((org[vp]||{})[ger]||{}).sort();
    selSup.innerHTML += sups.map(s=>`<option value="${s}">${s}</option>`).join('');
    selSup.disabled = false;
  } else { selSup.disabled = true; }
  renderOrg();
}

function onOrgSupChange() {
  const vp  = el('org-vp')?.value  || '';
  const ger = el('org-ger')?.value || '';
  const sup = el('org-sup')?.value || '';
  const org = window._ORG_MAP || {};
  const selSv = el('org-sv');
  selSv.innerHTML = '<option value="">— Todos —</option>';
  if (vp && ger && sup) {
    const svs = [...(((org[vp]||{})[ger]||{})[sup]||new Set())].sort();
    selSv.innerHTML += svs.map(s=>`<option value="${s}">${s}</option>`).join('');
    selSv.disabled = false;
  } else { selSv.disabled = true; }
  renderOrg();
}

// Build profile for a brigadista
function buildOrgProfile(ci, aggAll, aggMes) {
  const p = PERSONAL[ci];
  const entry    = aggAll[ci] || { lecs_done: new Set(), hrs_real: 0 };
  const entryMes = aggMes[ci] || { hrs_real: 0 };
  const comp     = cumpl(entry.lecs_done, p.tipo_bv);
  const hrsMes   = entryMes.hrs_real;

  // Pending lecciones by module — only applicable ones
  const mods = getModulos(p.tipo_bv);
  const col  = TIPO_COL[p.tipo_bv] || 'hrs_BVM';
  const pendByMod = [], doneByMod = [];
  mods.forEach(m => {
    const lecs = PROGRAMA.filter(l => l.modulo === m && l[col] > 0);
    const pend = lecs.filter(l => !entry.lecs_done.has(`${l.modulo}|${l.unidad}|${l.leccion}`));
    const done = lecs.filter(l =>  entry.lecs_done.has(`${l.modulo}|${l.unidad}|${l.leccion}`));
    const mn = m.replace('MODULO ', 'M');
    if (pend.length) pendByMod.push({ mod: mn, lecs: pend.map(l=>l.leccion.replace('LECCION ','L')) });
    if (done.length) doneByMod.push({ mod: mn, lecs: done.map(l=>l.leccion.replace('LECCION ','L')) });
  });

  return { ci, ...p, entry, comp, hrsMes, pendByMod, doneByMod };
}

function getFilteredCis() {
  const vp  = el('org-vp')?.value  || '';
  const ger = el('org-ger')?.value || '';
  const sup = el('org-sup')?.value || '';
  const sv  = el('org-sv')?.value  || '';
  return Object.keys(PERSONAL).filter(ci => {
    const p = PERSONAL[ci];
    if (p.estado !== 'Activo') return false;
    if (vp  && p.vp              !== vp)  return false;
    if (ger && p.gerencia         !== ger) return false;
    if (sup && p.superintendencia !== sup) return false;
    if (sv  && p.supervisor       !== sv)  return false;
    return true;
  });
}

function renderLecBadges(byMod, color, bg, border) {
  return byMod.map(({mod, lecs}) =>
    `<span style="white-space:nowrap;margin:1px 3px 1px 0;display:inline-block">
      <b style="color:#1a2326">${mod}:</b>
      ${lecs.map(l=>`<span style="background:${bg};border:1px solid ${border};border-radius:3px;padding:1px 5px;font-size:10px;font-family:Consolas,monospace;color:${color};margin:1px">${l}</span>`).join('')}
    </span>`
  ).join('');
}

function renderOrg() {
  const cont = el('org-content');
  if (!cont) return;
  const vp = el('org-vp')?.value || '';
  if (!vp) {
    cont.innerHTML = '<div class="empty"><div class="ei">🏢</div><p>Seleccioná una vicepresidencia para ver el reporte</p></div>';
    return;
  }

  const cis = getFilteredCis();
  if (!cis.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">🔍</div><p>Sin brigadistas activos para este filtro</p></div>';
    return;
  }

  const now   = new Date();
  const mes30 = new Date(now - 30 * 86400000);
  const aggAll = aggregate(RAW.filter(d => cis.includes(d.ci) && d.asistio));
  const aggMes = aggregate(RAW.filter(d => cis.includes(d.ci) && d.asistio && d.fecha && d.fecha >= mes30));

  const profiles = cis
    .map(ci => buildOrgProfile(ci, aggAll, aggMes))
    .sort((a,b) => a.gerencia.localeCompare(b.gerencia) ||
                   a.superintendencia.localeCompare(b.superintendencia) ||
                   a.supervisor.localeCompare(b.supervisor) ||
                   a.nombre.localeCompare(b.nombre));

  const total   = profiles.length;
  const avgComp = Math.round(profiles.reduce((s,p)=>s+p.comp.pct,0)/total);
  const bajo4   = profiles.filter(p=>p.hrsMes<4).length;
  const bajo50  = profiles.filter(p=>p.comp.pct<50).length;
  const ger     = el('org-ger')?.value || '';
  const sup     = el('org-sup')?.value || '';
  const sv      = el('org-sv')?.value  || '';
  const breadcrumb = [vp,ger,sup,sv].filter(Boolean).join(' › ');

  // Group by gerencia → superintendencia → supervisor
  const tree = {};
  profiles.forEach(p => {
    const g = p.gerencia || '—';
    const s2 = p.superintendencia || '—';
    const sv2 = p.supervisor || '—';
    if (!tree[g]) tree[g] = {};
    if (!tree[g][s2]) tree[g][s2] = {};
    if (!tree[g][s2][sv2]) tree[g][s2][sv2] = [];
    tree[g][s2][sv2].push(p);
  });

  // Render tree
  let treeHtml = '';
  Object.entries(tree).sort(([a],[b])=>a.localeCompare(b)).forEach(([g, sups]) => {
    const gProfs = Object.values(sups).flatMap(sv=>Object.values(sv).flat());
    const gAvg   = Math.round(gProfs.reduce((s,p)=>s+p.comp.pct,0)/gProfs.length);
    const gBajo4 = gProfs.filter(p=>p.hrsMes<4).length;
    const semaforo = gAvg>=70?'#5fa032':gAvg>=40?'#f0a500':'#d94f3d';

    let supHtml = '';
    Object.entries(sups).sort(([a],[b])=>a.localeCompare(b)).forEach(([s2, svs]) => {
      const sProfs = Object.values(svs).flat();
      const sAvg   = Math.round(sProfs.reduce((s,p)=>s+p.comp.pct,0)/sProfs.length);
      const sBajo4 = sProfs.filter(p=>p.hrsMes<4).length;

      let svHtml = '';
      Object.entries(svs).sort(([a],[b])=>a.localeCompare(b)).forEach(([sv2, brig]) => {
        const rows = brig.map(p => {
          const compColor  = cp(p.comp.pct);
          const hrsColor   = p.hrsMes >= 4 ? '#5fa032' : '#d94f3d';
          const pendHtml   = p.pendByMod.length
            ? renderLecBadges(p.pendByMod,'#d94f3d','rgba(217,79,61,.08)','rgba(217,79,61,.3)')
            : '<span style="color:#5fa032;font-size:11px">✓ Al día</span>';
          const doneHtml   = p.doneByMod.length
            ? renderLecBadges(p.doneByMod,'#5fa032','#e8f5e0','rgba(120,190,68,.35)')
            : '<span style="color:#6b7c82;font-size:11px">—</span>';
          return `<tr>
            <td style="font-weight:500">${p.nombre}</td>
            <td>${bdg(p.tipo_bv)}</td>
            <td style="text-align:center;font-weight:700;color:${compColor};font-family:Consolas,monospace">${p.comp.pct}%</td>
            <td style="text-align:center;font-weight:700;color:${hrsColor};font-family:Consolas,monospace">${p.hrsMes.toFixed(1)}</td>
            <td style="font-size:11px;line-height:1.8">${doneHtml}</td>
            <td style="font-size:11px;line-height:1.8">${pendHtml}</td>
          </tr>`;
        }).join('');

        svHtml += `
          <div style="margin:6px 0 6px 16px">
            <div style="font-size:12px;font-weight:600;color:#6b7c82;padding:4px 0;border-bottom:1px solid #eee;margin-bottom:4px">
              👤 Supervisor: ${sv2} <span style="font-weight:400">(${brig.length} brigadistas)</span>
            </div>
            <div style="overflow-x:auto">
              <table class="dt" style="font-size:13px">
                <thead><tr>
                  <th>Nombre</th><th>Tipo</th>
                  <th style="text-align:center">Cumpl.</th>
                  <th style="text-align:center">Hrs/mes</th>
                  <th>✓ Completadas</th>
                  <th>✗ Pendientes</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      });

      const sColor = sAvg>=70?'#5fa032':sAvg>=40?'#f0a500':'#d94f3d';
      supHtml += `
        <div style="margin:8px 0 8px 12px;border-left:3px solid ${sColor};padding-left:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;cursor:pointer"
               onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
            <span style="font-size:13px;font-weight:700;color:#1a2326">🏗 ${s2}</span>
            <span style="font-size:11px;background:${sColor};color:#fff;padding:2px 8px;border-radius:10px;font-weight:600">${sAvg}%</span>
            <span style="font-size:11px;color:#6b7c82">${sProfs.length} brigadistas</span>
            ${sBajo4>0?`<span style="font-size:11px;color:#d94f3d;font-weight:600">⚠ ${sBajo4} bajo 4 hrs/mes</span>`:''}
          </div>
          <div>${svHtml}</div>
        </div>`;
    });

    treeHtml += `
      <div class="panel" style="margin-bottom:12px">
        <div class="ph" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <span class="pt">🏢 ${g}</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:12px;background:${semaforo};color:#fff;padding:2px 10px;border-radius:10px;font-weight:700">${gAvg}%</span>
            <span style="font-size:12px;color:#6b7c82">${gProfs.length} brigadistas</span>
            ${gBajo4>0?`<span style="font-size:12px;color:#d94f3d;font-weight:600">⚠ ${gBajo4} bajo 4 hrs/mes</span>`:''}
          </div>
        </div>
        <div class="pb">${supHtml}</div>
      </div>`;
  });

  cont.innerHTML = `
    <div class="kg" style="margin-bottom:14px">
      <div class="kpi"><div class="kl">Brigadistas activos</div><div class="kv">${total}</div><div class="ks">${breadcrumb}</div></div>
      <div class="kpi"><div class="kl">Cumplimiento promedio</div><div class="kv" style="color:${cp(avgComp)}">${avgComp}%</div></div>
      <div class="kpi"><div class="kl">Bajo meta 4 hrs/mes</div>
        <div class="kv" style="color:${bajo4>0?'#d94f3d':'#5fa032'}">${bajo4}</div>
        <div class="ks">de ${total} · últimos 30 días</div></div>
      <div class="kpi grey"><div class="kl">Cumplimiento &lt;50%</div>
        <div class="kv" style="color:${bajo50>0?'#d94f3d':'#5fa032'}">${bajo50}</div></div>
    </div>
    ${treeHtml}`;
}

// ── PDF FORMAL ─────────────────────────────────────────────────────────────
async function exportOrgPDF() {
  const cis = getFilteredCis();
  if (!cis.length) { toast('Sin brigadistas para exportar'); return; }
  toast('⏳ Generando PDF...');
  await new Promise(r => setTimeout(r, 100));

  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const PW=210, PH=297, ML=14, MR=14, UW=PW-ML-MR;
  let y=0, pn=1;

  const now    = new Date();
  const mes30  = new Date(now - 30*86400000);
  const fecha  = now.toLocaleDateString('es-BO',{year:'numeric',month:'long',day:'numeric'});
  const aggAll = aggregate(RAW.filter(d=>cis.includes(d.ci)&&d.asistio));
  const aggMes = aggregate(RAW.filter(d=>cis.includes(d.ci)&&d.asistio&&d.fecha&&d.fecha>=mes30));

  const profiles = cis
    .map(ci=>buildOrgProfile(ci,aggAll,aggMes))
    .sort((a,b)=>a.gerencia.localeCompare(b.gerencia)||
                 a.superintendencia.localeCompare(b.superintendencia)||
                 a.supervisor.localeCompare(b.supervisor)||
                 a.nombre.localeCompare(b.nombre));

  const vp  = el('org-vp')?.value  || 'Todas las Vicepresidencias';
  const ger = el('org-ger')?.value || '';
  const sup = el('org-sup')?.value || '';
  const sv  = el('org-sv')?.value  || '';
  const scope = [vp,ger,sup,sv].filter(Boolean).join(' › ');

  function hdr() {
    pdf.setFillColor(30,45,50); pdf.rect(0,0,PW,16,'F');
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
    pdf.text('REPORTE DE CUMPLIMIENTO — PROGRAMA DE CAPACITACIÓN BRIGADAS VOLUNTARIAS',PW/2,7,{align:'center'});
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
    pdf.text('INSEIN SRL · Seguridad Industrial · Mina San Cristóbal',PW/2,12,{align:'center'});
    pdf.setFillColor(120,190,68); pdf.rect(0,16,PW,5,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(7.5); pdf.setFont('helvetica','bold');
    pdf.text(scope, ML, 19.5);
    pdf.text('Generado: '+fecha, PW-MR, 19.5, {align:'right'});
    return 27;
  }

  function ftr() {
    pdf.setFillColor(245,247,248); pdf.rect(0,PH-8,PW,8,'F');
    pdf.setDrawColor(200,205,208); pdf.setLineWidth(0.3); pdf.line(0,PH-8,PW,PH-8);
    pdf.setTextColor(150,150,150); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
    pdf.text('Documento generado por el Sistema de Gestión de Capacitación — INSEIN SRL',ML,PH-3);
    pdf.text('Pág. '+pn, PW-MR, PH-3, {align:'right'});
  }

  function chk(y2, need) {
    if (y2+(need||20) > PH-12) { ftr(); pdf.addPage(); pn++; y2=hdr(); }
    return y2;
  }

  function secTitle(title, y2) {
    pdf.setFillColor(240,244,246); pdf.rect(ML,y2,UW,8,'F');
    pdf.setFillColor(120,190,68);  pdf.rect(ML,y2,3,8,'F');
    pdf.setTextColor(26,35,38); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
    pdf.text(title, ML+6, y2+5.5);
    return y2+11;
  }

  function subTitle(title, y2, color) {
    pdf.setTextColor(color||30,45,50); pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
    pdf.text(title, ML+4, y2+4);
    pdf.setDrawColor(220,225,228); pdf.setLineWidth(0.3);
    pdf.line(ML+4, y2+5.5, ML+UW-4, y2+5.5);
    return y2+9;
  }

  function semColor(pct) {
    return pct>=70 ? [95,160,50] : pct>=40 ? [240,165,0] : [217,79,61];
  }

  y = hdr();

  // ── Summary KPIs ──
  y = chk(y, 28);
  const total   = profiles.length;
  const avgComp = Math.round(profiles.reduce((s,p)=>s+p.comp.pct,0)/total);
  const bajo4   = profiles.filter(p=>p.hrsMes<4).length;
  const bajo50  = profiles.filter(p=>p.comp.pct<50).length;

  const kpis = [
    {l:'BRIGADISTAS ACTIVOS', v:String(total)},
    {l:'CUMPLIMIENTO PROMEDIO', v:avgComp+'%', vc:semColor(avgComp)},
    {l:'BAJO META 4 HRS/MES', v:String(bajo4), vc:bajo4>0?[217,79,61]:[95,160,50]},
    {l:'CUMPLIMIENTO <50%', v:String(bajo50), vc:bajo50>0?[217,79,61]:[95,160,50]},
  ];
  const kw = UW/4;
  kpis.forEach((k,i)=>{
    const x=ML+i*kw;
    pdf.setFillColor(255,255,255); pdf.setDrawColor(220,225,228); pdf.setLineWidth(0.4);
    pdf.roundedRect(x+1,y,kw-2,20,2,2,'FD');
    pdf.setFillColor(120,190,68); pdf.rect(x+1,y,3,20,'F');
    pdf.setTextColor(107,124,130); pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5);
    pdf.text(k.l, x+6, y+5);
    const vc = k.vc||[26,35,38];
    pdf.setTextColor(vc[0],vc[1],vc[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(16);
    pdf.text(k.v, x+6, y+15);
  });
  y += 24;

  // ── Resumen ejecutivo ──
  y = chk(y, 24);
  pdf.setFillColor(232,245,220); pdf.setDrawColor(120,190,68); pdf.setLineWidth(0.5);
  pdf.roundedRect(ML,y,UW,18,2,2,'FD');
  pdf.setTextColor(30,80,20); pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
  pdf.text('RESUMEN EJECUTIVO', ML+4, y+5);
  pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5);
  const resumen = `De los ${total} brigadistas activos bajo ${scope}, ${bajo4} (${Math.round(bajo4/total*100)}%) no alcanzaron la meta de 4 horas mensuales de capacitacion requeridas por el programa. El cumplimiento promedio del programa es de ${avgComp}%, con ${bajo50} brigadistas por debajo del 50% de avance. Los responsables de cada area deben coordinar con el personal a su cargo para recuperar las lecciones pendientes indicadas en este reporte.`;
  const lines = pdf.splitTextToSize(resumen, UW-8);
  pdf.text(lines, ML+4, y+10);
  y += 22;

  // ── Detail by gerencia → superintendencia → supervisor ──
  const tree = {};
  profiles.forEach(p=>{
    const g=p.gerencia||'—', s2=p.superintendencia||'—', sv2=p.supervisor||'—';
    if(!tree[g])tree[g]={};
    if(!tree[g][s2])tree[g][s2]={};
    if(!tree[g][s2][sv2])tree[g][s2][sv2]=[];
    tree[g][s2][sv2].push(p);
  });

  Object.entries(tree).sort(([a],[b])=>a.localeCompare(b)).forEach(([g,sups])=>{
    const gProfs = Object.values(sups).flatMap(sv=>Object.values(sv).flat());
    const gAvg   = Math.round(gProfs.reduce((s,p)=>s+p.comp.pct,0)/gProfs.length);
    const gBajo4 = gProfs.filter(p=>p.hrsMes<4).length;
    const gSem   = semColor(gAvg);

    y = chk(y, 18);
    // Gerencia header
    pdf.setFillColor(30,45,50); pdf.rect(ML,y,UW,10,'F');
    pdf.setFillColor(gSem[0],gSem[1],gSem[2]); pdf.rect(ML,y,4,10,'F');
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
    pdf.text(g.toUpperCase(), ML+7, y+6.5);
    pdf.setFontSize(8);
    pdf.text(`${gAvg}%  |  ${gProfs.length} brigadistas  |  ${gBajo4} bajo meta`, PW-MR, y+6.5,{align:'right'});
    y += 13;

    Object.entries(sups).sort(([a],[b])=>a.localeCompare(b)).forEach(([s2,svs])=>{
      const sProfs = Object.values(svs).flat();
      const sAvg   = Math.round(sProfs.reduce((s,p)=>s+p.comp.pct,0)/sProfs.length);
      const sSem   = semColor(sAvg);

      y = chk(y, 12);
      // Superintendencia header
      pdf.setFillColor(245,247,248); pdf.rect(ML,y,UW,8,'F');
      pdf.setFillColor(sSem[0],sSem[1],sSem[2]); pdf.rect(ML,y,3,8,'F');
      pdf.setTextColor(26,35,38); pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
      pdf.text('Superintendencia: '+s2, ML+6, y+5.5);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
      pdf.text(`${sAvg}% prom. · ${sProfs.length} brigadistas`, PW-MR, y+5.5,{align:'right'});
      y += 11;

      Object.entries(svs).sort(([a],[b])=>a.localeCompare(b)).forEach(([sv2,brig])=>{
        y = chk(y, 10);
        pdf.setTextColor(107,124,130); pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
        pdf.text('Supervisor: '+sv2+' ('+brig.length+' brigadistas)', ML+4, y+4);
        y += 8;

        // Table header
        y = chk(y, 8);
        pdf.setFillColor(235,240,242); pdf.rect(ML,y,UW,7,'F');
        pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.setTextColor(80,90,95);
        pdf.text('Nombre', ML+2, y+4.5);
        pdf.text('Tipo', ML+68, y+4.5);
        pdf.text('Cumpl.', ML+82, y+4.5);
        pdf.text('Hrs/mes', ML+100, y+4.5);
        pdf.text('Completadas', ML+118, y+4.5);
        pdf.text('Pendientes', ML+158, y+4.5);
        y += 8;

        brig.forEach((p,idx)=>{
          // Estimate row height based on pending/done content
          const pendStr = p.pendByMod.map(({mod,lecs})=>mod+': '+lecs.join(' ')).join(' | ');
          const doneStr = p.doneByMod.map(({mod,lecs})=>mod+': '+lecs.join(' ')).join(' | ');
          const pendLines = pdf.splitTextToSize(pendStr||'Al dia', 47).length;
          const doneLines = pdf.splitTextToSize(doneStr||'—', 37).length;
          const rowH = Math.max(7, Math.max(pendLines, doneLines)*4+4);

          y = chk(y, rowH);
          if(idx%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML,y,UW,rowH,'F');}

          const pctC = semColor(p.comp.pct);
          const hrsC = p.hrsMes>=4?[95,160,50]:[217,79,61];

          pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(26,35,38);
          pdf.text((p.nombre||'').substring(0,24), ML+2, y+4.5);

          // Tipo badge
          pdf.setFontSize(6.5);
          pdf.setFillColor(232,245,220); pdf.roundedRect(ML+68,y+1,12,5,1,1,'F');
          pdf.setTextColor(60,120,30); pdf.setFont('helvetica','bold');
          pdf.text((p.tipo_bv||'').replace('-',''), ML+69, y+4.5);

          pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
          pdf.setTextColor(pctC[0],pctC[1],pctC[2]);
          pdf.text(p.comp.pct+'%', ML+82, y+4.5);

          pdf.setTextColor(hrsC[0],hrsC[1],hrsC[2]);
          pdf.text(p.hrsMes.toFixed(1), ML+100, y+4.5);

          // Done lecciones
          pdf.setFont('helvetica','normal'); pdf.setFontSize(6.5);
          pdf.setTextColor(60,120,30);
          const dLines = pdf.splitTextToSize(doneStr||'—', 37);
          pdf.text(dLines, ML+118, y+4.5);

          // Pending lecciones
          pdf.setTextColor(p.pendByMod.length ? 180:107, p.pendByMod.length?50:124, p.pendByMod.length?40:130);
          const pLines = pdf.splitTextToSize(pendStr||'Al dia', 47);
          pdf.text(pLines, ML+158, y+4.5);

          y += rowH;
        });
        y += 4;
      });
      y += 3;
    });
    y += 6;
  });

  // Signature block
  y = chk(y, 35);
  pdf.setDrawColor(200,205,208); pdf.setLineWidth(0.5);
  pdf.line(ML, y+20, ML+60, y+20);
  pdf.line(PW/2-30, y+20, PW/2+30, y+20);
  pdf.line(PW-MR-60, y+20, PW-MR, y+20);
  pdf.setTextColor(107,124,130); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
  pdf.text('Jefe de Seguridad Industrial', ML, y+24);
  pdf.text('Responsable del Área', PW/2, y+24, {align:'center'});
  pdf.text('Vicepresidencia / Gerencia', PW-MR, y+24, {align:'right'});

  ftr();
  pdf.save('Reporte-Organigrama-'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('✓ PDF generado');
}
