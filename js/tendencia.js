// ─── tendencia.js — Gráficos de tendencia histórica ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// TAB: TENDENCIA
// ═══════════════════════════════════════════════════════════════════════════
function renderTendencia(){
  const byMonth={};
  for(const d of RAW){
    if(!d.fecha) continue;
    const k=`${d.fecha.getFullYear()}-${String(d.fecha.getMonth()+1).padStart(2,'0')}`;
    if(!byMonth[k])byMonth[k]={hrs:0,notas:[],cis:new Set()};
    if(d.asistio){byMonth[k].hrs+=d.hrs;byMonth[k].cis.add(d.ci);}
    if(d.nota!==null)byMonth[k].notas.push(d.nota);
  }
  const months=Object.keys(byMonth).sort();
  const hrsArr=months.map(m=>+(byMonth[m].hrs/(byMonth[m].cis.size||1)).toFixed(1));
  const brigArr=months.map(m=>byMonth[m].cis.size);
  const notaArr=months.map(m=>avg(byMonth[m].notas)?+avg(byMonth[m].notas).toFixed(1):null);

  // Cumplimiento por tipo por mes
  const tipos=['BV-B','BV-M','URE-M','LE'];
  const tipoColors=['#78be44','#2d8cff','#d94f3d','#f0a500'];
  const aggAll=aggregate(RAW);
  const tipoMonthComp={};
  tipos.forEach(t=>{tipoMonthComp[t]={};months.forEach(m=>tipoMonthComp[t][m]={sum:0,cnt:0});});
  for(const[ci,entry] of Object.entries(aggAll)){
    const tipo=PERSONAL[ci]?.tipo_bv; if(!tipo||!tipoMonthComp[tipo]) continue;
    const comp=cumpl(entry.lecs_done,tipo);
    months.forEach(m=>{
      const hasAct=RAW.some(d=>d.ci===ci&&d.fecha&&`${d.fecha.getFullYear()}-${String(d.fecha.getMonth()+1).padStart(2,'0')}`===m&&d.asistio);
      if(hasAct){tipoMonthComp[tipo][m].sum+=comp.pct;tipoMonthComp[tipo][m].cnt++;}
    });
  }

  el('tab-tendencia').innerHTML=`
    <div class="shdr"><div><div class="stitle">Tendencia Temporal</div>
      <div class="ssub">Evolución histórica del programa — datos completos independiente del filtro de período</div></div></div>
    <div class="g2">
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">⏱ Horas promedio por brigadista/mes</span></div>
        <div class="pb"><div class="cw" style="position:relative;height:230px;width:100%"><canvas id="ch-tr-h"></canvas></div></div></div>
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">👥 Brigadistas activos por mes</span></div>
        <div class="pb"><div class="cw" style="position:relative;height:230px;width:100%"><canvas id="ch-tr-b"></canvas></div></div></div>
    </div>
    <div class="panel"><div class="ph"><span class="pt">📈 Cumplimiento del programa por tipo a lo largo del tiempo</span></div>
      <div class="pb"><div class="cw" style="position:relative;height:300px;width:100%"><canvas id="ch-tr-tipo"></canvas></div></div></div>
    <div class="panel"><div class="ph"><span class="pt">📝 Nota promedio mensual</span></div>
      <div class="pb"><div class="cw" style="position:relative;height:180px;width:100%"><canvas id="ch-tr-n"></canvas></div></div></div>`;

  const lo={responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#6b7c82',font:{size:11}}}},
    scales:{x:{grid:{color:'#dde2e4'},ticks:{color:'#6b7c82',maxRotation:45,font:{size:10}}},
            y:{grid:{color:'#dde2e4'},ticks:{color:'#6b7c82'}}}};

  // Force sizes and render after DOM paint
  function forceSizeAndRender(id, w, h){
    const cv=el(id); if(!cv) return;
    if(cv.parentElement) cv.parentElement.style.cssText=`position:relative;height:${h}px;width:100%;display:block`;
    cv.width=w; cv.height=h;
    cv.style.cssText=`display:block;width:100%;height:${h}px`;
  }

  setTimeout(()=>{
    const tabEl=el('tab-tendencia');
    const W=Math.max((tabEl?tabEl.getBoundingClientRect().width:0)||700, 400);
    forceSizeAndRender('ch-tr-h',   Math.round(W-40), 230);
    forceSizeAndRender('ch-tr-tipo',Math.round(W-40), 300);
    forceSizeAndRender('ch-tr-b',   Math.round(W*0.47), 180);
    forceSizeAndRender('ch-tr-n',   Math.round(W*0.47), 180);

    if(el('ch-tr-h')) CHARTS['ch-tr-h']=new Chart(el('ch-tr-h'),{type:'bar',
      data:{labels:months,datasets:[{label:'Hrs/brigadista',data:hrsArr,backgroundColor:'#78be44',borderRadius:3}]},
      options:{...lo,responsive:true,plugins:{legend:{display:false}}}});
    if(el('ch-tr-b')) CHARTS['ch-tr-b']=new Chart(el('ch-tr-b'),{type:'bar',
      data:{labels:months,datasets:[{label:'Brigadistas',data:brigArr,backgroundColor:'#6b7c82',borderRadius:3}]},
      options:{...lo,responsive:true,plugins:{legend:{display:false}}}});
    if(el('ch-tr-n')) CHARTS['ch-tr-n']=new Chart(el('ch-tr-n'),{type:'line',
      data:{labels:months,datasets:[{label:'Nota prom.',data:notaArr,borderColor:'#2d8cff',backgroundColor:'rgba(45,140,255,.1)',tension:.3,fill:true,spanGaps:true,pointRadius:3}]},
      options:{...lo,responsive:true,plugins:{legend:{display:false}},scales:{...lo.scales,y:{...lo.scales.y,min:0,max:100}}}});
    if(el('ch-tr-tipo')) CHARTS['ch-tr-tipo']=new Chart(el('ch-tr-tipo'),{type:'line',
      data:{labels:months,datasets:tipos.map((t,i)=>({
        label:TIPO_LABEL[t]||t,
        data:months.map(m=>tipoMonthComp[t][m].cnt?Math.round(tipoMonthComp[t][m].sum/tipoMonthComp[t][m].cnt):null),
        borderColor:tipoColors[i],tension:.3,fill:false,pointRadius:2,spanGaps:true
      }))},
      options:{...lo,responsive:true,scales:{...lo.scales,y:{...lo.scales.y,min:0,max:100,ticks:{callback:v=>v+'%',color:'#6b7c82'}}}}});
  }, 300);
}

