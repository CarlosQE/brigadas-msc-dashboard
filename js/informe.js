// ─── informe.js — Informe mensual y exportación PDF/Word ───────────────────
// ═══════════════════════════════════════════════════════════════════════════
// TAB: INFORME MENSUAL
// ═══════════════════════════════════════════════════════════════════════════
function renderInforme(){
  destroyCharts(['ch-inf-avance','ch-inf-grupos','ch-inf-tipos','ch-inf-lecs']);
  const now = new Date();
  const thisMonth = now.getFullYear()*100 + (now.getMonth()+1);
  const lastMonth = now.getMonth()===0
    ? (now.getFullYear()-1)*100+12
    : now.getFullYear()*100+now.getMonth();

  function monthKey(d){ return d.getFullYear()*100+(d.getMonth()+1); }
  function monthLabel(ym){
    const y=Math.floor(ym/100), m=ym%100;
    return new Date(y,m-1,1).toLocaleDateString('es-BO',{month:'long',year:'numeric'});
  }

  // Get all available months
  const allMonths = [...new Set(RAW.filter(d=>d.fecha).map(d=>monthKey(d.fecha)))].sort();
  const latestMonth = allMonths[allMonths.length-1]||thisMonth;
  const prevMonth   = allMonths[allMonths.length-2]||latestMonth;

  // Only active brigadistas
  const activeCis = Object.keys(PERSONAL).filter(ci=>PERSONAL[ci].estado==='Activo');

  // Filter rows for each period
  const rowsThis = RAW.filter(d=>d.fecha&&monthKey(d.fecha)===latestMonth&&activeCis.includes(d.ci)&&d.asistio);
  const rowsPrev = RAW.filter(d=>d.fecha&&monthKey(d.fecha)===prevMonth&&activeCis.includes(d.ci)&&d.asistio);

  // KPIs for current month
  const cisThis = new Set(rowsThis.map(d=>d.ci));
  const cisPrev = new Set(rowsPrev.map(d=>d.ci));
  const hrsThis = rowsThis.reduce((s,d)=>s+d.hrs,0);
  const hrsPrev = rowsPrev.reduce((s,d)=>s+d.hrs,0);
  const lecsThis = new Set(rowsThis.filter(d=>d.lecKey).map(d=>d.lecKey));
  const lecsPrev = new Set(rowsPrev.filter(d=>d.lecKey).map(d=>d.lecKey));

  // Lecciones nuevas (completed this month that weren't done before)
  const aggPrev = aggregate(RAW.filter(d=>d.fecha&&monthKey(d.fecha)<latestMonth&&d.asistio));
  const lecsNuevas = [...lecsThis].filter(k=>{
    return ![...cisPrev].some(ci=>(aggPrev[ci]?.lecs_done||new Set()).has(k));
  });

  // By group (area_2)
  const byGrupo = {};
  rowsThis.forEach(d=>{
    const p=PERSONAL[d.ci]; if(!p) return;
    const g=p.area_2||p.area||'Sin área';
    if(!byGrupo[g]) byGrupo[g]={hrs:0,cis:new Set(),lecs:new Set()};
    byGrupo[g].hrs+=d.hrs; byGrupo[g].cis.add(d.ci);
    if(d.lecKey) byGrupo[g].lecs.add(d.lecKey);
  });

  // By tipo
  const byTipo = {};
  ['BV-B','BV-M','LE','URE-M'].forEach(t=>{
    const rows=rowsThis.filter(d=>PERSONAL[d.ci]?.tipo_bv===t);
    byTipo[t]={hrs:rows.reduce((s,d)=>s+d.hrs,0), cis:new Set(rows.map(d=>d.ci))};
  });

  // Monthly trend (last 6 months)
  const last6 = allMonths.slice(-6);
  const trendData = last6.map(m=>{
    const r=RAW.filter(d=>d.fecha&&monthKey(d.fecha)===m&&activeCis.includes(d.ci)&&d.asistio);
    return{m, hrs:r.reduce((s,d)=>s+d.hrs,0), cis:new Set(r.map(d=>d.ci)).size, lecs:new Set(r.filter(d=>d.lecKey).map(d=>d.lecKey)).size};
  });

  // Modules advanced this month
  const modsThis = {};
  rowsThis.filter(d=>d.lecKey).forEach(d=>{
    const lec=LEC_LOOKUP[d.lecKey]; if(!lec) return;
    if(!modsThis[lec.modulo]) modsThis[lec.modulo]={tema:lec.tema_mod, lecs:new Set(), hrs:0};
    modsThis[lec.modulo].lecs.add(d.lecKey); modsThis[lec.modulo].hrs+=d.hrs;
  });

  // Delta indicators
  function delta(a,b){
    if(!b) return '';
    const d=Math.round(((a-b)/b)*100);
    const color=d>=0?'#5fa032':'#d94f3d';
    return `<span style="font-size:12px;font-weight:600;color:${color}">${d>=0?'+':''}${d}% vs mes anterior</span>`;
  }

  el('tab-informe').innerHTML=`
    <div class="shdr"><div>
      <div class="stitle">📊 Informe Mensual de Capacitación</div>
      <div class="ssub">Período actual: <b>${monthLabel(latestMonth)}</b> · Comparado con: ${monthLabel(prevMonth)}</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="exportInformePDF()">⬇ PDF</button>
      <button class="btn btn-ghost" onclick="exportInformeWord()">⬇ Word</button>
    </div></div>

    <div class="kg">
      <div class="kpi"><div class="kl">Brigadistas capacitados</div>
        <div class="kv">${cisThis.size}</div>
        <div class="ks">${delta(cisThis.size,cisPrev.size)} · ${cisPrev.size} mes anterior</div></div>
      <div class="kpi"><div class="kl">Horas de capacitación</div>
        <div class="kv">${hrsThis.toFixed(1)}</div>
        <div class="ks">${delta(hrsThis,hrsPrev)} · ${hrsPrev.toFixed(1)} mes anterior</div></div>
      <div class="kpi"><div class="kl">Lecciones dictadas</div>
        <div class="kv">${lecsThis.size}</div>
        <div class="ks">${delta(lecsThis.size,lecsPrev.size)} · ${lecsPrev.size} mes anterior</div></div>
      <div class="kpi"><div class="kl">Módulos con avance</div>
        <div class="kv">${Object.keys(modsThis).length}</div>
        <div class="ks">en ${monthLabel(latestMonth)}</div></div>
    </div>

    <div class="g2">
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">📈 Tendencia últimos 6 meses — Horas</span></div>
        <div class="pb"><div style="position:relative;height:200px;width:100%"><canvas id="ch-inf-avance"></canvas></div></div></div>
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">👥 Brigadistas activos por mes</span></div>
        <div class="pb"><div style="position:relative;height:200px;width:100%"><canvas id="ch-inf-tipos"></canvas></div></div></div>
    </div>
    <div class="g2" style="margin-top:14px">
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">🏢 Horas por área de trabajo — ${monthLabel(latestMonth)}</span></div>
        <div class="pb"><div style="position:relative;height:220px;width:100%"><canvas id="ch-inf-grupos"></canvas></div></div></div>
      <div class="panel" style="margin:0"><div class="ph"><span class="pt">📚 Lecciones dictadas por tipo — ${monthLabel(latestMonth)}</span></div>
        <div class="pb"><div style="position:relative;height:220px;width:100%"><canvas id="ch-inf-lecs"></canvas></div></div></div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="ph"><span class="pt">📋 Módulos y lecciones avanzadas en ${monthLabel(latestMonth)}</span></div>
      <div style="overflow-x:auto"><table class="dt">
        <thead><tr><th>Módulo</th><th>Lecciones dictadas</th><th>Horas</th></tr></thead>
        <tbody>${Object.entries(modsThis).sort((a,b)=>b[1].hrs-a[1].hrs).map(([mod,data])=>`<tr>
          <td><span class="mono">${mod.replace('MODULO','M')}</span> — ${data.tema}</td>
          <td style="font-size:12px">${[...data.lecs].map(k=>{const l=LEC_LOOKUP[k];return l?`<span style="background:#e8f5e0;color:#5fa032;border:1px solid rgba(120,190,68,.3);border-radius:4px;padding:1px 6px;font-size:10px;font-family:Consolas,monospace;margin:1px;display:inline-block">${l.leccion.replace('LECCION','L')}</span>`:''}).join('')}</td>
          <td class="mono">${data.hrs.toFixed(1)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>

    <div class="g2" style="margin-top:14px">
      <div class="panel" style="margin:0">
        <div class="ph"><span class="pt">🏆 Mayor avance este mes</span></div>
        <div class="pb"><div style="max-height:200px;overflow-y:auto">
          ${[...cisThis].map(ci=>({ci,nombre:PERSONAL[ci]?.nombre||ci,
            hrs:rowsThis.filter(d=>d.ci===ci).reduce((s,d)=>s+d.hrs,0),
            lecs:new Set(rowsThis.filter(d=>d.ci===ci&&d.lecKey).map(d=>d.lecKey)).size}))
            .sort((a,b)=>b.hrs-a.hrs).slice(0,10)
            .map((b,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #dde2e4">
              <span style="font-size:11px;font-weight:700;color:#6b7c82;min-width:20px">${i+1}</span>
              <span style="flex:1;font-size:13px">${b.nombre}</span>
              <span style="font-family:Consolas,monospace;font-size:12px;color:#5fa032;font-weight:600">${b.hrs.toFixed(1)}h</span>
              <span style="font-size:11px;color:#6b7c82">${b.lecs} lec.</span>
            </div>`).join('')}
        </div></div>
      </div>
      <div class="panel" style="margin:0">
        <div class="ph"><span class="pt">📊 Comparativa ${monthLabel(prevMonth)} vs ${monthLabel(latestMonth)}</span></div>
        <div class="pb">
          <table class="dt"><thead><tr><th>Indicador</th><th>${monthLabel(prevMonth)}</th><th>${monthLabel(latestMonth)}</th><th>Variación</th></tr></thead>
          <tbody>
            <tr><td>Brigadistas</td><td class="mono">${cisPrev.size}</td><td class="mono">${cisThis.size}</td>
              <td class="mono" style="color:${cisThis.size>=cisPrev.size?'#5fa032':'#d94f3d'}">${cisThis.size-cisPrev.size>=0?'+':''}${cisThis.size-cisPrev.size}</td></tr>
            <tr><td>Horas totales</td><td class="mono">${hrsPrev.toFixed(1)}</td><td class="mono">${hrsThis.toFixed(1)}</td>
              <td class="mono" style="color:${hrsThis>=hrsPrev?'#5fa032':'#d94f3d'}">${(hrsThis-hrsPrev)>=0?'+':''}${(hrsThis-hrsPrev).toFixed(1)}</td></tr>
            <tr><td>Lecciones dictadas</td><td class="mono">${lecsPrev.size}</td><td class="mono">${lecsThis.size}</td>
              <td class="mono" style="color:${lecsThis.size>=lecsPrev.size?'#5fa032':'#d94f3d'}">${lecsThis.size-lecsPrev.size>=0?'+':''}${lecsThis.size-lecsPrev.size}</td></tr>
          </tbody></table>
        </div>
      </div>
    </div>`;

  // Charts
  setTimeout(()=>{
    const tabEl=el('tab-informe');
    const W=Math.max(tabEl?tabEl.getBoundingClientRect().width:0,600);

    function makeC(id,h){
      const cv=document.getElementById(id); if(!cv)return null;
      if(cv.parentElement){cv.parentElement.style.cssText=`position:relative;height:${h}px;width:100%;display:block`;}
      cv.setAttribute('width',String(Math.round(W*0.47))); cv.setAttribute('height',String(h));
      return cv;
    }

    const lo={responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#1a2326',font:{size:11}}}},
      scales:{x:{grid:{color:'#dde2e4'},ticks:{color:'#6b7c82',font:{size:10}}},
              y:{grid:{color:'#dde2e4'},ticks:{color:'#6b7c82'}}}};

    const cvA=makeC('ch-inf-avance',200);
    if(cvA) CHARTS['ch-inf-avance']=new Chart(cvA,{type:'bar',
      data:{labels:trendData.map(d=>monthLabel(d.m).split(' ')[0].substring(0,3)+' '+String(d.m).slice(0,4)),
            datasets:[{label:'Horas',data:trendData.map(d=>+d.hrs.toFixed(1)),backgroundColor:'#78be44',borderRadius:3}]},
      options:{...lo,plugins:{legend:{display:false}}}});

    const cvT=makeC('ch-inf-tipos',200);
    if(cvT) CHARTS['ch-inf-tipos']=new Chart(cvT,{type:'bar',
      data:{labels:trendData.map(d=>monthLabel(d.m).split(' ')[0].substring(0,3)),
            datasets:[{label:'Brigadistas',data:trendData.map(d=>d.cis),backgroundColor:'#2d8cff',borderRadius:3}]},
      options:{...lo,plugins:{legend:{display:false}}}});

    const grupos=Object.entries(byGrupo).sort((a,b)=>b[1].hrs-a[1].hrs).slice(0,8);
    const cvG=makeC('ch-inf-grupos',220);
    if(cvG) CHARTS['ch-inf-grupos']=new Chart(cvG,{type:'bar',
      data:{labels:grupos.map(([g])=>g.substring(0,18)),
            datasets:[{data:grupos.map(([,v])=>+v.hrs.toFixed(1)),
              backgroundColor:grupos.map((_,i)=>['#78be44','#2d8cff','#f0a500','#d94f3d','#8b5cf6','#06b6d4','#84cc16','#f59e0b'][i%8]),borderRadius:3}]},
      options:{...lo,plugins:{legend:{display:false}}}});

    const tiposArr=Object.entries(byTipo).filter(([,v])=>v.cis.size>0);
    const cvL=makeC('ch-inf-lecs',220);
    if(cvL) CHARTS['ch-inf-lecs']=new Chart(cvL,{type:'doughnut',
      data:{labels:tiposArr.map(([t])=>TIPO_LABEL[t]||t),
            datasets:[{data:tiposArr.map(([,v])=>v.cis.size),
              backgroundColor:['#78be44','#2d8cff','#f0a500','#d94f3d'],borderWidth:2,borderColor:'#fff'}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'50%',
        plugins:{legend:{position:'bottom',labels:{color:'#1a2326',font:{size:11},padding:8,boxWidth:12}}}}});
  },400);
}

async function exportInformePDF(){
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const PW=210,PH=297,ML=18,MR=18,UW=PW-ML-MR;
  let y=0, pn=1;
  const fecha=new Date().toLocaleDateString('es-BO',{year:'numeric',month:'long',day:'numeric'});

  function hdr2(){
    pdf.setFillColor(120,190,68);pdf.rect(0,0,PW,14,'F');
    pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text('INFORME MENSUAL DE CAPACITACIÓN — BRIGADAS VOLUNTARIAS MSC',PW/2,9,{align:'center'});
    pdf.setFillColor(61,71,74);pdf.rect(0,14,PW,7,'F');
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);
    pdf.text('Generado: '+fecha,ML,18.5);
    pdf.text('INSEIN SRL — Seguridad Industrial',PW-MR,18.5,{align:'right'});
    return 26;
  }
  function ftr2(){
    pdf.setFillColor(245,247,248);pdf.rect(0,PH-9,PW,9,'F');
    pdf.setDrawColor(220,220,220);pdf.setLineWidth(0.3);pdf.line(0,PH-9,PW,PH-9);
    pdf.setTextColor(150,150,150);pdf.setFontSize(7);
    pdf.text('INSEIN SRL · Documento confidencial',ML,PH-3.5);
    pdf.text('Pág. '+pn,PW-MR,PH-3.5,{align:'right'});
  }
  function chk2(y2,need){if(y2+(need||30)>PH-12){ftr2();pdf.addPage();pn++;y2=hdr2();}return y2;}
  function secT2(title,y2){
    pdf.setFillColor(245,247,248);pdf.rect(ML,y2,UW,8,'F');
    pdf.setFillColor(120,190,68);pdf.rect(ML,y2,3,8,'F');
    pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text(title,ML+7,y2+5.5);return y2+12;
  }

  y=hdr2();

  // KPIs from DOM
  const kpis=Array.from(el('tab-informe')?.querySelectorAll('.kpi')||[]).map(k=>({
    label:k.querySelector('.kl')?.textContent||'', value:k.querySelector('.kv')?.textContent||'—',
    sub:k.querySelector('.ks')?.textContent||''
  }));
  if(kpis.length){
    const w=UW/Math.min(kpis.length,4);
    kpis.slice(0,4).forEach((it,i)=>{
      const x=ML+i*w;
      pdf.setFillColor(255,255,255);pdf.setDrawColor(220,225,228);pdf.setLineWidth(0.4);
      pdf.roundedRect(x+1,y,w-2,20,2,2,'FD');
      pdf.setFillColor(120,190,68);pdf.rect(x+1,y,3,20,'F');
      pdf.setTextColor(107,124,130);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
      pdf.text(String(it.label).toUpperCase(),x+7,y+5.5);
      pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(16);
      pdf.text(String(it.value),x+7,y+14);
      pdf.setTextColor(107,124,130);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
      const sub=it.sub.replace(/[^\x00-\x7f]/g,'').trim();
      if(sub)pdf.text(sub.substring(0,30),x+7,y+18.5);
    });
    y+=24;
  }

  // Charts
  y=chk2(y,130);
  y=secT2('Evolución mensual y comparativa',y);
  const ci1=await cImgInforme('ch-inf-avance');
  const ci2=await cImgInforme('ch-inf-tipos');
  if(ci1){pdf.text('Horas de capacitación',ML,y+3);pdf.addImage(ci1,'PNG',ML,y+5,UW*0.48,55);}
  if(ci2){pdf.text('Brigadistas activos',ML+UW*0.52,y+3);pdf.addImage(ci2,'PNG',ML+UW*0.52,y+5,UW*0.48,55);}
  y+=64;

  const ci3=await cImgInforme('ch-inf-grupos');
  const ci4=await cImgInforme('ch-inf-lecs');
  y=chk2(y,70);
  if(ci3){pdf.text('Horas por área de trabajo',ML,y+3);pdf.addImage(ci3,'PNG',ML,y+5,UW*0.56,58);}
  if(ci4){pdf.text('Brigadistas por tipo',ML+UW*0.6,y+3);pdf.addImage(ci4,'PNG',ML+UW*0.6,y+5,UW*0.4,58);}
  y+=68;

  // Comparativa table
  y=chk2(y,50);
  y=secT2('Comparativa mes anterior vs mes actual',y);
  const tabRows=el('tab-informe')?.querySelectorAll('.dt tbody tr');
  if(tabRows){
    pdf.setFillColor(245,247,248);pdf.rect(ML,y,UW,7,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(107,124,130);
    pdf.text('Indicador',ML+2,y+4.5);pdf.text('Mes anterior',ML+80,y+4.5);pdf.text('Mes actual',ML+120,y+4.5);pdf.text('Variación',ML+160,y+4.5);
    y+=8;
    Array.from(tabRows).forEach((row,idx)=>{
      y=chk2(y,8);
      const cells=row.querySelectorAll('td');
      if(cells.length<4)return;
      if(idx%2===0){pdf.setFillColor(250,252,248);pdf.rect(ML,y-1,UW,8,'F');}
      pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
      pdf.text(cells[0].textContent.trim(),ML+2,y+4);
      pdf.text(cells[1].textContent.trim(),ML+80,y+4);
      pdf.text(cells[2].textContent.trim(),ML+120,y+4);
      const v=parseFloat(cells[3].textContent);
      pdf.setTextColor(...(v>=0?[60,140,40]:[180,60,50]));
      pdf.setFont('helvetica','bold');
      pdf.text(cells[3].textContent.trim(),ML+160,y+4);
      y+=8;
    });
  }

  ftr2();
  pdf.save(`Informe-Mensual-${new Date().toISOString().slice(0,7)}.pdf`);
  toast('✓ Informe PDF generado');
}

async function cImgInforme(id){
  const o=document.getElementById(id);
  if(!o||o.width===0||o.height===0)return null;
  try{
    const c=document.createElement('canvas');
    c.width=Math.max(o.width,1);c.height=Math.max(o.height,1);
    const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);
    x.drawImage(o,0,0);return c.toDataURL('image/png');
  }catch(e){return null;}
}

async function exportInformeWord(){
  toast('⏳ Generando Word...');
  await new Promise(r=>setTimeout(r,100));
  try{
    const {Document,Packer,Paragraph,Table,TableRow,TableCell,TextRun,HeadingLevel,
           AlignmentType,BorderStyle,WidthType,ShadingType}=window.docx;
          
    const fecha=new Date().toLocaleDateString('es-BO',{year:'numeric',month:'long',day:'numeric'});
    const kpis=Array.from(el('tab-informe')?.querySelectorAll('.kpi')||[]).map(k=>({
      label:k.querySelector('.kl')?.textContent||'',value:k.querySelector('.kv')?.textContent||'—',
      sub:k.querySelector('.ks')?.textContent||''
    }));

    const greenColor='2E7D32';
    const headerShading={type:ShadingType.SOLID,color:'78BE44',fill:'78BE44'};
    const rowShading={type:ShadingType.SOLID,color:'F4F6F7',fill:'F4F6F7'};

    function hCell(text){return new TableCell({children:[new Paragraph({children:[new TextRun({text,bold:true,color:'FFFFFF',size:18})],alignment:AlignmentType.CENTER})],shading:headerShading,margins:{top:80,bottom:80,left:100,right:100}});}
    function dCell(text,bold=false,color='1A2326'){return new TableCell({children:[new Paragraph({children:[new TextRun({text:String(text),bold,color,size:16})],alignment:AlignmentType.LEFT})],margins:{top:60,bottom:60,left:100,right:100}});}

    const sections=[{children:[
      new Paragraph({children:[new TextRun({text:'INFORME MENSUAL DE CAPACITACIÓN',bold:true,size:28,color:greenColor})],heading:HeadingLevel.TITLE,alignment:AlignmentType.CENTER,spacing:{after:200}}),
      new Paragraph({children:[new TextRun({text:'Brigadas Voluntarias — Mina San Cristóbal',size:22,color:'555555'})],alignment:AlignmentType.CENTER,spacing:{after:100}}),
      new Paragraph({children:[new TextRun({text:'INSEIN SRL · '+fecha,size:18,color:'777777'})],alignment:AlignmentType.CENTER,spacing:{after:400}}),

      // KPI section title
      new Paragraph({children:[new TextRun({text:'INDICADORES DEL PERÍODO',bold:true,size:22,color:greenColor})],spacing:{before:200,after:200}}),

      // KPI table
      new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
        new TableRow({children:kpis.slice(0,4).map(k=>hCell(k.label.toUpperCase()))}),
        new TableRow({children:kpis.slice(0,4).map(k=>new TableCell({
          children:[
            new Paragraph({children:[new TextRun({text:k.value,bold:true,size:36,color:greenColor})],alignment:AlignmentType.CENTER}),
            new Paragraph({children:[new TextRun({text:k.sub.replace(/[^\x00-\x7f]/g,'').trim().substring(0,40),size:14,color:'777777'})],alignment:AlignmentType.CENTER})
          ],margins:{top:100,bottom:100,left:100,right:100}
        }))}),
      ],margins:{top:0,bottom:0}}),

      new Paragraph({text:'',spacing:{after:300}}),

      // Comparativa
      new Paragraph({children:[new TextRun({text:'COMPARATIVA MENSUAL',bold:true,size:22,color:greenColor})],spacing:{before:200,after:200}}),
      ...((()=>{
        const rows=Array.from(el('tab-informe')?.querySelectorAll('.dt tbody tr')||[]);
        if(!rows.length)return[];
        const tableRows=[
          new TableRow({children:[hCell('Indicador'),hCell('Mes Anterior'),hCell('Mes Actual'),hCell('Variación')]})
        ];
        rows.forEach((row,idx)=>{
          const cells=row.querySelectorAll('td');
          if(cells.length<4)return;
          const v=parseFloat(cells[3].textContent)||0;
          const shading=idx%2===0?rowShading:undefined;
          tableRows.push(new TableRow({children:[
            dCell(cells[0].textContent.trim()),
            dCell(cells[1].textContent.trim()),
            dCell(cells[2].textContent.trim()),
            dCell(cells[3].textContent.trim(),true,v>=0?'2E7D32':'C62828')
          ]}));
        });
        return[new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:tableRows})];
      })()),

      new Paragraph({text:'',spacing:{after:300}}),
      new Paragraph({children:[new TextRun({text:'Documento generado automáticamente por el Sistema de Gestión de Capacitación — INSEIN SRL',size:14,color:'999999',italics:true})],alignment:AlignmentType.CENTER})
    ]}];

    const doc=new Document({sections,title:'Informe Mensual Capacitación',creator:'INSEIN SRL'});
    const blob=await Packer.toBlob(doc);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`Informe-Mensual-${new Date().toISOString().slice(0,7)}.docx`;
    a.click();URL.revokeObjectURL(url);
    toast('✓ Informe Word generado');
  }catch(e){console.error(e);toast('Error generando Word: '+e.message);}
}


