/* ─────────────────────────────────────────────────────────────────
   app.js — Main application controller

   What this file is responsible for:
     - STATE object: holds connected status, current trial, selected
       path runs, active page, and cached API responses
     - Login modal: PostgreSQL form + Excel drag-and-drop upload
     - Trial selector: populates dropdown after connect, switches trials
     - Path run selector: multi-select for filtering by run number
     - Page navigation: showPage() swaps visible panel,
       loadPage() fetches data from the API and caches it
     - KPI strip: animated number counters, colour-coded by value
     - Page renderers: renderOverview/Spatial/Safety/Fleet/Temporal/
       MLRisk/TrialIntel — each receives API data and calls the
       chart functions in charts.js

   How data moves through the app:
     User clicks Connect
       → handleConnect()        stores trial list, selects first trial
         → selectTrial()        fetches path runs, populates selector
           → loadPage('overview')
               → API.getOverview()   fetches JSON from backend
                 → renderOverview(data)
                   → chartOutcomes() / renderLayerBars() / …  (charts.js)

   Caching:
     STATE.pageCache maps page name → API response.
     It is cleared whenever the trial or path run selection changes,
     so switching back to a page you already visited does not re-fetch.

   Script load order (in index.html):
     api.js → charts.js → animations.js → app.js
     app.js must be last because it calls functions from all of the above.
───────────────────────────────────────────────────────────────────── */

/* app.js — Main application controller */

// ── State ─────────────────────────────────────────────────────────────────────
const STATE = {
  connected : false,
  trials    : [],
  trial     : null,
  pathRuns  : [],
  selPaths  : [],
  page      : 'overview',
  pageCache : {},   // page → data (cleared on trial/path change)
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── Utility ───────────────────────────────────────────────────────────────────
function cvr(vals) {
  if (!vals.length) return 0;
  const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
  if (mean===0) return 0;
  const std  = Math.sqrt(vals.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/vals.length);
  return Math.round(std/mean*1000)/1000;
}
function stabilityLabel(cv) {
  if (cv < 0.1) return '✓ Stable';
  if (cv < 0.3) return '⚠ Variable';
  return '✗ Unstable';
}
function getSelPaths() {
  const sel = $('pathrun-select');
  if (!sel) return [];
  return Array.from(sel.selectedOptions).map(o=>Number(o.value));
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal()  { $('modal-overlay').classList.remove('hidden'); }
function closeModal() { $('modal-overlay').classList.add('hidden'); }

$('hero-connect-btn').addEventListener('click', openModal);
$('modal-close').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) closeModal();
});
$('btn-reconnect').addEventListener('click', openModal);

// Modal tabs
$$('.modal-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.modal-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $$('.modal-body').forEach(b=>b.classList.add('hidden'));
    $('tab-'+btn.dataset.tab).classList.remove('hidden');
  });
});

// ── File upload ───────────────────────────────────────────────────────────────
let _uploadFile = null;
const uploadZone = $('upload-zone');
const fileInput  = $('file-input');

uploadZone.addEventListener('click', ()=>fileInput.click());
uploadZone.addEventListener('dragover', e=>{e.preventDefault();uploadZone.classList.add('drag-over');});
uploadZone.addEventListener('dragleave', ()=>uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e=>{
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) { _uploadFile=f; $('upload-filename').textContent=f.name; $('btn-upload-excel').disabled=false; }
});
fileInput.addEventListener('change', ()=>{
  _uploadFile = fileInput.files[0];
  if (_uploadFile) { $('upload-filename').textContent=_uploadFile.name; $('btn-upload-excel').disabled=false; }
});

// ── Connect handlers ──────────────────────────────────────────────────────────
function showModalStatus(msg, type='ok') {
  const el = $('modal-status');
  el.textContent = msg;
  el.className = `modal-status ${type}`;
}

async function handleConnect(result) {
  STATE.connected = true;
  STATE.trials    = result.trials || [];
  STATE.pageCache = {};
  // Populate trial select
  const sel = $('trial-select');
  sel.innerHTML = '<option value="">Select trial…</option>' +
    STATE.trials.map(t=>`<option value="${t}">${t}</option>`).join('');
  closeModal();
  // Hide hero immediately, show dashboard
  const hero = $('hero');
  const dash = $('dashboard');
  if (hero) hero.classList.add('hidden');
  if (dash) dash.classList.remove('hidden');
  transitionToDashboard();
  if (STATE.trials.length >= 1) {
    sel.value = STATE.trials[0];
    await selectTrial(STATE.trials[0]);
  }
}

$('btn-connect-pg').addEventListener('click', async ()=>{
  showLoading('Connecting to PostgreSQL…');
  try {
    const r = await API.connectPostgres(
      $('db-host').value, $('db-port').value,
      $('db-name').value, $('db-user').value, $('db-pass').value
    );
    hideLoading();
    if (!r || !r.trials) throw new Error('No trials returned from server');
    showModalStatus('Connected — ' + r.trials.length + ' trial(s) found', 'ok');
    await handleConnect(r);
  } catch(e) {
    hideLoading();
    const msg = (e && e.message) ? e.message : (typeof e === 'string' ? e : 'Connection failed');
    showModalStatus('Error: ' + msg, 'err');
    console.error('PG connect error:', e);
  }
});

$('btn-upload-excel').addEventListener('click', async ()=>{
  if (!_uploadFile) return;
  showLoading('Uploading & parsing Excel…');
  try {
    const r = await API.connectExcel(_uploadFile);
    hideLoading();
    showModalStatus(`Loaded — ${r.trials.length} trial(s)`, 'ok');
    await handleConnect(r);
  } catch(e) {
    hideLoading();
    const msg2 = (e && e.message) ? e.message : String(e);
    showModalStatus('Error: '+msg2, 'err');
  }
});

// ── Trial selection ───────────────────────────────────────────────────────────
$('trial-select').addEventListener('change', async e => {
  if (e.target.value) await selectTrial(e.target.value);
});
$('pathrun-select').addEventListener('change', ()=>{
  STATE.selPaths  = getSelPaths();
  STATE.pageCache = {};
  loadPage(STATE.page);
});

async function selectTrial(trial) {
  STATE.trial     = trial;
  STATE.pageCache = {};
  showLoading('Loading trial…');
  try {
    // 1. Get path runs for new trial
    const pr = await API.getPathRuns(trial);
    STATE.pathRuns = pr.path_runs;
    STATE.selPaths = [...pr.path_runs];

    // 2. Repopulate path run selector
    const sel = $('pathrun-select');
    sel.innerHTML = STATE.pathRuns
      .map(p=>`<option value="${p}" selected>Run ${p}</option>`).join('');

    // 3. Always refresh KPI strip immediately on trial change
    try {
      const kpis = await API.getKPIs(trial, STATE.selPaths);
      updateKPIs(kpis);
    } catch(e) { console.warn('KPI refresh failed:', e); }

    hideLoading();

    // 4. Force reload current page with new trial data
    await loadPage(STATE.page);
  } catch(e) {
    hideLoading();
    console.error('selectTrial:', e);
  }
}

// ── Page navigation ───────────────────────────────────────────────────────────
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', ()=>{
    $$('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    STATE.page = btn.dataset.page;
    showPage(STATE.page);
    loadPage(STATE.page);
  });
});

function showPage(name) {
  $$('.page').forEach(p=>{ p.classList.remove('active'); p.classList.add('hidden'); });
  const pg = $('page-'+name);
  if (pg) { pg.classList.remove('hidden'); pg.classList.add('active'); }
  animatePageIn(pg);
  triggerReveal();
}

// ── KPI strip updater ─────────────────────────────────────────────────────────

// ── KPI animation helpers ────────────────────────────────────────────────────
function animateKPIValue(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  const num = parseFloat(target);
  if (isNaN(num)) { el.textContent = target; return; }
  const isFloat = target.includes('.');
  const hasPct  = target.includes('%');
  const suffix  = hasPct ? '%' : '';
  const raw     = hasPct ? parseFloat(target) : num;
  const dur = 900, start = performance.now();
  function tick(now) {
    const p = Math.min((now-start)/dur, 1);
    const e = 1 - Math.pow(1-p, 4);
    const v = isFloat ? (raw*e).toFixed(1) : Math.round(raw*e);
    el.textContent = v + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

function pulseKPICard(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.style.transition = 'box-shadow 0.3s';
  el.style.boxShadow  = '0 0 20px rgba(0,180,220,0.2)';
  setTimeout(() => { el.style.boxShadow = ''; }, 600);
}

function updateKPIs(k) {
  const set = (id, val, subId, sub, cardId, style) => {
    animateKPIValue(id, String(val));
    if (subId && sub!==undefined) $(subId).textContent = sub;
    if (cardId && style) {
      const card = $(cardId);
      card.className = 'kpi-card ' + style;
    }
  };
  set('kv-fleet',    k.N,
      'ks-fleet',    `${k.N} drones`,
      'kpi-fleet',   'info');
  set('kv-complete', k.comp_pct+'%',
      'ks-complete', `${k.n_ok} of ${k.N} arrived`,
      'kpi-complete', k.comp_pct>80?'good':k.comp_pct>50?'warn':'danger');
  set('kv-coll',     k.n_coll,
      'ks-coll',     `${k.n_dir} direct · ${k.n_prox} prox · ${k.n_nm} near-miss`,
      'kpi-coll',    k.n_dir>0?'danger':k.n_coll>0?'warn':'good');
  set('kv-battery',  k.avg_bat_used+'%',
      null, null, 'kpi-battery', 'info');
  set('kv-eff',      k.avg_efficiency,
      null, null, 'kpi-eff', k.avg_efficiency>=0.95?'good':k.avg_efficiency>=0.7?'warn':'danger');
  set('kv-crash',    k.crash_pct+'%',
      'ks-crash',    `${k.n_crash}/${k.N} flights`,
      'kpi-crash',   k.crash_pct>5?'danger':k.crash_pct>0?'warn':'good');
  ['kpi-fleet','kpi-complete','kpi-coll','kpi-battery','kpi-eff','kpi-crash']
    .forEach(id=>pulseKPICard(id));
}

// ── Page loaders ──────────────────────────────────────────────────────────────
async function loadPage(name) {
  if (!STATE.trial) return;
  const prs = STATE.selPaths;
  const key = `${name}:${STATE.trial}:${prs.join(',')}`;
  if (STATE.pageCache[key]) { renderPage(name, STATE.pageCache[key]); return; }

  showLoading(`Loading ${name}…`);
  try {
    let data;
    if (name === 'overview') {
      data = await API.getOverview(STATE.trial, prs);
      updateKPIs(data.kpis);
    } else if (name === 'spatial') {
      data = await API.getSpatial(STATE.trial, prs);
    } else if (name === 'safety') {
      data = await API.getSafety(STATE.trial, prs);
      const kpis = await API.getKPIs(STATE.trial, prs);
      data.kpis = kpis;
    } else if (name === 'fleet') {
      data = await API.getFleet(STATE.trial, prs);
      updateKPIs(data.kpis);
    } else if (name === 'temporal') {
      data = await API.getTemporal(STATE.trial, prs);
    } else if (name === 'ml_risk') {
      data = await API.getMLRisk(STATE.trial, prs);
    } else if (name === 'trial_intel') {
      const mlData   = await API.getMLRisk(STATE.trial, prs);
      const fleetData = await API.getFleet(STATE.trial, prs);
      data = {...mlData,
        bat_reserve_layer: fleetData.bat_reserve_layer||[],
        dur_by_status: fleetData.dur_by_status||[],
      };
    }
    STATE.pageCache[key] = data;
    hideLoading();
    renderPage(name, data);
  } catch(e) {
    hideLoading();
    console.error(`loadPage(${name}):`, e);
  }
}

function renderPage(name, data) {
  console.log('[renderPage]', name, 'data keys:', Object.keys(data||{}));
  triggerReveal();
  try {
    if (name === 'overview')       renderOverview(data);
    else if (name === 'spatial')   renderSpatial(data);
    else if (name === 'safety')    renderSafety(data);
    else if (name === 'fleet')     renderFleet(data);
    else if (name === 'temporal')  renderTemporal(data);
    else if (name === 'ml_risk')      renderMLRisk(data);
    else if (name === 'trial_intel')  renderTrialIntel(data);
  } catch(e) {
    console.error('[renderPage:'+name+']', e);
  }
}

// ── Page renderers ─────────────────────────────────────────────────────────────

function renderOverview(data) {
  chartOutcomes('chart-outcomes', data.outcomes);
  chartVehicles('chart-vehicles', data.vehicles);
  renderLayerBars('layer-bars', data.layers, data.kpis.N);
  renderCollLog('coll-log-table', data.coll_log);
}

function renderSpatial(data) {
  const lf   = $('layer-filter').value;
  const view = $('spatial-view').value;
  chartSpatial('chart-spatial', data, lf, view);
  // Filter layer bars and conflict table by selected layer too
  const filteredDrones = lf === 'all'
    ? data.drones
    : data.drones.filter(d => String(d.layer) === String(lf));
  const filteredConflicts = lf === 'all'
    ? data.conflicts
    : data.conflicts.filter(e =>
        e.layer != null && Math.round(e.layer) === parseInt(lf)
      );
  renderLayerBars('spatial-layer-bars', _layerCountsFromDrones(data.drones), data.drones.length);
  renderConflictNodes('conflict-nodes-table', filteredConflicts);
}
function _layerCountsFromDrones(drones) {
  const counts = {1:0,2:0,3:0,4:0};
  drones.forEach(d=>{ if(d.layer>=1&&d.layer<=4) counts[d.layer]++; });
  return counts;
}

$('layer-filter').addEventListener('change', ()=>{ if(STATE.pageCache['spatial:'+STATE.trial+':'+STATE.selPaths.join(',')]) renderSpatial(STATE.pageCache['spatial:'+STATE.trial+':'+STATE.selPaths.join(',')]); });
$('spatial-view').addEventListener('change',  ()=>{ if(STATE.pageCache['spatial:'+STATE.trial+':'+STATE.selPaths.join(',')]) renderSpatial(STATE.pageCache['spatial:'+STATE.trial+':'+STATE.selPaths.join(',')]); });

function renderSafety(data) {
  const k = data.kpis;
  $('safety-kpis').innerHTML = [
    ['Direct Collisions', k.n_dir,  'node-to-node contact', '#e05252'],
    ['Proximity Events',  k.n_prox, 'within safety radius', '#e08c52'],
    ['Near Misses',       k.n_nm,   'logged, no crash', '#d4a84f'],
    ['Collision-Free',    k.collision_free_pct+'%', `${k.N-k.n_crash} of ${k.N} drones`, '#7abd7a'],
  ].map(([l,v,s,c])=>`<div class="safety-kpi">
    <div class="safety-kpi-label">${l}</div>
    <div class="safety-kpi-val" style="color:${c}">${v}</div>
    <div class="safety-kpi-sub">${s}</div>
  </div>`).join('');

  if (data.severity && data.severity.length)      chartSeverity('chart-severity', data.severity);
  if (data.vehicle_hits && data.vehicle_hits.length) chartVehHits('chart-veh-hits', data.vehicle_hits);
  chartBatCrash('chart-bat-crash', data.bat_kde||{x:[],y:[],obs:[]});
  chartLayerVehicleHeatmap('chart-layer-veh-heatmap', data.layer_veh_heatmap||{vehicles:[],layers:[],z:[]});
  chartRouteByVehicle('chart-route-by-vehicle', data.route_by_vehicle||{vehicles:[],buckets:[],data:{}});
  chartLayerSafety('chart-layer-safety', data.layer_safety||{layers:[]});
}

function renderFleet(data) {
  const bk = data.bat_kde || {};
  const statusKDEs = (data.bat_kde_by_status && data.bat_kde_by_status.length)
    ? data.bat_kde_by_status
    : [{status:'All drones', x:(bk.consumed||{}).x||[], y:(bk.consumed||{}).y||[]}];
  chartBatKDE('chart-bat-kde', bk, statusKDEs);
  chartOutcomeFunnel('chart-fleet-funnel', data.fleet_funnel||{total:0,complete:0,coll_direct:0,coll_prox:0,batt_fail:0,canc_inflight:0,canc_preflight:0});
  chartBatDrain('chart-bat-drain', data.bat_drain_points||[]);
  chartZoneCrash('chart-zone-crash', data.zone_crash||{z:[],text:[],x_labels:[],y_labels:[]});
  chartBatReserveByLayer('chart-bat-reserve-layer', data.bat_reserve_layer||[]);
  renderVehSummary('veh-summary-table', data.veh_summary);
}

function renderTemporal(data) {
  console.log('[renderTemporal] keys:', Object.keys(data||{}));
  try {
    chartFullTimeline('chart-full-timeline',
      data.full_timeline ? data.full_timeline.events||[] : []);
  } catch(e) { console.error('[chartFullTimeline]', e.message); }
  try {
    chartFleetDensity('chart-fleet-density',
      data.fleet_density||{ticks:[],airborne:[],collision_counts:[]});
  } catch(e) { console.error('[chartFleetDensity]', e.message); }
  try {
    if (data.dur_by_status&&data.dur_by_status.length)
      chartDurBox('chart-dur-box', data.dur_by_status);
  } catch(e) { console.error('[chartDurBox]', e.message); }
}

function renderDistributions(data) {
  // Merged battery states KDE (replaces 3 separate charts)
  chartBatStatesKDE('chart-bat-states-kde', data.bat_kde||{});
  // Efficiency by vehicle KDE
  chartEffVeh('chart-eff-veh', data.eff_by_veh||{});
  // Battery consumed vs distance (color-mapped)
  chartBatDist('chart-bat-dist', data.bat_drain_points||[]);
  // Battery by layer violin
  chartBatByLayer('chart-bat-by-layer', data.bat_by_layer||{});
  // Path run consistency
  chartPathRunConsistency('chart-pr-consistency', data.path_run_consistency||[]);
  // Routing overhead all drones
  chartReroutingOverhead('chart-overhead-dist', data.rerouting_overhead||[]);
}

function renderMultitrail(data) {
  const trials = data.trials || [];
  if (trials.length < 2) {
    $('multitrail-locked').classList.remove('hidden');
    $('multitrail-content').classList.add('hidden');
    return;
  }
  $('multitrail-locked').classList.add('hidden');
  $('multitrail-content').classList.remove('hidden');

  renderKPIMatrix('kpi-matrix-table', trials);
  chartPareto('chart-pareto', trials);
  chartCollStrip('chart-coll-strip', trials);

  // CVR calculation (client-side)
  const crVals  = trials.map(t=>t.coll_rate);
  const cpVals  = trials.map(t=>t.comp_pct);
  const batVals = trials.map(t=>t.bat_used);
  const items   = [
    {name:'Collision rate',   vals:crVals},
    {name:'Completion rate',  vals:cpVals},
    {name:'Avg battery used', vals:batVals},
  ].map(({name,vals})=>{
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
    const std  = Math.sqrt(vals.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/vals.length);
    const cv   = cvr(vals);
    return {name, mean:Math.round(mean*100)/100, std:Math.round(std*100)/100,
            cvr:cv, stability:stabilityLabel(cv)};
  });
  renderCVRRows('cvr-rows', items);
}


function renderMLRisk(data) {
  console.log('[renderMLRisk] data keys:', Object.keys(data||{}));
  console.log('[renderMLRisk] ml.drones:', (data.ml||{}).drones ? (data.ml.drones).length : 'MISSING');
  const ml = data.ml || {};
  const drones = ml.drones || [];
  const fi     = ml.feature_importance || {};
  const tiers  = ml.risk_tiers || {Low:0,Medium:0,High:0};
  const conf   = ml.confusion || {tp:0,fp:0,tn:0,fn:0};

  // ML KPI strip
  const total_conf = conf.tp+conf.fp+conf.tn+conf.fn;
  const accuracy = total_conf > 0
    ? Math.round((conf.tp+conf.tn)/total_conf*100) : 0;
  if ($('ml-kpis')) $('ml-kpis').innerHTML = [
    ['High Risk Drones',    tiers.High||0,  'predicted crash probability ≥ 60%', '#e05252'],
    ['Medium Risk',         tiers.Medium||0,'30–60% crash probability',           '#d4a84f'],
    ['Low Risk',            tiers.Low||0,   'below 30% crash probability',        '#7abd7a'],
    ['Anomalies Detected',  ml.n_anomalies||0,'outside normal parameter range',   '#a07acd'],
    ['Model Accuracy',      accuracy+'%',   'correct predictions / total drones', '#4fa8d4'],
    ['Drones Analyzed',     ml.total_analyzed||0,'with sufficient feature data',  '#4a6278'],
  ].map(([l,v,s,c])=>`<div class="safety-kpi">
    <div class="safety-kpi-label">${l}</div>
    <div class="safety-kpi-val" style="color:${c}">${v}</div>
    <div class="safety-kpi-sub">${s}</div>
  </div>`).join('');

  if (drones.length) {
    chartRiskMap('chart-risk-map', drones);
    chartRiskDist('chart-risk-dist', drones);
    chartAnomalyMap('chart-anomaly-map', drones);
    chartRiskByVehicle('chart-risk-by-vehicle', drones);
  }
  if (Object.keys(fi).length) chartFeatureImportance('chart-feature-importance', fi);
  chartConfusion('chart-confusion', conf);
  chartVehicleRadar('chart-vehicle-radar', data.vehicle_radar||{vehicles:[],axes:[]});
}

function renderTrialIntel(data) {
  console.log('[renderTrialIntel] keys:', Object.keys(data||{}));
  console.log('[renderTrialIntel] bat_reserve_layer:', (data.bat_reserve_layer||[]).length);
  console.log('[renderTrialIntel] dur_by_status:', (data.dur_by_status||[]).length);
  const calls = [
    ()=>chartOutcomeFunnel('chart-outcome-funnel',
      data.fleet_funnel||{total:0,complete:0,coll_direct:0,coll_prox:0,
                          batt_fail:0,canc_inflight:0,canc_preflight:0}),
    ()=>chartConflictEscalation('chart-conflict-escalation',
      data.conflict_escalation||{pairs:[],ticks:[]}),
    ()=>chartEventHeatmap('chart-event-heatmap',
      data.event_heatmap||{ticks:[],types:[],z:[]}),
    ()=>chartBatReserveByLayer('chart-bat-reserve-intel',
      data.bat_reserve_layer||[]),
    ()=>{ if(data.dur_by_status&&data.dur_by_status.length)
            chartDurBox('chart-dur-box-intel', data.dur_by_status); },
  ];
  calls.forEach((fn,i)=>{
    try { fn(); }
    catch(e) { console.error('[renderTrialIntel chart '+i+']', e.message); }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
showPage('overview');
