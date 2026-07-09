# How to Add a New Chart

This dashboard follows a consistent pattern. Every chart lives in one of four files.
Here is the exact sequence of steps to add a new one.

---

## Step 1 — Write a data builder in `main.py`

Add a function that takes the enriched DataFrames and returns a plain Python dict.

```python
def my_new_chart_data(d: pd.DataFrame, c: pd.DataFrame) -> dict:
    # d = drones DataFrame (filtered to trial + path runs, columns enriched)
    # c = collisions DataFrame
    result = d.groupby('vehicle')['bat_u'].mean().round(1)
    return {
        'labels': list(result.index),
        'values': list(result.values),
    }
```

Available enriched columns in `d`:
`bat_s` `bat_e` `bat_u` `spd` `cx` `cy` `layer` `alt` `dp` `da` `eff` `duration`

---

## Step 2 — Add it to the relevant route in `main.py`

```python
@app.get('/api/trial/{tid}/fleet')
async def get_fleet(tid: str, path_runs: Optional[str] = None):
    d, c = _get(tid, path_runs)
    return J({
        # ... existing keys ...
        'my_new_chart': my_new_chart_data(d, c),
    })
```

---

## Step 3 — Write a chart function in `charts.js`

Add it under the relevant `// ── PAGE N` section comment.

```js
function chartMyNewThing(elId, data) {
  // data = the dict returned by my_new_chart_data()
  const traces = [{
    type: 'bar',
    x: data.labels,
    y: data.values,
    marker: { color: C.fleet },   // use a design token from const C at top
  }];
  safePlot(elId, traces, baseLayout(250));
  // Always use safePlot() — never call Plotly.newPlot() directly
}
```

---

## Step 4 — Call it from `app.js`

```js
function renderFleet(data) {
  // ... existing calls ...
  chartMyNewThing('my-new-chart-div', data.my_new_chart);
}
```

---

## Step 5 — Add a container in `index.html`

```html
<!-- Inside <div class="page" id="page-fleet"> -->
<div class="card reveal">
  <div class="card-label">My New Chart Title</div>
  <div id="my-new-chart-div" class="ch"></div>
</div>
```

---

## Design tokens

All chart colours come from `const C` at the top of `charts.js`:

```js
const C = {
  radar:   '#00b4dc',   // cyan   — primary
  hot:     '#ff4400',   // red    — danger / collision
  amber:   '#ffaa00',   // amber  — warning
  safe:    '#00ff99',   // green  — success
  violet:  '#8855ff',   // purple — secondary
  fleet:   '#00b4dc',
  safety:  '#ff4400',
  temporal:'#ffaa00',
  // ...
};
```

The same palette is in `main.css` as CSS custom properties (`--radar`, `--hot`, etc.).
Change the value in one place and it updates across all charts and UI elements that use it.
