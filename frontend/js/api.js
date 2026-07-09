/* ─────────────────────────────────────────────────────────────────
   api.js — All HTTP calls to the backend, in one place.

   Every fetch() in this project goes through this file.
   If an endpoint URL changes, only this file needs editing.

   Usage (from app.js):
     API.getOverview('my_trial', [1, 2]).then(data => ...)

   How path run filtering works:
     Most methods take a `prs` array, e.g. [1, 3].
     _prParam() turns it into "?path_runs=1,3" on the URL.
     The backend then filters to those runs only.
     Pass [] to get all runs.

   Error handling:
     _fetch() reads FastAPI's { detail: "..." } on errors
     and throws a plain JS Error so callers can catch it.
───────────────────────────────────────────────────────────────────── */

const API = {

  // Base URL — empty means relative to current origin (http://127.0.0.1:8000)
  BASE: '',

  // Internal fetch wrapper used by all methods below
  async _fetch(url, opts={}) {
    const res = await fetch(this.BASE + url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({detail: res.statusText}));
      throw new Error(err.detail || res.statusText);
    }
    return res.json();
  },

  // ── Connect ──────────────────────────────────────────────────────
  // Both return { ok: true, trials: [...], source: "..." }
  // The trials list populates the trial selector after login.

  connectPostgres(host, port, dbname, user, password) {
    const fd = new FormData();
    fd.append('host', host); fd.append('port', port);
    fd.append('dbname', dbname); fd.append('user', user);
    fd.append('password', password);
    return this._fetch('/api/connect/postgres', {method:'POST', body:fd});
  },

  connectExcel(file) {
    // file = File object from <input type="file"> or drag-and-drop
    const fd = new FormData();
    fd.append('file', file);
    return this._fetch('/api/connect/excel', {method:'POST', body:fd});
  },

  // ── Trial & path run discovery ───────────────────────────────────
  getTrials()       { return this._fetch('/api/trials'); },
  getPathRuns(trial){ return this._fetch(`/api/trial/${encodeURIComponent(trial)}/path_runs`); },

  // ── Per-trial data endpoints ─────────────────────────────────────
  // prs = array of path run numbers to include, e.g. [1, 2]
  // Pass [] or null to include all path runs for the trial.

  getKPIs(trial, prs) {
    // Returns the 7 headline numbers: N, comp_pct, crash_pct, n_coll, etc.
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/kpis${_prParam(prs)}`);
  },
  getOverview(trial, prs) {
    // Returns: kpis + outcome bars + layer counts + vehicle counts + collision log
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/overview${_prParam(prs)}`);
  },
  getSpatial(trial, prs) {
    // Returns: drone final positions + conflict coordinates for the airspace map
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/spatial${_prParam(prs)}`);
  },
  getSafety(trial, prs) {
    // Returns: severity breakdown, vehicle hit rates, battery KDE, layer heatmap,
    //          cascade events, layer safety profile, route length by vehicle
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/safety${_prParam(prs)}`);
  },
  getFleet(trial, prs) {
    // Returns: battery KDE, efficiency scatter, drain points, zone crash heatmap,
    //          vehicle summary table, outcome funnel, radar data
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/fleet${_prParam(prs)}`);
  },
  getTemporal(trial, prs) {
    // Returns: full event timeline, fleet density over ticks, duration by status
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/temporal${_prParam(prs)}`);
  },
  getDistributions(trial, prs) {
    // Returns: battery state KDEs, efficiency by vehicle, battery distribution
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/distributions${_prParam(prs)}`);
  },
  getMLRisk(trial, prs) {
    // Returns: Random Forest risk scores per drone, feature importance,
    //          risk tier counts, event heatmap, cumulative severity, conflict escalation
    // Requires scikit-learn to be installed — backend returns an error message if missing
    return this._fetch(`/api/trial/${encodeURIComponent(trial)}/ml_risk${_prParam(prs)}`);
  },

  // ── Cross-trial comparison ───────────────────────────────────────
  getMultitrailIntel() {
    // Compares all loaded trials — no trial or path run filter
    return this._fetch('/api/multitrail_intel');
  },
};

// Builds the ?path_runs=1,2,3 query string from an array
function _prParam(prs) {
  if (!prs || !prs.length) return '';
  return '?path_runs=' + prs.join(',');
}
