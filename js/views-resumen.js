// ─── views-resumen.js — Resumen ejecutivo exportable ────────────────────────

function renderResumenShell() {
  el('tab-resumen').innerHTML = `
    <div class="shdr"><div>
      <div class="stitle">📋 Resumen Ejecutivo</div>
      <div class="ssub">Reporte simplificado por organigrama con participación y cumplimiento de meta de horas</div>
    </div></div>

    <div style="padding:14px;background:#f4f6f7;border-radius:6px;border:1px solid #dde2e4;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#1a2326;margin-bottom:10px">⚙ Período del reporte</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Desde</span>
          <input type="date" class="tdate" id="res-from" style="padding:8px 10px;font-size:13px" onchange="renderResumen()"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Hasta</span>
          <input type="date" class="tdate" id="res-to" style="padding:8px 10px;font-size:13px" onchange="renderResumen()"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Acceso rápido</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="setResRange('y2024')">2024</button>
            <button class="btn btn-ghost btn-sm" onclick="setResRange('y2025')">2025</button>
            <button class="btn btn-ghost btn-sm" onclick="setResRange('y2026')">2026</button>
            <button class="btn btn-ghost btn-sm" onclick="setResRange('mes')">Este mes</button>
            <button class="btn btn-ghost btn-sm" onclick="setResRange('trim')">Trimestre</button>
          </div>
        </div>
        <button class="btn btn-primary" onclick="exportResumenPDF()" style="align-self:flex-end">⬇ PDF Ejecutivo</button>
      </div>
    </div>

    <div id="res-content">
      <div class="empty"><div class="ei">📋</div><p>Seleccioná un período para generar el resumen</p></div>
    </div>`;

  // Default: current year
  const now = new Date();
  el('res-from').value = `${now.getFullYear()}-01-01`;
  el('res-to').value   = now.toISOString().slice(0,10);
  renderResumen();
}

function setResRange(mode) {
  const now = new Date();
  const D   = 86400000;
  let from, to;
  if (mode==='y2024'){ from='2024-01-01'; to='2024-12-31'; }
  else if(mode==='y2025'){ from='2025-01-01'; to='2025-12-31'; }
  else if(mode==='y2026'){ from='2026-01-01'; to=now.toISOString().slice(0,10); }
  else if(mode==='mes'){
    from = new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
    to   = now.toISOString().slice(0,10);
  } else if(mode==='trim'){
    from = new Date(now - 90*D).toISOString().slice(0,10);
    to   = now.toISOString().slice(0,10);
  }
  if(from) el('res-from').value = from;
  if(to)   el('res-to').value   = to;
  renderResumen();
}

function renderResumen() {
  const cont = el('res-content');
  if (!cont) return;

  const fromVal = el('res-from')?.value;
  const toVal   = el('res-to')?.value;
  if (!fromVal || !toVal) {
    cont.innerHTML = '<div class="empty"><div class="ei">📅</div><p>Seleccioná las fechas de inicio y fin</p></div>';
    return;
  }

  const from = new Date(fromVal+'T00:00:00');
  const to   = new Date(toVal+'T23:59:59');
  const year = from.getFullYear();

  // Meta por tipo según año y período
  // 2026: BV-B desde marzo, BV-M y LE desde enero
  // 2024/2025 y períodos anteriores: todos desde enero
  function metaParaTipo(tipo, fromDate, toDate) {
    let inicioTipo;
    const y = fromDate.getFullYear();
    if (y >= 2026) {
      if (tipo === 'BV-B') {
        inicioTipo = new Date(2026, 2, 1); // Marzo 2026
      } else {
        inicioTipo = new Date(2026, 0, 1); // Enero 2026
      }
    } else {
      inicioTipo = new Date(y, 0, 1); // Enero del año
    }
    // Effective start: max(inicioTipo, fromDate)
    const efectivo = inicioTipo > fromDate ? inicioTipo : fromDate;
    if (efectivo > toDate) return { meses: 0, meta: 0, inicio: inicioTipo };
    const meses = (toDate.getFullYear() - efectivo.getFullYear()) * 12
                + (toDate.getMonth()    - efectivo.getMonth()) + 1;
    return { meses: Math.max(1, meses), meta: Math.max(1, meses) * 4, inicio: inicioTipo };
  }

  const fromLabel = from.toLocaleDateString('es-BO',{month:'long',year:'numeric'});
  const toLabel   = to.toLocaleDateString('es-BO',{month:'long',year:'numeric'});
  const periodoLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`;

  // All active brigadistas (BV-B, BV-M, LE)
  const activeCis = Object.keys(PERSONAL).filter(ci => {
    const p = PERSONAL[ci];
    return p.estado === 'Activo' && ['BV-B','BV-M','LE'].includes(p.tipo_bv);
  });

  // Aggregate for period — only rows within fromDate→toDate
  const filtRows = RAW.filter(d =>
    activeCis.includes(d.ci) && d.asistio && d.fecha && d.fecha >= from && d.fecha <= to
  );
  const agg = aggregate(filtRows);

  // Build profiles with per-type meta
  const profiles = activeCis.map(ci => {
    const p      = PERSONAL[ci];
    const mInfo  = metaParaTipo(p.tipo_bv, from, to);
    const hrs    = agg[ci]?.hrs_real || 0;
    const cumpl  = mInfo.meta > 0 ? Math.min(Math.round(hrs / mInfo.meta * 100), 100) : 0;
    const cumplMeta = hrs >= mInfo.meta && mInfo.meta > 0;
    return { ci, ...p, hrs, cumpl, cumplMeta, meta: mInfo.meta, meses: mInfo.meses };
  });

  // Meta info per tipo for display
  const metaInfo = {
    'BV-B': metaParaTipo('BV-B', from, to),
    'BV-M': metaParaTipo('BV-M', from, to),
    'LE':   metaParaTipo('LE',   from, to),
  };

  // Global totals
  const total     = profiles.length;
  const totalHrs  = +profiles.reduce((s,p)=>s+p.hrs,0).toFixed(1);
  const metaTotal = profiles.reduce((s,p)=>s+p.meta,0);
  const cumplProm = total ? Math.round(profiles.reduce((s,p)=>s+p.cumpl,0)/total) : 0;
  const cumplMeta = profiles.filter(p=>p.cumplMeta).length;
  const particip  = new Set(filtRows.map(d=>d.ci)).size;

  // Build org tree: VP → GER → SUP
  const tree = {};
  profiles.forEach(p => {
    const vp  = p.vp  || '(Sin VP)';
    const ger = p.gerencia || '(Sin Gerencia)';
    const sup = p.superintendencia || '(Sin Superintendencia)';
    if (!tree[vp]) tree[vp] = {};
    if (!tree[vp][ger]) tree[vp][ger] = {};
    if (!tree[vp][ger][sup]) tree[vp][ger][sup] = [];
    tree[vp][ger][sup].push(p);
  });

  function calcGroup(profs) {
    const hrs   = profs.reduce((s,p)=>s+p.hrs,0);
    const meta  = profs.reduce((s,p)=>s+p.meta,0);
    const pct   = meta>0 ? Math.min(Math.round(hrs/meta*100),100) : 0;
    const part  = profs.filter(p=>p.hrs>0).length;
    const cumM  = profs.filter(p=>p.cumplMeta).length;
    return { total:profs.length, hrs:+hrs.toFixed(1), meta:+meta.toFixed(0), pct, part, cumM };
  }

  function semColor(pct){ return pct>=80?'#5fa032':pct>=50?'#f0a500':'#d94f3d'; }
  function semDot(pct)  { return pct>=80?'🟢':pct>=50?'🟡':'🔴'; }
  function pctBar(pct) {
    const c = semColor(pct);
    return `<div style="display:flex;align-items:center;gap:6px">
      <div style="width:80px;height:7px;background:#eee;border-radius:4px">
        <div style="width:${Math.min(pct,100)}%;height:7px;background:${c};border-radius:4px"></div>
      </div>
      <span style="font-weight:700;color:${c};min-width:38px;font-size:13px">${pct}%</span>
    </div>`;
  }

  // Org tree HTML
  let treeHtml = '';
  Object.entries(tree).sort(([a],[b])=>a.localeCompare(b)).forEach(([vp, gers]) => {
    const vpProfs = Object.values(gers).flatMap(s=>Object.values(s).flat());
    const vpG = calcGroup(vpProfs);

    let gerHtml = '';
    Object.entries(gers).sort(([a],[b])=>a.localeCompare(b)).forEach(([ger, sups]) => {
      const gerProfs = Object.values(sups).flat();
      const gerG = calcGroup(gerProfs);

      let supHtml = '<table class="dt" style="margin:0;font-size:13px"><thead><tr>'
        + '<th>Superintendencia</th>'
        + '<th style="text-align:center">Brigadistas</th>'
        + '<th style="text-align:center">Participaron</th>'
        + '<th style="text-align:center">Hrs realizadas</th>'
        + '<th style="text-align:center">Meta hrs</th>'
        + '<th style="text-align:center">Cumplieron meta</th>'
        + '<th style="min-width:140px">Progreso</th>'
        + '</tr></thead><tbody>';

      Object.entries(sups).sort(([a],[b])=>a.localeCompare(b)).forEach(([sup, profs]) => {
        const g = calcGroup(profs);
        supHtml += `<tr>
          <td style="font-weight:600">${semDot(g.pct)} ${sup}</td>
          <td style="text-align:center">${g.total}</td>
          <td style="text-align:center;color:${g.part>0?'#1a2326':'#d94f3d'}">${g.part}</td>
          <td style="text-align:center;font-family:Consolas,monospace;font-weight:600">${g.hrs}</td>
          <td style="text-align:center;font-family:Consolas,monospace;color:#6b7c82">${g.meta}</td>
          <td style="text-align:center;font-weight:700;color:${g.cumM===g.total?'#5fa032':'#d94f3d'}">${g.cumM}/${g.total}</td>
          <td>${pctBar(g.pct)}</td>
        </tr>`;
      });

      supHtml += `<tr style="background:#e8f5e0;font-weight:700">
        <td>SUBTOTAL — ${ger}</td>
        <td style="text-align:center">${gerG.total}</td>
        <td style="text-align:center">${gerG.part}</td>
        <td style="text-align:center;font-family:Consolas,monospace;color:${semColor(gerG.pct)}">${gerG.hrs}</td>
        <td style="text-align:center;font-family:Consolas,monospace;color:#6b7c82">${gerG.meta}</td>
        <td style="text-align:center;color:${gerG.cumM===gerG.total?'#5fa032':'#d94f3d'}">${gerG.cumM}/${gerG.total}</td>
        <td>${pctBar(gerG.pct)}</td>
      </tr></tbody></table>`;

      gerHtml += `
        <div style="margin:8px 0 8px 12px;border-left:3px solid ${semColor(gerG.pct)};padding-left:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;cursor:pointer"
               onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
            <span style="font-size:13px;font-weight:700">${semDot(gerG.pct)} Gerencia: ${ger}</span>
            <span style="font-size:11px;background:${semColor(gerG.pct)};color:#fff;padding:2px 8px;border-radius:10px;font-weight:600">${gerG.pct}%</span>
            <span style="font-size:11px;color:#6b7c82">${gerG.total} brigadistas · ${gerG.hrs}/${gerG.meta} hrs</span>
            ${gerG.part<gerG.total?`<span style="font-size:11px;color:#d94f3d">⚠ ${gerG.total-gerG.part} sin participación</span>`:''}
          </div>
          <div>${supHtml}</div>
        </div>`;
    });

    treeHtml += `
      <div class="panel" style="margin-bottom:12px">
        <div class="ph" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="pt">${semDot(vpG.pct)} ${vp}</span>
            <span style="font-size:12px;background:${semColor(vpG.pct)};color:#fff;padding:2px 10px;border-radius:10px;font-weight:700">${vpG.pct}%</span>
          </div>
          <div style="display:flex;gap:16px;font-size:12px;color:#6b7c82">
            <span>${vpG.total} brigadistas</span>
            <span>${vpG.hrs}/${vpG.meta} hrs</span>
            <span style="color:${vpG.cumM===vpG.total?'#5fa032':'#d94f3d'}">${vpG.cumM}/${vpG.total} cumplen meta</span>
          </div>
        </div>
        <div class="pb">${gerHtml}</div>
      </div>`;
  });

  // By tipo breakdown
  const byTipo = {};
  profiles.forEach(p=>{
    if(!byTipo[p.tipo_bv]) byTipo[p.tipo_bv]={total:0,hrs:0,meta:0,cumM:0,part:0,meses:p.meses};
    byTipo[p.tipo_bv].total++;
    byTipo[p.tipo_bv].hrs   += p.hrs;
    byTipo[p.tipo_bv].meta  += p.meta;
    if(p.cumplMeta) byTipo[p.tipo_bv].cumM++;
    if(p.hrs>0)     byTipo[p.tipo_bv].part++;
  });

  cont.innerHTML = `
    <div style="background:#1e2d32;border-radius:8px;padding:20px 24px;margin-bottom:16px;color:#fff">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px">Resumen Ejecutivo — Mina San Cristóbal</div>
      <div style="font-size:12px;color:#78be44;margin-bottom:4px">Período: <b>${periodoLabel}</b></div>
      <div style="font-size:11px;color:#a0b4b8;margin-bottom:16px">
        Meta: 4 hrs/mes por brigadista ·
        BV-B desde ${new Date(2026,2,1).toLocaleDateString('es-BO',{month:'long',year:'numeric'})} (${metaInfo['BV-B'].meses} meses = <b>${metaInfo['BV-B'].meta} hrs</b>) ·
        BV-M y LE desde ${metaInfo['BV-M'].inicio.toLocaleDateString('es-BO',{month:'long',year:'numeric'})} (${metaInfo['BV-M'].meses} meses = <b>${metaInfo['BV-M'].meta} hrs</b>)
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
        ${[
          {l:'Total brigadistas', v:String(total), s:'BV-B / BV-M / LE activos'},
          {l:'Participaron', v:String(particip), s:`${Math.round(particip/total*100)}% del total`, vc:particip===total?'#78be44':'#f0a500'},
          {l:'Hrs realizadas', v:totalHrs.toFixed(1), s:`de ${metaTotal} hrs meta total`},
          {l:'Cumplimiento prom.', v:cumplProm+'%', s:'sobre meta por tipo', vc:semColor(cumplProm)},
          {l:'Cumplieron meta', v:`${cumplMeta}/${total}`, s:'alcanzaron su meta', vc:cumplMeta===total?'#78be44':'#d94f3d'},
        ].map(k=>`<div style="background:rgba(255,255,255,.08);border-radius:6px;padding:12px 14px">
          <div style="font-size:10px;color:#a0b4b8;font-weight:600;text-transform:uppercase;margin-bottom:4px">${k.l}</div>
          <div style="font-size:26px;font-weight:700;color:${k.vc||'#fff'}">${k.v}</div>
          <div style="font-size:10px;color:#a0b4b8;margin-top:2px">${k.s}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="panel" style="margin-bottom:14px">
      <div class="ph"><span class="pt">📊 Desglose por tipo de brigadista</span></div>
      <div style="overflow-x:auto"><table class="dt">
        <thead><tr>
          <th>Tipo</th>
          <th style="text-align:center">Total</th>
          <th style="text-align:center">Participaron</th>
          <th style="text-align:center">Hrs realizadas</th>
          <th style="text-align:center">Meta individual</th>
          <th style="text-align:center">Meta grupal</th>
          <th style="text-align:center">Cumplieron meta</th>
          <th>Progreso grupal</th>
        </tr></thead>
        <tbody>${Object.entries(byTipo).map(([t,v])=>{
          const pct2 = v.meta>0 ? Math.min(Math.round(v.hrs/v.meta*100),100) : 0;
          const metaInd = metaInfo[t]?.meta || 0;
          return `<tr>
            <td>${bdg(t)}</td>
            <td style="text-align:center;font-weight:700">${v.total}</td>
            <td style="text-align:center">${v.part}</td>
            <td style="text-align:center;font-family:Consolas,monospace;font-weight:600">${v.hrs.toFixed(1)}</td>
            <td style="text-align:center;font-family:Consolas,monospace;color:#78be44;font-weight:600">${metaInd} hrs</td>
            <td style="text-align:center;font-family:Consolas,monospace;color:#6b7c82">${v.meta.toFixed(0)} hrs</td>
            <td style="text-align:center;font-weight:700;color:${v.cumM===v.total?'#5fa032':'#d94f3d'}">${v.cumM}/${v.total}</td>
            <td>${pctBar(pct2)}</td>
          </tr>`;
        }).join('')}
        <tr style="background:#f4f6f7;font-weight:700">
          <td>TOTAL MSC</td>
          <td style="text-align:center">${total}</td>
          <td style="text-align:center">${particip}</td>
          <td style="text-align:center;font-family:Consolas,monospace;color:${semColor(cumplProm)}">${totalHrs}</td>
          <td style="text-align:center">—</td>
          <td style="text-align:center;font-family:Consolas,monospace;color:#6b7c82">${metaTotal.toFixed(0)} hrs</td>
          <td style="text-align:center;color:${cumplMeta===total?'#5fa032':'#d94f3d'}">${cumplMeta}/${total}</td>
          <td>${pctBar(cumplProm)}</td>
        </tr></tbody>
      </table></div>
      <div style="padding:10px 16px;font-size:11px;color:#6b7c82;border-top:1px solid #dde2e4">
        <b>Meta individual</b>: hrs que cada brigadista de ese tipo debe completar en el período ·
        <b>Meta grupal</b>: suma de metas individuales del grupo ·
        <b>Cumplieron meta</b>: brigadistas que alcanzaron o superaron su meta individual
      </div>
    </div>

    <div style="font-size:14px;font-weight:700;color:#1a2326;margin-bottom:10px;padding-left:4px">
      🏢 Detalle por Organigrama — clic para expandir/colapsar
    </div>
    ${treeHtml}`;

  window._RES_DATA = { tree, profiles, byTipo, metaInfo, total, particip,
    totalHrs, metaTotal, cumplProm, cumplMeta, periodoLabel, fromVal, toVal };
}

async function exportResumenPDF() {
  const d = window._RES_DATA;
  if (!d) { toast('Generá el resumen primero'); return; }
  toast('⏳ Generando PDF...');
  await new Promise(r=>setTimeout(r,100));

  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const PW=210,PH=297,ML=14,MR=14,UW=PW-ML-MR;
  let y=0, pn=1;
  const fecha = new Date().toLocaleDateString('es-BO',{year:'numeric',month:'long',day:'numeric'});

  function hdr(){
    pdf.setFillColor(30,45,50); pdf.rect(0,0,PW,16,'F');
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
    pdf.text('RESUMEN EJECUTIVO DE CAPACITACIÓN — BRIGADAS VOLUNTARIAS MSC',PW/2,7,{align:'center'});
    pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
    pdf.text('INSEIN SRL · Seguridad Industrial · Mina San Cristóbal',PW/2,12,{align:'center'});
    pdf.setFillColor(120,190,68); pdf.rect(0,16,PW,5,'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(7.5); pdf.setFont('helvetica','bold');
    pdf.text(`Periodo: ${d.periodoLabel}`, ML, 19.5);
    pdf.text('Generado: '+fecha, PW-MR, 19.5, {align:'right'});
    return 27;
  }
  function ftr(){
    pdf.setFillColor(245,247,248); pdf.rect(0,PH-8,PW,8,'F');
    pdf.setDrawColor(200,205,208); pdf.setLineWidth(0.3); pdf.line(0,PH-8,PW,PH-8);
    pdf.setTextColor(150,150,150); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
    pdf.text('INSEIN SRL · Sistema de Gestión de Capacitación — Documento confidencial', ML, PH-3);
    pdf.text('Pág. '+pn, PW-MR, PH-3, {align:'right'});
  }
  function chk(y2,need){ if(y2+(need||20)>PH-12){ftr();pdf.addPage();pn++;y2=hdr();}return y2; }
  function sem(pct){ return pct>=80?[95,160,50]:pct>=50?[240,165,0]:[217,79,61]; }

  y = hdr();

  // Global KPIs
  const kpis = [
    {l:'TOTAL BRIGADISTAS', v:String(d.total)},
    {l:'PARTICIPARON', v:String(d.particip), vc:d.particip===d.total?[95,160,50]:[240,165,0], s:Math.round(d.particip/d.total*100)+'% del total'},
    {l:'HRS REALIZADAS', v:d.totalHrs.toFixed(1), s:`de ${d.metaTotal.toFixed(0)} hrs meta`},
    {l:'CUMPLIMIENTO', v:d.cumplProm+'%', vc:sem(d.cumplProm)},
    {l:'CUMPLIERON META', v:`${d.cumplMeta}/${d.total}`, vc:d.cumplMeta===d.total?[95,160,50]:[217,79,61], s:'alcanzaron su meta'},
  ];
  const kw = UW/5;
  kpis.forEach((k,i)=>{
    const x=ML+i*kw;
    pdf.setFillColor(255,255,255); pdf.setDrawColor(220,225,228); pdf.setLineWidth(0.4);
    pdf.roundedRect(x+1,y,kw-2,22,2,2,'FD');
    pdf.setFillColor(120,190,68); pdf.rect(x+1,y,3,22,'F');
    pdf.setTextColor(107,124,130); pdf.setFont('helvetica','normal'); pdf.setFontSize(6);
    pdf.text(k.l, x+5, y+5);
    const vc=k.vc||[26,35,38];
    pdf.setTextColor(vc[0],vc[1],vc[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(14);
    pdf.text(k.v, x+5, y+14);
    if(k.s){ pdf.setFont('helvetica','normal'); pdf.setFontSize(6); pdf.setTextColor(107,124,130); pdf.text(k.s, x+5, y+19); }
  });
  y += 26;

  // Resumen ejecutivo paragraph
  y = chk(y,22);
  pdf.setFillColor(232,245,220); pdf.setDrawColor(120,190,68); pdf.setLineWidth(0.5);
  pdf.roundedRect(ML,y,UW,18,2,2,'FD');
  pdf.setTextColor(30,80,20); pdf.setFont('helvetica','bold'); pdf.setFontSize(8);
  pdf.text('RESUMEN', ML+4, y+5);
  pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5);
  const txt = `Durante el periodo ${d.periodoLabel}, de los ${d.total} brigadistas activos de Mina San Cristobal, ${d.particip} participaron en capacitaciones (${Math.round(d.particip/d.total*100)}%). Se registraron ${d.totalHrs.toFixed(1)} horas en total sobre una meta acumulada de ${d.metaTotal.toFixed(0)} horas. ${d.cumplMeta} brigadistas (${Math.round(d.cumplMeta/d.total*100)}%) alcanzaron la meta minima del periodo.`;
  pdf.text(pdf.splitTextToSize(txt.replace(/[^\x00-\x7F]/g,''), UW-8), ML+4, y+10);
  y += 22;

  // Por tipo
  y = chk(y,14);
  pdf.setFillColor(240,244,246); pdf.rect(ML,y,UW,8,'F');
  pdf.setFillColor(120,190,68); pdf.rect(ML,y,3,8,'F');
  pdf.setTextColor(26,35,38); pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
  pdf.text('DESGLOSE POR TIPO DE BRIGADISTA', ML+6, y+5.5); y+=11;
  pdf.setFillColor(235,240,242); pdf.rect(ML,y,UW,7,'F');
  pdf.setFont('helvetica','bold'); pdf.setFontSize(7); pdf.setTextColor(80,90,95);
  pdf.text('Tipo',ML+2,y+4.5); pdf.text('Total',ML+35,y+4.5);
  pdf.text('Participaron',ML+55,y+4.5); pdf.text('Hrs realizadas',ML+85,y+4.5);
  pdf.text('Meta hrs',ML+120,y+4.5); pdf.text('Cumplieron meta',ML+148,y+4.5); pdf.text('%',ML+183,y+4.5);
  y+=8;
  Object.entries(d.byTipo).forEach(([t,v],idx)=>{
    y=chk(y,8);
    if(idx%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML,y,UW,8,'F');}
    const pct2=v.meta>0?Math.min(Math.round(v.hrs/v.meta*100),100):0;
    const sc=sem(pct2);
    pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); pdf.setTextColor(60,120,30);
    pdf.text(t,ML+2,y+4.5);
    pdf.setTextColor(26,35,38); pdf.setFont('helvetica','normal');
    pdf.text(String(v.total),ML+35,y+4.5);
    pdf.text(String(v.part),ML+55,y+4.5);
    pdf.text(v.hrs.toFixed(1),ML+85,y+4.5);
    pdf.text(String(v.meta.toFixed(0)),ML+120,y+4.5);
    pdf.setTextColor(v.cumM===v.total?95:217,v.cumM===v.total?160:79,v.cumM===v.total?50:61);
    pdf.setFont('helvetica','bold');
    pdf.text(`${v.cumM}/${v.total}`,ML+148,y+4.5);
    pdf.setTextColor(sc[0],sc[1],sc[2]);
    pdf.text(pct2+'%',ML+183,y+4.5);
    y+=8;
  });
  // Total row
  const pctTot=Math.min(Math.round(d.totalHrs/d.metaTotal*100),100);
  const scT=sem(pctTot);
  pdf.setFillColor(232,245,220); pdf.rect(ML,y,UW,8,'F');
  pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5);
  pdf.setTextColor(26,35,38); pdf.text('TOTAL MSC',ML+2,y+4.5);
  pdf.text(String(d.total),ML+35,y+4.5);
  pdf.text(String(d.particip),ML+55,y+4.5);
  pdf.setTextColor(scT[0],scT[1],scT[2]);
  pdf.text(d.totalHrs.toFixed(1),ML+85,y+4.5);
  pdf.setTextColor(26,35,38);
  pdf.text(d.metaTotal.toFixed(0),ML+120,y+4.5);
  pdf.setTextColor(d.cumplMeta===d.total?95:217,d.cumplMeta===d.total?160:79,d.cumplMeta===d.total?50:61);
  pdf.text(`${d.cumplMeta}/${d.total}`,ML+148,y+4.5);
  pdf.setTextColor(scT[0],scT[1],scT[2]);
  pdf.text(pctTot+'%',ML+183,y+4.5);
  y+=12;

  // VP → GER → SUP table
  y=chk(y,14);
  pdf.setFillColor(240,244,246); pdf.rect(ML,y,UW,8,'F');
  pdf.setFillColor(120,190,68); pdf.rect(ML,y,3,8,'F');
  pdf.setTextColor(26,35,38); pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
  pdf.text('DETALLE POR ORGANIGRAMA', ML+6, y+5.5); y+=11;

  Object.entries(d.tree).sort(([a],[b])=>a.localeCompare(b)).forEach(([vp,gers])=>{
    const vpProfs=Object.values(gers).flatMap(s=>Object.values(s).flat());
    const vpHrs=vpProfs.reduce((s,p)=>s+p.hrs,0);
    const vpMeta=vpProfs.reduce((s,p)=>s+p.meta,0);
    const vpPct=Math.min(Math.round(vpHrs/vpMeta*100),100);
    const vpSc=sem(vpPct);
    const vpCumM=vpProfs.filter(p=>p.cumplMeta).length;

    y=chk(y,10);
    pdf.setFillColor(30,45,50); pdf.rect(ML,y,UW,9,'F');
    pdf.setFillColor(vpSc[0],vpSc[1],vpSc[2]); pdf.rect(ML,y,4,9,'F');
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(9);
    pdf.text(vp.toUpperCase().substring(0,40),ML+7,y+6);
    pdf.setFontSize(8);
    pdf.text(`${vpPct}%  |  ${vpProfs.length} brigadistas  |  ${vpHrs.toFixed(1)} hrs  |  ${vpCumM}/${vpProfs.length} cumplen`,PW-MR,y+6,{align:'right'});
    y+=12;

    Object.entries(gers).sort(([a],[b])=>a.localeCompare(b)).forEach(([ger,sups])=>{
      const gerProfs=Object.values(sups).flat();
      const gerHrs=gerProfs.reduce((s,p)=>s+p.hrs,0);
      const gerMeta=gerProfs.reduce((s,p)=>s+p.meta,0);
      const gerPct=Math.min(Math.round(gerHrs/gerMeta*100),100);
      const gerSc=sem(gerPct);

      y=chk(y,8);
      pdf.setFillColor(245,247,248); pdf.rect(ML,y,UW,8,'F');
      pdf.setFillColor(gerSc[0],gerSc[1],gerSc[2]); pdf.rect(ML,y,3,8,'F');
      pdf.setTextColor(26,35,38); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5);
      pdf.text('Gerencia: '+ger.substring(0,35),ML+6,y+5.5);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
      pdf.text(`${gerPct}% · ${gerProfs.length} brig. · ${gerHrs.toFixed(1)} hrs`,PW-MR,y+5.5,{align:'right'});
      y+=10;

      // Sup table header
      y=chk(y,7);
      pdf.setFillColor(235,240,242); pdf.rect(ML+4,y,UW-4,7,'F');
      pdf.setFont('helvetica','bold'); pdf.setFontSize(6.5); pdf.setTextColor(80,90,95);
      pdf.text('Superintendencia',ML+6,y+4.5);
      pdf.text('Brig.',ML+90,y+4.5); pdf.text('Partic.',ML+103,y+4.5);
      pdf.text('Hrs',ML+118,y+4.5); pdf.text('Meta',ML+133,y+4.5);
      pdf.text('Cumpl.',ML+150,y+4.5); pdf.text('%',ML+172,y+4.5);
      y+=8;

      Object.entries(sups).sort(([a],[b])=>a.localeCompare(b)).forEach(([sup,profs],idx)=>{
        const g={
          total:profs.length,
          hrs:profs.reduce((s,p)=>s+p.hrs,0),
          part:profs.filter(p=>p.hrs>0).length,
          cumM:profs.filter(p=>p.cumplMeta).length,
        };
        const g_meta=profs.reduce((s,p)=>s+p.meta,0);
        const pct3=g_meta>0?Math.min(Math.round(g.hrs/g_meta*100),100):0;
        const sc3=sem(pct3);
        y=chk(y,7);
        if(idx%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML+4,y,UW-4,7,'F');}
        pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(26,35,38);
        pdf.text(sup.substring(0,32),ML+6,y+4.5);
        pdf.text(String(g.total),ML+90,y+4.5);
        pdf.text(String(g.part),ML+103,y+4.5);
        pdf.text(g.hrs.toFixed(1),ML+118,y+4.5);
        pdf.text(String(g_meta.toFixed(0)),ML+133,y+4.5);
        pdf.setTextColor(g.cumM===g.total?95:217,g.cumM===g.total?160:79,g.cumM===g.total?50:61);
        pdf.setFont('helvetica','bold');
        pdf.text(`${g.cumM}/${g.total}`,ML+150,y+4.5);
        pdf.setTextColor(sc3[0],sc3[1],sc3[2]);
        pdf.text(pct3+'%',ML+172,y+4.5);
        y+=7;
      });
      y+=4;
    });
    y+=6;
  });

  // Signature block
  y=chk(y,30); y+=8;
  pdf.setDrawColor(180,185,190); pdf.setLineWidth(0.5);
  pdf.line(ML,y+18,ML+55,y+18);
  pdf.line(PW/2-27,y+18,PW/2+27,y+18);
  pdf.line(PW-MR-55,y+18,PW-MR,y+18);
  pdf.setTextColor(107,124,130); pdf.setFont('helvetica','normal'); pdf.setFontSize(7);
  pdf.text('Jefe de Seguridad Industrial',ML,y+22);
  pdf.text('Responsable del Area',PW/2,y+22,{align:'center'});
  pdf.text('Vicepresidencia / Gerencia',PW-MR,y+22,{align:'right'});

  ftr();
  pdf.save(`Resumen-Ejecutivo-${new Date().toISOString().slice(0,10)}.pdf`);
  toast('✓ PDF Ejecutivo generado');
}
