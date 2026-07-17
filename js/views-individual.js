// ─── views-individual.js — Vista por brigadista ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// TAB: INDIVIDUAL
// ═══════════════════════════════════════════════════════════════════════════
function renderIndividual(){
  el('tab-individual').innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">Consulta por Brigadista</div>
      <div class="ssub">Buscá por CI o nombre — muestra módulos, unidades y lecciones completadas y pendientes</div>
    </div></div>
    <div class="info-banner"><span class="ib-icon">💡</span>
      El árbol de módulos muestra el avance real en base a la carga horaria del programa. Las lecciones marcadas con N/A no corresponden al tipo de este brigadista. Hacé clic en un módulo para expandirlo.</div>
    <div class="srow">
      <input type="text" class="sinput" id="sci" placeholder="Ingresá CI o nombre…" oninput="onSearch()"/>
      <button class="btn btn-ghost" onclick="clearSearch()">✕</button>
    </div>
    <div id="sres"></div><div id="pdet"></div>`;
}

let _searchT;
function onSearch(){
  clearTimeout(_searchT);
  _searchT=setTimeout(()=>{
    const q=el('sci')?.value.trim().toLowerCase();
    el('pdet').innerHTML='';
    if(!q){el('sres').innerHTML='';return;}
    const res=Object.keys(PERSONAL).filter(ci=>ci.includes(q)||PERSONAL[ci].nombre.toLowerCase().includes(q));
    if(!res.length){el('sres').innerHTML=`<div class="empty"><div class="ei">🔍</div><p>Sin resultados para "${q}"</p></div>`;return;}
    if(res.length===1){showPerson(res[0]);el('sres').innerHTML='';return;}
    el('sres').innerHTML=`<div class="panel"><div class="ph"><span class="pt">Resultados (${res.length})</span></div><div class="srl">
      ${res.slice(0,12).map(ci=>`<div class="sri" onclick="showPerson('${ci}');el('sres').innerHTML=''">
        <span class="sri-ci">${ci}</span><span class="sri-name">${PERSONAL[ci].nombre}</span>
        ${bdg(PERSONAL[ci].tipo_bv)}<span class="sri-area">${PERSONAL[ci].area_2||PERSONAL[ci].area}</span>
      </div>`).join('')}
    </div></div>`;
  },180);
}

function clearSearch(){if(el('sci'))el('sci').value='';el('sres').innerHTML='';el('pdet').innerHTML='';}

function showPerson(ci){
  if(el('sci')) el('sci').value=PERSONAL[ci]?.nombre||ci;
  el('sres').innerHTML='';
  const prof=PERSONAL[ci]||{};
  const tipo=prof.tipo_bv||'';
  // Use filtered data for this period
  const filtRows=fd().filter(d=>d.ci===ci);
  const agg=aggregate(filtRows);
  const entry=agg[ci]||{lecs_done:new Set(),hrs_real:0,notas:[],mods:{}};
  const comp=cumpl(entry.lecs_done,tipo);
  const na=avg(entry.notas);
  const mods=getModulos(tipo);

  el('pdet').innerHTML=`
    <div class="panel">
      <div class="p-hdr">
        <div>
          <div class="p-name">${prof.nombre||ci}</div>
          <div class="p-meta">
            <span class="pm">🪪 <b>${ci}</b></span>
            <span class="pm">📍 ${prof.area||'—'}</span>
            <span class="pm">🏢 ${prof.area_2||'—'}</span>
            <span class="pm">🏷 ${prof.grupo||'—'}</span>
            <span class="pm">👤 Sup: ${prof.supervisor||'—'}</span>
            <span class="pm" style="color:${prof.estado==='Activo'?'#78be44':'#d94f3d'}"><b>${prof.estado||'—'}</b></span>
          </div>
        </div>
        ${bdg(tipo)}
      </div>
      <div class="pstats">
        <div class="ps"><div class="psv" style="color:${cp(comp.pct)}">${comp.pct}%</div><div class="psl">Cumplimiento</div></div>
        <div class="ps"><div class="psv">${f1(comp.hrs_done)}</div><div class="psl">Hrs completadas</div></div>
        <div class="ps"><div class="psv">${f1(comp.hrs_req)}</div><div class="psl">Hrs requeridas</div></div>
        <div class="ps"><div class="psv">${na?Math.round(na):'—'}</div><div class="psl">Nota promedio</div></div>
        <div class="ps"><div class="psv">${entry.lecs_done.size}</div><div class="psl">Lecciones OK</div></div>
      </div>
      <div class="g2" style="padding:14px;gap:14px">
        <div class="panel" style="margin:0"><div class="ph"><span class="pt">📈 Cumplimiento por módulo — ${periodLabel()}</span></div>
          <div class="pb"><div class="cw" style="position:relative;height:230px;width:100%"><canvas id="ch-pi-c"></canvas></div></div></div>
        <div class="panel" style="margin:0"><div class="ph"><span class="pt">📝 Nota promedio por módulo</span></div>
          <div class="pb"><div class="cw" style="position:relative;height:230px;width:100%"><canvas id="ch-pi-n"></canvas></div></div></div>
      </div>
      <div class="ph"><span class="pt">📚 Detalle de módulos y lecciones</span>
        <span style="font-size:11px;color:#6b7c82">Clic en módulo para expandir · ${periodLabel()}</span></div>
      <div class="mod-tree" id="modtree-${ci}">${buildModTree(entry,tipo,ci)}</div>
    </div>`;

  const pcts=mods.map(m=>cumplMod(m,entry.lecs_done,tipo).pct);
  const notas=mods.map(m=>{const mn=entry.mods[m]?.notas||[];return mn.length?Math.round(avg(mn)):null;});
  const _pMods=mods,_pPcts=pcts,_pNotas=notas;
  function renderPersonCharts(){
    const cvPC=document.getElementById('ch-pi-c');
    if(!cvPC) return;
    const tabEl=document.getElementById('tab-individual');
    const tabW=tabEl?tabEl.getBoundingClientRect().width:0;
    const PW=Math.max(tabW>10?Math.round(tabW*0.47):Math.round((window.innerWidth-260)*0.47),280);
    if(cvPC.parentElement){
      cvPC.parentElement.style.position='relative';
      cvPC.parentElement.style.height='230px';
      cvPC.parentElement.style.width=PW+'px';
      cvPC.parentElement.style.display='block';
    }
    cvPC.setAttribute('width',String(PW)); cvPC.setAttribute('height','230');
    cvPC.style.display='block'; cvPC.style.width=PW+'px'; cvPC.style.height='230px';
    if(_pMods.length){
      if(CHARTS['ch-pi-c']){CHARTS['ch-pi-c'].destroy();delete CHARTS['ch-pi-c'];}
      CHARTS['ch-pi-c']=new Chart(cvPC,{type:'bar',
        data:{labels:_pMods.map(m=>m.replace('MODULO ','')),
              datasets:[{data:_pPcts,backgroundColor:_pPcts.map(v=>v>=80?'#78be44':v>=50?'#f0a500':'#d94f3d'),borderRadius:4,borderSkipped:false}]},
        options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+'% completado'}}},
          scales:{x:{max:100,grid:{color:'#dde2e4'},ticks:{color:'#6b7c82',callback:v=>v+'%'}},
                  y:{grid:{display:false},ticks:{color:'#1a2326',font:{size:13}}}}}});
    }
    const cvPN=document.getElementById('ch-pi-n');
    if(cvPN&&_pMods.length){
      const nv=_pNotas.map(v=>v===null?0:v);
      if(CHARTS['ch-pi-n']){CHARTS['ch-pi-n'].destroy();delete CHARTS['ch-pi-n'];}
      CHARTS['ch-pi-n']=new Chart(cvPN,{type:'bar',
        data:{labels:_pMods.map(m=>m.replace('MODULO ','')),
              datasets:[{data:nv,backgroundColor:nv.map(v=>v>=60?'#78be44':v>0?'#d94f3d':'#dde2e4'),borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw>0?' Nota: '+c.raw:' Sin evaluación'}}},
          scales:{y:{max:100,min:0,grid:{color:'#dde2e4'},ticks:{color:'#6b7c82'}},
                  x:{grid:{display:false},ticks:{color:'#1a2326',font:{size:13}}}}}});
    }
  }
  setTimeout(renderPersonCharts,100);
}

function buildModTree(entry,tipo,ci){
  const col=TIPO_COL[tipo]||'hrs_BVM';
  const mods=[...new Set(PROGRAMA.map(l=>l.modulo))];
  return mods.map(mod=>{
    const lm=PROGRAMA.filter(l=>l.modulo===mod);
    const comp=cumplMod(mod,entry.lecs_done,tipo);
    if(comp.na) return '';
    const tema=lm[0]?.tema_mod||mod;
    const mn=entry.mods[mod]?.notas||[];
    const na_mod=mn.length?Math.round(avg(mn)):null;
    const hdrClass=comp.pct>=100?'done':'';
    const units=[...new Set(lm.map(l=>l.unidad))];
    const unidBody=units.map(un=>{
      const lu=lm.filter(l=>l.unidad===un);
      const tu=lu[0]?.tema_unidad||un;
      const un_req=lu.reduce((s,l)=>s+(l[col]||0),0);
      const un_done=lu.reduce((s,l)=>{const k=`${l.modulo}|${l.unidad}|${l.leccion}`;return s+(entry.lecs_done.has(k)?(l[col]||0):0);},0);
      if(un_req===0) return '';
      const un_pct=Math.round(un_done/un_req*100);
      const lecsHtml=lu.map(l=>{
        const key=`${l.modulo}|${l.unidad}|${l.leccion}`;
        const hrs_req_lec=l[col]||0;
        if(hrs_req_lec===0&&l.carga>0) return `<div class="lec-row na">
          <div class="lec-check na-check">—</div>
          <div class="lec-info"><span class="lec-tag">${l.leccion.replace('LECCION','L')}</span>
            <span class="lec-name" style="font-style:italic;font-size:11px">${l.tema_lec.substring(0,80)}</span>
            <div class="lec-meta"><span class="lec-hrs" style="color:#6b7c82">No aplica a ${tipo}</span></div>
          </div><span class="lec-status s-na">N/A</span></div>`;
        const done=entry.lecs_done.has(key);
        // Get nota for this specific lesson
        const lec_rows=RAW.filter(d=>d.ci===ci&&d.lecKey===key&&d.nota!==null);
        const nota_lec=lec_rows.length?Math.round(avg(lec_rows.map(d=>d.nota))):null;
        return `<div class="lec-row">
          <div class="lec-check ${done?'done':'pending'}">${done?'✓':''}</div>
          <div class="lec-info">
            <span class="lec-tag">${l.leccion.replace('LECCION','L')}</span>
            <span class="lec-name">${l.tema_lec.substring(0,90)}${l.tema_lec.length>90?'…':''}</span>
            <div class="lec-meta">
              <span class="lec-hrs">${hrs_req_lec>0?hrs_req_lec+' hr':'Evaluación'}</span>
              ${nota_lec!==null?`<span class="lec-nota ${nota_lec>=60?'ok':'fail'}">Nota: ${nota_lec}</span>`:''}
            </div>
          </div>
          <span class="lec-status ${done?'s-done':'s-pend'}">${done?'COMPLETADA':'PENDIENTE'}</span>
        </div>`;
      }).join('');
      return `<div class="unit-block">
        <div class="unit-hdr">
          <span class="unit-tag">${un.replace('UNIDAD','U')}</span>
          <span class="unit-title">${tu}</span>
          <span class="unit-prog">${un_done}/${un_req} hr · ${un_pct}%</span>
        </div>${lecsHtml}</div>`;
    }).join('');
    return `<div class="mod-block">
      <div class="mod-hdr ${hdrClass}" onclick="this.classList.toggle('open')">
        <span class="mod-tag">${mod.replace('MODULO','M')}</span>
        <span class="mod-title">${tema}</span>
        <div class="mod-prog-wrap"><div class="mod-prog" style="width:${comp.pct}%;background:${cp(comp.pct)}"></div></div>
        <span class="mod-pct" style="color:${cp(comp.pct)}">${comp.pct}%</span>
        <span class="mod-hrs">${f1(comp.hrs_done)}/${f1(comp.hrs_req)} hr</span>
        ${na_mod!==null?`<span class="mono" style="font-size:11px;min-width:40px;text-align:right;color:${na_mod>=60?'#5fa032':'#d94f3d'}">N:${na_mod}</span>`:''}
        <span class="mod-arrow">▶</span>
      </div>
      <div class="mod-body">${unidBody}</div>
    </div>`;
  }).filter(Boolean).join('');
}

