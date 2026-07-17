// ─── views-nivel.js — Vistas BV-B, BV-M, URE, Sin clasificar ──────────────
// ═══════════════════════════════════════════════════════════════════════════
// TAB: NIVEL — FIX: usa fd() correctamente para filtro temporal
// ═══════════════════════════════════════════════════════════════════════════
function renderNivel(tipo){
  destroyCharts(['ch-nv-c','ch-nv-dist','ch-nv-n']);
  const tabId  = {'BV-B':'bvb','BV-M':'bvm','URE-M':'ure','LE':'le'}[tipo];
  const label  = TIPO_LABEL[tipo]||tipo;
  const col    = TIPO_COL[tipo]||'hrs_BVM';

  // ── 1. Filter state (persisted per tipo) ─────────────────────────────────
  const estadoKey = '_nEst_'+tipo;
  const a2Key     = '_nA2_'+tipo;
  const grpKey    = '_nGrp_'+tipo;
  if (!window[estadoKey]) window[estadoKey] = 'Activo';
  if (!window[a2Key])     window[a2Key]     = '';
  if (!window[grpKey])    window[grpKey]    = '';
  const estadoFilt = window[estadoKey];
  const a2Filt     = window[a2Key];
  const grpFilt    = window[grpKey];

  // ── 2. Available options for selectors ───────────────────────────────────
  const a2sT = [...new Set(
    Object.values(PERSONAL).filter(p=>p.tipo_bv===tipo).map(p=>p.area_2).filter(Boolean)
  )].sort();
  const grpsT = a2Filt
    ? [...new Set(Object.values(PERSONAL).filter(p=>p.tipo_bv===tipo&&p.area_2===a2Filt).map(p=>p.grupo).filter(Boolean))].sort()
    : [...new Set(Object.values(PERSONAL).filter(p=>p.tipo_bv===tipo).map(p=>p.grupo).filter(Boolean))].sort();

  // ── 3. Filter brigadistas ─────────────────────────────────────────────────
  const cis = Object.keys(PERSONAL).filter(ci=>{
    const p = PERSONAL[ci];
    if (p.tipo_bv !== tipo) return false;
    if (estadoFilt !== 'todos' && p.estado !== estadoFilt) return false;
    if (a2Filt  && p.area_2 !== a2Filt)  return false;
    if (grpFilt && p.grupo  !== grpFilt) return false;
    return true;
  });

  if (!cis.length) {
    el('tab-'+tabId).innerHTML=`
      <div class="shdr"><div><div class="stitle">${label} (${tipo})</div></div></div>
      ${nivelFiltersHTML(tipo,estadoKey,a2Key,grpKey,estadoFilt,a2Filt,grpFilt,a2sT,grpsT)}
      <div class="empty"><div class="ei">📭</div><p>Sin brigadistas para el filtro seleccionado</p></div>`;
    return;
  }

  // ── 4. Aggregate with time filter ─────────────────────────────────────────
  const filtRows = fd().filter(d=>cis.includes(d.ci));
  const agg      = aggregate(filtRows);
  const profiles = cis.map(ci=>{
    const entry = agg[ci]||{lecs_done:new Set(),hrs_real:0,notas:[],mods:{}};
    const comp  = cumpl(entry.lecs_done, tipo);
    return {...PERSONAL[ci], ci, entry, comp, na:avg(entry.notas), tipo:PERSONAL[ci].tipo_bv||tipo};
  });

  const hasActivity  = profiles.filter(p=>p.entry.hrs_real>0);
  const avgComp      = Math.round(profiles.reduce((s,p)=>s+p.comp.pct,0)/profiles.length);
  const avgCompActive= hasActivity.length ? Math.round(hasActivity.reduce((s,p)=>s+p.comp.pct,0)/hasActivity.length) : 0;
  const allNotas     = profiles.flatMap(p=>p.entry.notas);
  const notaAvg      = avg(allNotas);
  const hrs_req_total= PROGRAMA.reduce((s,l)=>s+(l[col]||0),0);
  const sorted       = [...profiles].sort((a,b)=>b.comp.pct-a.comp.pct);
  // Group ties for best and worst
  const bestPct  = sorted[0]?.comp.pct ?? 0;
  const worstPct = sorted[sorted.length-1]?.comp.pct ?? 0;
  const bestList  = sorted.filter(p=>p.comp.pct===bestPct);
  const worstList = sorted.filter(p=>p.comp.pct===worstPct);

  const appMods  = getModulos(tipo);
  const modAvgPct= appMods.map(m=>Math.round(
    profiles.reduce((s,p)=>s+cumplMod(m,p.entry.lecs_done,tipo).pct,0)/profiles.length
  ));

  const notaBuckets={'<60':0,'60-69':0,'70-79':0,'80-89':0,'90-100':0};
  allNotas.forEach(n=>{
    if(n<60)notaBuckets['<60']++;
    else if(n<70)notaBuckets['60-69']++;
    else if(n<80)notaBuckets['70-79']++;
    else if(n<90)notaBuckets['80-89']++;
    else notaBuckets['90-100']++;
  });

  // ── 5. Pending modules ────────────────────────────────────────────────────
  const pendingGroups={};
  profiles.forEach(p=>{
    appMods.forEach(m=>{
      if(cumplMod(m,p.entry.lecs_done,tipo).pct<100){
        if(!pendingGroups[m]) pendingGroups[m]=[];
        pendingGroups[m].push(p.nombre);
      }
    });
  });

  // ── 6. Table rows ─────────────────────────────────────────────────────────
  const tableRows = sorted.map(p=>`<tr>
    <td style="cursor:pointer;color:#78be44;font-weight:500" onclick="goTab('individual');setTimeout(()=>{el('sci').value='${p.ci}';onSearch()},80)">${p.nombre}</td>
    <td class="mono">${p.ci}</td>
    <td>${bdg(p.tipo_bv)}</td>
    <td><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:${p.estado==='Activo'?'rgba(120,190,68,.15)':'rgba(217,79,61,.1)'};color:${p.estado==='Activo'?'#5fa032':'#d94f3d'}">${p.estado||'—'}</span></td>
    <td>${p.area_2||p.area||'—'}</td>
    <td>${p.grupo||'—'}</td>
    <td>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="mono" style="color:${cp(p.comp.pct)};font-weight:600;min-width:36px">${p.comp.pct}%</span>
        <div class="abw" style="width:60px"><div class="ab" style="width:${Math.min(p.comp.pct,100)}%;background:${cp(p.comp.pct)}"></div></div>
      </div>
    </td>
    <td class="mono">${f1(p.comp.hrs_done)}/${f1(p.comp.hrs_req)}</td>
    <td class="mono" style="color:${p.na>=60?'#5fa032':p.na?'#d94f3d':'#6b7c82'}">${p.na?Math.round(p.na):'—'}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="toggleModDetail('nvmd-${p.ci}')">Ver módulos</button></td>
  </tr>
  <tr id="nvmd-${p.ci}" style="display:none"><td colspan="10" style="padding:0;background:#f9fafb">
    <div style="padding:12px">${buildGroupPersonDetail(p)}</div>
  </td></tr>`).join('');

  const pendHtml = Object.entries(pendingGroups).sort((a,b)=>b[1].length-a[1].length).slice(0,5)
    .map(([mod,brig])=>`<tr>
      <td><span class="mono">${mod.replace('MODULO','M')}</span> — ${PROGRAMA.find(l=>l.modulo===mod)?.tema_mod||''}</td>
      <td class="mono" style="color:#d94f3d;font-weight:600">${brig.length}</td>
      <td style="font-size:11px;color:#6b7c82">${brig.slice(0,3).map(n=>n.split(' ')[0]).join(', ')}${brig.length>3?` +${brig.length-3}`:''}</td>
    </tr>`).join('');

  // ── 7. Render HTML ────────────────────────────────────────────────────────
  el('tab-'+tabId).innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">${label} <span style="font-size:13px;font-weight:400;color:#6b7c82">(${tipo})</span></div>
      <div class="ssub">Período: ${periodLabel()} · ${profiles.length} brigadistas filtrados</div>
    </div></div>

    ${nivelFiltersHTML(tipo,estadoKey,a2Key,grpKey,estadoFilt,a2Filt,grpFilt,a2sT,grpsT)}

    ${!hasActivity.length?`<div class="info-banner"><span class="ib-icon">📅</span>
      Ningún brigadista filtrado tiene actividad registrada en el período seleccionado.</div>`:''}

    <div class="kg">
      <div class="kpi"><div class="kl">Total ${tipo}</div><div class="kv">${profiles.length}</div>
        <div class="ks">${hasActivity.length} con actividad en período</div></div>
      <div class="kpi"><div class="kl">Cumplimiento programa</div>
        <div class="kv" style="color:${cp(avgComp)}">${avgComp}%</div>
        <div class="ks">sobre ${hrs_req_total} hrs requeridas</div></div>
      <div class="kpi"><div class="kl">Cumplimiento activos</div>
        <div class="kv" style="color:${cp(avgCompActive)}">${hasActivity.length?avgCompActive+'%':'—'}</div></div>
      <div class="kpi grey"><div class="kl">Nota promedio</div>
        <div class="kv">${notaAvg?Math.round(notaAvg):'—'}</div></div>
      <div class="kpi grey"><div class="kl">Hrs requeridas</div>
        <div class="kv">${hrs_req_total}</div></div>
    </div>

    <div class="rcs">
      <div class="rc top">
        <div class="rcl">🏆 Mayor cumplimiento — ${bestPct}%</div>
        <div style="max-height:110px;overflow-y:auto;margin-top:4px">
          ${bestList.map(p=>`<div style="font-size:13px;font-weight:600;color:#1a2326;padding:2px 0">${p.nombre}</div>
          <div style="font-size:11px;color:#6b7c82;margin-bottom:4px">${p.area_2||p.area||''} · ${p.grupo||''}</div>`).join('')}
        </div>
        <div class="rcv">${bestPct}%</div>
      </div>
      <div class="rc bot">
        <div class="rcl">⚠ Menor cumplimiento — ${worstPct}%</div>
        <div style="max-height:110px;overflow-y:auto;margin-top:4px">
          ${worstList.map(p=>`<div style="font-size:13px;font-weight:600;color:#1a2326;padding:2px 0">${p.nombre}</div>
          <div style="font-size:11px;color:#6b7c82;margin-bottom:4px">${p.area_2||p.area||''} · ${p.grupo||''}</div>`).join('')}
        </div>
        <div class="rcv">${worstPct}%</div>
      </div>
    </div>

    <div class="g2">
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">📈 Cumplimiento por módulo — ${tipo}</span></div>
        <div class="pb"><div style="position:relative;height:230px;width:100%"><canvas id="ch-nv-c"></canvas></div></div></div>
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">🎯 Distribución de notas</span></div>
        <div class="pb"><div style="position:relative;height:230px;width:100%" id="ch-nv-dist-wrap"><canvas id="ch-nv-dist"></canvas></div></div></div>
    </div>

    ${pendHtml?`<div class="panel"><div class="ph"><span class="pt">⚠ Módulos con mayor cantidad de brigadistas pendientes</span></div>
      <div style="overflow-x:auto"><table class="dt"><thead><tr><th>Módulo</th><th>Pendientes</th><th>Ejemplos</th></tr></thead>
      <tbody>${pendHtml}</tbody></table></div></div>`:''}

    <div class="panel"><div class="ph"><span class="pt">📋 Todos los brigadistas · ${label}</span></div>
    <div style="overflow-x:auto"><table class="dt">
      <thead><tr><th>Nombre</th><th>CI</th><th>Tipo</th><th>Estado</th><th>Área 2</th><th>Grupo</th><th>Cumplimiento</th><th>Hrs</th><th>Nota</th><th>Detalle</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table></div></div>`;

  // ── 8. Charts — wait until container has real height ─────────────────────
  const _appMods=appMods, _modAvgPct=modAvgPct, _notaBuckets=notaBuckets;

  function renderNivelCharts(){
    const cvC = document.getElementById('ch-nv-c');
    const cvD = document.getElementById('ch-nv-dist');
    if(!cvC) return;

    // Force explicit pixel dimensions — use window width as reliable fallback
    const parent = cvC.parentElement;
    const H = 230;
    const tabEl = document.getElementById('tab-'+tabId);
    const tabW  = tabEl ? tabEl.getBoundingClientRect().width : 0;
    const W     = tabW > 10 ? Math.round(tabW * 0.47) : Math.round((window.innerWidth - 260) * 0.47);
    const safeW = Math.max(W, 280);
    if(parent){
      parent.style.position = 'relative';
      parent.style.height   = H + 'px';
      parent.style.width    = safeW + 'px';
      parent.style.display  = 'block';
      parent.style.minHeight = H + 'px';
    }
    cvC.setAttribute('width',  String(safeW));
    cvC.setAttribute('height', String(H));
    cvC.style.display  = 'block';
    cvC.style.width    = safeW + 'px';
    cvC.style.height   = H + 'px';

    if(_appMods.length){
      if(CHARTS['ch-nv-c']){CHARTS['ch-nv-c'].destroy();delete CHARTS['ch-nv-c'];}
      CHARTS['ch-nv-c'] = new Chart(cvC,{type:'bar',
        data:{labels:_appMods.map(m=>m.replace('MODULO ','')),
              datasets:[{data:_modAvgPct,
                backgroundColor:_modAvgPct.map(v=>v>=80?'#78be44':v>=50?'#f0a500':'#d94f3d'),
                borderRadius:4,borderSkipped:false}]},
        options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
          plugins:{legend:{display:false},
                   tooltip:{callbacks:{label:ctx=>' '+ctx.raw+'% cumplimiento promedio'}}},
          scales:{x:{max:100,grid:{color:'#dde2e4'},ticks:{color:'#6b7c82',callback:v=>v+'%',font:{size:12}}},
                  y:{grid:{display:false},ticks:{color:'#1a2326',font:{size:12}}}}}});
    }

    if(cvD){
      const vals=Object.values(_notaBuckets), hasN=vals.some(v=>v>0);
      if(CHARTS['ch-nv-dist']){CHARTS['ch-nv-dist'].destroy();delete CHARTS['ch-nv-dist'];}
      if(hasN){
        CHARTS['ch-nv-dist'] = new Chart(cvD,{type:'doughnut',
          data:{labels:['< 60','60-69','70-79','80-89','90-100'],
                datasets:[{data:vals,
                  backgroundColor:['#d94f3d','#f0a500','#d29922','#78be44','#2d8cff'],
                  borderWidth:2,borderColor:'#ffffff'}]},
          options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
            plugins:{legend:{position:'bottom',labels:{color:'#1a2326',font:{size:11},padding:6,boxWidth:10}},
                     tooltip:{callbacks:{label:c=>` ${c.raw} brigadistas`}}}}});
      } else {
        const wrap=document.getElementById('ch-nv-dist-wrap');
        if(wrap) wrap.innerHTML='<div style="height:230px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px"><span style="font-size:32px">📝</span><p style="color:#6b7c82;font-size:14px">Sin notas en el período seleccionado</p></div>';
      }
    }
  }

  setTimeout(renderNivelCharts, 100);
}

function nivelFiltersHTML(tipo,estadoKey,a2Key,grpKey,estadoFilt,a2Filt,grpFilt,a2sT,grpsT){
  const hasFilters = a2Filt||grpFilt||estadoFilt!=='Activo';
  return `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:flex-end;padding:12px;background:#f4f6f7;border-radius:6px;border:1px solid #dde2e4">
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:12px;font-weight:600;color:#6b7c82">Estado</span>
      <select class="fsel" onchange="window['${estadoKey}']=this.value;window['${a2Key}']='';window['${grpKey}']='';renderNivel('${tipo}')">
        <option value="Activo" ${estadoFilt==='Activo'?'selected':''}>Solo Activos</option>
        <option value="todos" ${estadoFilt==='todos'?'selected':''}>Todos (activos e inactivos)</option>
        <option value="Baja" ${estadoFilt==='Baja'?'selected':''}>Solo Baja</option>
      </select>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:12px;font-weight:600;color:#6b7c82">Área de trabajo</span>
      <select class="fsel" onchange="window['${a2Key}']=this.value;window['${grpKey}']='';renderNivel('${tipo}')">
        <option value="">Todas las áreas</option>
        ${a2sT.map(a=>`<option value="${a}" ${a2Filt===a?'selected':''}>${a}</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:12px;font-weight:600;color:#6b7c82">Grupo</span>
      <select class="fsel" onchange="window['${grpKey}']=this.value;renderNivel('${tipo}')">
        <option value="">Todos los grupos</option>
        ${grpsT.map(g=>`<option value="${g}" ${grpFilt===g?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
    ${hasFilters?`<button class="btn btn-ghost btn-sm" style="align-self:flex-end" onclick="window['${estadoKey}']='Activo';window['${a2Key}']='';window['${grpKey}']='';renderNivel('${tipo}')">✕ Limpiar</button>`:''}
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB: SIN CLASIFICAR
// ═══════════════════════════════════════════════════════════════════════════
function renderSinClasif(){
  const cis=Object.keys(PERSONAL).filter(ci=>!PERSONAL[ci].tipo_bv);
  el('tab-sinclasif').innerHTML=`
    <div class="shdr"><div><div class="stitle">Brigadistas Sin Clasificar</div>
      <div class="ssub">Personas en BD_personal sin tipo_bv asignado — requieren actualización en la planilla</div></div></div>
    <div class="info-banner"><span class="ib-icon">⚠️</span>
      Estos ${cis.length} brigadistas no tienen tipo BV asignado en la columna <b>BV-GPR-LE</b> de BD_personal. No aparecen en ninguna sección de nivel y su cumplimiento no puede calcularse. Se recomienda actualizar la planilla con el tipo correcto (BV-B, BV-M, LE, URE-M).</div>
    ${cis.length===0?'<div class="empty"><div class="ei">✅</div><p>Todos los brigadistas tienen tipo asignado</p></div>':`
    <div class="panel"><div class="ph"><span class="pt">👤 Lista de brigadistas sin clasificar (${cis.length})</span></div>
    <div style="overflow-x:auto"><table class="dt">
      <thead><tr><th>Nombre</th><th>CI</th><th>Área</th><th>Área 2</th><th>Grupo</th><th>Estado</th></tr></thead>
      <tbody>${cis.map(ci=>{const p=PERSONAL[ci];return`<tr>
        <td>${p.nombre}</td><td class="mono">${ci}</td>
        <td>${p.area}</td><td>${p.area_2}</td><td>${p.grupo}</td>
        <td style="color:${p.estado==='Activo'?'#78be44':'#d94f3d'}">${p.estado}</td>
      </tr>`;}).join('')}
      </tbody>
    </table></div></div>`}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: PLAN SEMANAL
// Seleccioná módulos y lecciones → ver qué brigadistas las necesitan
// ═══════════════════════════════════════════════════════════════════════════
function renderPlanSemanal(){
  // Build module list from programa
  const allMods = [...new Set(PROGRAMA.map(l=>l.modulo))];
  const modOpts = allMods.map(m=>{
    const tema = PROGRAMA.find(l=>l.modulo===m)?.tema_mod||m;
    return `<option value="${m}">${m.replace('MODULO','M')} — ${tema}</option>`;
  }).join('');

  el('tab-plansemanal').innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">📅 Plan Semanal de Capacitación</div>
      <div class="ssub">Seleccioná los módulos y lecciones que se dictarán esta semana para ver qué brigadistas los necesitan</div>
    </div></div>
    <div class="info-banner"><span class="ib-icon">💡</span>
      <div><b>¿Cómo usar?</b><br/>
      1. Hacé clic en <b>+ Agregar módulo</b> para seleccionar un módulo del programa.<br/>
      2. Elegí las lecciones específicas que se dictarán (o dejá sin seleccionar para ver todos los pendientes del módulo).<br/>
      3. La tabla mostrará automáticamente qué brigadistas necesitan esas lecciones.<br/>
      4. Podés agregar varios módulos para armar el plan completo de la semana.</div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center">
      <button class="btn btn-primary" onclick="psAddModulo()">+ Agregar módulo</button>
      <button class="btn btn-ghost" onclick="psClear()">✕ Limpiar todo</button>
      <button class="btn btn-ghost" id="ps-export-btn" onclick="exportPlanSemanal()" style="display:none">📄 Exportar plan</button>
    </div>
    <div id="ps-bloques" style="display:flex;flex-direction:column;gap:12px"></div>
    <div id="ps-resultado" style="margin-top:16px"></div>`;

  window._PS_BLOQUES = [];
  psAddModulo();
}

function psAddModulo(){
  const id = Date.now();
  const allMods = [...new Set(PROGRAMA.map(l=>l.modulo))];
  window._PS_BLOQUES = window._PS_BLOQUES||[];
  window._PS_BLOQUES.push({id, modulo:'', lecciones:[]});

  const modOpts = allMods.map(m=>{
    const tema = PROGRAMA.find(l=>l.modulo===m)?.tema_mod||m;
    return `<option value="${m}">${m.replace('MODULO','M')} — ${tema}</option>`;
  }).join('');

  const bloque = document.createElement('div');
  bloque.id = 'psb-'+id;
  bloque.style.cssText = 'background:#fff;border:1px solid #dde2e4;border-radius:6px;overflow:hidden';
  bloque.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f4f6f7;border-bottom:1px solid #dde2e4">
      <span style="font-size:13px;font-weight:600;color:#6b7c82">Módulo</span>
      <select class="fsel" style="flex:1" onchange="psOnModChange(${id},this.value)">
        <option value="">— Seleccioná un módulo —</option>
        ${modOpts}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="psRemoveBloque(${id})">✕</button>
    </div>
    <div id="psb-lecs-${id}" style="padding:12px 16px;display:none">
      <div style="font-size:12px;font-weight:600;color:#6b7c82;margin-bottom:8px">
        Lecciones a dictar (dejá sin marcar para incluir todas las pendientes del módulo):
      </div>
      <div id="psb-lecs-list-${id}" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>`;
  document.getElementById('ps-bloques').appendChild(bloque);
}

function psOnModChange(id, modulo){
  const bloque = window._PS_BLOQUES.find(b=>b.id===id);
  if(!bloque) return;
  bloque.modulo = modulo;
  bloque.lecciones = [];

  const lecsDiv = document.getElementById('psb-lecs-'+id);
  const lecsList = document.getElementById('psb-lecs-list-'+id);
  if(!modulo){lecsDiv.style.display='none';psUpdateResultado();return;}

  // Get lecciones for this module (all types combined - show all)
  const lecs = PROGRAMA.filter(l=>l.modulo===modulo&&l.carga>0);
  lecsList.innerHTML = lecs.map(l=>`
    <label style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#f4f6f7;border:1px solid #dde2e4;border-radius:4px;cursor:pointer;font-size:12px">
      <input type="checkbox" value="${l.leccion}" 
        onchange="psOnLecChange(${id},'${l.leccion}',this.checked)"
        style="accent-color:#78be44">
      <span style="font-family:Consolas,monospace;color:#6b7c82">${l.leccion.replace('LECCION','L')}</span>
      <span>${l.tema_lec.substring(0,35)}${l.tema_lec.length>35?'…':''}</span>
      <span style="color:#6b7c82;font-size:10px">(${l.carga}hr)</span>
    </label>`).join('');
  lecsDiv.style.display='block';
  psUpdateResultado();
}

function psOnLecChange(id, leccion, checked){
  const bloque = window._PS_BLOQUES.find(b=>b.id===id);
  if(!bloque) return;
  if(checked) bloque.lecciones.push(leccion);
  else bloque.lecciones = bloque.lecciones.filter(l=>l!==leccion);
  psUpdateResultado();
}

function psRemoveBloque(id){
  window._PS_BLOQUES = window._PS_BLOQUES.filter(b=>b.id!==id);
  document.getElementById('psb-'+id)?.remove();
  psUpdateResultado();
}

function psClear(){
  window._PS_BLOQUES = [];
  document.getElementById('ps-bloques').innerHTML='';
  document.getElementById('ps-resultado').innerHTML='';
  document.getElementById('ps-export-btn').style.display='none';
  psAddModulo();
}

function psUpdateResultado(){
  const bloques = (window._PS_BLOQUES||[]).filter(b=>b.modulo);
  const res = document.getElementById('ps-resultado');
  if(!bloques.length){res.innerHTML='';return;}

  // Only active brigadistas
  const activeCis = Object.keys(PERSONAL).filter(ci=>PERSONAL[ci].estado==='Activo');
  const aggAll = aggregate(RAW.filter(d=>activeCis.includes(d.ci)));

  // For each bloque, determine which brigadistas need which lecciones
  const planData = bloques.map(b=>{
    const lecs_mod = PROGRAMA.filter(l=>l.modulo===b.modulo&&l.carga>0);
    // If specific lecciones selected, use those; else all lecciones of module
    const targetLecs = b.lecciones.length>0
      ? lecs_mod.filter(l=>b.lecciones.includes(l.leccion))
      : lecs_mod;

    // For each active brigadista, check which target lecs they're missing
    const brigadistas = [];
    activeCis.forEach(ci=>{
      const p = PERSONAL[ci];
      const col = TIPO_COL[p.tipo_bv]||'hrs_BVM';
      // Only include if this module applies to their type
      const appLecs = targetLecs.filter(l=>l[col]>0);
      if(!appLecs.length) return;

      const entry = aggAll[ci]||{lecs_done:new Set()};
      const pendLecs = appLecs.filter(l=>!entry.lecs_done.has(`${l.modulo}|${l.unidad}|${l.leccion}`));
      if(pendLecs.length>0){
        brigadistas.push({
          ci, nombre:p.nombre, tipo:p.tipo_bv,
          area_2:p.area_2||p.area, grupo:p.grupo,
          pendLecs: pendLecs.map(l=>l.leccion.replace('LECCION','L'))
        });
      }
    });

    return {modulo:b.modulo, tema:PROGRAMA.find(l=>l.modulo===b.modulo)?.tema_mod||'', 
            targetLecs, brigadistas};
  });

  // Store for export
  window._PS_PLAN_DATA = planData;
  document.getElementById('ps-export-btn').style.display = planData.some(p=>p.brigadistas.length) ? 'inline-flex' : 'none';

  const html = planData.map(plan=>`
    <div class="panel" style="margin-bottom:12px">
      <div class="ph">
        <span class="pt">📚 ${plan.modulo.replace('MODULO','M')} — ${plan.tema}</span>
        <span style="font-size:12px;color:#6b7c82">${plan.brigadistas.length} brigadistas con lecciones pendientes</span>
      </div>
      ${plan.brigadistas.length===0
        ? '<div class="pb"><div class="empty" style="padding:20px"><div class="ei">✅</div><p>Todos los brigadistas activos completaron estas lecciones</p></div></div>'
        : `<div style="overflow-x:auto"><table class="dt">
            <thead><tr><th>Nombre</th><th>CI</th><th>Tipo</th><th>Área</th><th>Grupo</th><th>Lecciones pendientes</th></tr></thead>
            <tbody>${plan.brigadistas.map(b=>`<tr>
              <td style="font-weight:500">${b.nombre}</td>
              <td class="mono">${b.ci}</td>
              <td>${bdg(b.tipo)}</td>
              <td>${b.area_2}</td>
              <td>${b.grupo}</td>
              <td><div style="display:flex;flex-wrap:wrap;gap:4px">
                ${b.pendLecs.map(l=>`<span style="background:rgba(217,79,61,.1);color:#d94f3d;border:1px solid rgba(217,79,61,.3);border-radius:4px;padding:1px 7px;font-size:11px;font-family:Consolas,monospace;font-weight:600">${l}</span>`).join('')}
              </div></td>
            </tr>`).join('')}
            </tbody></table></div>`
      }
    </div>`).join('');

  res.innerHTML = html;
}

async function exportPlanSemanal(){
  const plan = window._PS_PLAN_DATA;
  if(!plan||!plan.length) return;
  const fecha = new Date().toLocaleDateString('es-BO',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const semana = `Semana del ${new Date().toLocaleDateString('es-BO')}`;

  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const PW=210,PH=297,ML=18,MR=18,UW=PW-ML-MR;
  let y=0, pn=1;

  function hdr(){
    pdf.setFillColor(120,190,68);pdf.rect(0,0,PW,14,'F');
    pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text('PLAN SEMANAL DE CAPACITACIÓN — BRIGADAS VOLUNTARIAS MSC',PW/2,9,{align:'center'});
    pdf.setFillColor(61,71,74);pdf.rect(0,14,PW,7,'F');
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(255,255,255);
    pdf.text(semana,ML,18.5);
    pdf.text('INSEIN SRL — Seguridad Industrial',PW-MR,18.5,{align:'right'});
    return 26;
  }
  function ftr(){
    pdf.setFillColor(245,247,248);pdf.rect(0,PH-9,PW,9,'F');
    pdf.setDrawColor(220,220,220);pdf.setLineWidth(0.3);pdf.line(0,PH-9,PW,PH-9);
    pdf.setTextColor(150,150,150);pdf.setFontSize(7);pdf.setFont('helvetica','normal');
    pdf.text('INSEIN SRL · Plan generado: '+fecha,ML,PH-3.5);
    pdf.text('Pág. '+pn,PW-MR,PH-3.5,{align:'right'});
  }
  function chkP(y2,need){
    if(y2+(need||30)>PH-12){ftr();pdf.addPage();pn++;y2=hdr();}
    return y2;
  }

  y = hdr();

  plan.forEach((bloque,bi)=>{
    y=chkP(y,20);
    // Module header
    pdf.setFillColor(240,245,240);pdf.rect(ML,y,UW,9,'F');
    pdf.setFillColor(120,190,68);pdf.rect(ML,y,4,9,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.setTextColor(26,35,38);
    pdf.text(`${bloque.modulo.replace('MODULO','MÓDULO')} — ${bloque.tema}`,ML+7,y+6);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(107,124,130);
    pdf.text(`${bloque.brigadistas.length} brigadistas con lecciones pendientes`,PW-MR,y+6,{align:'right'});
    y+=12;

    if(bloque.brigadistas.length===0){
      y=chkP(y,10);
      pdf.setFont('helvetica','italic');pdf.setFontSize(8);pdf.setTextColor(107,124,130);
      pdf.text('✓ Todos los brigadistas activos completaron estas lecciones.',ML+4,y+5);
      y+=10;return;
    }

    // Table header
    y=chkP(y,10);
    pdf.setFillColor(245,247,248);pdf.rect(ML,y,UW,7,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(107,124,130);
    pdf.text('Nombre',ML+2,y+4.5);
    pdf.text('CI',ML+72,y+4.5);
    pdf.text('Tipo',ML+92,y+4.5);
    pdf.text('Área / Grupo',ML+108,y+4.5);
    pdf.text('Lecciones pendientes',ML+148,y+4.5);
    y+=8;

    bloque.brigadistas.forEach((b,idx)=>{
      y=chkP(y,8);
      if(idx%2===0){pdf.setFillColor(250,252,248);pdf.rect(ML,y-1,UW,8,'F');}
      pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
      pdf.text(b.nombre.substring(0,28),ML+2,y+4);
      pdf.text(b.ci,ML+72,y+4);
      pdf.setTextColor(95,160,50);pdf.setFont('helvetica','bold');
      pdf.text(b.tipo,ML+92,y+4);
      pdf.setTextColor(26,35,38);pdf.setFont('helvetica','normal');
      pdf.text((b.area_2+' / '+b.grupo).substring(0,22),ML+108,y+4);
      pdf.setTextColor(217,79,61);pdf.setFont('helvetica','bold');pdf.setFontSize(7);
      pdf.text(b.pendLecs.join('  '),ML+148,y+4);
      y+=8;
    });
    y+=4;
  });

  ftr();
  pdf.save(`Plan-Semanal-${new Date().toISOString().slice(0,10)}.pdf`);
}


