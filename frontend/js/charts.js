/* ─────────────────────────────────────────────────────────────────
   charts.js — All Plotly chart rendering functions.

   Every chart in the dashboard has one function here.
   They are organised by page — search for the section comment
   to jump to the charts for any page:

     PAGE 1: OVERVIEW        chartOutcomes, chartVehicles,
                             renderLayerBars, renderCollLog
     PAGE 2: AIRSPACE        chartSpatial, renderConflictNodes
     PAGE 3: SAFETY          chartSeverity, chartVehHits,
                             chartBatCrash, chartLayerVehicleHeatmap,
                             chartCollTiming, chartDistHist, chartDistBox
     PAGE 4: FLEET           chartBatKDE, chartEffScatter, chartBatDrain,
                             chartReroutingOverhead, chartBatReserveByLayer,
                             renderVehSummary
     PAGE 5: TEMPORAL        chartTimeline, chartRolling,
                             chartDurBox, chartFleetDensity
     PAGE 6: DISTRIBUTIONS   chartBatStatesKDE, chartEffVeh, chartBatDist
     PAGE 7: MULTI-TRIAL     renderTrialTable, chartTrialComp, chartTrialColl
     PAGE: PREDICTIVE RISK   chartRiskScatter, chartFeatureImportance,
                             chartRiskTiers, chartCumSeverity,
                             chartEventHeatmap, renderEscalationTable,
                             chartVehicleRadar
     PAGE: TRIAL INTEL       renderTrialTable, chartTrialComp,
                             chartCumSeverity, chartEventHeatmap

   Key helpers at the top of this file:
     const C          design token colours — change here to retheme all charts
     const STATUS_C   colour per flight status
     baseLayout(h)    standard Plotly layout using the C tokens
     safePlot(id, traces, layout)
                      wraps Plotly.newPlot() — if it throws, it renders
                      the error message in the div instead of failing silently

   To add a new chart:
     1. Write  function chartMyThing(elId, data) { safePlot(elId, ...) }
     2. Call it from the relevant renderXxx() in app.js
     3. Add a <div id="..."> in the right page panel in index.html
     4. Return the data from the relevant route in main.py
───────────────────────────────────────────────────────────────────── */

/* charts.js — All Plotly chart rendering functions */

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:'rgba(0,0,0,0)', plot:'#040e1a', border:'#082030',
  text:'#1a5570', white:'#e8f8ff',
  safety:'#ff4400', fleet:'#00b4dc', temporal:'#ffaa00',
  stat:'#00ff99', multi:'#8855ff', spatial:'#00ffcc',
  palette:['#00b4dc','#00ff99','#ffaa00','#ff4400','#8855ff','#00ffcc','#ff6b1a'],
};
const STATUS_C = {
  'Complete':'#00ff99','Incomplete — Battery':'#8855ff',
  'Collision — Node to Node':'#ff4400','Collision — Proximity':'#ff6b1a',
  'Cancelled — In-flight':'#ffaa00','Cancelled — Pre-flight':'#1a5570',
};
const VEH_C = {quad:'#00b4dc',hexa:'#00ff99',octa:'#ffaa00',vtol:'#8855ff',fixed_wing:'#ff4400'};
const TYPE_C = {Direct:'#ff4400',Proximity:'#ff6b1a','Near Miss':'#ffaa00'};
const SEV_C  = {Critical:'#ff4400',Major:'#ff6b1a',Minor:'#ffaa00','Near Miss':'#00b4dc'};
const LAYER_C= {1:'#00b4dc',2:'#00ff99',3:'#ffaa00',4:'#8855ff'};

// ── Base layout ───────────────────────────────────────────────────────────────
function baseLayout(h=300, extra={}) {
  return {
    height:h, paper_bgcolor:C.bg, plot_bgcolor:C.plot,
    font:{family:'JetBrains Mono, monospace', color:C.text, size:10},
    margin:{l:48,r:16,t:28,b:40},
    xaxis:{gridcolor:C.border,linecolor:C.border,zerolinecolor:C.border,tickfont:{size:9,color:C.text}},
    yaxis:{gridcolor:C.border,linecolor:C.border,zerolinecolor:C.border,tickfont:{size:9,color:C.text}},
    legend:{bgcolor:'rgba(0,0,0,0)',bordercolor:C.border,borderwidth:1,font:{size:9,color:C.text}},
    hoverlabel:{bgcolor:C.plot,bordercolor:C.border,font:{family:'JetBrains Mono, monospace',size:10,color:C.white}},
    colorway:C.palette,
    ...extra
  };
}
const PC = {responsive:true, displayModeBar:false};

// Safe Plotly wrapper - shows error in div instead of silent blank
function safePlot(elId, traces, layout) {
  try {
    Plotly.newPlot(elId, traces, layout, {responsive:true, displayModeBar:false});
  } catch(e) {
    console.error('[safePlot:'+elId+']', e);
    const el = document.getElementById(elId);
    if (el) el.innerHTML = '<div style="font-family:monospace;font-size:11px;'+
      'color:#e05252;padding:12px;background:#0e1520">'+
      'Chart error: '+e.message+'</div>';
  }
}

// ── PAGE 1: OVERVIEW ──────────────────────────────────────────────────────────

function chartOutcomes(elId, data) {
  const colors = data.statuses.map(s => STATUS_C[s] || C.text);
  safePlot(elId, [{
    type:'bar', orientation:'h',
    x:data.counts, y:data.statuses,
    marker:{color:colors},
    text:data.pcts.map((p,i)=>`  ${data.counts[i]}  (${p}%)`),
    textposition:'outside',
    textfont:{family:'IBM Plex Mono',size:9,color:C.white},
    hovertemplate:'<b>%{y}</b><br>Count: %{x}<extra></extra>',
  }], {...baseLayout(300), margin:{l:200,r:70,t:24,b:24},
    xaxis:{...baseLayout().xaxis,showgrid:false,showticklabels:false,range:[0,Math.max(...data.counts)*1.3]},
    yaxis:{...baseLayout().yaxis,tickfont:{size:9,color:C.text}},
    bargap:0.3,
  });
}

function chartVehicles(elId, vehicles) {
  const labels = Object.keys(vehicles);
  const vals   = Object.values(vehicles);
  safePlot(elId, [{
    type:'bar', x:labels, y:vals,
    marker:{color:labels.map(v=>VEH_C[v]||C.text)},
    text:vals, textposition:'outside',
    textfont:{family:'IBM Plex Mono',size:10,color:C.white},
    showlegend:false,
    hovertemplate:'<b>%{x}</b><br>Count: %{y}<extra></extra>',
  }], {...baseLayout(240),margin:{l:20,r:20,t:20,b:40}});
}

function renderLayerBars(elId, layers, total) {
  const el = document.getElementById(elId);
  if (!el) return;
  const alts = {1:0,2:50,3:100,4:150};
  el.innerHTML = [1,2,3,4].map(ln => {
    const cnt = layers[ln] || 0;
    const pct = total ? Math.round(cnt/total*100) : 0;
    const col = LAYER_C[ln];
    return `<div class="layer-bar-item">
      <div class="layer-bar-label">L${ln} · ${alts[ln]}m</div>
      <div class="layer-bar-track"><div class="layer-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <div class="layer-bar-count" style="color:${col}">${cnt}</div>
      <div class="layer-bar-pct">${pct}%</div>
    </div>`;
  }).join('');
}

function renderCollLog(elId, rows) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--stat);padding:1rem">No collision events.</div>';
    return;
  }
  const heads = ['Run','Tick','Type','Severity','Drone A','Drone B','Veh A','Veh B','X','Y','Layer'];
  const keys  = ['path_run','tick','type','severity','drone_a','drone_b','veh_a','veh_b','x','y','layer'];
  const thead = `<tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const tbody = rows.map(r=>{
    const typeCol = TYPE_C[r.type]||C.text;
    return `<tr>
      <td>${r.path_run??'—'}</td><td>${r.tick??'—'}</td>
      <td style="color:${typeCol}">${r.type}</td>
      <td style="color:${SEV_C[r.severity]||C.text}">${r.severity}</td>
      <td>${r.drone_a}</td><td>${r.drone_b}</td>
      <td>${r.veh_a}</td><td>${r.veh_b}</td>
      <td>${r.x??'—'}</td><td>${r.y??'—'}</td><td>${r.layer??'—'}</td></tr>`;
  }).join('');
  el.innerHTML = `<table class="utm-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ── PAGE 2: AIRSPACE ─────────────────────────────────────────────────────────

function chartSpatial(elId, data, layerFilter, viewMode) {
  const traces = [];
  for (let v=0; v<=50; v+=10) {
    traces.push({type:'scatter',x:[v,v],y:[0,50],mode:'lines',
      line:{color:C.border,width:0.5},showlegend:false,hoverinfo:'skip'});
    traces.push({type:'scatter',x:[0,50],y:[v,v],mode:'lines',
      line:{color:C.border,width:0.5},showlegend:false,hoverinfo:'skip'});
  }
  const activeConflicts = layerFilter === 'all'
    ? data.conflicts
    : data.conflicts.filter(e => e.layer != null && Math.round(e.layer) === parseInt(layerFilter));

  if (viewMode === 'density') {
    const actual = activeConflicts.filter(e => e.type === 'Direct' || e.type === 'Proximity');
    if (actual.length >= 2) {
      const xs = actual.map(e=>e.x).filter(v=>v!=null);
      const ys = actual.map(e=>e.y).filter(v=>v!=null);
      traces.push({type:'histogram2dcontour',x:xs,y:ys,
        colorscale:[[0,'rgba(0,0,0,0)'],[0.3,'#e0525222'],[0.7,'#e0525266'],[1,'#e05252cc']],
        showscale:true,contours:{coloring:'fill'},line:{width:0},showlegend:false,
        colorbar:{tickfont:{size:8,color:C.text},thickness:10,len:0.5,title:{text:'density',font:{size:8,color:C.text}}}});
      traces.push({type:'scatter',x:xs,y:ys,mode:'markers',name:'Actual Collision',
        marker:{size:10,color:C.safety,symbol:'cross',line:{width:1.5,color:C.safety}},
        hovertemplate:'Actual Collision<br>(%{x}, %{y})<extra></extra>'});
    } else {
      const el=document.getElementById(elId);
      if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text2);padding:2rem;text-align:center">Not enough collision events for density map on this layer.</div>';
      return;
    }
  } else if (viewMode === 'vectors') {
    // ── COLLISION ENCOUNTER MAP ─────────────────────────────────────────────
    // Each collision event shown as two labelled points (A and B drone positions)
    // connected by a line. Clean, readable, on the grid.
    // Only Direct and Proximity shown (actual collisions).

    const actual = activeConflicts.filter(e =>
      e.type === 'Direct' || e.type === 'Proximity'
    );

    if (!actual.length) {
      const el = document.getElementById(elId);
      if (el) el.innerHTML = '<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text2);padding:2rem;text-align:center">No actual collision events for this layer.</div>';
      return;
    }

    // One trace per event — line connecting the two drone positions
    actual.forEach((e, i) => {
      if (e.x==null||e.y==null||e.bx==null||e.by==null) return;
      const col   = e.type === 'Direct' ? C.safety : '#e08c52';
      const label = `${e.type} t${e.tick}`;

      // Connecting line
      traces.push({
        type:'scatter', mode:'lines', showlegend:false, hoverinfo:'skip',
        x:[e.x, e.bx], y:[e.y, e.by],
        line:{color:col+'99', width:e.type==='Direct'?2.5:1.5,
              dash:e.type==='Direct'?'solid':'dash'},
      });

      // Drone A — filled circle
      traces.push({
        type:'scatter', mode:'markers+text',
        name: i===0 ? `Drone A (${e.type})` : undefined,
        showlegend: false,
        x:[e.x], y:[e.y],
        text:[`D${e.drone_a}`],
        textposition:'top center',
        textfont:{family:'IBM Plex Mono', size:9, color:col},
        marker:{size:14, color:col, symbol:'circle',
          line:{width:2, color:'#ffffff88'}},
        customdata:[[e.drone_a, e.veh_a, e.type, e.tick, 'A']],
        hovertemplate:
          '<b>Drone A: D%{customdata[0]}</b> (%{customdata[1]})<br>'+
          '%{customdata[2]} — Tick %{customdata[3]}<br>'+
          'Position: (%{x}, %{y})<extra></extra>',
      });

      // Drone B — diamond
      traces.push({
        type:'scatter', mode:'markers+text',
        showlegend: false,
        x:[e.bx], y:[e.by],
        text:[`D${e.drone_b}`],
        textposition:'bottom center',
        textfont:{family:'IBM Plex Mono', size:9, color:col},
        marker:{size:14, color:'rgba(0,0,0,0)', symbol:'diamond',
          line:{width:2, color:col}},
        customdata:[[e.drone_b, e.veh_b, e.type, e.tick, 'B']],
        hovertemplate:
          '<b>Drone B: D%{customdata[0]}</b> (%{customdata[1]})<br>'+
          '%{customdata[2]} — Tick %{customdata[3]}<br>'+
          'Position: (%{x}, %{y})<extra></extra>',
      });

      // Collision type label at midpoint
      traces.push({
        type:'scatter', mode:'text', showlegend:false, hoverinfo:'skip',
        x:[(e.x+e.bx)/2], y:[(e.y+e.by)/2 + 1.5],
        text:[label],
        textfont:{family:'IBM Plex Mono', size:8, color:col},
        textposition:'middle center',
      });
    });

    // Manual legend entries
    traces.push({type:'scatter',mode:'markers',name:'Drone A (filled)',x:[null],y:[null],
      marker:{size:12,color:C.safety,symbol:'circle'}});
    traces.push({type:'scatter',mode:'markers',name:'Drone B (outline)',x:[null],y:[null],
      marker:{size:12,color:'rgba(0,0,0,0)',symbol:'diamond',line:{width:2,color:C.safety}}});
    traces.push({type:'scatter',mode:'lines',name:'Direct crash',x:[null],y:[null],
      line:{color:C.safety,width:2.5,dash:'solid'}});
    traces.push({type:'scatter',mode:'lines',name:'Proximity',x:[null],y:[null],
      line:{color:'#e08c52',width:1.5,dash:'dash'}});

  } else {
    const byStatus={};
    data.drones.forEach(d=>{
      if(layerFilter!=='all'&&Math.round(d.layer)!==parseInt(layerFilter)) return;
      (byStatus[d.status]=byStatus[d.status]||[]).push(d);
    });
    Object.entries(byStatus).forEach(([status,drones])=>{
      const col=STATUS_C[status]||C.text;
      traces.push({type:'scatter',mode:'markers',name:status,x:drones.map(d=>d.x),y:drones.map(d=>d.y),marker:{size:9,color:col,opacity:0.88,line:{width:0.5,color:'rgba(255,255,255,0.1)'}},customdata:drones.map(d=>[d.id,d.status,d.alt,d.bat_u,d.vehicle,d.eff]),hovertemplate:'<b>Drone %{customdata[0]}</b> · %{customdata[4]}<br>%{customdata[1]}<br>Alt %{customdata[2]}m  Bat %{customdata[3]}%<br>Eff %{customdata[5]}<br>(%{x}, %{y})<extra></extra>'});
    });
    const byType={};
    activeConflicts.forEach(e=>{if(e.x==null||e.y==null) return; (byType[e.type]=byType[e.type]||[]).push(e);});
    Object.entries(byType).forEach(([t,evts])=>{
      traces.push({type:'scatter',mode:'markers',name:t,x:evts.map(e=>e.x),y:evts.map(e=>e.y),marker:{size:22,color:'rgba(0,0,0,0)',symbol:'circle-open',line:{width:1.5,color:TYPE_C[t]||C.text}},hovertemplate:`<b>${t}</b><br>Tick %{customdata[0]}<extra></extra>`,customdata:evts.map(e=>[e.tick])});
    });
  }

  safePlot(elId, traces, {
    ...baseLayout(520),
    xaxis:{...baseLayout().xaxis, range:[-1,51], dtick:10, title:'X',
      showgrid:true, showticklabels:true, zeroline:false,
      tickfont:{size:8,color:C.text}},
    yaxis:{...baseLayout().yaxis, range:[-1,51], dtick:10, title:'Y',
      scaleanchor:'x', showgrid:true, showticklabels:true, zeroline:false,
      tickfont:{size:8,color:C.text}},
    legend:{x:1.02,y:1,font:{size:8,color:C.text},
      bgcolor:'rgba(0,0,0,0)',bordercolor:C.border,borderwidth:1},
  });
}


function renderConflictNodes(elId, events) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!events.length) {
    el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--stat);padding:6px">No conflicts.</div>';
    return;
  }
  const rows = events.map(e=>`<tr>
    <td style="color:${TYPE_C[e.type]||C.text}">${e.type}</td>
    <td>${e.x??'—'}</td><td>${e.y??'—'}</td>
    <td>${e.layer??'—'}</td><td>${e.tick??'—'}</td></tr>`).join('');
  el.innerHTML=`<table class="utm-table"><thead><tr><th>Type</th><th>X</th><th>Y</th><th>L</th><th>Tick</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ── PAGE 3: SAFETY ────────────────────────────────────────────────────────────

// Severity bar (unchanged)
function chartSeverity(elId, sev) {
  safePlot(elId, [{
    type:'bar', x:sev.map(s=>s.severity), y:sev.map(s=>s.count),
    marker:{color:sev.map(s=>SEV_C[s.severity]||C.text)},
    text:sev.map(s=>s.count), textposition:'outside',
    textfont:{family:'IBM Plex Mono',size:10,color:C.white},
    showlegend:false,
  }], {...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Severity'},
    yaxis:{...baseLayout().yaxis,title:'Count'}});
}

// Vehicle hits (unchanged)
function chartVehHits(elId, data) {
  if (!data||!data.length) return;
  // API returns: vehicle, collisions, fleet, rate_pct
  const rate = data.map(d => d.rate_pct || d.collision_rate || 0);
  const colArr = data.map(d=>VEH_C[d.vehicle]||C.fleet);
  safePlot(elId, [{
    type:'bar',
    x: data.map(d=>d.vehicle.replace('_',' ').toUpperCase()),
    y: rate,
    marker:{color:colArr, opacity:0.85, line:{color:colArr,width:1}},
    text: rate.map(r=>r.toFixed(0)+'%'),
    textposition:'outside',
    textfont:{size:9,color:C.white,family:'JetBrains Mono,monospace'},
    customdata: data.map(d=>[d.vehicle, d.collisions||d.hits||0, d.fleet||d.fleet_count||0]),
    hovertemplate:'<b>%{x}</b><br>Collisions: %{customdata[1]}<br>Fleet: %{customdata[2]}<br>Rate: %{y:.0f}%<extra></extra>',
  }], {
    ...baseLayout(280), bargap:0.35, showlegend:false,
    margin:{l:40,r:20,t:30,b:50},
    xaxis:{...baseLayout().xaxis},
    yaxis:{...baseLayout().yaxis, title:'Collision Rate %',
           range:[0,Math.max(...rate,10)*1.35]},
    shapes:[{type:'line',x0:-0.5,x1:data.length-0.5,y0:100,y1:100,
      line:{color:C.safety,dash:'dot',width:1}}],
  });
}

// Battery at crash KDE (unchanged)
function chartBatCrash(elId, batKde) {
  if (!batKde.x||!batKde.x.length) {
    document.getElementById(elId).innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">Insufficient data.</div>';
    return;
  }
  const traces = [{type:'scatter',x:batKde.x,y:batKde.y,mode:'lines',name:'KDE',
    line:{color:C.safety,width:2},fill:'tozeroy',fillcolor:C.safety+'18'}];
  if (batKde.obs) traces.push({type:'scatter',x:batKde.obs,y:new Array(batKde.obs.length).fill(0),
    mode:'markers',showlegend:false,
    marker:{size:4,color:C.safety,opacity:0.5,symbol:'line-ns-open',line:{width:1.5,color:C.safety}}});
  safePlot(elId, traces, {...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Battery at collision (%)'},
    yaxis:{...baseLayout().yaxis,title:'Density',showgrid:false,showticklabels:false}});
}

// NEW: Layer × Vehicle collision heatmap
function chartLayerVehicleHeatmap(elId, data) {
  // data: {layers:[1,2,3,4], vehicles:['quad',...], z:[[count,...],...]}
  if (!data.vehicles||!data.vehicles.length) {
    document.getElementById(elId).innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">No collision data.</div>';
    return;
  }
  const layerLabels = data.layers.map(l=>`L${l} · ${(l-1)*50}m`);
  safePlot(elId, [{
    type:'heatmap',
    z:data.z, x:data.vehicles, y:layerLabels,
    colorscale:[[0,'#0e1520'],[0.3,'#e0525233'],[0.7,'#e0525277'],[1,'#e05252']],
    showscale:true,
    text:data.z, texttemplate:'%{text}',
    textfont:{family:'IBM Plex Mono',size:12,color:C.white},
    colorbar:{tickfont:{size:8,color:C.text},title:{text:'events',font:{size:8,color:C.text}},thickness:10,len:0.7},
    hovertemplate:'Layer: %{y}<br>Vehicle: %{x}<br>Collision events: %{z}<extra></extra>',
  }], {
    paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:C.plot,height:280,
    font:{family:'IBM Plex Mono',color:C.text,size:10},
    margin:{l:90,r:60,t:16,b:50},
    xaxis:{tickfont:{size:9,color:C.text},title:{text:'Vehicle type',font:{size:9,color:C.text}}},
    yaxis:{tickfont:{size:9,color:C.text}},
    hoverlabel:{bgcolor:C.plot,bordercolor:C.border,font:{family:'JetBrains Mono, monospace',size:10,color:C.white}},
  });
}

// NEW: Collision cascade gap chart
function chartCollTiming(elId, events) {
  // Bar chart: events per grid tick, colored by severity
  if (!events||!events.length) {
    const el=document.getElementById(elId);
    if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">No collision events.</div>';
    return;
  }
  // Count by tick and severity
  const tickSev = {};
  events.forEach(e=>{
    const t = e.tick;
    if (t==null) return;
    if (!tickSev[t]) tickSev[t] = {Critical:0,Minor:0,'Near Miss':0};
    const sev = e.severity||'Near Miss';
    if (tickSev[t][sev]!==undefined) tickSev[t][sev]++;
  });
  const ticks = Object.keys(tickSev).map(Number).sort((a,b)=>a-b);
  const sevs  = ['Critical','Minor','Near Miss'];
  const cols  = [C.safety,'#e08c52',C.fleet];
  const traces = sevs.map((sev,i)=>({
    type:'bar', name:sev,
    x:ticks, y:ticks.map(t=>tickSev[t][sev]||0),
    marker:{color:cols[i]},
  }));
  // Add total line
  traces.push({
    type:'scatter', mode:'lines+markers', name:'Total',
    x:ticks, y:ticks.map(t=>Object.values(tickSev[t]).reduce((a,b)=>a+b,0)),
    line:{color:C.white,width:2,dash:'dot'},
    marker:{size:6,color:C.white},
    yaxis:'y',
  });
  safePlot(elId, traces, {
    ...baseLayout(280,{barmode:'stack'}),
    xaxis:{...baseLayout().xaxis,title:'Grid tick',dtick:1},
    yaxis:{...baseLayout().yaxis,title:'Collision events'},
    shapes:[{type:'rect',x0:ticks[0]-0.5,x1:ticks[ticks.length-1]+0.5,
      y0:0,y1:3,fillcolor:C.safety+'08',line:{width:0}}],
  });
}

// Distance crash charts (unchanged)
function chartDistHist(elId, distCrash) {
  const byType = {};
  distCrash.forEach(d=>{(byType[d.type]=byType[d.type]||[]).push(d.dist);});
  const traces = Object.entries(byType).map(([t,vals])=>({
    type:'histogram',x:vals,nbinsx:10,name:t,
    marker:{color:TYPE_C[t]||C.text},opacity:0.8,
  }));
  safePlot(elId, traces, {...baseLayout(260,{barmode:'overlay'}),
    xaxis:{...baseLayout().xaxis,title:'Actual distance at collision'},
    yaxis:{...baseLayout().yaxis,title:'Count'}});
}

function chartDistBox(elId, distCrash) {
  const byType = {};
  distCrash.forEach(d=>{(byType[d.type]=byType[d.type]||[]).push(d.dist);});
  const traces = Object.entries(byType).map(([t,vals])=>({
    type:'box',y:vals,name:t,
    marker:{color:TYPE_C[t]||C.text,size:4,opacity:0.7},
    line:{color:TYPE_C[t]||C.text},
    fillcolor:(TYPE_C[t]||C.text)+'22',
    boxpoints:'all',jitter:0.3,
  }));
  safePlot(elId, traces, {...baseLayout(260),
    yaxis:{...baseLayout().yaxis,title:'Distance at collision'}});
}

// ── PAGE 4: FLEET ─────────────────────────────────────────────────────────────

// KDE helpers
function kdeTrace(xs, ys, color, name, fill=true) {
  return {type:'scatter',x:xs,y:ys,mode:'lines',name:name,
    line:{color:color,width:2},
    ...(fill?{fill:'tozeroy',fillcolor:color+'18'}:{})};
}
function rugTrace(obs, color) {
  return {type:'scatter',x:obs,y:new Array(obs.length).fill(0),
    mode:'markers',showlegend:false,
    marker:{size:4,color:color,opacity:0.5,symbol:'line-ns-open',
            line:{width:1.5,color:color}}};
}

// Battery KDE by outcome (unchanged)
function chartBatKDE(elId, kde, statusKDEs) {
  const traces = (statusKDEs||[]).map(k=>{
    if (!k.x||!k.x.length) return null;
    const col = STATUS_C[k.status]||C.text;
    const lbl = k.status.split('\u2014').pop().trim().split('—').pop().trim();
    return {type:'scatter',x:k.x,y:k.y,mode:'lines',name:lbl,
      line:{color:col,width:1.5},
      fill:'tozeroy',fillcolor:col+'10'};
  }).filter(Boolean);
  if (!traces.length) return;
  safePlot(elId, traces, {
    ...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Battery consumed (%)'},
    yaxis:{...baseLayout().yaxis,title:'Density',showticklabels:false,showgrid:false},
    legend:{x:1.01,y:1,bgcolor:'rgba(0,0,0,0)',font:{size:8,color:C.text},
      bordercolor:C.border,borderwidth:1},
    margin:{l:40,r:110,t:16,b:40},
  });
}

// Efficiency scatter (unchanged)
function chartEffScatter(elId, eff) {
  const byStatus = {};
  eff.points.forEach(p=>{(byStatus[p.status]=byStatus[p.status]||[]).push(p);});
  const traces = [];
  if (eff.points.length>=5) {
    traces.push({type:'histogram2dcontour',
      x:eff.points.map(p=>p.dp),y:eff.points.map(p=>p.da),
      colorscale:[[0,'rgba(0,0,0,0)'],[1,'#4fa8d422']],
      showscale:false,line:{width:0},contours:{coloring:'fill'},ncontours:6,showlegend:false});
  }
  Object.entries(byStatus).forEach(([s,pts])=>{
    traces.push({type:'scatter',mode:'markers',name:s.split('—').pop().trim(),
      x:pts.map(p=>p.dp),y:pts.map(p=>p.da),
      marker:{size:7,color:STATUS_C[s]||C.text,opacity:0.85,
        line:{width:0.5,color:'rgba(255,255,255,0.1)'}},
    });
  });
  const mx = Math.max(...eff.points.map(p=>Math.max(p.dp||0,p.da||0)),1);
  traces.push({type:'scatter',x:[0,mx],y:[0,mx],mode:'lines',name:'ideal',
    line:{color:C.text,dash:'dot',width:1.5},showlegend:true});
  if (eff.trend_x.length) {
    traces.push({type:'scatter',x:eff.trend_x,y:eff.trend_y,mode:'lines',name:'trend',
      line:{color:C.fleet,width:1.5},showlegend:true});
  }
  safePlot(elId, traces, {...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Planned distance'},
    yaxis:{...baseLayout().yaxis,title:'Actual distance'}});
}

// NEW: Battery drain vs distance — FIXED (actual battery consumed on Y axis)
function chartBatDrain(elId, pts) {
  if (!pts||!pts.length) return;
  const byVeh={};
  pts.forEach(p=>{const v=p.vehicle||'?'; (byVeh[v]=byVeh[v]||[]).push(p);});
  const traces=Object.entries(byVeh).map(([veh,points])=>({
    type:'scatter',mode:'markers',name:veh,
    x:points.map(p=>p.da),y:points.map(p=>p.bat_u),
    marker:{size:7,color:VEH_C[veh]||C.fleet,opacity:0.75,
            line:{width:1,color:'rgba(255,255,255,0.1)'}},
    hovertemplate:'<b>'+veh+'</b><br>Dist: %{x:.1f}<br>Bat: %{y:.1f}%<extra></extra>',
  }));
  const maxD=Math.max(...pts.map(p=>p.da||0),1);
  traces.push({type:'scatter',mode:'lines',name:'2.5%/unit ref',
    x:[0,maxD],y:[0,maxD*2.5],
    line:{color:C.amber,dash:'dot',width:1},hoverinfo:'skip'});
  safePlot(elId,traces,{
    ...baseLayout(280),margin:{l:48,r:16,t:24,b:50},
    xaxis:{...baseLayout().xaxis,title:'Distance Flown'},
    yaxis:{...baseLayout().yaxis,title:'Battery Used %',range:[0,110]},
  });
}

// NEW: Rerouting overhead — efficiency distribution per outcome as histogram
function chartReroutingOverhead(elId, points) {
  // points: array of {eff, status, dp, da}
  // eff = dp/da — values < 1 mean drone flew more than planned (rerouted)
  // We show (1 - eff)*100 as "overhead %" — 0% = no rerouting, 50% = flew 50% extra
  if (!points||!points.length) return;
  const byStatus = {};
  points.forEach(p=>{
    if (p.eff==null||!isFinite(p.eff)) return;
    const overhead = Math.max(0, (1 - p.eff)*100);
    (byStatus[p.status]=byStatus[p.status]||[]).push(overhead);
  });
  const traces = Object.entries(byStatus).map(([s,vals])=>({
    type:'histogram',x:vals,nbinsx:15,
    name:s.split('—').pop().trim(),
    marker:{color:STATUS_C[s]||C.text},
    opacity:0.75,
  }));
  safePlot(elId, traces, {...baseLayout(280,{barmode:'overlay'}),
    xaxis:{...baseLayout().xaxis,title:'Routing overhead (%) — 0 = flew exact planned route'},
    yaxis:{...baseLayout().yaxis,title:'Drone count'},
    shapes:[{type:'line',x0:0,x1:0,y0:0,y1:1,yref:'paper',
      line:{color:C.stat,dash:'dot',width:1.5}}],
    annotations:[{x:2,y:0.96,xref:'x',yref:'paper',text:'no rerouting',
      showarrow:false,font:{family:'IBM Plex Mono',size:8,color:C.stat}}],
  });
}

// NEW: Battery reserve at end by layer
function chartBatReserveByLayer(elId, data) {
  if (!data||!data.length) return;
  const byLayer = {1:[],2:[],3:[],4:[]};
  data.forEach(p=>{
    const l = Math.round(p.layer);
    if (l>=1&&l<=4&&p.bat_e!=null) byLayer[l].push(p.bat_e);
  });
  const traces = [1,2,3,4]
    .filter(l=>byLayer[l].length>0)
    .map(l=>({
      type:'box', y:byLayer[l], name:`L${l} · ${(l-1)*50}m`,
      marker:{color:LAYER_C[l]||C.text,size:4,opacity:0.7},
      line:{color:LAYER_C[l]||C.text},
      fillcolor:(LAYER_C[l]||C.text)+'22',
      boxpoints:'all',jitter:0.3,
      hovertemplate:`<b>Layer ${l} · ${(l-1)*50}m</b><br>Battery end: %{y:.1f}%<extra></extra>`,
    }));
  if (!traces.length) return;
  safePlot(elId, traces, {
    ...baseLayout(280),
    yaxis:{...baseLayout().yaxis,title:'Battery at mission end (%)'},
    showlegend:false,
    shapes:[
      {type:'line',x0:-0.5,x1:traces.length-0.5,y0:20,y1:20,
        line:{color:C.temporal,dash:'dot',width:1}},
    ],
    annotations:[{x:traces.length-0.6,y:22,xref:'x',yref:'y',
      text:'20% reserve',showarrow:false,
      font:{family:'IBM Plex Mono',size:8,color:C.temporal}}],
  });
}

// Vehicle summary table (unchanged)
function renderVehSummary(elId, rows) {
  const el = document.getElementById(elId);
  if (!el||!rows.length) return;
  const heads = ['Vehicle','Fleet','Complete','Comp %','Collisions','Crash %','Avg Bat','Avg Eff'];
  const thead = `<tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const tbody = rows.map(r=>{
    const col = VEH_C[r.vehicle]||C.text;
    return `<tr>
      <td style="color:${col}">${r.vehicle}</td>
      <td>${r.fleet}</td><td>${r.complete}</td>
      <td style="color:${r.comp_pct>80?'#7abd7a':r.comp_pct>50?'#d4a84f':'#e05252'}">${r.comp_pct}%</td>
      <td>${r.collisions}</td>
      <td style="color:${r.crash_pct>5?'#e05252':r.crash_pct>0?'#d4a84f':'#7abd7a'}">${r.crash_pct}%</td>
      <td>${r.avg_bat}%</td><td>${r.avg_eff}</td></tr>`;
  }).join('');
  el.innerHTML=`<table class="utm-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

// ── PAGE 5: TEMPORAL ──────────────────────────────────────────────────────────

function chartTimeline(elId, events) {
  if (!events.length) {
    document.getElementById(elId).innerHTML='<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text2);padding:1.5rem">No collision events.</div>';
    return;
  }
  const laneOrder = ['Direct','Proximity','Near Miss'];
  const laneY     = {Direct:0,Proximity:1,'Near Miss':2};
  const szMap     = {Critical:16,Major:12,Minor:10,'Near Miss':9};
  const traces    = [];
  const byType = {};
  events.forEach(e=>{(byType[e.type]=byType[e.type]||[]).push(e);});
  Object.entries(byType).forEach(([t,evts])=>{
    traces.push({type:'scatter',mode:'markers',name:t,
      x:evts.map(e=>e.tick),y:evts.map(e=>laneY[e.type]||0),
      marker:{size:evts.map(e=>szMap[e.severity]||9),
        color:TYPE_C[t]||C.text,opacity:0.9,symbol:'diamond',
        line:{width:1,color:'rgba(255,255,255,0.2)'}},
      customdata:evts.map(e=>[e.severity,e.drone_a,e.drone_b,e.veh_a,e.veh_b]),
      hovertemplate:'<b>%{customdata[0]} %{name}</b><br>Tick %{x}<br>D%{customdata[1]} (%{customdata[3]}) × D%{customdata[2]} (%{customdata[4]})<extra></extra>',
    });
  });
  const tickCounts = {};
  events.forEach(e=>{if(e.tick!=null) tickCounts[e.tick]=(tickCounts[e.tick]||0)+1;});
  const tks = Object.keys(tickCounts).map(Number).sort((a,b)=>a-b);
  traces.push({type:'bar',x:tks,y:tks.map(t=>tickCounts[t]),
    name:'Events/tick',yaxis:'y2',marker:{color:C.temporal+'55'},showlegend:false});
  safePlot(elId, traces, {
    ...baseLayout(320),
    yaxis:{tickvals:[0,1,2],ticktext:['Direct','Proximity','Near Miss'],
      range:[-0.6,2.4],gridcolor:C.border},
    yaxis2:{overlaying:'y',side:'right',showgrid:false,showticklabels:false,
      range:[0,(Math.max(...Object.values(tickCounts))||1)*5]},
    barmode:'overlay',margin:{l:80,r:40,t:28,b:40},
    xaxis:{...baseLayout().xaxis,title:'Grid tick'},
  });
}

function chartRolling(elId, roll) {
  safePlot(elId, [
    {type:'scatter',x:roll.ticks,y:roll.raw,mode:'lines',name:'Raw count',
      line:{color:C.temporal+'55',width:1},fill:'tozeroy',fillcolor:C.temporal+'0a'},
    {type:'scatter',x:roll.ticks,y:roll.rolling,mode:'lines',name:'5-tick avg',
      line:{color:C.temporal,width:2}},
  ], {...baseLayout(200),
    xaxis:{...baseLayout().xaxis,title:'Grid tick'},
    yaxis:{...baseLayout().yaxis,title:'Events per tick'},
    margin:{l:48,r:16,t:16,b:40}});
}

// Duration box plot by outcome (unchanged)
function chartDurBox(elId, byStatus) {
  const traces = byStatus.map(b=>({
    type:'box',y:b.values,name:b.status.split('—').pop().trim(),
    marker:{color:STATUS_C[b.status]||C.text,size:4,opacity:0.6},
    line:{color:STATUS_C[b.status]||C.text},
    fillcolor:(STATUS_C[b.status]||C.text)+'1a',
    boxpoints:'all',jitter:0.3,
  }));
  safePlot(elId, traces, {...baseLayout(280),
    yaxis:{...baseLayout().yaxis,title:'Seconds'},showlegend:false,
    margin:{l:48,r:10,t:16,b:60}});
}

// NEW: Fleet density vs collision rate dual-axis
function chartFleetDensity(elId, data) {
  const ticks=data.ticks||[], air=data.airborne||[], coll=data.collision_counts||[];
  if (!ticks.length) return;
  safePlot(elId, [
    {type:'bar',name:'Drones Airborne',x:ticks,y:air,
      marker:{color:'rgba(0,180,220,0.25)',line:{color:'rgba(0,180,220,0.5)',width:1}},
      hovertemplate:'Tick %{x}<br>Airborne: %{y}<extra></extra>'},
    {type:'scatter',name:'Collisions',yaxis:'y2',x:ticks,y:coll,
      mode:'lines+markers',
      line:{color:C.safety,width:2,shape:'hv'},
      marker:{size:coll.map(v=>v>0?8:3),color:coll.map(v=>v>0?C.safety:C.border),
              symbol:coll.map(v=>v>0?'diamond':'circle')},
      fill:'tozeroy',fillcolor:'rgba(255,68,0,0.06)',
      hovertemplate:'Tick %{x}<br>Collisions: %{y}<extra></extra>'},
  ], {
    ...baseLayout(280), barmode:'overlay',
    margin:{l:48,r:48,t:24,b:40},
    xaxis:{...baseLayout().xaxis,title:'Grid Tick'},
    yaxis:{...baseLayout().yaxis,title:'Drones Airborne'},
    yaxis2:{overlaying:'y',side:'right',title:'Collision Events',
      gridcolor:'rgba(0,0,0,0)',zeroline:false,
      tickfont:{size:9,color:C.safety},titlefont:{size:9,color:C.safety}},
    legend:{x:0,y:1.1,orientation:'h',font:{size:9,color:C.text},bgcolor:'rgba(0,0,0,0)'},
  });
}

// ── PAGE 6: DISTRIBUTIONS ─────────────────────────────────────────────────────

// NEW: Merged battery states — all three KDEs on one chart with toggleable legend
function chartBatStatesKDE(elId, batKde) {
  const configs = [
    {key:'start',    color:C.fleet,    label:'Battery at start'},
    {key:'consumed', color:C.temporal, label:'Battery consumed'},
    {key:'end',      color:C.stat,     label:'Battery at end'},
  ];
  const traces = [];
  configs.forEach(cfg => {
    const kde = batKde[cfg.key];
    if (!kde||!kde.x||!kde.x.length) return;
    traces.push({
      type:'scatter',x:kde.x,y:kde.y,mode:'lines',name:cfg.label,
      line:{color:cfg.color,width:2},
      fill:'tozeroy',fillcolor:cfg.color+'12',
    });
  });
  safePlot(elId, traces, {...baseLayout(300),
    xaxis:{...baseLayout().xaxis,title:'Battery (%)'},
    yaxis:{...baseLayout().yaxis,title:'Density',showgrid:false,showticklabels:false},
    legend:{x:0.02,y:0.96,bgcolor:'rgba(0,0,0,0)',font:{size:9,color:C.text}},
  });
}

// Efficiency by vehicle KDE (unchanged)
function chartEffVeh(elId, effByVeh) {
  const traces = Object.entries(effByVeh).map(([veh,kde])=>({
    ...kdeTrace(kde.x,kde.y,VEH_C[veh]||C.text,veh),
  }));
  safePlot(elId, traces, {...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Efficiency (planned / actual)'},
    yaxis:{...baseLayout().yaxis,title:'Density',showgrid:false,showticklabels:false},
    shapes:[{type:'line',x0:1,x1:1,y0:0,y1:1,yref:'paper',
      line:{color:C.text,dash:'dot',width:1}}],
  });
}

// Battery consumed vs distance (unchanged, color-mapped)
function chartBatDist(elId, pts) {
  if (!pts||!pts.length) return;
  const valid = pts.filter(p=>p.da!=null&&p.bat_u!=null);
  if (!valid.length) return;
  const traces = [{
    type:'scatter',mode:'markers',showlegend:false,
    x:valid.map(p=>p.da), y:valid.map(p=>p.bat_u),
    marker:{size:7,color:valid.map(p=>p.bat_u),
      colorscale:[[0,C.stat],[0.5,C.temporal],[1,C.safety]],
      showscale:true,opacity:0.8,
      line:{width:0.5,color:'rgba(255,255,255,0.1)'},
      colorbar:{tickfont:{size:8,color:C.text},
        title:{text:'bat%',font:{size:8,color:C.text}},thickness:10,len:0.6}},
    hovertemplate:'Distance: %{x}<br>Battery used: %{y}%<extra></extra>',
  }];
  // Fit trend line
  try {
    const xs = valid.map(p=>p.da); const ys = valid.map(p=>p.bat_u);
    const n=xs.length, sx=xs.reduce((a,b)=>a+b,0), sy=ys.reduce((a,b)=>a+b,0);
    const sxx=xs.reduce((a,b)=>a+b*b,0), sxy=xs.reduce((a,b,i)=>a+b*ys[i],0);
    const m=(n*sxy-sx*sy)/(n*sxx-sx*sx);
    const b_=(sy-m*sx)/n;
    const tx=[0,Math.max(...xs)];
    traces.push({type:'scatter',x:tx,y:tx.map(x=>m*x+b_),mode:'lines',
      name:`trend y=${m.toFixed(2)}x+${b_.toFixed(1)}`,
      line:{color:C.fleet,width:1.5}});
  } catch(e){}
  safePlot(elId, traces, {...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Actual distance'},
    yaxis:{...baseLayout().yaxis,title:'Battery consumed (%)'}});
}

// NEW: Path run consistency chart
function chartPathRunConsistency(elId, prData) {
  // prData: array of {path_run, comp_pct, coll_count, bat_avg, eff_median}
  if (!prData||prData.length < 1) {
    document.getElementById(elId).innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">Requires multiple path runs per trial.</div>';
    return;
  }
  const prs = prData.map(r=>r.path_run);
  safePlot(elId, [
    {type:'bar',x:prs,y:prData.map(r=>r.comp_pct),name:'Completion %',
      marker:{color:C.stat+'cc'},yaxis:'y',
      hovertemplate:'Run %{x}<br>Completion: %{y}%<extra></extra>'},
    {type:'scatter',x:prs,y:prData.map(r=>r.coll_count),mode:'lines+markers',
      name:'Collisions',yaxis:'y2',
      line:{color:C.safety,width:2},marker:{size:7,color:C.safety},
      hovertemplate:'Run %{x}<br>Collisions: %{y}<extra></extra>'},
  ], {
    ...baseLayout(280),
    yaxis:{...baseLayout().yaxis,title:'Completion %',range:[0,105]},
    yaxis2:{overlaying:'y',side:'right',showgrid:false,
      title:{text:'Collision events',font:{size:9,color:C.safety}},
      tickfont:{size:9,color:C.safety}},
    xaxis:{...baseLayout().xaxis,title:'Path run',dtick:1},
    barmode:'group',
    shapes:[{type:'line',x0:Math.min(...prs)-0.5,x1:Math.max(...prs)+0.5,y0:80,y1:80,
      line:{color:C.stat,dash:'dot',width:1}}],
    annotations:[{x:Math.max(...prs),y:81,xref:'x',yref:'y',text:'80% target',
      showarrow:false,font:{family:'IBM Plex Mono',size:8,color:C.stat}}],
  });
}

// NEW: Per-layer battery consumption KDE overlay
function chartBatByLayer(elId, layerBatData) {
  // layerBatData: {1:[bat_u values], 2:[...], 3:[...], 4:[...]}
  const traces = [];
  [1,2,3,4].forEach(ln => {
    const vals = layerBatData[ln];
    if (!vals||vals.length<2) return;
    const col = LAYER_C[ln];
    const label = `L${ln} · ${(ln-1)*50}m`;
    // Simple histogram as proxy when too few points for KDE
    if (vals.length < 5) {
      traces.push({type:'histogram',x:vals,nbinsx:8,name:label,
        marker:{color:col},opacity:0.7});
    } else {
      // Manual KDE approximation via histogram with many bins
      traces.push({type:'violin',y:vals,name:label,
        side:'positive',points:'all',
        fillcolor:col+'33',line:{color:col,width:2},
        meanline:{visible:true,color:col},
        marker:{size:3,color:col,opacity:0.6},
        hovertemplate:`<b>${label}</b><br>Battery consumed: %{y}%<extra></extra>`,
        box:{visible:true,fillcolor:col+'22'},
        bandwidth:8,
      });
    }
  });
  safePlot(elId, traces, {...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Altitude layer'},
    yaxis:{...baseLayout().yaxis,title:'Battery consumed (%)'},
    violinmode:'group',
  });
}

// ── PAGE 7: MULTI-TRIAL ───────────────────────────────────────────────────────

function renderKPIMatrix(elId, trials) {
  const el = document.getElementById(elId);
  if (!el) return;
  const tc = (v,m) => {
    if (m==='comp_pct') return v>80?'#7abd7a':v>50?'#d4a84f':'#e05252';
    if (m==='coll_rate') return v===0?'#7abd7a':v<5?'#d4a84f':'#e05252';
    if (m==='efficiency') return v>=0.95?'#7abd7a':v>=0.8?'#d4a84f':'#e05252';
    return C.text;
  };
  const heads=['Trial','Fleet','Complete','Comp%','Collisions','Coll%','Bat Used','Efficiency'];
  const thead=`<tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const tbody=trials.map(r=>`<tr>
    <td style="color:${C.white}">${r.trial}</td>
    <td style="color:${C.text}">${r.fleet}</td>
    <td>${r.complete}</td>
    <td style="color:${tc(r.comp_pct,'comp_pct')}">${r.comp_pct}%</td>
    <td>${r.collisions}</td>
    <td style="color:${tc(r.coll_rate,'coll_rate')}">${r.coll_rate}%</td>
    <td style="color:${C.fleet}">${r.bat_used}%</td>
    <td style="color:${tc(r.efficiency,'efficiency')}">${r.efficiency}</td>
  </tr>`).join('');
  el.innerHTML=`<table class="kpi-matrix"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function chartPareto(elId, trials) {
  const traces = trials.map(r=>{
    const col = r.coll_rate>10?C.safety:r.coll_rate>5?C.temporal:C.stat;
    const ovh = 100-r.comp_pct;
    return {type:'scatter',mode:'markers+text',
      x:[r.coll_rate],y:[ovh],
      marker:{size:8+r.fleet/4,color:col,opacity:0.85,
        line:{width:1,color:'rgba(255,255,255,0.15)'}},
      text:[r.trial.split('/').pop().substring(0,20)],
      textposition:'top center',
      textfont:{family:'IBM Plex Mono',size:8,color:C.text},
      showlegend:false,
      hovertemplate:`<b>${r.trial}</b><br>Collision: ${r.coll_rate}%<br>Overhead: ${ovh}%<br>Fleet: ${r.fleet}<extra></extra>`,
    };
  });
  safePlot(elId, traces, {
    ...baseLayout(420),
    shapes:[{type:'rect',x0:0,y0:0,x1:5,y1:25,
      fillcolor:C.stat+'0a',line:{color:C.stat,width:1,dash:'dot'}}],
    annotations:[
      {x:2.5,y:12.5,text:'optimal zone',showarrow:false,
        font:{family:'IBM Plex Mono',size:8,color:C.stat},xref:'x',yref:'y'},
      {x:5,y:0,text:'5% threshold',showarrow:false,yanchor:'bottom',
        font:{family:'IBM Plex Mono',size:8,color:C.text3},xref:'x',yref:'paper'},
    ],
    xaxis:{...baseLayout().xaxis,title:'Collision rate (%)  —  lower = safer'},
    yaxis:{...baseLayout().yaxis,title:'Non-completion (%)  —  lower = efficient'},
  });
}

function renderCVRRows(elId, items) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = items.map(it=>{
    const col = it.cvr<0.1?C.stat:it.cvr<0.3?C.temporal:C.safety;
    return `<div class="cvr-row" style="border-left-color:${col}">
      <div class="cvr-name">${it.name}</div>
      <div class="cvr-stat">mean: <span style="color:${col}">${it.mean}</span></div>
      <div class="cvr-stat">std: ${it.std}</div>
      <div class="cvr-stat">CVR: <span style="color:${col}">${it.cvr}</span></div>
      <div class="cvr-status" style="color:${col}">${it.stability}</div>
    </div>`;
  }).join('');
}

function chartCollStrip(elId, trials) {
  const sorted = [...trials].sort((a,b)=>a.coll_rate-b.coll_rate);
  const traces = sorted.map((r,i)=>{
    const col = r.coll_rate>10?C.safety:r.coll_rate>5?C.temporal:C.stat;
    return {type:'scatter',x:[r.coll_rate],y:[i],mode:'markers+text',
      marker:{size:10,color:col,line:{width:1,color:'rgba(255,255,255,0.15)'}},
      text:['  '+r.trial.split('/').pop().substring(0,22)],
      textposition:'middle right',
      textfont:{family:'IBM Plex Mono',size:8,color:C.text},
      showlegend:false,
      hovertemplate:`<b>${r.trial}</b><br>Rate: ${r.coll_rate}%<extra></extra>`,
    };
  });
  const lines = sorted.map((r,i)=>{
    const col = r.coll_rate>10?C.safety:r.coll_rate>5?C.temporal:C.stat;
    return {type:'line',x0:0,y0:i,x1:r.coll_rate,y1:i,
      line:{color:col+'44',width:1,dash:'dot'},xref:'x',yref:'y'};
  });
  safePlot(elId, traces, {...baseLayout(180),
    shapes:lines,
    xaxis:{...baseLayout().xaxis,title:'Collision rate (%)'},
    yaxis:{showticklabels:false,showgrid:false,gridcolor:C.border},
    margin:{l:16,r:200,t:16,b:40},
    annotations:[{x:5,y:0,text:'5%',showarrow:false,yanchor:'bottom',
      font:{family:'IBM Plex Mono',size:8,color:C.text3},xref:'x',yref:'paper'}],
  });
}


// ── PAGE: PREDICTIVE RISK ANALYSIS ───────────────────────────────────────────

function chartRiskMap(elId, drones) {
  if (!drones||!drones.length) return;
  const traces = [];
  // Grid
  for (let v=0;v<=50;v+=10) {
    traces.push({type:'scatter',x:[v,v],y:[0,50],mode:'lines',
      line:{color:C.border,width:0.5},showlegend:false,hoverinfo:'skip'});
    traces.push({type:'scatter',x:[0,50],y:[v,v],mode:'lines',
      line:{color:C.border,width:0.5},showlegend:false,hoverinfo:'skip'});
  }
  // All drones colored by risk score — single trace with colorscale
  const valid = drones.filter(d=>d.x!=null&&d.y!=null);
  if (valid.length) {
    traces.push({
      type:'scatter', mode:'markers', name:'Risk score',
      x:valid.map(d=>d.x), y:valid.map(d=>d.y),
      marker:{
        size:valid.map(d=>8+d.risk_score*14),
        color:valid.map(d=>d.risk_score),
        colorscale:[[0,C.stat],[0.4,C.temporal],[0.7,C.safety],[1,'#ff0000']],
        showscale:true, cmin:0, cmax:1, opacity:0.9,
        symbol:valid.map(d=>d.anomaly?'diamond':'circle'),
        colorbar:{tickfont:{size:8,color:C.text},
          title:{text:'crash prob',font:{size:8,color:C.text}},
          thickness:10,len:0.5},
      },
      customdata:valid.map(d=>[d.id,d.status,
        Math.round(d.risk_score*100),d.bat_s,d.dp,d.layer,d.anomaly,d.crashed]),
      hovertemplate:
        '<b>Drone %{customdata[0]}</b>  %{customdata[1]}<br>'+
        'Crash probability: <b>%{customdata[2]}%</b><br>'+
        'Battery start: %{customdata[3]}%  Distance: %{customdata[4]}<br>'+
        'Layer: %{customdata[5]}  Anomaly: %{customdata[6]}<br>'+
        'Actually crashed: %{customdata[7]}<br>'+
        'Pos: (%{x}, %{y})<extra></extra>',
      showlegend:false,
    });
    // Ring overlay for actual crashes
    const crashed = valid.filter(d=>d.crashed);
    if (crashed.length) {
      traces.push({
        type:'scatter',mode:'markers',name:'Actual crash',
        x:crashed.map(d=>d.x),y:crashed.map(d=>d.y),
        marker:{size:20,color:'rgba(0,0,0,0)',symbol:'circle-open',
          line:{width:2,color:C.safety}},
        hoverinfo:'skip',showlegend:true,
      });
    }
    // Ring for anomalies
    const anomalies = valid.filter(d=>d.anomaly);
    if (anomalies.length) {
      traces.push({
        type:'scatter',mode:'markers',name:'Anomaly',
        x:anomalies.map(d=>d.x),y:anomalies.map(d=>d.y),
        marker:{size:24,color:'rgba(0,0,0,0)',symbol:'diamond-open',
          line:{width:1.5,color:C.multi}},
        hoverinfo:'skip',showlegend:true,
      });
    }
  }
  safePlot(elId, traces, {
    ...baseLayout(500),
    xaxis:{...baseLayout().xaxis,range:[-1,51],dtick:10,title:'X'},
    yaxis:{...baseLayout().yaxis,range:[-1,51],dtick:10,title:'Y',scaleanchor:'x'},
    legend:{x:1.02,y:1,font:{size:8,color:C.text},bgcolor:'rgba(0,0,0,0)',
            bordercolor:C.border,borderwidth:1},
    margin:{l:48,r:100,t:28,b:40},
  });
}

function chartFeatureImportance(elId, fi) {
  const items = Object.entries(fi).sort((a,b)=>b[1]-a[1]);
  if (!items.length) return;
  const maxV = Math.max(...items.map(i=>i[1]));
  const colors = items.map(([,v]) => {
    const t = v/maxV;
    return t>0.7?C.safety:t>0.4?C.amber:C.fleet;
  });
  const labels = {
    bat_s:'Battery at Start', cx:'X Position', cy:'Y Position',
    layer:'Altitude Layer', dp:'Planned Distance',
  };
  safePlot(elId, [{
    type:'bar', orientation:'h',
    x: items.map(i=>i[1]),
    y: items.map(i=>labels[i[0]]||i[0]),
    marker:{color:colors, opacity:0.85, line:{color:colors,width:1}},
    text: items.map(i=>(i[1]*100).toFixed(1)+'%'),
    textposition:'outside',
    textfont:{size:9, color:C.white, family:'JetBrains Mono,monospace'},
    hovertemplate:'<b>%{y}</b><br>Importance: %{x:.3f}<extra></extra>',
  }], {
    ...baseLayout(280),
    margin:{l:130,r:60,t:24,b:30},
    xaxis:{...baseLayout().xaxis, range:[0,maxV*1.3], showticklabels:false},
    yaxis:{...baseLayout().yaxis, tickfont:{size:10,color:C.text}},
  });
}

function chartRiskDist(elId, drones) {
  if (!drones||!drones.length) return;
  const crashed     = drones.filter(d=>d.crashed).map(d=>d.risk_score);
  const not_crashed = drones.filter(d=>!d.crashed).map(d=>d.risk_score);
  const traces = [];
  if (crashed.length >= 2) {
    traces.push({type:'box',y:crashed,name:'Crashed',boxpoints:'all',jitter:0.4,
      marker:{color:C.safety,size:5,opacity:0.8},
      line:{color:C.safety},fillcolor:C.safety+'22',
      hovertemplate:'Crashed<br>Risk: %{y:.3f}<extra></extra>'});
  }
  if (not_crashed.length >= 2) {
    traces.push({type:'box',y:not_crashed,name:'Survived',boxpoints:'all',jitter:0.4,
      marker:{color:C.stat,size:5,opacity:0.8},
      line:{color:C.stat},fillcolor:C.stat+'22',
      hovertemplate:'Survived<br>Risk: %{y:.3f}<extra></extra>'});
  }
  safePlot(elId, traces, {
    ...baseLayout(280),
    yaxis:{...baseLayout().yaxis,title:'Predicted crash probability (0–1)',range:[-0.05,1.05]},
    shapes:[{type:'line',x0:-0.5,x1:1.5,y0:0.5,y1:0.5,
      line:{color:C.temporal,dash:'dot',width:1.5}}],
    annotations:[{x:1.4,y:0.52,xref:'x',yref:'y',text:'0.5 threshold',
      showarrow:false,font:{family:'IBM Plex Mono',size:8,color:C.temporal}}],
  });
}

function chartAnomalyMap(elId, drones) {
  if (!drones||!drones.length) return;
  const normal    = drones.filter(d=>!d.anomaly&&d.x!=null);
  const anomalies = drones.filter(d=>d.anomaly&&d.x!=null);
  const traces = [];
  for (let v=0;v<=50;v+=10) {
    traces.push({type:'scatter',x:[v,v],y:[0,50],mode:'lines',
      line:{color:C.border,width:0.5},showlegend:false,hoverinfo:'skip'});
    traces.push({type:'scatter',x:[0,50],y:[v,v],mode:'lines',
      line:{color:C.border,width:0.5},showlegend:false,hoverinfo:'skip'});
  }
  if (normal.length) {
    traces.push({type:'scatter',mode:'markers',name:'Normal',
      x:normal.map(d=>d.x),y:normal.map(d=>d.y),
      marker:{size:7,color:C.text,opacity:0.4,symbol:'circle'},
      hovertemplate:'<b>Drone %{customdata[0]}</b><br>Normal<br>%{customdata[1]}<extra></extra>',
      customdata:normal.map(d=>[d.id,d.status])});
  }
  if (anomalies.length) {
    traces.push({type:'scatter',mode:'markers',name:'Anomaly',
      x:anomalies.map(d=>d.x),y:anomalies.map(d=>d.y),
      marker:{size:14,color:C.multi,symbol:'diamond',
              line:{width:1.5,color:C.white}},
      customdata:anomalies.map(d=>[d.id,d.status,
        Math.round(d.risk_score*100),d.bat_s]),
      hovertemplate:'<b>ANOMALY — Drone %{customdata[0]}</b><br>'+
        '%{customdata[1]}<br>Risk: %{customdata[2]}%<br>'+
        'Battery start: %{customdata[3]}%<br>Pos: (%{x},%{y})<extra></extra>'});
  }
  safePlot(elId, traces, {
    ...baseLayout(280),
    xaxis:{...baseLayout().xaxis,range:[-1,51],dtick:10,title:'X'},
    yaxis:{...baseLayout().yaxis,range:[-1,51],dtick:10,title:'Y',scaleanchor:'x'},
    legend:{x:1.02,y:1,font:{size:8,color:C.text},bgcolor:'rgba(0,0,0,0)',
            bordercolor:C.border,borderwidth:1},
    margin:{l:48,r:80,t:16,b:40},
  });
}

function chartRiskByVehicle(elId, drones) {
  if (!drones||!drones.length) return;
  const cats = {};
  drones.forEach(d=>{
    const cat = d.status.includes('Collision')?'Crashed':
                d.status.includes('Battery')?'Battery':
                d.status.includes('Cancelled')?'Cancelled':'Complete';
    if (!cats[cat]) cats[cat] = {Low:0,Medium:0,High:0};
    cats[cat][d.risk_tier]=(cats[cat][d.risk_tier]||0)+1;
  });
  const labels = Object.keys(cats);
  const tiers  = ['Low','Medium','High'];
  const colors = [C.stat,C.temporal,C.safety];
  const traces = tiers.map((tier,i)=>({
    type:'bar',name:tier,
    x:labels,y:labels.map(l=>cats[l][tier]||0),
    marker:{color:colors[i]},
    hovertemplate:`<b>${tier} Risk</b><br>%{x}: %{y} drones<extra></extra>`,
  }));
  safePlot(elId, traces, {
    ...baseLayout(280,{barmode:'stack'}),
    xaxis:{...baseLayout().xaxis,title:'Outcome category'},
    yaxis:{...baseLayout().yaxis,title:'Drone count'},
  });
}

function chartConfusion(elId, conf) {
  if (!conf) return;
  const total = conf.tp+conf.fp+conf.tn+conf.fn;
  const acc   = total>0?Math.round((conf.tp+conf.tn)/total*100):0;
  const z = [[conf.tn,conf.fp],[conf.fn,conf.tp]];
  const labels_x = ['Predicted: Safe','Predicted: Crash'];
  const labels_y = ['Actually: Safe','Actually: Crashed'];
  safePlot(elId, [{
    type:'heatmap', z:z, x:labels_x, y:labels_y,
    colorscale:[[0,'#0e1520'],[0.5,'#4fa8d444'],[1,'#7abd7a']],
    showscale:false,
    text:[
      ['TN: '+conf.tn,'FP: '+conf.fp],
      ['FN: '+conf.fn,'TP: '+conf.tp],
    ],
    texttemplate:'<b>%{text}</b><br>%{z}',
    textfont:{family:'IBM Plex Mono',size:11,color:C.white},
    hovertemplate:'%{y}<br>%{x}<br>Count: %{z}<extra></extra>',
  }], {
    paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:C.plot,height:280,
    font:{family:'IBM Plex Mono',color:C.text,size:10},
    margin:{l:120,r:20,t:48,b:80},
    xaxis:{tickfont:{size:9,color:C.text}},
    yaxis:{tickfont:{size:9,color:C.text}},
    title:{text:'Accuracy: '+acc+'% ('+((conf.tp+conf.tn))+'/'+total+' correct)',
           font:{family:'IBM Plex Mono',size:10,color:C.white},x:0},
    hoverlabel:{bgcolor:C.plot,bordercolor:C.border,
      font:{family:'IBM Plex Mono',size:10,color:C.white}},
  });
}

// ── PAGE: TRIAL INTELLIGENCE ──────────────────────────────────────────────────

function chartOutcomeFunnel(elId, data) {
  const labels=['FLEET','COMPLETE','BAT FAIL','DIRECT CRASH','PROXIMITY','CNCL FLIGHT','CNCL PRE'];
  const vals=[data.total||0,data.complete||0,data.batt_fail||0,
    data.coll_direct||0,data.coll_prox||0,data.canc_inflight||0,data.canc_preflight||0];
  const clrs=[C.fleet,C.stat,C.multi,C.safety,'#ff6b1a','#ffaa00',C.text];
  const total=data.total||1;
  safePlot(elId, [{
    type:'bar', x:labels, y:vals,
    marker:{color:clrs, opacity:0.85, line:{color:clrs,width:1}},
    text:vals.map((v,i)=>v+(i>0?'\n'+(v/total*100).toFixed(0)+'%':'')),
    textposition:'outside',
    textfont:{size:9,color:C.white,family:'JetBrains Mono,monospace'},
    hovertemplate:'<b>%{x}</b><br>%{y} drones<extra></extra>',
  }], {
    ...baseLayout(280), bargap:0.3, showlegend:false,
    margin:{l:40,r:20,t:40,b:60},
    yaxis:{...baseLayout().yaxis, range:[0,total*1.35]},
    shapes:[{type:'line',x0:-0.5,x1:6.5,y0:total*0.8,y1:total*0.8,
      line:{color:C.stat,dash:'dot',width:1}}],
  });
}

function chartCumSeverity(elId, data) {
  if (!data||!data.ticks||!data.ticks.length) return;
  safePlot(elId, [
    {type:'scatter',x:data.ticks,y:data.critical,mode:'lines+markers',
      name:'Critical',fill:'tozeroy',fillcolor:C.safety+'18',
      line:{color:C.safety,width:2},marker:{size:5,color:C.safety}},
    {type:'scatter',x:data.ticks,y:data.minor,mode:'lines+markers',
      name:'Minor',fill:'tozeroy',fillcolor:C.temporal+'18',
      line:{color:C.temporal,width:2},marker:{size:5,color:C.temporal}},
    {type:'scatter',x:data.ticks,y:data.near_miss,mode:'lines+markers',
      name:'Near Miss',fill:'tozeroy',fillcolor:C.fleet+'18',
      line:{color:C.fleet,width:2},marker:{size:5,color:C.fleet}},
  ], {
    ...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Grid tick'},
    yaxis:{...baseLayout().yaxis,title:'Cumulative events'},
    margin:{l:48,r:16,t:16,b:40},
  });
}

function chartEventHeatmap(elId, data) {
  if (!data||!data.ticks||!data.ticks.length) {
    const el=document.getElementById(elId);
    if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">No collision events.</div>';
    return;
  }
  safePlot(elId, [{
    type:'heatmap',
    z:data.z,
    x:data.ticks.map(t=>'Tick '+t),
    y:data.types,
    colorscale:[[0,'#0e1520'],[0.01,'#1c2d42'],[0.4,C.temporal],[1,C.safety]],
    showscale:true,
    text:data.z,
    texttemplate:'%{text}',
    textfont:{family:'IBM Plex Mono',size:11,color:C.white},
    colorbar:{tickfont:{size:8,color:C.text},
      title:{text:'count',font:{size:8,color:C.text}},thickness:10,len:0.6},
    xgap:2,ygap:2,
  }], {
    paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:C.plot,height:200,
    font:{family:'IBM Plex Mono',color:C.text,size:10},
    margin:{l:90,r:80,t:16,b:60},
    xaxis:{tickfont:{size:8,color:C.text},tickangle:30},
    yaxis:{tickfont:{size:9,color:C.text}},
    hoverlabel:{bgcolor:C.plot,bordercolor:C.border,
      font:{family:'IBM Plex Mono',size:10,color:C.white}},
  });
}

function chartFullTimeline(elId, events) {
  if (!events||!events.length) {
    const el=document.getElementById(elId);
    if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text2);padding:1.5rem">No events.</div>';
    return;
  }

  const laneLabels = ['Complete','Battery Fail','Cancel Pre',
                      'Cancel In-flight','Critical','Minor','Near Miss'];
  const laneColors = [C.stat,C.multi,'#546e7a',C.temporal,C.safety,'#e08c52',C.fleet];

  // Separate terminal events (lane 0-3) from collision events (lane 4-6)
  const terminalLanes = [0,1,2,3];
  const collLanes     = [4,5,6];

  // Terminal events → horizontal bar chart showing counts by duration ranges
  const termCounts = terminalLanes.map(l=>{
    const evts = events.filter(e=>e.lane===l);
    return {lane:l, label:laneLabels[l], count:evts.length, color:laneColors[l],
            durations:evts.filter(e=>e.duration!=null).map(e=>e.duration)};
  });

  // Collision events → swimlane by tick
  const collEvents = events.filter(e=>collLanes.includes(e.lane));

  const traces = [];

  // Section 1: Collision swimlane (lanes 4,5,6 mapped to y=0,1,2)
  collLanes.forEach((lane,idx)=>{
    const evts = events.filter(e=>e.lane===lane);
    if (!evts.length) return;
    const col = laneColors[lane];
    const sz  = {4:14,5:11,6:9};
    traces.push({
      type:'scatter', mode:'markers', name:laneLabels[lane],
      x:evts.map(e=>e.tick||0), y:evts.map(_=>idx),
      xaxis:'x', yaxis:'y',
      marker:{size:sz[lane]||9, color:col, opacity:0.9, symbol:'diamond',
              line:{width:1,color:C.white+"33"}},
      customdata:evts.map(e=>[e.severity||laneLabels[lane],
        e.id_a||'—',e.id_b||'—',e.veh_a||'—',e.tick||'—']),
      hovertemplate:'<b>%{customdata[0]}</b> Tick %{customdata[4]}<br>'+
        'D%{customdata[1]}(%{customdata[3]}) × D%{customdata[2]}<extra></extra>',
    });
  });

  // Tick density bar on secondary y
  const tickCounts = {};
  collEvents.forEach(e=>{if(e.tick!=null) tickCounts[e.tick]=(tickCounts[e.tick]||0)+1;});
  const tks = Object.keys(tickCounts).map(Number).sort((a,b)=>a-b);
  if (tks.length) {
    traces.push({type:'bar',x:tks,y:tks.map(t=>tickCounts[t]),
      name:'Events/tick',xaxis:'x',yaxis:'y3',
      marker:{color:C.temporal+'55'},showlegend:false});
  }

  // Section 2: Terminal outcome bars (by duration bucket)
  termCounts.filter(t=>t.count>0).forEach(t=>{
    traces.push({
      type:'bar', name:t.label,
      x:[t.label], y:[t.count],
      xaxis:'x2', yaxis:'y2',
      marker:{color:t.color},
      text:[t.count], textposition:'outside',
      textfont:{family:'IBM Plex Mono',size:10,color:C.white},
      hovertemplate:`<b>${t.label}</b><br>Count: ${t.count}<extra></extra>`,
      showlegend:false,
    });
  });

  safePlot(elId, traces, {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:C.plot, height:420,
    font:{family:'IBM Plex Mono', color:C.text, size:10},
    hoverlabel:{bgcolor:C.plot,bordercolor:C.border,
      font:{family:'IBM Plex Mono',size:10,color:C.white}},
    legend:{bgcolor:'rgba(0,0,0,0)',bordercolor:C.border,borderwidth:1,
      font:{size:9,color:C.text},x:0,y:1.08,orientation:'h'},
    margin:{l:80,r:16,t:60,b:50},

    // Left plot: collision swimlane (0-60% of width)
    xaxis:{domain:[0,0.6], title:'Grid tick',
      gridcolor:C.border,linecolor:C.border,
      tickfont:{size:9,color:C.text}},
    yaxis:{domain:[0,1], tickvals:[0,1,2],
      ticktext:['Critical','Minor','Near Miss'],
      range:[-0.6,2.6],gridcolor:C.border,
      tickfont:{size:8,color:C.text}},
    yaxis3:{overlaying:'y',side:'right',showgrid:false,showticklabels:false,
      range:[0,Math.max(...Object.values(tickCounts),1)*6]},

    // Right plot: terminal outcomes bar (65-100% of width)
    xaxis2:{domain:[0.65,1], title:'Terminal state',
      tickfont:{size:8,color:C.text},tickangle:20,
      gridcolor:C.border,linecolor:C.border},
    yaxis2:{anchor:'x2', title:'Drone count',
      gridcolor:C.border,linecolor:C.border,
      tickfont:{size:9,color:C.text}},

    // Divider annotation
    shapes:[{type:'line',x0:0.63,x1:0.63,y0:0,y1:1,xref:'paper',yref:'paper',
      line:{color:C.border,width:1,dash:'dot'}}],
    annotations:[
      {x:0.3,y:1.06,xref:'paper',yref:'paper',text:'COLLISION EVENTS BY TICK',
        showarrow:false,font:{family:'IBM Plex Mono',size:8,color:C.text2}},
      {x:0.82,y:1.06,xref:'paper',yref:'paper',text:'TERMINAL OUTCOMES',
        showarrow:false,font:{family:'IBM Plex Mono',size:8,color:C.text2}},
    ],
    barmode:'group',
  });
}

// Risk factors scatter: risk score vs battery start, sized by planned distance
function chartRiskFactors(elId, drones) {
  if (!drones||!drones.length) return;
  const valid = drones.filter(d=>d.bat_s!=null&&d.risk_score!=null);
  if (!valid.length) return;
  const cols = valid.map(d=>d.crashed?C.safety:C.stat);
  safePlot(elId, [{
    type:'scatter', mode:'markers',
    x:valid.map(d=>d.bat_s),
    y:valid.map(d=>d.risk_score),
    marker:{
      size:valid.map(d=>5+(d.dp||10)/8),
      color:cols, opacity:0.85,
      line:{width:valid.map(d=>d.crashed?2:0.5),
            color:valid.map(d=>d.crashed?C.white:C.border)},
    },
    customdata:valid.map(d=>[d.id,d.status,
      Math.round(d.risk_score*100),d.bat_s,d.dp||0]),
    hovertemplate:'<b>Drone %{customdata[0]}</b><br>%{customdata[1]}<br>'+
      'Risk: %{customdata[2]}%  Battery start: %{customdata[3]}%<br>'+
      'Planned dist: %{customdata[4]}<extra></extra>',
    showlegend:false,
  },{
    type:'scatter',mode:'markers',name:'Crashed',showlegend:true,
    x:[null],y:[null],marker:{size:8,color:C.safety,symbol:'circle'},
  },{
    type:'scatter',mode:'markers',name:'Survived',showlegend:true,
    x:[null],y:[null],marker:{size:8,color:C.stat,symbol:'circle'},
  }], {
    ...baseLayout(280),
    xaxis:{...baseLayout().xaxis,title:'Battery at start (%)'},
    yaxis:{...baseLayout().yaxis,title:'Predicted crash probability (0–1)',
           range:[-0.05,1.05]},
    shapes:[{type:'line',x0:0,x1:100,y0:0.5,y1:0.5,
      line:{color:C.temporal,dash:'dot',width:1}}],
    annotations:[{x:95,y:0.52,xref:'x',yref:'y',text:'0.5 threshold',
      showarrow:false,font:{family:'IBM Plex Mono',size:8,color:C.temporal}}],
    margin:{l:48,r:80,t:16,b:40},
  });
}

// ── NEW ANALYSIS CHARTS ───────────────────────────────────────────────────────

// Mission success rate by launch zone — 5x5 crash rate heatmap
function chartZoneCrash(elId, data) {
  if (!data||!data.z||!data.z.length) return;
  // Replace null with -0.1 for display (no drones in zone)
  const z_display = data.z.map(row =>
    row.map(v => v === null ? -0.1 : v)
  );
  safePlot(elId, [{
    type:'heatmap',
    z: z_display,
    x: data.x_labels,
    y: data.y_labels,
    colorscale:[
      [0,   '#2a3d52'],   // no data
      [0.05,'#7abd7a'],   // 0% crash = safe
      [0.35, '#d4a84f'],  // medium risk
      [0.65, '#e08c52'],  // high risk
      [1.0,  '#e05252'],  // 100% crash = danger
    ],
    zmin:-0.1, zmax:1,
    showscale:true,
    text: data.text,
    texttemplate:'%{text}',
    textfont:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'},
    colorbar:{
      tickvals:[-0.1,0,0.25,0.5,0.75,1.0],
      ticktext:['no data','0%','25%','50%','75%','100%'],
      tickfont:{size:8,color:'#4a6278'},
      title:{text:'crash rate',font:{size:8,color:'#4a6278'}},
      thickness:10,len:0.8,
    },
    hovertemplate:'Zone X: %{x}<br>Zone Y: %{y}<br>'+
      'Crash rate: %{z:.0%}<br>Crashes/drones: %{text}<extra></extra>',
    xgap:3, ygap:3,
  }], {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:280,
    font:{family:'IBM Plex Mono',color:'#4a6278',size:10},
    margin:{l:60,r:100,t:16,b:50},
    xaxis:{title:'X grid zone',tickfont:{size:9,color:'#4a6278'}},
    yaxis:{title:'Y grid zone',tickfont:{size:9,color:'#4a6278'}},
    hoverlabel:{bgcolor:'#0e1520',bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}

// Collision pair network — drone IDs as nodes, collisions as edges
function chartPairNetwork(elId, data) {
  const el = document.getElementById(elId);
  if (!data||!data.nodes||!data.nodes.length) {
    if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">No collision events.</div>';
    return;
  }

  const TYPE_C_local = {Direct:'#e05252',Proximity:'#e08c52','Near Miss':'#d4a84f'};
  const traces = [];

  // Draw edges first (lines between colliding drones)
  data.edges.forEach(edge => {
    const nodeA = data.nodes.find(n=>n.id===edge.a);
    const nodeB = data.nodes.find(n=>n.id===edge.b);
    if (!nodeA||!nodeB) return;
    const col = TYPE_C_local[edge.type]||'#4a6278';
    traces.push({
      type:'scatter', mode:'lines', showlegend:false, hoverinfo:'skip',
      x:[nodeA.x, nodeB.x, null],
      y:[nodeA.y, nodeB.y, null],
      line:{color:col+'99', width: edge.type==='Direct'?2.5:1.5,
            dash: edge.type==='Near Miss'?'dot':'solid'},
    });
    // Midpoint tick label
    traces.push({
      type:'scatter', mode:'text', showlegend:false, hoverinfo:'skip',
      x:[(nodeA.x+nodeB.x)/2], y:[(nodeA.y+nodeB.y)/2],
      text:[`t${edge.tick}`],
      textfont:{family:'IBM Plex Mono',size:8,color:'#4a6278'},
      textposition:'top center',
    });
  });

  // Nodes — sized by degree (how many collisions)
  const crashed = data.nodes.filter(n=>n.crashed);
  const survived = data.nodes.filter(n=>!n.crashed);

  if (survived.length) traces.push({
    type:'scatter', mode:'markers+text', name:'Near Miss only',
    x:survived.map(n=>n.x), y:survived.map(n=>n.y),
    text:survived.map(n=>String(n.id)),
    textfont:{family:'IBM Plex Mono',size:8,color:'#d4e1ed'},
    textposition:'top center',
    marker:{size:survived.map(n=>10+n.degree*4),
      color:'#d4a84f', opacity:0.9,
      line:{width:1.5,color:'#d4e1ed66'}},
    customdata:survived.map(n=>[n.id,n.vehicle,n.status,n.degree]),
    hovertemplate:'<b>Drone %{customdata[0]}</b> (%{customdata[1]})<br>'+
      '%{customdata[2]}<br>Collision events: %{customdata[3]}<extra></extra>',
  });

  if (crashed.length) traces.push({
    type:'scatter', mode:'markers+text', name:'Crashed',
    x:crashed.map(n=>n.x), y:crashed.map(n=>n.y),
    text:crashed.map(n=>String(n.id)),
    textfont:{family:'IBM Plex Mono',size:8,color:'#d4e1ed'},
    textposition:'top center',
    marker:{size:crashed.map(n=>10+n.degree*4),
      color:'#e05252', opacity:0.9,
      line:{width:2,color:'#d4e1ed88'}},
    customdata:crashed.map(n=>[n.id,n.vehicle,n.status,n.degree]),
    hovertemplate:'<b>Drone %{customdata[0]}</b> (%{customdata[1]})<br>'+
      '%{customdata[2]}<br>Collision events: %{customdata[3]}<extra></extra>',
  });

  safePlot(elId, traces, {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:280,
    font:{family:'IBM Plex Mono',color:'#4a6278',size:10},
    margin:{l:20,r:80,t:16,b:20},
    xaxis:{range:[-2,52],showgrid:true,gridcolor:'#1c2d42',
      showticklabels:false,zeroline:false},
    yaxis:{range:[-2,52],showgrid:true,gridcolor:'#1c2d42',
      showticklabels:false,zeroline:false,scaleanchor:'x'},
    legend:{x:1.02,y:1,bgcolor:'rgba(0,0,0,0)',bordercolor:'#1c2d42',
      borderwidth:1,font:{size:9,color:'#4a6278'}},
    hoverlabel:{bgcolor:'#0e1520',bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}

// Layer collision density — collisions per drone per altitude layer
function chartLayerDensity(elId, data) {
  if (!data||!data.layers||!data.layers.length) return;
  const layers = data.layers;
  const LAYER_C_local = {1:'#4fa8d4',2:'#7abd7a',3:'#d4a84f',4:'#a07acd'};

  safePlot(elId, [
    // Drone count bars (background)
    {type:'bar', name:'Drones in layer',
      x:layers.map(l=>l.label), y:layers.map(l=>l.drones),
      marker:{color:layers.map(l=>LAYER_C_local[l.layer]||'#4a6278'),opacity:0.3},
      yaxis:'y',
      hovertemplate:'<b>%{x}</b><br>Drones: %{y}<extra></extra>'},
    // Collision count bars
    {type:'bar', name:'Collision events',
      x:layers.map(l=>l.label), y:layers.map(l=>l.collisions),
      marker:{color:layers.map(l=>LAYER_C_local[l.layer]||'#4a6278'),opacity:0.9},
      yaxis:'y',
      hovertemplate:'<b>%{x}</b><br>Collisions: %{y}<extra></extra>'},
    // Density line on secondary axis
    {type:'scatter', mode:'lines+markers+text', name:'Density (colls/drone)',
      x:layers.map(l=>l.label), y:layers.map(l=>l.density),
      yaxis:'y2',
      line:{color:'#e05252',width:2.5},
      marker:{size:10,color:layers.map(l=>
        l.density>1?'#e05252':l.density>0.5?'#d4a84f':'#7abd7a'),
        line:{width:1.5,color:'#d4e1ed'}},
      text:layers.map(l=>l.density.toFixed(2)),
      textposition:'top center',
      textfont:{family:'IBM Plex Mono',size:9,color:'#d4e1ed'},
      hovertemplate:'<b>%{x}</b><br>Density: %{y:.3f} colls/drone<extra></extra>'},
  ], {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:280,
    font:{family:'IBM Plex Mono',color:'#4a6278',size:10},
    margin:{l:48,r:60,t:28,b:50},
    barmode:'overlay',
    xaxis:{tickfont:{size:9,color:'#4a6278'},gridcolor:'#1c2d42',linecolor:'#1c2d42'},
    yaxis:{title:'Count',gridcolor:'#1c2d42',linecolor:'#1c2d42',
      tickfont:{size:9,color:'#4a6278'}},
    yaxis2:{overlaying:'y',side:'right',title:'Density (collisions/drone)',
      tickfont:{size:9,color:'#e05252'},
      title_font:{size:9,color:'#e05252'},showgrid:false},
    legend:{x:0,y:1.08,bgcolor:'rgba(0,0,0,0)',font:{size:9,color:'#4a6278'},
      orientation:'h'},
    shapes:[{type:'line',x0:-0.5,x1:3.5,y0:1,y1:1,yref:'y2',
      line:{color:'#e05252',dash:'dot',width:1}}],
    annotations:[{x:3.4,y:1.05,xref:'x',yref:'y2',text:'1.0 critical',
      showarrow:false,font:{family:'IBM Plex Mono',size:8,color:'#e05252'}}],
    hoverlabel:{bgcolor:'#0e1520',bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}

// ── THREE NEW CHARTS ──────────────────────────────────────────────────────────

// Vehicle Performance — Dot Matrix Heatmap
// Each cell = one vehicle × one metric
// Circle SIZE = score magnitude (bigger = better)
// Circle COLOUR = performance level (green→red)
function chartVehicleRadar(elId, data) {
  if (!data||!data.vehicles||!data.vehicles.length) return;

  const vehicles = data.vehicles.map(v=>v.vehicle);
  const metrics  = data.axes;

  // Build one scatter trace per vehicle (column)
  // X = vehicle index, Y = metric index
  // marker size and color encode the score
  const VEH_LABEL = {
    quad:'Quad', hexa:'Hexa', octa:'Octa',
    vtol:'VTOL', fixed_wing:'Fixed Wing'
  };

  // All scores flat for color scale reference
  const scores = [];
  data.vehicles.forEach(v => {
    [v.completion, v.safety, v.bat_eff, v.route_eff, v.route_load]
      .forEach(s => scores.push(s));
  });

  const traces = [];

  // Dot trace — one per vehicle so hover shows vehicle name
  data.vehicles.forEach((v, xi) => {
    const vals = [v.completion, v.bat_fail, v.bat_consumed, v.bat_reserve, v.cancellation];
    const raw  = [
      v.raw.comp + '% completed',
      (100-v.raw.bat_fail).toFixed(0) + '% battery failure rate',
      v.raw.bat_u + '% avg battery consumed',
      v.raw.bat_e + '% avg battery remaining at end',
      v.raw.canc + '% cancellation rate',
    ];

    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: VEH_LABEL[v.vehicle] || v.vehicle,
      x: metrics.map((_,mi) => xi),
      y: metrics.map((_,mi) => mi),
      marker: {
        size:  vals.map(s => 8 + s * 0.32),  // 8px min, 40px max
        color: vals,
        colorscale: [[0,'#e05252'],[0.35,'#e08c52'],
                     [0.55,'#d4a84f'],[0.75,'#7abd7a'],[1,'#4fa8d4']],
        cmin: 0, cmax: 100,
        showscale: xi === 0,  // show colorbar only once
        colorbar: xi === 0 ? {
          tickvals:[0,25,50,75,100],
          ticktext:['0','25','50','75','100'],
          title:{text:'score',font:{size:8,color:'#4a6278'}},
          tickfont:{size:8,color:'#4a6278'},
          thickness:8, len:0.6, x:1.02,
        } : undefined,
        line:{width:1.5, color:'rgba(255,255,255,0.3)'},
        opacity:0.92,
      },
      customdata: vals.map((s,mi)=>[metrics[mi], s.toFixed(0), raw[mi]]),
      hovertemplate:
        '<b>'+(VEH_LABEL[v.vehicle]||v.vehicle)+'</b><br>'+
        '%{customdata[0]}<br>'+
        'Score: %{customdata[1]}/100<br>'+
        'Value: %{customdata[2]}<extra></extra>',
      showlegend: false,
    });

    // Score labels inside each dot
    traces.push({
      type:'scatter', mode:'text',
      x: metrics.map((_,mi)=>xi),
      y: metrics.map((_,mi)=>mi),
      text: vals.map(s => s.toFixed(0)),
      textfont:{family:'IBM Plex Mono', size:9,
        color: vals.map(s => s > 45 ? '#0e1520' : '#d4e1ed')},
      showlegend:false, hoverinfo:'skip',
    });
  });

  // Vehicle label annotations at top
  const annotations = data.vehicles.map((v,xi)=>({
    x: xi, y: metrics.length - 0.05,
    xref:'x', yref:'paper',
    text: '<b>'+(VEH_LABEL[v.vehicle]||v.vehicle)+'</b>',
    showarrow:false, yanchor:'bottom',
    font:{family:'IBM Plex Mono', size:10, color:'#d4e1ed'},
  }));

  safePlot(elId, traces, {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:300,
    font:{family:'IBM Plex Mono', color:'#4a6278', size:10},
    margin:{l:140, r:80, t:50, b:30},
    xaxis:{
      tickvals: data.vehicles.map((_,i)=>i),
      ticktext: data.vehicles.map(v => VEH_LABEL[v.vehicle]||v.vehicle),
      tickfont:{size:10, color:'#d4e1ed'},
      gridcolor:'#1c2d42', zeroline:false, showline:false,
      side:'top',
    },
    yaxis:{
      tickvals: metrics.map((_,i)=>i),
      ticktext: metrics,
      tickfont:{size:10, color:'#8fa3b8'},
      gridcolor:'#1c2d42', zeroline:false, showline:false,
      autorange:'reversed',
    },
    annotations,
    hoverlabel:{bgcolor:'#0e1520', bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}

// Route Length Assignment by Vehicle — stacked bar
function chartRouteByVehicle(elId, data) {
  if (!data||!data.vehicles||!data.vehicles.length) return;
  const bucketColors = ['#4fa8d4','#7abd7a','#d4a84f','#e05252'];
  const traces = data.buckets.map((bucket, i) => ({
    type:'bar', name:bucket,
    x: data.vehicles,
    y: data.vehicles.map(v => data.data[v][i]||0),
    marker:{color: bucketColors[i], opacity:0.85},
    hovertemplate: `<b>%{x}</b><br>${bucket}: %{y} drones<extra></extra>`,
  }));
  safePlot(elId, traces, {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:280,
    font:{family:'IBM Plex Mono', color:'#4a6278', size:10},
    barmode:'stack',
    xaxis:{tickfont:{size:9,color:'#8fa3b8'}, title:'Vehicle type',
      gridcolor:'#1c2d42', linecolor:'#1c2d42'},
    yaxis:{tickfont:{size:9,color:'#4a6278'}, title:'Drone count',
      gridcolor:'#1c2d42', linecolor:'#1c2d42'},
    legend:{bgcolor:'rgba(0,0,0,0)', bordercolor:'#1c2d42', borderwidth:1,
      font:{size:9,color:'#4a6278'}, x:1.01, y:1},
    margin:{l:48,r:120,t:16,b:50},
    hoverlabel:{bgcolor:'#0e1520',bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}

// Layer Safety Profile — grouped bar completion/crash/battery/cancel per layer
function chartLayerSafety(elId, data) {
  if (!data||!data.layers||!data.layers.length) return;
  const labels  = data.layers.map(l=>l.label);
  const metrics = [
    {key:'complete_pct', name:'Complete',       color:'#7abd7a'},
    {key:'crash_pct',    name:'Crashed',        color:'#e05252'},
    {key:'battery_pct',  name:'Battery Fail',   color:'#a07acd'},
    {key:'cancel_pct',   name:'Cancelled',      color:'#d4a84f'},
  ];
  const traces = metrics.map(m => ({
    type:'bar', name:m.name,
    x: labels,
    y: data.layers.map(l=>l[m.key]),
    marker:{color:m.color, opacity:0.85},
    text: data.layers.map(l=>`${l[m.key]}%`),
    textposition:'inside',
    textfont:{family:'IBM Plex Mono',size:8,color:'#d4e1ed'},
    hovertemplate:`<b>%{x}</b><br>${m.name}: %{y}%<extra></extra>`,
  }));
  // Add drone count annotation
  const countTrace = {
    type:'scatter', mode:'markers+text', name:'Drone count',
    x:labels, y:data.layers.map(_=>105),
    text:data.layers.map(l=>`n=${l.drones}`),
    textfont:{family:'IBM Plex Mono',size:8,color:'#4a6278'},
    textposition:'middle center',
    marker:{size:0}, showlegend:false, hoverinfo:'skip',
  };
  safePlot(elId, [...traces, countTrace], {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:280,
    font:{family:'IBM Plex Mono', color:'#4a6278', size:10},
    barmode:'stack',
    xaxis:{tickfont:{size:9,color:'#8fa3b8'}, title:'Altitude layer',
      gridcolor:'#1c2d42', linecolor:'#1c2d42'},
    yaxis:{tickfont:{size:9,color:'#4a6278'}, title:'% of drones in layer',
      range:[0,115], gridcolor:'#1c2d42', linecolor:'#1c2d42'},
    legend:{bgcolor:'rgba(0,0,0,0)', bordercolor:'#1c2d42', borderwidth:1,
      font:{size:9,color:'#4a6278'}, x:1.01, y:1},
    margin:{l:48,r:100,t:16,b:50},
    shapes:[{type:'line',x0:-0.5,x1:data.layers.length-0.5,y0:50,y1:50,
      line:{color:'#4a6278',dash:'dot',width:1}}],
    hoverlabel:{bgcolor:'#0e1520',bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}

// Conflict Escalation Timeline — escalated pairs only
function chartConflictEscalation(elId, data) {
  const el = document.getElementById(elId);
  if (!data||!data.pairs||!data.pairs.length) {
    if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text2);padding:1rem">No escalation events found.</div>';
    return;
  }

  // Only show pairs that escalated Near Miss → Crash
  const escalated = data.pairs.filter(p => p.escalated);
  if (!escalated.length) {
    if(el) el.innerHTML='<div style="font-family:var(--font-mono);font-size:0.65rem;color:#7abd7a;padding:1rem">No escalations — every near miss was successfully resolved.</div>';
    return;
  }

  const SEV_C_local = {'Critical':'#e05252','Minor':'#e08c52','Near Miss':'#d4a84f'};
  const traces = [];

  escalated.forEach((pair, i) => {
    // Connecting line
    traces.push({
      type:'scatter', mode:'lines', showlegend:false, hoverinfo:'skip',
      x: pair.events.map(e=>e.tick),
      y: pair.events.map(_=>i),
      line:{ color:'#e0525255', width:2.5 },
    });
    // Event markers
    pair.events.forEach(evt => {
      const col = SEV_C_local[evt.severity]||'#4a6278';
      const sym = evt.severity==='Critical'?'diamond':evt.severity==='Minor'?'square':'circle';
      const sz  = evt.severity==='Critical'?18:evt.severity==='Minor'?14:12;
      traces.push({
        type:'scatter', mode:'markers+text',
        name:evt.severity, showlegend:false,
        x:[evt.tick], y:[i],
        text:[evt.severity],
        textposition:'top center',
        textfont:{family:'IBM Plex Mono',size:8,color:col},
        marker:{size:sz, color:col, symbol:sym,
          line:{width:2, color:'#ffffff88'}},
        hovertemplate:`<b>${pair.pair}</b><br>Tick ${evt.tick}<br>${evt.type} — ${evt.severity}<extra></extra>`,
      });
    });
    // Arrow annotation showing the escalation direction
  });

  // Legend
  [['Near Miss','#d4a84f','circle',12],
   ['Minor','#e08c52','square',14],
   ['Critical — CRASH','#e05252','diamond',18]].forEach(([n,c,s,sz])=>{
    traces.push({type:'scatter',mode:'markers',name:n,x:[null],y:[null],
      marker:{size:sz,color:c,symbol:s}});
  });

  const minTick = Math.min(...escalated.flatMap(p=>p.events.map(e=>e.tick))) - 1;
  const maxTick = Math.max(...escalated.flatMap(p=>p.events.map(e=>e.tick))) + 1;

  safePlot(elId, traces, {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0e1520', height:220,
    font:{family:'IBM Plex Mono', color:'#8fa3b8', size:10},
    margin:{l:100, r:120, t:44, b:50},
    xaxis:{
      title:'Grid tick', range:[minTick, maxTick], dtick:1,
      gridcolor:'#1c2d42', linecolor:'#1c2d42', zeroline:false,
      tickfont:{size:9,color:'#8fa3b8'},
    },
    yaxis:{
      tickvals: escalated.map((_,i)=>i),
      ticktext: escalated.map(p=>p.pair),
      tickfont:{size:11, color:'#e05252'},
      gridcolor:'#1c2d42', linecolor:'#1c2d42', zeroline:false,
      range:[-0.7, escalated.length-0.3],
    },
    legend:{x:1.02,y:1,bgcolor:'rgba(0,0,0,0)',
      bordercolor:'#1c2d42',borderwidth:1,font:{size:9,color:'#8fa3b8'}},
    shapes: escalated.map((_,i)=>({
      type:'rect', xref:'paper', yref:'y',
      x0:0, x1:1, y0:i-0.5, y1:i+0.5,
      fillcolor:'#e0525208', line:{width:0},
    })),
    annotations:[{
      x:0, y:1.18, xref:'paper', yref:'paper', xanchor:'left',
      text:'These drone pairs had a Near Miss but the algorithm failed to prevent a Direct Crash on the next tick',
      showarrow:false,
      font:{family:'IBM Plex Mono',size:8,color:'#e05252'},
    }],
    hoverlabel:{bgcolor:'#0e1520',bordercolor:'#1c2d42',
      font:{family:'IBM Plex Mono',size:10,color:'#d4e1ed'}},
  });
}
