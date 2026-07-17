// ─── exports.js — Exportación PDF (plan semanal e individual) ──────────────
// ═══════════════════════════════════════════════════════════════════════════
// PDF MODAL
// ═══════════════════════════════════════════════════════════════════════════
function openPdfModal(){el('pdf-modal').style.display='flex';}
function closePdfModal(){el('pdf-modal').style.display='none';}

async function generateSelectedPDF(){
  closePdfModal();
  const chks={
    individual:el('pdf-chk-individual')?.checked,
    grupo:el('pdf-chk-grupo')?.checked,
    bvb:el('pdf-chk-bvb')?.checked,
    bvm:el('pdf-chk-bvm')?.checked,
    ure:el('pdf-chk-ure')?.checked,
    le:el('pdf-chk-le')?.checked,
    tendencia:el('pdf-chk-tendencia')?.checked,
  };
  const selected=Object.entries(chks).filter(([,v])=>v).map(([k])=>k);
  if(!selected.length){toast('Seleccioná al menos una sección');openPdfModal();return;}
  toast('⏳ Generando PDF...');
  await new Promise(r=>setTimeout(r,200));

  const{jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const PW=210,PH=297,ML=18,MR=18,UW=PW-ML-MR;
  let pn=1;
  const LOGO='/*LOGO*/';

  function hdr(p){
    pdf.setFillColor(120,190,68);pdf.rect(0,0,PW,16,'F');
    try{pdf.addImage('data:image/png;base64,'+LOGO,'PNG',ML,2,38,12);}catch(e){}
    pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
    pdf.text('BRIGADAS VOLUNTARIAS · MSC · INSEIN SRL',PW-MR,7.5,{align:'right'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
    pdf.text('Período: '+periodLabel(),PW-MR,12,{align:'right'});
    pdf.setFillColor(107,124,130);pdf.rect(0,16,PW,6,'F');
    pdf.setTextColor(255,255,255);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
    pdf.text('Generado: '+new Date().toLocaleString('es-BO'),ML,20.5);
    if(p>1)pdf.text('Pág. '+p,PW/2,20.5,{align:'center'});
    return 28;
  }
  function ftr(){
    pdf.setFillColor(245,247,248);pdf.rect(0,PH-10,PW,10,'F');
    pdf.setDrawColor(220,220,220);pdf.setLineWidth(0.3);pdf.line(0,PH-10,PW,PH-10);
    pdf.setTextColor(150,150,150);pdf.setFontSize(7);pdf.setFont('helvetica','normal');
    pdf.text('INSEIN SRL – Seguridad Industrial',ML,PH-4);
    pdf.text('Documento confidencial generado automáticamente',PW-MR,PH-4,{align:'right'});
  }
  function secT(title,y){
    pdf.setFillColor(245,247,248);pdf.rect(ML,y,UW,8,'F');
    pdf.setFillColor(120,190,68);pdf.rect(ML,y,3,8,'F');
    pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text(title,ML+7,y+5.5);return y+12;
  }
  function kRow(items,y){
    const w=UW/items.length;
    items.forEach((it,i)=>{
      const x=ML+i*w;
      pdf.setFillColor(255,255,255);pdf.setDrawColor(220,225,228);pdf.setLineWidth(0.4);
      pdf.roundedRect(x+1,y,w-2,18,2,2,'FD');
      pdf.setFillColor(120,190,68);pdf.rect(x+1,y,3,18,'F');
      pdf.setTextColor(107,124,130);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
      pdf.text(String(it.label).toUpperCase(),x+7,y+5.5);
      pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(14);
      pdf.text(String(it.value),x+7,y+13);
    });return y+22;
  }
  function ibox(text,y){
    const lines=pdf.splitTextToSize('>> '+text,UW-8);
    const bh=lines.length*4.5+6;
    pdf.setFillColor(232,245,220);pdf.setDrawColor(120,190,68);pdf.setLineWidth(0.5);
    pdf.roundedRect(ML,y,UW,bh,2,2,'FD');
    pdf.setTextColor(60,90,40);pdf.setFont('helvetica','italic');pdf.setFontSize(8);
    pdf.text(lines,ML+4,y+5);return y+bh+4;
  }
  function chkP(y,need){
    if(y+(need||40)>PH-14){ftr();pdf.addPage();pn++;y=hdr(pn);}return y;
  }
  async function cImg(id){
    const o=document.getElementById(id);
    if(!o||o.width===0||o.height===0)return null;
    try{
      const c=document.createElement('canvas');
      c.width=Math.max(o.width,1);c.height=Math.max(o.height,1);
      const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);
      x.drawImage(o,0,0);return c.toDataURL('image/png');
    }catch(e){console.warn('cImg failed for',id,e);return null;}
  }
  function addC(img,lbl,y,h){
    h=h||58;if(!img)return y;
    pdf.setTextColor(107,124,130);pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);
    pdf.text(lbl,ML,y+3.5);pdf.addImage(img,'PNG',ML,y+5,UW,h);return y+h+9;
  }
  function modTable(tipo,agg,y){
    const col=TIPO_COL[tipo]||'hrs_BVM';
    const appMods=getModulos(tipo);
    const allLecsDone=agg?.lecs_done||new Set();
    pdf.setFillColor(245,247,248);pdf.rect(ML,y,UW,7,'F');
    pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(107,124,130);
    pdf.text('Módulo',ML+2,y+4.5);pdf.text('Cumplimiento',ML+80,y+4.5);pdf.text('Hrs',ML+115,y+4.5);pdf.text('Estado',ML+140,y+4.5);
    y+=8;
    appMods.forEach((m,idx)=>{
      y=chkP(y,9);
      const comp=cumplMod(m,allLecsDone,tipo);
      if(comp.na)return;
      if(idx%2===0){pdf.setFillColor(250,252,248);pdf.rect(ML,y-1,UW,8,'F');}
      const tema=PROGRAMA.find(l=>l.modulo===m)?.tema_mod||'';
      pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
      pdf.text(`${m.replace('MODULO','M')} ${tema}`.substring(0,42),ML+2,y+4);
      const rgb=comp.pct>=80?[60,140,40]:comp.pct>=50?[180,120,0]:[180,60,50];
      pdf.setTextColor(...rgb);pdf.setFont('helvetica','bold');
      pdf.text(comp.pct+'%',ML+80,y+4);
      pdf.setTextColor(26,35,38);pdf.setFont('helvetica','normal');
      pdf.text(`${f1(comp.hrs_done)}/${f1(comp.hrs_req)} hr`,ML+115,y+4);
      const st=comp.pct>=100?'COMPLETO':comp.pct>0?'PARCIAL':'PENDIENTE';
      const stc=comp.pct>=100?[60,140,40]:comp.pct>0?[180,120,0]:[180,60,50];
      pdf.setFillColor(...stc);pdf.roundedRect(ML+138,y+0.5,28,5.5,1,1,'F');
      pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(6.5);
      pdf.text(st,ML+152,y+4.2,{align:'center'});
      y+=8;
    });
    return y;
  }

  let y=hdr(pn);let first=true;

  for(const sec of selected){
    if(!first){ftr();pdf.addPage();pn++;y=hdr(pn);}
    first=false;

    if(sec==='individual'){
      const detEl=el('pdet');
      if(!detEl?.innerHTML.trim()){y=ibox('No hay brigadista seleccionado. Abrí la sección Brigadista, buscá uno y volvé a generar el reporte.',y);continue;}
      const pName=detEl.querySelector('.p-name')?.textContent||'—';
      const pCI=detEl.querySelector('.pm b')?.textContent||'—';
      const tipo_i=Object.keys(PERSONAL).find(ci=>PERSONAL[ci].nombre===pName)&&PERSONAL[Object.keys(PERSONAL).find(ci=>PERSONAL[ci].nombre===pName)]?.tipo_bv||'';
      const stats=detEl.querySelectorAll('.ps');
      y=secT('Reporte Individual — '+pName,y);
      pdf.setTextColor(107,124,130);pdf.setFont('helvetica','normal');pdf.setFontSize(8);
      const prof2=PERSONAL[pCI]||{};
      pdf.text(`CI: ${pCI} | ${prof2.area_2||prof2.area||''} | Grupo: ${prof2.grupo||'—'} | ${bdgTxt(tipo_i)}`,ML,y);y+=7;
      const kits=Array.from(stats).slice(0,4).map(s=>({label:s.querySelector('.psl')?.textContent||'',value:s.querySelector('.psv')?.textContent||'—'}));
      if(kits.length)y=kRow(kits,y);
      const cp_n=parseInt(kits[0]?.value||'0');
      y=ibox(`Brigadista ${pName} — cumplimiento ${cp_n}% del programa de capacitación. `+(cp_n>=80?'Cumplimiento satisfactorio.':cp_n>=50?'En progreso, requiere continuar capacitaciones pendientes.':'Cumplimiento bajo, requiere atención prioritaria.'),y);
      y=chkP(y,80);
      const i1=await cImg('ch-pi-c'),i2=await cImg('ch-pi-n');
      if(i1||i2){
        pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(107,124,130);
        if(i1){pdf.text('% Cumplimiento por módulo',ML,y+3);pdf.addImage(i1,'PNG',ML,y+5,UW*.48,52);}
        if(i2){pdf.text('Nota promedio por módulo',ML+UW*.52,y+3);pdf.addImage(i2,'PNG',ML+UW*.52,y+5,UW*.48,52);}
        y+=60;
      }
      y=ibox('Cumplimiento por módulo: porcentaje de horas completadas sobre las horas requeridas para este tipo. Nota: promedio de calificaciones obtenidas en evaluaciones del módulo.',y);
      if(tipo_i){
        y=chkP(y,50);y=secT('Detalle por módulo — '+tipo_i,y);
        const agg_i=aggregate(fd().filter(d=>d.ci===pCI));
        const entry_i=agg_i[pCI]||{lecs_done:new Set()};
        y=modTable(tipo_i,entry_i,y);
      }
    }

    else if(sec==='grupo'){
      const fA2=el('f-area2')?.value??'',fG=el('f-grupo')?.value??'';
      const label=[fA2,fG].filter(Boolean).join(' → ')||'Todos los grupos';
      y=secT('Reporte de Grupo — '+label,y);
      const kpis=Array.from(el('gcontent')?.querySelectorAll('.kpi')||[]).slice(0,3).map(k=>({
        label:k.querySelector('.kl')?.textContent||'',value:k.querySelector('.kv')?.textContent||'—'
      }));
      if(kpis.length)y=kRow(kpis,y);
      const avgC=parseInt(kpis.find(k=>k.label.toLowerCase().includes('cumpl'))?.value||'0');
      const best=el('gcontent')?.querySelector('.rc.top .rcn')?.textContent||'—';
      const bv=el('gcontent')?.querySelector('.rc.top .rcv')?.textContent||'—';
      const worst=el('gcontent')?.querySelector('.rc.bot .rcn')?.textContent||'—';
      const wv=el('gcontent')?.querySelector('.rc.bot .rcv')?.textContent||'—';
      y=ibox(`Grupo ${label} — cumplimiento promedio ${avgC}%. Mayor: ${best} (${bv}). Menor: ${worst} (${wv}). `+(avgC>=80?'Grupo con desempeño satisfactorio.':avgC>=50?'Grupo en progreso.':'Grupo requiere atención en capacitaciones.'),y);
      y=chkP(y,75);
      const gi=await cImg('ch-gm');
      if(gi)y=addC(gi,'Cumplimiento promedio por módulo del grupo',y,58);
      y=ibox('Cada barra muestra el porcentaje promedio de cumplimiento del grupo en ese módulo, calculado en base a las horas requeridas para cada tipo de brigadista.',y);
      // Table
      y=chkP(y,50);y=secT('Detalle individual del grupo',y);
      const tRows=el('gcontent')?.querySelectorAll('.dt tbody tr:not([id])');
      if(tRows?.length){
        pdf.setFillColor(245,247,248);pdf.rect(ML,y,UW,7,'F');
        pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.setTextColor(107,124,130);
        ['Nombre','CI','Tipo','Cumpl.','Hrs','Nota','Mód. OK'].forEach((h2,i)=>{
          pdf.text(h2,ML+[0,55,78,95,112,130,148][i],y+4.5);});y+=8;
        Array.from(tRows).forEach((row,idx)=>{
          y=chkP(y,9);
          const cells=row.querySelectorAll('td');
          if(cells.length<7)return;
          if(idx%2===0){pdf.setFillColor(250,252,248);pdf.rect(ML,y-1,UW,8,'F');}
          pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(26,35,38);
          [cells[0],cells[1],cells[2],cells[3],cells[5],cells[6],cells[7]].forEach((c,i)=>{
            if(c)try{pdf.text(c.textContent.trim().substring(0,18),ML+[0,55,78,95,112,130,148][i],y+4);}catch{}});y+=8;
        });
      }
    }

    else if(['bvb','bvm','ure','le'].includes(sec)){
      const tipoMap={bvb:'BV-B',bvm:'BV-M',ure:'URE-M',le:'LE'};
      const tipo=tipoMap[sec],label=TIPO_LABEL[tipo]||tipo;
      const tabEl=el('tab-'+sec);
      y=secT(`Reporte ${label} (${tipo}) — ${periodLabel()}`,y);
      const kpis2=Array.from(tabEl?.querySelectorAll('.kpi')||[]).slice(0,5).map(k=>({
        label:k.querySelector('.kl')?.textContent||'',value:k.querySelector('.kv')?.textContent||'—'
      }));
      if(kpis2.length)y=kRow(kpis2.slice(0,4),y);
      const avgC2=parseInt(kpis2.find(k=>k.label.toLowerCase().includes('programa'))?.value||'0');
      const b=tabEl?.querySelector('.rc.top .rcn')?.textContent||'—';
      const bv2=tabEl?.querySelector('.rc.top .rcv')?.textContent||'—';
      const w=tabEl?.querySelector('.rc.bot .rcn')?.textContent||'—';
      const wv2=tabEl?.querySelector('.rc.bot .rcv')?.textContent||'—';
      y=ibox(`${label} — cumplimiento promedio del programa: ${avgC2}%. Mayor cumplimiento: ${b} (${bv2}). Menor: ${w} (${wv2}).`,y);
      y=chkP(y,80);
      const ni=await cImg('ch-nv-c'),nd=await cImg('ch-nv-dist');
      if(ni||nd){
        pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(107,124,130);
        if(ni){pdf.text(`Cumplimiento por módulo — ${tipo}`,ML,y+3);pdf.addImage(ni,'PNG',ML,y+5,UW*.56,55);}
        if(nd){pdf.text('Distribución de notas',ML+UW*.6,y+3);pdf.addImage(nd,'PNG',ML+UW*.6,y+5,UW*.4,55);}
        y+=64;
      }
      y=ibox('Cumplimiento: porcentaje promedio del grupo de brigadistas en cada módulo, calculado en base a las horas requeridas para el tipo '+tipo+'. La distribución de notas clasifica las calificaciones obtenidas en rangos.',y);
      // Module summary table
      y=chkP(y,50);y=secT('Resumen de cumplimiento por módulo — '+tipo,y);
      const filtRows2=fd().filter(d=>Object.keys(PERSONAL).filter(ci=>PERSONAL[ci].tipo_bv===tipo).includes(d.ci));
      const agg2=aggregate(filtRows2);
      // Aggregate all lecs_done for group
      const allLecsDone=new Set();
      Object.values(agg2).forEach(e=>e.lecs_done.forEach(k=>allLecsDone.add(k)));
      // Use per-person averages instead
      const cis2=Object.keys(PERSONAL).filter(ci=>PERSONAL[ci].tipo_bv===tipo);
      const profiles2=cis2.map(ci=>({lecs_done:(agg2[ci]||{lecs_done:new Set()}).lecs_done}));
      const col=TIPO_COL[tipo]||'hrs_BVM';
      const appMods2=getModulos(tipo);
      pdf.setFillColor(245,247,248);pdf.rect(ML,y,UW,7,'F');
      pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(107,124,130);
      pdf.text('Módulo',ML+2,y+4.5);pdf.text('Cumpl. prom.',ML+90,y+4.5);pdf.text('Pendientes',ML+135,y+4.5);
      y+=8;
      appMods2.forEach((m,idx)=>{
        y=chkP(y,9);
        const avg_pct=Math.round(profiles2.reduce((s,p)=>s+cumplMod(m,p.lecs_done,tipo).pct,0)/profiles2.length);
        const pend_cnt=profiles2.filter(p=>cumplMod(m,p.lecs_done,tipo).pct<100).length;
        if(idx%2===0){pdf.setFillColor(250,252,248);pdf.rect(ML,y-1,UW,8,'F');}
        const tema=PROGRAMA.find(l=>l.modulo===m)?.tema_mod||'';
        pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
        pdf.text(`${m.replace('MODULO','M')} ${tema}`.substring(0,45),ML+2,y+4);
        const rgb=avg_pct>=80?[60,140,40]:avg_pct>=50?[180,120,0]:[180,60,50];
        pdf.setTextColor(...rgb);pdf.setFont('helvetica','bold');pdf.text(avg_pct+'%',ML+90,y+4);
        pdf.setTextColor(...(pend_cnt>0?[180,60,50]:[60,140,40]));pdf.text(`${pend_cnt} brigadistas`,ML+135,y+4);
        y+=8;
      });
    }

    else if(sec==='tendencia'){
      y=secT('Análisis de Tendencia Temporal — Historial completo',y);
      y=ibox('Este reporte analiza la evolución histórica del programa de capacitación. Los gráficos muestran la progresión del cumplimiento, las horas de capacitación y las notas obtenidas a lo largo del tiempo, permitiendo identificar tendencias de mejora o deterioro.',y);
      const tCharts=[
        {id:'ch-tr-h',lbl:'Promedio de horas por brigadista activo/mes',h:52,
         txt:'Muestra la evolución de las horas promedio de capacitación por brigadista activo en cada mes. Picos indican meses con mayor intensidad de capacitación.'},
        {id:'ch-tr-tipo',lbl:'Cumplimiento del programa por tipo de brigadista a lo largo del tiempo',h:60,
         txt:'Compara la evolución del cumplimiento acumulado entre tipos de brigadistas. Permite identificar qué grupo mantiene mejor progresión histórica.'},
      ];
      for(const ch of tCharts){
        y=chkP(y,80);
        const img=await cImg(ch.id);
        if(img)y=addC(img,ch.lbl,y,ch.h);
        y=ibox(ch.txt,y);
      }
    }
  }

  ftr();
  pdf.save(`INSEIN-Brigadas-reporte-${new Date().toISOString().slice(0,10)}.pdf`);
  toast('✓ Reporte PDF generado');
}

function bdgTxt(t){return TIPO_LABEL[t]||t||'Sin clasificar';}

