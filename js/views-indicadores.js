// ─── views-indicadores.js — Indicadores de cumplimiento mensual ──────────────

function renderIndicadoresShell() {
  const org = window._ORG_MAP || buildOrgMapInd();
  const vps  = Object.keys(org).sort();

  // Default start dates
  const defBVB = '2026-03-01';
  const defBVM = '2026-01-01';

  el('tab-indicadores').innerHTML = `
    <div class="shdr"><div>
      <div class="stitle">📈 Indicadores de Capacitación</div>
      <div class="ssub">Cumplimiento de la meta de 4 hrs/mes por brigadista activo, filtrado por organigrama</div>
    </div></div>

    <div style="padding:14px;background:#f4f6f7;border-radius:6px;border:1px solid #dde2e4;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#1a2326;margin-bottom:10px">⚙ Configuración del período</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Inicio capacitaciones BV-B (Nivel Inicial)</span>
          <input type="date" class="tdate" id="ind-inicio-bvb" value="${defBVB}" onchange="renderIndicadores()" style="padding:8px 10px;font-size:13px"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Inicio capacitaciones BV-M (Nivel Medio)</span>
          <input type="date" class="tdate" id="ind-inicio-bvm" value="${defBVM}" onchange="renderIndicadores()" style="padding:8px 10px;font-size:13px"/>
        </div>
      </div>
    </div>

    <div style="padding:14px;background:#f4f6f7;border-radius:6px;border:1px solid #dde2e4;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#1a2326;margin-bottom:10px">🏢 Filtro por organigrama</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Vicepresidencia</span>
          <select class="fsel" id="ind-vp" onchange="onIndVpChange()" style="min-width:240px">
            <option value="">— Todas —</option>
            ${vps.map(v=>`<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Gerencia</span>
          <select class="fsel" id="ind-ger" onchange="onIndGerChange()" style="min-width:200px" disabled>
            <option value="">— Todas —</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Superintendencia</span>
          <select class="fsel" id="ind-sup" onchange="onIndSupChange()" style="min-width:180px" disabled>
            <option value="">— Todas —</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:12px;font-weight:600;color:#6b7c82">Supervisor</span>
          <select class="fsel" id="ind-sv" onchange="renderIndicadores()" style="min-width:160px" disabled>
            <option value="">— Todos —</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="exportIndicadoresPDF()" style="align-self:flex-end">⬇ PDF</button>
      </div>
    </div>

    <div id="ind-content">
      <div class="empty"><div class="ei">📈</div><p>Configurá las fechas de inicio y seleccioná un filtro para ver los indicadores</p></div>
    </div>`;

  renderIndicadores();
}

function buildOrgMapInd() {
  const map = {};
  for (const p of Object.values(PERSONAL)) {
    if (!['BV-B','BV-M','LE'].includes(p.tipo_bv)) continue;
    if (p.estado !== 'Activo') continue;
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

function onIndVpChange() {
  const vp  = el('ind-vp')?.value || '';
  const org = window._ORG_MAP || buildOrgMapInd();
  const selGer = el('ind-ger');
  const selSup = el('ind-sup');
  const selSv  = el('ind-sv');
  selGer.innerHTML = '<option value="">— Todas —</option>';
  selSup.innerHTML = '<option value="">— Todas —</option>';
  selSv.innerHTML  = '<option value="">— Todos —</option>';
  selSup.disabled = true; selSv.disabled = true;
  if (vp) {
    const gers = Object.keys(org[vp]||{}).sort();
    selGer.innerHTML += gers.map(g=>`<option value="${g}">${g}</option>`).join('');
    selGer.disabled = false;
  } else { selGer.disabled = true; }
  renderIndicadores();
}

function onIndGerChange() {
  const vp  = el('ind-vp')?.value  || '';
  const ger = el('ind-ger')?.value || '';
  const org = window._ORG_MAP || buildOrgMapInd();
  const selSup = el('ind-sup'); const selSv = el('ind-sv');
  selSup.innerHTML = '<option value="">— Todas —</option>';
  selSv.innerHTML  = '<option value="">— Todos —</option>';
  selSv.disabled = true;
  if (vp && ger) {
    const sups = Object.keys((org[vp]||{})[ger]||{}).sort();
    selSup.innerHTML += sups.map(s=>`<option value="${s}">${s}</option>`).join('');
    selSup.disabled = false;
  } else { selSup.disabled = true; }
  renderIndicadores();
}

function onIndSupChange() {
  const vp  = el('ind-vp')?.value  || '';
  const ger = el('ind-ger')?.value || '';
  const sup = el('ind-sup')?.value || '';
  const org = window._ORG_MAP || buildOrgMapInd();
  const selSv = el('ind-sv');
  selSv.innerHTML = '<option value="">— Todos —</option>';
  if (vp && ger && sup) {
    const svs = [...(((org[vp]||{})[ger]||{})[sup]||new Set())].sort();
    selSv.innerHTML += svs.map(s=>`<option value="${s}">${s}</option>`).join('');
    selSv.disabled = false;
  } else { selSv.disabled = true; }
  renderIndicadores();
}

// Months elapsed from start date to today (complete months)
function mesesTranscurridos(startDate) {
  const now   = new Date();
  const start = new Date(startDate);
  if (isNaN(start)) return 0;
  let months = (now.getFullYear() - start.getFullYear()) * 12
             + (now.getMonth() - start.getMonth());
  // If we haven't reached the day of the month yet, don't count current month
  // But per requirement: count current month as complete
  months += 1;
  return Math.max(months, 1);
}

function renderIndicadores() {
  const cont = el('ind-content');
  if (!cont) return;

  const inicioBVB = el('ind-inicio-bvb')?.value || '2026-03-01';
  const inicioBVM = el('ind-inicio-bvm')?.value || '2026-01-01';
  const mesesBVB  = mesesTranscurridos(inicioBVB);
  const mesesBVM  = mesesTranscurridos(inicioBVM);
  const metaBVB   = mesesBVB * 4;
  const metaBVM   = mesesBVM * 4;

  const vp  = el('ind-vp')?.value  || '';
  const ger = el('ind-ger')?.value || '';
  const sup = el('ind-sup')?.value || '';
  const sv  = el('ind-sv')?.value  || '';

  // Filter only BV-B and BV-M activos
  const cis = Object.keys(PERSONAL).filter(ci => {
    const p = PERSONAL[ci];
    if (p.estado !== 'Activo') return false;
    if (!['BV-B','BV-M','LE'].includes(p.tipo_bv)) return false;
    if (vp  && p.vp              !== vp)  return false;
    if (ger && p.gerencia         !== ger) return false;
    if (sup && p.superintendencia !== sup) return false;
    if (sv  && p.supervisor       !== sv)  return false;
    return true;
  });

  if (!cis.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">🔍</div><p>Sin brigadistas BV-B/BV-M activos para este filtro</p></div>';
    return;
  }

  const now   = new Date();
  // Current month range
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin    = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
  // Year range
  const anioInicio = new Date(now.getFullYear(), 0, 1);

  const aggTotal = aggregate(RAW.filter(d => cis.includes(d.ci) && d.asistio));
  const aggMes   = aggregate(RAW.filter(d => cis.includes(d.ci) && d.asistio && d.fecha && d.fecha >= mesInicio && d.fecha <= mesFin));
  const aggAnio  = aggregate(RAW.filter(d => cis.includes(d.ci) && d.asistio && d.fecha && d.fecha >= anioInicio));

  // Build profiles
  const profiles = cis.map(ci => {
    const p       = PERSONAL[ci];
    const meta    = p.tipo_bv === 'BV-B' ? metaBVB : metaBVM;
    const meses   = p.tipo_bv === 'BV-B' ? mesesBVB : mesesBVM;
    const hrsMes  = aggMes[ci]?.hrs_real   || 0;
    const hrsAnio = aggAnio[ci]?.hrs_real  || 0;
    const hrsTotal= aggTotal[ci]?.hrs_real || 0;
    const cumplMeta = Math.min(Math.round(hrsTotal / meta * 100), 100);
    const cumplMes  = hrsMes >= 4;
    return { ci, ...p, meta, meses, hrsMes, hrsAnio, hrsTotal, cumplMeta, cumplMes };
  }).sort((a,b) => a.gerencia?.localeCompare(b.gerencia||'')||
                   a.superintendencia?.localeCompare(b.superintendencia||'')||
                   a.nombre?.localeCompare(b.nombre||''));

  // Global KPIs
  const total       = profiles.length;
  const cumplMes    = profiles.filter(p=>p.cumplMes).length;
  const avgCumpl    = Math.round(profiles.reduce((s,p)=>s+p.cumplMeta,0)/total);
  const bajo4mes    = profiles.filter(p=>!p.cumplMes).length;
  const bvbCount    = profiles.filter(p=>p.tipo_bv==='BV-B').length;
  const bvmCount    = profiles.filter(p=>p.tipo_bv==='BV-M').length;
  const leCount     = profiles.filter(p=>p.tipo_bv==='LE').length;
  const breadcrumb  = [vp,ger,sup,sv].filter(Boolean).join(' › ') || 'Todos';
  const mesLabel    = now.toLocaleDateString('es-BO',{month:'long',year:'numeric'});

  // Monthly breakdown — hrs per month per brigadista (for trend table)
  const months = [];
  // Generate months from earliest start to now
  const earliestStart = new Date(Math.min(new Date(inicioBVB), new Date(inicioBVM)));
  let cur = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), 1);
  while (cur <= now) {
    months.push(new Date(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
  }

  // Per-month aggregate
  const monthlyData = months.map(m => {
    const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
    const mEnd   = new Date(m.getFullYear(), m.getMonth()+1, 0, 23, 59, 59);
    const rows   = RAW.filter(d => cis.includes(d.ci) && d.asistio && d.fecha && d.fecha >= mStart && d.fecha <= mEnd);
    const hrsTotal2 = rows.reduce((s,d)=>s+d.hrs,0);
    const activos   = new Set(rows.map(d=>d.ci)).size;
    const meta4     = profiles.length * 4;
    return {
      label: m.toLocaleDateString('es-BO',{month:'short',year:'2-digit'}),
      hrs: +hrsTotal2.toFixed(1),
      activos,
      meta: meta4,
      cumpl: meta4 > 0 ? Math.round(hrsTotal2/meta4*100) : 0
    };
  });

  // Group by superintendencia for summary table
  const bySup = {};
  profiles.forEach(p => {
    const key = p.superintendencia || '—';
    if (!bySup[key]) bySup[key] = {bvb:0, bvm:0, cumplSum:0, hrsMesSum:0, bajo4:0};
    bySup[key][p.tipo_bv==='BV-B'?'bvb':'bvm']++;
    bySup[key].cumplSum  += p.cumplMeta;
    bySup[key].hrsMesSum += p.hrsMes;
    if (!p.cumplMes) bySup[key].bajo4++;
  });

  const supRows = Object.entries(bySup).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>{
    const tot  = v.bvb + v.bvm;
    const avg2 = Math.round(v.cumplSum/tot);
    const sc   = avg2>=80?'#5fa032':avg2>=50?'#f0a500':'#d94f3d';
    return `<tr>
      <td style="font-weight:600">${key}</td>
      <td style="text-align:center">${v.bvb}</td>
      <td style="text-align:center">${v.bvm}</td>
      <td style="text-align:center">${tot}</td>
      <td style="text-align:center;font-weight:700;color:${sc}">${avg2}%</td>
      <td style="text-align:center;font-weight:700;color:${v.bajo4>0?'#d94f3d':'#5fa032'}">${v.bajo4}</td>
      <td style="text-align:center;font-family:Consolas,monospace">${(v.hrsMesSum/tot).toFixed(1)}</td>
    </tr>`;
  }).join('');

  // Individual table
  const detailRows = profiles.map(p => {
    const sc  = cp(p.cumplMeta);
    const hc  = p.cumplMes ? '#5fa032' : '#d94f3d';
    const bar = `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:6px;background:#eee;border-radius:3px">
        <div style="width:${Math.min(p.cumplMeta,100)}%;height:6px;background:${sc};border-radius:3px"></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${sc};min-width:34px">${p.cumplMeta}%</span>
    </div>`;
    return `<tr>
      <td style="font-weight:500">${p.nombre}</td>
      <td>${bdg(p.tipo_bv)}</td>
      <td style="font-size:11px;color:#6b7c82">${p.superintendencia||'—'}</td>
      <td style="font-size:11px;color:#6b7c82">${p.supervisor||'—'}</td>
      <td style="min-width:120px">${bar}</td>
      <td style="text-align:center;font-family:Consolas,monospace">${p.hrsTotal.toFixed(1)} / ${p.meta}</td>
      <td style="text-align:center;font-weight:700;color:${hc};font-family:Consolas,monospace">${p.hrsMes.toFixed(1)}</td>
      <td style="text-align:center;font-family:Consolas,monospace">${p.hrsAnio.toFixed(1)}</td>
    </tr>`;
  }).join('');

  // Monthly trend table
  const trendRows = monthlyData.map(m => {
    const sc = m.cumpl>=80?'#5fa032':m.cumpl>=50?'#f0a500':'#d94f3d';
    const bar = `<div style="width:${Math.min(m.cumpl,100)}%;height:6px;background:${sc};border-radius:3px;min-width:2px"></div>`;
    return `<tr>
      <td style="font-weight:600">${m.label}</td>
      <td style="text-align:center;font-family:Consolas,monospace">${m.hrs}</td>
      <td style="text-align:center">${m.activos}</td>
      <td style="text-align:center;color:#6b7c82">${m.meta}</td>
      <td style="min-width:100px">
        <div style="background:#eee;border-radius:3px;height:6px">${bar}</div>
      </td>
      <td style="text-align:center;font-weight:700;color:${sc}">${m.cumpl}%</td>
    </tr>`;
  }).join('');

  cont.innerHTML = `
    <!-- ── CABECERA EJECUTIVA ─────────────────────────────────────────── -->
    <div style="background:#1e2d32;border-radius:8px;padding:20px 24px;margin-bottom:16px;color:#fff">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:18px;font-weight:700">Indicadores de Capacitación — ${breadcrumb}</div>
        <div style="font-size:12px;color:#a0b4b8">${new Date().toLocaleDateString('es-BO',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div style="font-size:12px;color:#78be44;margin-bottom:16px">
        Meta: <b>4 horas de capacitación por brigadista por mes</b> ·
        BV-B desde ${new Date(inicioBVB).toLocaleDateString('es-BO',{month:'long',year:'numeric'})} (meta acum. ${metaBVB} hrs) ·
        BV-M desde ${new Date(inicioBVM).toLocaleDateString('es-BO',{month:'long',year:'numeric'})} (meta acum. ${metaBVM} hrs)
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        <div style="background:rgba(255,255,255,.08);border-radius:6px;padding:14px 16px">
          <div style="font-size:11px;color:#a0b4b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Brigadistas activos</div>
          <div style="font-size:32px;font-weight:700;margin:4px 0">${total}</div>
          <div style="font-size:11px;color:#a0b4b8">BV-B: ${bvbCount} · BV-M: ${bvmCount}</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:6px;padding:14px 16px">
          <div style="font-size:11px;color:#a0b4b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Cumplimiento promedio</div>
          <div style="font-size:32px;font-weight:700;margin:4px 0;color:${cp(avgCumpl)}">${avgCumpl}%</div>
          <div style="font-size:11px;color:#a0b4b8">sobre la meta acumulada por tipo</div>
        </div>
        <div style="background:rgba(255,255,255,.08);border-radius:6px;padding:14px 16px">
          <div style="font-size:11px;color:#a0b4b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Meta 4 hrs/mes — ${mesLabel}</div>
          <div style="font-size:32px;font-weight:700;margin:4px 0;color:${cumplMes===total?'#78be44':'#f0a500'}">${cumplMes}<span style="font-size:18px;color:#a0b4b8"> / ${total}</span></div>
          <div style="font-size:11px;color:#a0b4b8">brigadistas alcanzaron la meta este mes</div>
        </div>
        <div style="background:rgba(${bajo4mes>0?'217,79,61':'95,160,50'},.2);border:1px solid rgba(${bajo4mes>0?'217,79,61':'95,160,50'},.4);border-radius:6px;padding:14px 16px">
          <div style="font-size:11px;color:#a0b4b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Bajo meta este mes</div>
          <div style="font-size:32px;font-weight:700;margin:4px 0;color:${bajo4mes>0?'#d94f3d':'#78be44'}">${bajo4mes}</div>
          <div style="font-size:11px;color:#a0b4b8">brigadistas con menos de 4 hrs en ${mesLabel}</div>
        </div>
      </div>
    </div>

    <!-- ── TABLA COMPARATIVA POR SUPERINTENDENCIA ─────────────────────── -->
    <div class="panel" style="margin-bottom:16px">
      <div class="ph">
        <span class="pt">🏗 Comparativa por Superintendencia</span>
        <span style="font-size:11px;color:#6b7c82">Los colores indican el nivel de cumplimiento: 🟢 ≥80% · 🟡 50–79% · 🔴 &lt;50%</span>
      </div>
      <div style="overflow-x:auto"><table class="dt">
        <thead><tr>
          <th>Superintendencia</th>
          <th style="text-align:center" title="Brigadistas Nivel Inicial">BV-B</th>
          <th style="text-align:center" title="Brigadistas Nivel Medio">BV-M</th>
          <th style="text-align:center">Total</th>
          <th style="text-align:center" title="Porcentaje promedio de cumplimiento sobre la meta acumulada por tipo de brigadista">Cumpl. acum. ↑</th>
          <th style="text-align:center" title="Brigadistas que completaron 4 hrs durante ${mesLabel}">Meta mes ✓</th>
          <th style="text-align:center" title="Brigadistas que NO alcanzaron 4 hrs en ${mesLabel}">Bajo meta ⚠</th>
          <th style="text-align:center" title="Promedio de horas por brigadista durante ${mesLabel}">Hrs/brig. mes</th>
        </tr></thead>
        <tbody>${Object.entries(bySup).sort(([a],[b])=>a.localeCompare(b)).map(([key,v],idx)=>{
          const tot2=v.bvb+v.bvm;
          const avg2=Math.round(v.cumplSum/tot2);
          const cumplMes2=tot2-v.bajo4;
          const sc=avg2>=80?'#5fa032':avg2>=50?'#f0a500':'#d94f3d';
          const dot=avg2>=80?'🟢':avg2>=50?'🟡':'🔴';
          return `<tr>
            <td style="font-weight:600">${dot} ${key}</td>
            <td style="text-align:center">${v.bvb}</td>
            <td style="text-align:center">${v.bvm}</td>
            <td style="text-align:center;font-weight:700">${tot2}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                <div style="width:50px;height:6px;background:#eee;border-radius:3px">
                  <div style="width:${Math.min(avg2,100)}%;height:6px;background:${sc};border-radius:3px"></div>
                </div>
                <span style="font-weight:700;color:${sc};min-width:34px">${avg2}%</span>
              </div>
            </td>
            <td style="text-align:center;font-weight:700;color:#5fa032">${cumplMes2}</td>
            <td style="text-align:center;font-weight:700;color:${v.bajo4>0?'#d94f3d':'#5fa032'}">${v.bajo4}</td>
            <td style="text-align:center;font-family:Consolas,monospace">${(v.hrsMesSum/tot2).toFixed(1)}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr style="background:#f4f6f7;font-weight:700">
          <td>TOTAL</td>
          <td style="text-align:center">${bvbCount}</td>
          <td style="text-align:center">${bvmCount}</td>
          <td style="text-align:center">${total}</td>
          <td style="text-align:center;color:${cp(avgCumpl)}">${avgCumpl}%</td>
          <td style="text-align:center;color:#5fa032">${cumplMes}</td>
          <td style="text-align:center;color:${bajo4mes>0?'#d94f3d':'#5fa032'}">${bajo4mes}</td>
          <td style="text-align:center;font-family:Consolas,monospace">${(profiles.reduce((s,p)=>s+p.hrsMes,0)/total).toFixed(1)}</td>
        </tr></tfoot>
      </table></div>
      <div style="padding:10px 16px;font-size:11px;color:#6b7c82;border-top:1px solid #dde2e4;line-height:1.6">
        <b>Cumpl. acum.</b>: horas completadas desde el inicio del programa ÷ meta total acumulada (BV-B: ${metaBVB} hrs en ${mesesBVB} meses · BV-M: ${metaBVM} hrs en ${mesesBVM} meses) ·
        <b>Meta mes</b>: brigadistas que completaron ≥ 4 hrs durante ${mesLabel} ·
        <b>Hrs/brig. mes</b>: promedio de horas por brigadista en ${mesLabel}
      </div>
    </div>

    <div class="kg" style="margin-bottom:14px">
      <div class="kpi"><div class="kl">Total brigadistas</div>
        <div class="kv">${total}</div>
        <div class="ks">BV-B: ${bvbCount} · BV-M: ${bvmCount}</div></div>
      <div class="kpi"><div class="kl">Cumpl. meta acumulada</div>
        <div class="kv" style="color:${cp(avgCumpl)}">${avgCumpl}%</div>
        <div class="ks">promedio sobre meta por tipo</div></div>
      <div class="kpi"><div class="kl">Cumplieron 4 hrs este mes</div>
        <div class="kv" style="color:${cumplMes===total?'#5fa032':'#d94f3d'}">${cumplMes}/${total}</div>
        <div class="ks">${mesLabel}</div></div>
      <div class="kpi"><div class="kl">Bajo meta este mes</div>
        <div class="kv" style="color:${bajo4mes>0?'#d94f3d':'#5fa032'}">${bajo4mes}</div>
        <div class="ks">menos de 4 hrs en ${mesLabel}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="panel" style="margin:0">
        <div class="ph"><span class="pt">📅 Meta acumulada por tipo</span></div>
        <div class="pb">
          <table class="dt">
            <thead><tr><th>Tipo</th><th>Inicio</th><th>Meses</th><th>Meta acum.</th><th>4 hrs/mes</th></tr></thead>
            <tbody>
              <tr><td>${bdg('BV-B')}</td><td>${new Date(inicioBVB).toLocaleDateString('es-BO',{month:'long',year:'numeric'})}</td>
                <td style="text-align:center;font-weight:700">${mesesBVB}</td>
                <td style="text-align:center;font-weight:700;color:#78be44">${metaBVB} hrs</td>
                <td style="text-align:center;color:#6b7c82">× 4 hrs/mes</td></tr>
              <tr><td>${bdg('BV-M')}</td><td>${new Date(inicioBVM).toLocaleDateString('es-BO',{month:'long',year:'numeric'})}</td>
                <td style="text-align:center;font-weight:700">${mesesBVM}</td>
                <td style="text-align:center;font-weight:700;color:#78be44">${metaBVM} hrs</td>
                <td style="text-align:center;color:#6b7c82">× 4 hrs/mes</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel" style="margin:0">
        <div class="ph"><span class="pt">🏗 Resumen por Superintendencia</span></div>
        <div style="overflow-x:auto"><table class="dt">
          <thead><tr><th>Superintendencia</th><th style="text-align:center">BV-B</th><th style="text-align:center">BV-M</th>
            <th style="text-align:center">Total</th><th style="text-align:center">Cumpl.</th>
            <th style="text-align:center">Bajo meta</th><th style="text-align:center">Hrs/mes prom.</th></tr></thead>
          <tbody>${supRows}</tbody>
        </table></div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:14px">
      <div class="ph"><span class="pt">📆 Avance mensual — ${breadcrumb}</span></div>
      <div style="overflow-x:auto"><table class="dt">
        <thead><tr><th>Mes</th><th style="text-align:center">Hrs totales</th>
          <th style="text-align:center">Brigadistas activos</th>
          <th style="text-align:center">Meta (${total}×4)</th>
          <th>Progreso</th><th style="text-align:center">Cumpl.</th></tr></thead>
        <tbody>${trendRows}</tbody>
      </table></div>
    </div>

    <div class="panel">
      <div class="ph"><span class="pt">👥 Detalle individual — ${breadcrumb}</span></div>
      <div style="overflow-x:auto"><table class="dt">
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Superintendencia</th><th>Supervisor</th>
          <th>Cumpl. acumulado</th><th style="text-align:center">Hrs / Meta</th>
          <th style="text-align:center">Hrs este mes</th>
          <th style="text-align:center">Hrs este año</th></tr></thead>
        <tbody>${detailRows}</tbody>
      </table></div>
    </div>`;

  // Store for PDF export
  window._IND_DATA = { profiles, monthlyData, bySup, metaBVB, metaBVM,
    mesesBVB, mesesBVM, inicioBVB, inicioBVM, breadcrumb, mesLabel,
    total, cumplMes, avgCumpl, bajo4mes, bvbCount, bvmCount };
}

async function exportIndicadoresPDF() {
  const d = window._IND_DATA;
  if (!d) { toast('Generá los indicadores primero'); return; }
  toast('⏳ Generando PDF...');
  await new Promise(r=>setTimeout(r,100));

  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const PW=210,PH=297,ML=14,MR=14,UW=PW-ML-MR;
  let y=0,pn=1;
  const fecha = new Date().toLocaleDateString('es-BO',{year:'numeric',month:'long',day:'numeric'});

  function hdr(){
    pdf.setFillColor(30,45,50);pdf.rect(0,0,PW,16,'F');
    pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text('INDICADORES DE CAPACITACIÓN — BRIGADAS VOLUNTARIAS MSC',PW/2,7,{align:'center'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);
    pdf.text('INSEIN SRL · Seguridad Industrial · Mina San Cristóbal',PW/2,12,{align:'center'});
    pdf.setFillColor(120,190,68);pdf.rect(0,16,PW,5,'F');
    pdf.setTextColor(255,255,255);pdf.setFontSize(7.5);pdf.setFont('helvetica','bold');
    pdf.text(d.breadcrumb,ML,19.5);
    pdf.text('Generado: '+fecha,PW-MR,19.5,{align:'right'});
    return 27;
  }
  function ftr(){
    pdf.setFillColor(245,247,248);pdf.rect(0,PH-8,PW,8,'F');
    pdf.setDrawColor(200,205,208);pdf.setLineWidth(0.3);pdf.line(0,PH-8,PW,PH-8);
    pdf.setTextColor(150,150,150);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
    pdf.text('INSEIN SRL · Sistema de Gestión de Capacitación',ML,PH-3);
    pdf.text('Pág. '+pn,PW-MR,PH-3,{align:'right'});
  }
  function chk(y2,need){if(y2+(need||20)>PH-12){ftr();pdf.addPage();pn++;y2=hdr();}return y2;}
  function sem(pct){return pct>=80?[95,160,50]:pct>=50?[240,165,0]:[217,79,61];}

  y=hdr();

  // KPIs
  const kpis=[
    {l:'BRIGADISTAS',v:String(d.total),s:`BV-B:${d.bvbCount} BV-M:${d.bvmCount}`},
    {l:'CUMPL. PROMEDIO',v:d.avgCumpl+'%',vc:sem(d.avgCumpl)},
    {l:'META 4 HRS/MES',v:`${d.cumplMes}/${d.total}`,vc:d.cumplMes===d.total?[95,160,50]:[217,79,61],s:d.mesLabel},
    {l:'BAJO META',v:String(d.bajo4mes),vc:d.bajo4mes>0?[217,79,61]:[95,160,50],s:'este mes'},
  ];
  const kw=UW/4;
  kpis.forEach((k,i)=>{
    const x=ML+i*kw;
    pdf.setFillColor(255,255,255);pdf.setDrawColor(220,225,228);pdf.setLineWidth(0.4);
    pdf.roundedRect(x+1,y,kw-2,22,2,2,'FD');
    pdf.setFillColor(120,190,68);pdf.rect(x+1,y,3,22,'F');
    pdf.setTextColor(107,124,130);pdf.setFont('helvetica','normal');pdf.setFontSize(6.5);
    pdf.text(k.l,x+6,y+5);
    const vc=k.vc||[26,35,38];
    pdf.setTextColor(vc[0],vc[1],vc[2]);pdf.setFont('helvetica','bold');pdf.setFontSize(16);
    pdf.text(k.v,x+6,y+15);
    if(k.s){pdf.setFont('helvetica','normal');pdf.setFontSize(6);pdf.setTextColor(107,124,130);pdf.text(k.s,x+6,y+20);}
  });
  y+=26;

  // Meta table
  y=chk(y,30);
  pdf.setFillColor(240,244,246);pdf.rect(ML,y,UW,8,'F');
  pdf.setFillColor(120,190,68);pdf.rect(ML,y,3,8,'F');
  pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
  pdf.text('META ACUMULADA POR TIPO',ML+6,y+5.5);y+=11;
  ['BV-B','BV-M'].forEach((tipo,i)=>{
    const inicio=i===0?d.inicioBVB:d.inicioBVM;
    const meses=i===0?d.mesesBVB:d.mesesBVM;
    const meta=i===0?d.metaBVB:d.metaBVM;
    if(i%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML,y,UW,8,'F');}
    pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(60,120,30);
    pdf.text(tipo,ML+2,y+5);
    pdf.setFont('helvetica','normal');pdf.setTextColor(26,35,38);
    pdf.text('Inicio: '+new Date(inicio).toLocaleDateString('es-BO',{month:'long',year:'numeric'}),ML+20,y+5);
    pdf.text(meses+' meses transcurridos',ML+80,y+5);
    pdf.setFont('helvetica','bold');pdf.setTextColor(120,190,68);
    pdf.text('Meta: '+meta+' hrs',ML+150,y+5);
    y+=8;
  });y+=4;

  // Monthly trend
  y=chk(y,14);
  pdf.setFillColor(240,244,246);pdf.rect(ML,y,UW,8,'F');
  pdf.setFillColor(120,190,68);pdf.rect(ML,y,3,8,'F');
  pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
  pdf.text('AVANCE MENSUAL',ML+6,y+5.5);y+=11;
  pdf.setFillColor(235,240,242);pdf.rect(ML,y,UW,7,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.setTextColor(80,90,95);
  pdf.text('Mes',ML+2,y+4.5);pdf.text('Hrs totales',ML+30,y+4.5);
  pdf.text('Brigadistas',ML+60,y+4.5);pdf.text('Meta',ML+90,y+4.5);
  pdf.text('Cumplimiento',ML+110,y+4.5);y+=8;

  d.monthlyData.forEach((m,idx)=>{
    y=chk(y,8);
    if(idx%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML,y,UW,8,'F');}
    const sc=sem(m.cumpl);
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
    pdf.text(m.label,ML+2,y+4.5);
    pdf.text(String(m.hrs),ML+30,y+4.5);
    pdf.text(String(m.activos),ML+60,y+4.5);
    pdf.text(String(m.meta),ML+90,y+4.5);
    // Bar
    const barW=40,barX=ML+110;
    pdf.setFillColor(220,225,228);pdf.roundedRect(barX,y+2,barW,4,1,1,'F');
    pdf.setFillColor(sc[0],sc[1],sc[2]);pdf.roundedRect(barX,y+2,barW*Math.min(m.cumpl,100)/100,4,1,1,'F');
    pdf.setTextColor(sc[0],sc[1],sc[2]);pdf.setFont('helvetica','bold');
    pdf.text(m.cumpl+'%',barX+barW+2,y+4.5);
    y+=8;
  });y+=4;

  // Summary by superintendencia
  y=chk(y,14);
  pdf.setFillColor(240,244,246);pdf.rect(ML,y,UW,8,'F');
  pdf.setFillColor(120,190,68);pdf.rect(ML,y,3,8,'F');
  pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
  pdf.text('RESUMEN POR SUPERINTENDENCIA',ML+6,y+5.5);y+=11;
  pdf.setFillColor(235,240,242);pdf.rect(ML,y,UW,7,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.setTextColor(80,90,95);
  pdf.text('Superintendencia',ML+2,y+4.5);pdf.text('BV-B',ML+70,y+4.5);
  pdf.text('BV-M',ML+82,y+4.5);pdf.text('Total',ML+94,y+4.5);
  pdf.text('Cumpl.',ML+108,y+4.5);pdf.text('Bajo meta',ML+126,y+4.5);
  pdf.text('Hrs/mes prom.',ML+150,y+4.5);y+=8;

  Object.entries(d.bySup).sort(([a],[b])=>a.localeCompare(b)).forEach(([key,v],idx)=>{
    y=chk(y,8);
    if(idx%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML,y,UW,8,'F');}
    const tot=v.bvb+v.bvm;
    const avg2=Math.round(v.cumplSum/tot);
    const sc=sem(avg2);
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
    pdf.text(key.substring(0,28),ML+2,y+4.5);
    pdf.text(String(v.bvb),ML+70,y+4.5);pdf.text(String(v.bvm),ML+82,y+4.5);
    pdf.text(String(tot),ML+94,y+4.5);
    pdf.setTextColor(sc[0],sc[1],sc[2]);pdf.setFont('helvetica','bold');
    pdf.text(avg2+'%',ML+108,y+4.5);
    pdf.setTextColor(v.bajo4>0?217:95,v.bajo4>0?79:160,v.bajo4>0?61:50);
    pdf.text(String(v.bajo4),ML+126,y+4.5);
    pdf.setTextColor(26,35,38);pdf.setFont('helvetica','normal');
    pdf.text((v.hrsMesSum/tot).toFixed(1),ML+150,y+4.5);
    y+=8;
  });y+=4;

  // Individual detail
  y=chk(y,14);
  pdf.setFillColor(240,244,246);pdf.rect(ML,y,UW,8,'F');
  pdf.setFillColor(120,190,68);pdf.rect(ML,y,3,8,'F');
  pdf.setTextColor(26,35,38);pdf.setFont('helvetica','bold');pdf.setFontSize(9);
  pdf.text('DETALLE INDIVIDUAL',ML+6,y+5.5);y+=11;
  pdf.setFillColor(235,240,242);pdf.rect(ML,y,UW,7,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.setTextColor(80,90,95);
  pdf.text('Nombre',ML+2,y+4.5);pdf.text('Tipo',ML+60,y+4.5);
  pdf.text('Cumpl.',ML+74,y+4.5);pdf.text('Hrs/Meta',ML+92,y+4.5);
  pdf.text('Mes actual',ML+115,y+4.5);pdf.text('Este año',ML+140,y+4.5);
  pdf.text('Superintendencia',ML+158,y+4.5);y+=8;

  d.profiles.forEach((p,idx)=>{
    y=chk(y,8);
    if(idx%2===0){pdf.setFillColor(252,253,253);pdf.rect(ML,y,UW,8,'F');}
    const sc=sem(p.cumplMeta);
    const hc=p.cumplMes?[95,160,50]:[217,79,61];
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(26,35,38);
    pdf.text((p.nombre||'').substring(0,22),ML+2,y+4.5);
    pdf.setTextColor(60,120,30);pdf.setFont('helvetica','bold');pdf.setFontSize(6.5);
    pdf.text(p.tipo_bv||'',ML+60,y+4.5);
    pdf.setTextColor(sc[0],sc[1],sc[2]);pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);
    pdf.text(p.cumplMeta+'%',ML+74,y+4.5);
    pdf.setTextColor(26,35,38);pdf.setFont('helvetica','normal');
    pdf.text(p.hrsTotal.toFixed(1)+'/'+p.meta,ML+92,y+4.5);
    pdf.setTextColor(hc[0],hc[1],hc[2]);pdf.setFont('helvetica','bold');
    pdf.text(p.hrsMes.toFixed(1),ML+115,y+4.5);
    pdf.setTextColor(26,35,38);pdf.setFont('helvetica','normal');
    pdf.text(p.hrsAnio.toFixed(1),ML+140,y+4.5);
    pdf.text((p.superintendencia||'').substring(0,20),ML+158,y+4.5);
    y+=8;
  });

  // Signature
  y=chk(y,30);y+=8;
  pdf.setDrawColor(180,185,190);pdf.setLineWidth(0.5);
  pdf.line(ML,y+18,ML+55,y+18);
  pdf.line(PW/2-27,y+18,PW/2+27,y+18);
  pdf.line(PW-MR-55,y+18,PW-MR,y+18);
  pdf.setTextColor(107,124,130);pdf.setFont('helvetica','normal');pdf.setFontSize(7);
  pdf.text('Jefe de Seguridad Industrial',ML,y+22);
  pdf.text('Responsable del Área',PW/2,y+22,{align:'center'});
  pdf.text('Vicepresidencia / Gerencia',PW-MR,y+22,{align:'right'});

  ftr();
  pdf.save('Indicadores-'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('✓ PDF generado');
}
