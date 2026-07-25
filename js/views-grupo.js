// ─── views-grupo.js — Vista por grupo de trabajo ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// TAB: GRUPOS — con detalle de módulos/lecciones por brigadista
// ═══════════════════════════════════════════════════════════════════════════
// Build Area_2 → Grupo cascade from BD_personal
function initGroupFilters(){
  const a2Map = {};  // area_2 -> Set(grupo)
  for (const p of Object.values(PERSONAL)) {
    const a2 = p.area_2||'Sin área', g = p.grupo||'Sin grupo';
    if (!a2Map[a2]) a2Map[a2] = new Set();
    a2Map[a2].add(g);
  }
  window._A2_MAP  = a2Map;
  window._AREAS2  = Object.keys(a2Map).sort();
}

function renderGrupoShell(){
  const areas2 = window._AREAS2||[];
  const opts = areas2.map(a2=>`<option value="${a2}">${a2}</option>`).join('');
  el('tab-grupo').innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">Vista por Grupo de Trabajo</div>
      <div class="ssub">Seleccioná el área de trabajo y luego el grupo específico</div>
    </div></div>
    <div class="info-banner"><span class="ib-icon">💡</span>
      <div><b>¿Cómo usar esta sección?</b><br/>
      1. Elegí el <b>Área de trabajo</b> del desplegable de la izquierda.<br/>
      2. El selector de <b>Grupo</b> se actualizará automáticamente con los grupos de ese área.<br/>
      3. Los datos y gráficos aparecerán debajo con el cumplimiento de cada brigadista del grupo.</div>
    </div>
    <div class="frow" style="align-items:flex-end;gap:12px">
      <div style="display:flex;flex-direction:column;gap:5px">
        <span class="fl" style="font-weight:600">Área de trabajo</span>
        <select class="fsel" id="f-area2" onchange="onArea2Change()" style="min-width:200px">
          <option value="">— Seleccioná un área —</option>
          ${opts}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px">
        <span class="fl" style="font-weight:600">Grupo de trabajo</span>
        <select class="fsel" id="f-grupo" onchange="renderGrupo()" style="min-width:180px" disabled>
          <option value="">— Primero elegí el área —</option>
        </select>
      </div>
    </div>
    <div id="gcontent" style="margin-top:16px"></div>`;
}

function onArea2Change(){
  const a2  = el('f-area2')?.value||'';
  const selG = el('f-grupo');
  if(!a2){
    selG.innerHTML='<option value="">— Primero elegí el área —</option>';
    selG.disabled=true;
    el('gcontent').innerHTML='';
    return;
  }
  const grupos = [...(window._A2_MAP[a2]||new Set())].sort();
  selG.innerHTML = '<option value="">Todos los grupos de '+a2+'</option>'
    + grupos.map(g=>`<option value="${g}">${g} (${Object.values(PERSONAL).filter(p=>p.area_2===a2&&p.grupo===g).length} personas)</option>`).join('');
  selG.disabled = false;
  renderGrupo();
}

function renderGrupo(){
  destroyCharts(['ch-gm','ch-gn']);
  const fA2=el('f-area2')?.value??'',fG=el('f-grupo')?.value??'';
  // Strict match on area_2 + grupo only
  const cis=Object.keys(PERSONAL).filter(ci=>{
    const p=PERSONAL[ci];
    if(fA2!=='' && p.area_2!==fA2) return false;
    if(fG!==''  && p.grupo !==fG)  return false;
    return true;
  });
  if(!cis.length){el('gcontent').innerHTML='<div class="empty"><div class="ei">🔍</div><p>Sin brigadistas para este filtro</p></div>';return;}

  const filtRows=fd().filter(d=>cis.includes(d.ci));
  const agg=aggregate(filtRows);

  const profiles=cis.map(ci=>{
    const p=PERSONAL[ci];
    const entry=agg[ci]||{lecs_done:new Set(),hrs_real:0,notas:[],mods:{}};
    const tipo=p.tipo_bv||'';
    const comp=cumpl(entry.lecs_done,tipo);
    return{ci,...p,entry,tipo,comp,na:avg(entry.notas)};
  });

  const sup=[...new Set(profiles.map(p=>p.supervisor).filter(Boolean))].join(', ')||'—';
  const avgComp=Math.round(profiles.reduce((s,p)=>s+p.comp.pct,0)/profiles.length);
  const allNotas=profiles.flatMap(p=>p.entry.notas);
  const notaAvg=avg(allNotas);
  const sorted=[...profiles].sort((a,b)=>b.comp.pct-a.comp.pct);
  const best=sorted[0],worst=sorted[sorted.length-1];

  // Module avg cumplimiento
  const allMods=[...new Set(PROGRAMA.map(l=>l.modulo))];
  const modAvg=allMods.map(m=>{
    const rel=profiles.filter(p=>{const col=TIPO_COL[p.tipo]||'hrs_BVM';return PROGRAMA.some(l=>l.modulo===m&&l[col]>0);});
    if(!rel.length) return null;
    return Math.round(rel.reduce((s,p)=>s+cumplMod(m,p.entry.lecs_done,p.tipo).pct,0)/rel.length);
  });
  const validMods=allMods.filter((_,i)=>modAvg[i]!==null);
  const validPcts=modAvg.filter(v=>v!==null);

  // Detail table with module expansion per person
  const tableRows=sorted.map(p=>{
    const modsApp=getModulos(p.tipo);
    const modsOk=modsApp.filter(m=>cumplMod(m,p.entry.lecs_done,p.tipo).pct>=100).length;
    const na2=avg(p.entry.notas);
    // Pending lecciones summary
    const pendLecs=[];
    modsApp.forEach(m=>{
      const col=TIPO_COL[p.tipo]||'hrs_BVM';
      PROGRAMA.filter(l=>l.modulo===m&&l[col]>0).forEach(l=>{
        const k=`${l.modulo}|${l.unidad}|${l.leccion}`;
        if(!p.entry.lecs_done.has(k)) pendLecs.push({mod:m,lec:l.leccion,tema:l.tema_lec.substring(0,40)});
      });
    });
    return`<tr>
      <td><span style="cursor:pointer;color:#78be44;font-weight:600" onclick="goTab('individual');setTimeout(()=>{el('sci').value='${p.ci}';onSearch()},80)">${p.nombre}</span></td>
      <td class="mono">${p.ci}</td>
      <td>${bdg(p.tipo)}</td>
      <td class="mono" style="color:${cp(p.comp.pct)};font-weight:600">${p.comp.pct}%</td>
      <td class="mono">${f1(p.comp.hrs_done)}/${f1(p.comp.hrs_req)}</td>
      <td class="mono" style="color:${p.na>=60?'#5fa032':p.na?'#d94f3d':'#6b7c82'}">${p.na?Math.round(p.na):'—'}</td>
      <td class="mono">${modsOk}/${modsApp.length}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="toggleModDetail('md-${p.ci}')">Ver lecciones</button></td>
    </tr>
    <tr id="md-${p.ci}" style="display:none"><td colspan="8" style="padding:0">
      <div style="padding:12px;background:#f4f6f7;border-top:1px solid #dde2e4">
        ${buildGroupPersonDetail(p)}
      </div>
    </td></tr>`;
  }).join('');

  const label=[fA2,fG].filter(Boolean).join(' → ')||'Todos los grupos';
  el('gcontent').innerHTML=`
    <div class="panel"><div class="ph"><span class="pt">📍 ${label}</span>
      <span style="font-size:11px;color:#6b7c82">Supervisor: ${sup} · ${profiles.length} brigadistas</span></div>
    <div class="pb">
      <div class="kg">
        <div class="kpi"><div class="kl">Brigadistas</div><div class="kv">${profiles.length}</div></div>
        <div class="kpi"><div class="kl">Cumplimiento promedio</div><div class="kv" style="color:${cp(avgComp)}">${avgComp}%</div></div>
        <div class="kpi grey"><div class="kl">Nota promedio</div><div class="kv">${notaAvg?Math.round(notaAvg):'—'}</div></div>
      </div>
      ${(()=>{
        const gBestPct=sorted[0]?.comp.pct??0, gWorstPct=sorted[sorted.length-1]?.comp.pct??0;
        const gBest=sorted.filter(p=>p.comp.pct===gBestPct), gWorst=sorted.filter(p=>p.comp.pct===gWorstPct);
        return `<div class="rcs">
          <div class="rc top"><div class="rcl">🏆 Mayor cumplimiento — ${gBestPct}%</div>
            <div style="max-height:100px;overflow-y:auto;margin-top:4px">
              ${gBest.map(p=>`<div style="font-size:13px;font-weight:600;padding:2px 0">${p.nombre}</div><div style="font-size:11px;color:#6b7c82;margin-bottom:3px">${p.tipo}</div>`).join('')}
            </div><div class="rcv">${gBestPct}%</div></div>
          <div class="rc bot"><div class="rcl">⚠ Menor cumplimiento — ${gWorstPct}%</div>
            <div style="max-height:100px;overflow-y:auto;margin-top:4px">
              ${gWorst.map(p=>`<div style="font-size:13px;font-weight:600;padding:2px 0">${p.nombre}</div><div style="font-size:11px;color:#6b7c82;margin-bottom:3px">${p.tipo}</div>`).join('')}
            </div><div class="rcv">${gWorstPct}%</div></div>
        </div>`;
      })()}
    </div></div>
    <div class="g2">
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">📈 Cumplimiento por módulo (promedio grupo)</span></div>
        <div class="pb"><div class="cw" style="position:relative;height:230px;width:100%"><canvas id="ch-gm"></canvas></div></div></div>
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">📝 Nota promedio por brigadista</span></div>
        <div class="pb"><div class="cw" style="position:relative;height:230px;width:100%"><canvas id="ch-gn"></canvas></div></div></div>
    </div>
    <div class="panel"><div class="ph"><span class="pt">👥 Detalle del grupo — expandí cada fila para ver lecciones pendientes</span></div>
    <div style="overflow-x:auto"><table class="dt">
      <thead><tr><th>Nombre</th><th>CI</th><th>Tipo</th><th>Cumplimiento</th><th>Hrs</th><th>Nota</th><th>Módulos OK</th><th>Detalle</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table></div></div>`;

  const _gVm=validMods,_gVp=validPcts,_gSorted=sorted;
  function renderGrupoCharts(){
    const cvGM=document.getElementById('ch-gm');
    if(!cvGM) return;
    const tabEl=document.getElementById('tab-grupo');
    const tabW=tabEl?tabEl.getBoundingClientRect().width:0;
    const GW=Math.max(tabW>10?Math.round(tabW*0.47):Math.round((window.innerWidth-260)*0.47),280);
    if(cvGM.parentElement){
      cvGM.parentElement.style.position='relative';
      cvGM.parentElement.style.height='230px';
      cvGM.parentElement.style.width=GW+'px';
      cvGM.parentElement.style.display='block';
    }
    cvGM.setAttribute('width',String(GW)); cvGM.setAttribute('height','230');
    cvGM.style.display='block'; cvGM.style.width=GW+'px'; cvGM.style.height='230px';
    if(_gVm.length){
      if(CHARTS['ch-gm']){CHARTS['ch-gm'].destroy();delete CHARTS['ch-gm'];}
      CHARTS['ch-gm']=new Chart(cvGM,{type:'bar',
        data:{labels:_gVm.map(m=>m.replace('MODULO ','')),
              datasets:[{data:_gVp,backgroundColor:_gVp.map(v=>v>=80?'#78be44':v>=50?'#f0a500':'#d94f3d'),borderRadius:4,borderSkipped:false}]},
        options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+'% del grupo'}}},
          scales:{x:{max:100,grid:{color:'#dde2e4'},ticks:{color:'#6b7c82',callback:v=>v+'%'}},
                  y:{grid:{display:false},ticks:{color:'#1a2326',font:{size:13}}}}}});
    }
    const cvGN=document.getElementById('ch-gn');
    if(cvGN){
      const sN=[..._gSorted].filter(p=>p.na!==null&&p.entry.hrs_real>0);
      if(CHARTS['ch-gn']){CHARTS['ch-gn'].destroy();delete CHARTS['ch-gn'];}
      if(sN.length){CHARTS['ch-gn']=new Chart(cvGN,{type:'bar',
        data:{labels:sN.map(p=>p.nombre.split(' ').slice(0,2).join(' ')),
              datasets:[{data:sN.map(p=>Math.round(p.na)),backgroundColor:'#2d8cff',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' Nota: '+c.raw}}},
          scales:{y:{max:100,min:0,grid:{color:'#dde2e4'},ticks:{color:'#6b7c82'}},
                  x:{grid:{display:false},ticks:{color:'#1a2326',font:{size:11},maxRotation:45}}}}});}
    }
  }
  setTimeout(renderGrupoCharts,100);
}

function toggleModDetail(id){
  const row=document.getElementById(id);
  if(row) row.style.display=row.style.display==='none'?'table-row':'none';
}

function buildGroupPersonDetail(p){
  const col=TIPO_COL[p.tipo]||'hrs_BVM';
  const mods=getModulos(p.tipo);
  if(!mods.length) return '<p style="color:#6b7c82;font-size:12px">Sin módulos del programa para este tipo.</p>';

  const rows=mods.map(m=>{
    const comp=cumplMod(m,p.entry.lecs_done,p.tipo);
    const lm=PROGRAMA.filter(l=>l.modulo===m&&l[col]>0);
    const tema=PROGRAMA.find(l=>l.modulo===m)?.tema_mod||m;
    const doneLecs=lm.filter(l=>p.entry.lecs_done.has(`${l.modulo}|${l.unidad}|${l.leccion}`));
    const pendLecs=lm.filter(l=>!p.entry.lecs_done.has(`${l.modulo}|${l.unidad}|${l.leccion}`));
    const statusColor=comp.pct>=100?'#78be44':comp.pct>0?'#f0a500':'#d94f3d';
    return`<div style="margin-bottom:10px;border:1px solid #dde2e4;border-radius:6px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f4f6f7;border-bottom:1px solid #dde2e4">
        <span class="mono" style="font-size:11px;color:#6b7c82">${m.replace('MODULO','M')}</span>
        <span style="font-size:12px;font-weight:600;flex:1">${tema}</span>
        <span style="font-size:12px;font-weight:700;color:${statusColor}">${comp.pct}%</span>
        <span style="font-size:11px;color:#6b7c82">${f1(comp.hrs_done)}/${f1(comp.hrs_req)} hr</span>
      </div>
      ${doneLecs.length?`<div style="padding:6px 12px;font-size:11px">
        <span style="color:#5fa032;font-weight:600">✓ Completadas:</span>
        ${doneLecs.map(l=>`<span style="background:#e8f5e0;border:1px solid rgba(120,190,68,.3);border-radius:4px;padding:1px 6px;margin:2px;display:inline-block;font-size:10px;font-family:Consolas,monospace">${l.leccion.replace('LECCION','L')} ${l.tema_lec.substring(0,30)}</span>`).join('')}
      </div>`:''}
      ${pendLecs.length?`<div style="padding:6px 12px;font-size:11px;border-top:1px solid #dde2e4">
        <span style="color:#d94f3d;font-weight:600">⚠ Pendientes:</span>
        ${pendLecs.map(l=>`<span style="background:rgba(217,79,61,.08);border:1px solid rgba(217,79,61,.25);border-radius:4px;padding:1px 6px;margin:2px;display:inline-block;font-size:10px;font-family:Consolas,monospace">${l.leccion.replace('LECCION','L')} ${l.tema_lec.substring(0,30)}</span>`).join('')}
      </div>`:''}
    </div>`;
  }).join('');
  return rows||'<p style="color:#6b7c82;font-size:12px;padding:8px">Sin actividad en el período seleccionado.</p>';
}


// ═══════════════════════════════════════════════════════════════════════════
// VISTA MÓDULOS/LECCIONES POR GRUPO
// Selector de módulo → tabla brigadistas × lecciones (verde/rojo)
// ═══════════════════════════════════════════════════════════════════════════
function renderGrupoModulos(){
  const fA2 = el('f-area2-mod')?.value ?? '';
  const fG  = el('f-grupo-mod')?.value ?? '';
  const fMod = el('f-mod-sel')?.value ?? '';
  const cont = el('gcontent-mod');
  if(!cont) return;

  if(!fA2){ cont.innerHTML='<div class="empty"><div class="ei">👆</div><p>Seleccioná un área primero</p></div>'; return; }

  // Brigadistas del grupo
  const cis = Object.keys(PERSONAL).filter(ci=>{
    const p = PERSONAL[ci];
    if(p.area_2 !== fA2) return false;
    if(fG && p.grupo !== fG) return false;
    if(p.estado !== 'Activo') return false;
    return true;
  });

  if(!cis.length){ cont.innerHTML='<div class="empty"><div class="ei">🔍</div><p>Sin brigadistas activos para este filtro</p></div>'; return; }

  if(!fMod){ cont.innerHTML='<div class="empty"><div class="ei">📚</div><p>Seleccioná un módulo para ver el detalle de lecciones</p></div>'; return; }

  // Aggregate con todos los datos (historial completo para cumplimiento)
  const aggAll = aggregate(RAW.filter(d=>cis.includes(d.ci)&&d.asistio));

  // Lecciones del módulo por tipo de brigadista
  // Agrupamos brigadistas por tipo para mostrar solo lecciones pertinentes
  const tipos = [...new Set(cis.map(ci=>PERSONAL[ci].tipo_bv).filter(Boolean))];

  // Para cada brigadista, calcular estado de cada lección del módulo
  const rows = cis.map(ci=>{
    const p = PERSONAL[ci];
    const col = TIPO_COL[p.tipo_bv] || 'hrs_BVM';
    const lecs = PROGRAMA.filter(l=>l.modulo===fMod && l[col]>0);
    if(!lecs.length) return null; // módulo no aplica a este tipo
    const done = aggAll[ci]?.lecs_done || new Set();
    return { ci, nombre:p.nombre, tipo:p.tipo_bv, lecs, done };
  }).filter(Boolean);

  if(!rows.length){
    cont.innerHTML=`<div class="empty"><div class="ei">ℹ️</div><p>El módulo seleccionado no aplica a ningún brigadista de este grupo</p></div>`;
    return;
  }

  // Get all unique lecciones for this module across types
  const allLecs = [...new Map(
    rows.flatMap(r=>r.lecs.map(l=>([`${l.unidad}|${l.leccion}`, l])))
  ).values()].sort((a,b)=>a.leccion.localeCompare(b.leccion));

  const temaModulo = PROGRAMA.find(l=>l.modulo===fMod)?.tema_mod || fMod;

  // Summary counts
  const totalBrig = rows.length;
  const lecSummary = allLecs.map(l=>{
    const key = `${l.modulo}|${l.unidad}|${l.leccion}`;
    const doneCount = rows.filter(r=>r.done.has(key) && r.lecs.some(rl=>rl.leccion===l.leccion)).length;
    const appCount  = rows.filter(r=>r.lecs.some(rl=>rl.leccion===l.leccion)).length;
    return { lec:l, key, doneCount, appCount };
  });

  // Build table header
  const thLecs = allLecs.map(l=>`
    <th style="text-align:center;min-width:42px;padding:6px 4px">
      <div style="font-family:Consolas,monospace;font-size:11px;font-weight:700">${l.leccion.replace('LECCION','L')}</div>
      <div style="font-size:9px;color:#6b7c82;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${l.tema_lec}">${l.tema_lec.substring(0,10)}</div>
    </th>`).join('');

  // Summary row
  const tdSummary = lecSummary.map(({doneCount,appCount})=>{
    const pct = appCount ? Math.round(doneCount/appCount*100) : 0;
    const color = pct>=80?'#5fa032':pct>=50?'#f0a500':'#d94f3d';
    return `<td style="text-align:center;background:#f4f6f7;font-size:11px;font-weight:600;color:${color};padding:4px 2px">${doneCount}/${appCount}</td>`;
  }).join('');

  // Data rows
  const dataRows = rows.map(r=>{
    const cells = allLecs.map(l=>{
      const key = `${l.modulo}|${l.unidad}|${l.leccion}`;
      const applies = r.lecs.some(rl=>rl.leccion===l.leccion);
      if(!applies) return `<td style="text-align:center;background:#f9f9f9;color:#dde2e4;font-size:12px">—</td>`;
      const done = r.done.has(key);
      return done
        ? `<td style="text-align:center;background:#e8f5e0;color:#5fa032;font-size:14px;font-weight:700">✓</td>`
        : `<td style="text-align:center;background:rgba(217,79,61,.08);color:#d94f3d;font-size:14px;font-weight:700">✗</td>`;
    }).join('');

    const totalApp  = r.lecs.length;
    const totalDone = r.lecs.filter(l=>r.done.has(`${l.modulo}|${l.unidad}|${l.leccion}`)).length;
    const pct = totalApp ? Math.round(totalDone/totalApp*100) : 0;
    const pctColor = pct>=80?'#5fa032':pct>=50?'#f0a500':'#d94f3d';

    return `<tr>
      <td style="font-weight:500;white-space:nowrap;padding:6px 10px">${r.nombre}</td>
      <td style="text-align:center">${bdg(r.tipo)}</td>
      <td style="text-align:center;font-family:Consolas,monospace;font-weight:700;color:${pctColor}">${pct}%</td>
      ${cells}
    </tr>`;
  }).join('');

  cont.innerHTML=`
    <div class="panel">
      <div class="ph">
        <span class="pt">📋 ${fMod.replace('MODULO','Módulo')} — ${temaModulo}</span>
        <span style="font-size:12px;color:#6b7c82">${totalBrig} brigadistas · ${fA2}${fG?' → '+fG:''}</span>
      </div>
      <div style="overflow-x:auto">
        <table class="dt" style="min-width:100%">
          <thead>
            <tr>
              <th style="min-width:180px">Nombre</th>
              <th style="text-align:center">Tipo</th>
              <th style="text-align:center">Módulo</th>
              ${thLecs}
            </tr>
          </thead>
          <tbody>
            <tr style="background:#f4f6f7">
              <td style="font-size:11px;font-weight:600;color:#6b7c82;padding:4px 10px" colspan="2">Completaron / Aplica</td>
              <td></td>
              ${tdSummary}
            </tr>
            ${dataRows}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 16px;font-size:11px;color:#6b7c82;border-top:1px solid #dde2e4">
        <span style="color:#5fa032;font-weight:600">✓ Completada</span> &nbsp;
        <span style="color:#d94f3d;font-weight:600">✗ Pendiente</span> &nbsp;
        <span style="color:#dde2e4">— No aplica al tipo</span>
      </div>
    </div>`;
}

function renderGrupoModulosShell(){
  const areas2 = window._AREAS2 || [];
  const optsA2 = areas2.map(a=>`<option value="${a}">${a}</option>`).join('');
  const allMods = [...new Set(PROGRAMA.map(l=>l.modulo))];
  const optsMod = allMods.map(m=>{
    const tema = PROGRAMA.find(l=>l.modulo===m)?.tema_mod||m;
    return `<option value="${m}">${m.replace('MODULO','M')} — ${tema}</option>`;
  }).join('');

  el('tab-grupomods').innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">📋 Módulos y Lecciones por Grupo</div>
      <div class="ssub">Seleccioná grupo y módulo para ver el estado de cada lección por brigadista</div>
    </div></div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;align-items:flex-end;padding:14px;background:#f4f6f7;border-radius:6px;border:1px solid #dde2e4">
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Área de trabajo</span>
        <select class="fsel" id="f-area2-mod" onchange="onArea2ChangeMod()" style="min-width:200px">
          <option value="">— Seleccioná un área —</option>
          ${optsA2}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Grupo de trabajo</span>
        <select class="fsel" id="f-grupo-mod" onchange="renderGrupoModulos()" style="min-width:180px" disabled>
          <option value="">Todos los grupos</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:12px;font-weight:600;color:#6b7c82">Módulo</span>
        <select class="fsel" id="f-mod-sel" onchange="renderGrupoModulos()" style="min-width:260px">
          <option value="">— Seleccioná un módulo —</option>
          ${optsMod}
        </select>
      </div>
    </div>
    <div id="gcontent-mod"></div>`;
}

function onArea2ChangeMod(){
  const a2  = el('f-area2-mod')?.value||'';
  const selG = el('f-grupo-mod');
  if(!a2){
    selG.innerHTML='<option value="">Todos los grupos</option>';
    selG.disabled=true;
  } else {
    const grupos=[...(window._A2_MAP[a2]||new Set())].sort();
    selG.innerHTML='<option value="">Todos los grupos de '+a2+'</option>'
      +grupos.map(g=>`<option value="${g}">${g}</option>`).join('');
    selG.disabled=false;
  }
  renderGrupoModulos();
}
