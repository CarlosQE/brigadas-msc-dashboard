// ─── verificar.js — Verificación de datos ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// TAB: VERIFICAR
// ═══════════════════════════════════════════════════════════════════════════
function renderVerificar(){
  const totalRows    = RAW.length;
  const sinFecha     = RAW.filter(d=>!d.fecha).length;
  const conFecha     = totalRows - sinFecha;
  const cisU         = new Set(RAW.map(d=>d.ci).filter(Boolean)).size;
  const matched      = RAW.filter(d=>d.lecKey).length;
  const totalPers    = Object.keys(PERSONAL).length;
  const sinTipo      = Object.values(PERSONAL).filter(p=>!p.tipo_bv).length;
  const tipos        = ['BV-B','BV-M','LE','URE-M','GPR'];
  const tipoCount    = {};
  tipos.forEach(t=>{ tipoCount[t]=Object.values(PERSONAL).filter(p=>p.tipo_bv===t).length; });
  const hrsByTipo={}, lecsByTipo={};
  tipos.forEach(t=>{
    const col=TIPO_COL[t]||'hrs_BVM';
    hrsByTipo[t] =PROGRAMA.reduce((s,l)=>s+(l[col]||0),0);
    lecsByTipo[t]=PROGRAMA.filter(l=>l[col]>0).length;
  });
  const years=[...new Set(RAW.filter(d=>d.fecha).map(d=>d.fecha.getFullYear()))].sort();
  const byYear={};
  years.forEach(y=>{
    const yr=RAW.filter(d=>d.fecha&&d.fecha.getFullYear()===y);
    byYear[y]={rows:yr.length,cis:new Set(yr.map(d=>d.ci).filter(Boolean)).size,
               hrs:yr.reduce((s,d)=>s+(d.asistio?d.hrs:0),0).toFixed(1)};
  });
  const bvbCis=new Set(Object.keys(PERSONAL).filter(ci=>PERSONAL[ci].tipo_bv==='BV-B'));
  const bvmCis=new Set(Object.keys(PERSONAL).filter(ci=>PERSONAL[ci].tipo_bv==='BV-M'));
  const crossBVB=RAW.filter(d=>bvbCis.has(d.ci)&&d.tipo==='BV-M').length;
  const crossBVM=RAW.filter(d=>bvmCis.has(d.ci)&&d.tipo==='BV-B').length;
  const REF_CI='8566313';
  const refName=PERSONAL[REF_CI]?.nombre||REF_CI;
  const refTipo=PERSONAL[REF_CI]?.tipo_bv||'BV-M';
  const refAgg=aggregate(RAW.filter(d=>d.ci===REF_CI));
  const refE=refAgg[REF_CI]||{lecs_done:new Set(),hrs_real:0};
  const refComp=cumpl(refE.lecs_done,refTipo);
  function tag(val,ok){return`<span class="${ok?'vmatch':'vwrong'}">${val} ${ok?'✓':'✗'}</span>`;}
  function pct2(a,b){return b?Math.round(a/b*100):0;}

  el('tab-verificar').innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">✅ Verificación de Integridad</div>
      <div class="ssub">Todos los valores se calculan del archivo cargado — se actualizan con cada nueva planilla</div>
    </div></div>
    <div class="info-banner"><span class="ib-icon">ℹ️</span>
      <div><b>¿Para qué sirve esta sección?</b> Confirma que la herramienta está leyendo e interpretando correctamente la planilla. Verde ✓ = correcto. Rojo ✗ = requiere atención.</div>
    </div>
    <div class="g2" style="margin-bottom:14px">
      <div class="verify"><h3>📊 Resumen del archivo</h3>
        <div class="vrow"><span class="vk">Total registros leídos (BD_seg)</span><span class="vv" style="color:#1a2326;font-weight:700">${totalRows.toLocaleString()}</span></div>
        <div class="vrow"><span class="vk">Con fecha válida</span><span class="vv">${tag(conFecha+' ('+pct2(conFecha,totalRows)+'%)',conFecha/totalRows>0.95)}</span></div>
        <div class="vrow"><span class="vk">Con código de lección válido</span><span class="vv">${tag(matched+' ('+pct2(matched,totalRows)+'%)',matched/totalRows>0.95)}</span></div>
        <div class="vrow"><span class="vk">Brigadistas únicos con actividad</span><span class="vv" style="font-weight:700;color:#1a2326">${cisU}</span></div>
        <div class="vrow"><span class="vk">Total en BD_personal</span><span class="vv" style="font-weight:700;color:#1a2326">${totalPers}</span></div>
        <div class="vrow"><span class="vk">Sin tipo asignado ⚠</span><span class="vv">${tag(sinTipo,sinTipo===0)}</span></div>
      </div>
      <div class="verify"><h3>👥 Brigadistas por tipo</h3>
        ${tipos.map(t=>`<div class="vrow"><span class="vk">${t}</span><span class="vv" style="font-weight:700;color:#1a2326">${tipoCount[t]||0} brigadistas</span></div>`).join('')}
        <div class="vrow" style="border-top:2px solid #dde2e4;margin-top:4px;padding-top:6px">
          <span class="vk"><b>Clasificados</b></span><span class="vv" style="font-weight:700">${totalPers-sinTipo} / ${totalPers}</span>
        </div>
      </div>
    </div>
    <div class="verify"><h3>📚 Programa de capacitación por tipo (de _tbl2)</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:6px">
        ${tipos.map(t=>`<div style="background:#f4f6f7;border-radius:6px;padding:12px;border-left:3px solid #78be44">
          <div style="font-size:11px;font-weight:700;color:#6b7c82;text-transform:uppercase;margin-bottom:4px">${t}</div>
          <div style="font-size:20px;font-weight:700;color:#1a2326">${hrsByTipo[t]||0} hrs</div>
          <div style="font-size:12px;color:#6b7c82">${lecsByTipo[t]||0} lecciones</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="verify"><h3>📅 Actividad registrada por año</h3>
      <table class="dt"><thead><tr><th>Año</th><th>Registros</th><th>Brigadistas únicos</th><th>Horas totales</th></tr></thead>
      <tbody>
        ${years.map(y=>`<tr><td class="mono" style="font-weight:700">${y}</td><td class="mono">${byYear[y].rows}</td><td class="mono">${byYear[y].cis}</td><td class="mono">${byYear[y].hrs} hrs</td></tr>`).join('')}
        <tr style="background:#f4f6f7;font-weight:600"><td>TOTAL</td><td class="mono">${totalRows}</td><td class="mono">${cisU} únicos</td>
          <td class="mono">${RAW.reduce((s,d)=>s+(d.asistio?d.hrs:0),0).toFixed(1)} hrs</td></tr>
      </tbody></table>
    </div>
    <div class="g2">
      <div class="verify"><h3>🔒 Separación de tipos</h3>
        <div class="vrow"><span class="vk">BV-B con tipo BV-M en BD_seg (debe ser 0)</span><span class="vv">${tag(crossBVB,crossBVB===0)}</span></div>
        <div class="vrow"><span class="vk">BV-M con tipo BV-B en BD_seg (debe ser 0)</span><span class="vv">${tag(crossBVM,crossBVM===0)}</span></div>
        <div class="vrow"><span class="vk">% con código de lección válido</span><span class="vv">${tag(pct2(matched,totalRows)+'%',matched/totalRows>0.95)}</span></div>
      </div>
      <div class="verify"><h3>👤 Brigadista de referencia</h3>
        <div style="font-size:13px;color:#6b7c82;margin-bottom:8px">${refName} · CI ${REF_CI} · ${refTipo}</div>
        <div class="vrow"><span class="vk">Lecciones completadas (historial completo)</span><span class="vv" style="font-weight:700;color:#1a2326">${refE.lecs_done.size}</span></div>
        <div class="vrow"><span class="vk">Horas reales registradas</span><span class="vv" style="font-weight:700;color:#1a2326">${refE.hrs_real.toFixed(1)} hrs</span></div>
        <div class="vrow"><span class="vk">Cumplimiento ${refTipo}</span><span class="vv" style="font-weight:700;color:${refComp.pct>=50?'#78be44':'#d94f3d'}">${refComp.pct}% · ${refComp.hrs_done.toFixed(0)}/${refComp.hrs_req} hrs</span></div>
        <div style="font-size:11px;color:#6b7c82;margin-top:6px">Estos valores se actualizan con cada nueva planilla.</div>
      </div>
    </div>
    <p style="font-size:13px;color:#6b7c82;margin-top:4px;padding:12px;background:#f4f6f7;border-radius:6px">
      💡 Si todos los indicadores muestran ✓, la herramienta está procesando correctamente la planilla. Si aparece ✗ en "Con código de lección válido" o "Con fecha válida", hay filas con formato incorrecto que no se están procesando.
    </p>`;
}


