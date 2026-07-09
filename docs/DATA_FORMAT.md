# Data Format Reference

## Excel Workbook

### Drone sheets — `Run 1`, `Run 2`, …

Sheet names must start with `"Run "`. The number is extracted and used as the path run number.

```
Row 1:  Title string  (e.g. "Simulation Run 1")
Row 2:  Column headers
Row 3+: Data rows (skip blank rows)
```

Recognised column headers and their internal names:

| Excel column header | Internal name | Notes |
|---|---|---|
| `Drone` | `drone_id` | Unique drone ID |
| `Start Time` | `start_time` | |
| `End Time` | `end_time` | |
| `Flight Status` | `flight_status` | See values below |
| `Collision Severity` | `collision_severity` | Per-drone worst severity |
| `Vehicle` | `vehicle` | `quad` `hexa` `octa` `vtol` `fixed_wing` |
| `Path Label` | `path_label` | Human-readable run name |
| `Drone Speed` | `drone_speed` | Parsed; strips `×` / `x` |
| `Drone Source` | `src` | Origin node |
| `Drone Destination` | `dst` | Destination node |
| `Drone Coord X` | `coord_x` | Latitude |
| `Drone Coord Y` | `coord_y` | Longitude |
| `Drone Layer` | `drone_layer` | Altitude layer 1–4 |
| `Drone Altitude (m)` | `drone_altitude_m` | |
| `Crashed With Drone` | `crashed_with_drone` | ID of collision partner |
| `Battery at Start` | `battery_start` | `85` or `"85%"` — both work |
| `Battery at End` | `battery_end` | |
| `Battery Consumed` | `battery_consumed` | |
| `Distance Planned` | `distance_planned` | Metres |
| `Distance Actual` | `distance_actual` | Metres |

### Collision Log sheet — `Collision Log`

```
Row 1:  Column headers
Row 2+: Data rows
```

| Excel column header | Internal name |
|---|---|
| `Event ID` | `event_id` |
| `Path Run` | `path_run` |
| `Path Label` | `path_label` |
| `Timestamp` | `timestamp` |
| `Grid Tick` | `grid_tick` |
| `Type` | `type` |
| `Severity` | `severity` |
| `Drone A ID` | `drone_a_id` |
| `Drone B ID` | `drone_b_id` |
| `Drone A Vehicle` | `drone_a_vehicle` |
| `Drone B Vehicle` | `drone_b_vehicle` |
| `Drone A Speed` | `drone_a_speed` |
| `Drone B Speed` | `drone_b_speed` |
| `Drone A Coord X` | `drone_a_coord_x` |
| `Drone A Coord Y` | `drone_a_coord_y` |
| `Drone B Coord X` | `drone_b_coord_x` |
| `Drone B Coord Y` | `drone_b_coord_y` |
| `Drone A Layer` | `drone_a_layer` |
| `Drone B Layer` | `drone_b_layer` |
| `Drone A Altitude (m)` | `drone_a_altitude_m` |
| `Drone B Altitude (m)` | `drone_b_altitude_m` |
| `Layer Diff` | `layer_diff` |
| `Drone A Battery Start` | `drone_a_battery_start` |
| `Drone B Battery Start` | `drone_b_battery_start` |
| `Drone A Battery End` | `drone_a_battery_end` |
| `Drone B Battery End` | `drone_b_battery_end` |
| `Drone A Battery Consumed` | `drone_a_battery_consumed` |
| `Drone B Battery Consumed` | `drone_b_battery_consumed` |
| `Drone A Distance Actual` | `drone_a_distance_actual` |
| `Drone B Distance Actual` | `drone_b_distance_actual` |

---

## PostgreSQL

```sql
-- Tables used (joined with simulation_runs on run_id)
drone_summary_3d    -- one row per drone flight
collision_log_3d    -- one row per collision event

-- simulation_runs must have:
simulation_runs (
    run_id    INTEGER PRIMARY KEY,
    run_label VARCHAR   -- becomes the trial_id in the dashboard
)
```

Quick check:
```sql
SELECT run_label, COUNT(*) AS drones
FROM drone_summary_3d d
JOIN simulation_runs r USING (run_id)
GROUP BY run_label;
```

---

## Flight Status Values

| Value | Meaning |
|---|---|
| `Complete` | Mission completed successfully |
| `Incomplete — Battery` | Battery ran out before destination |
| `Collision — Node to Node` | Direct collision (counted as crash) |
| `Collision — Proximity` | Proximity violation |
| `Cancelled — In-flight` | Cancelled after takeoff |
| `Cancelled — Pre-flight` | Cancelled before takeoff |

## Altitude Layers

| Layer | Altitude |
|---|---|
| 1 | 0 m |
| 2 | 50 m |
| 3 | 100 m |
| 4 | 150 m |

## Changing column names

If your workbook uses different headers, update the mapping dicts near the top of `main.py`:

```python
DRONE_MAP = {
    'Your Header': 'internal_name',
    # e.g. 'Aircraft Type': 'vehicle',
}
```
