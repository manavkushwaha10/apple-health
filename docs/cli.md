# HealthKit CLI

A command-line interface for querying and writing HealthKit data through your Expo app's devtools connection.

## Installation

The CLI requires a running Expo app with the `useHealthKitDevTools` hook enabled.

```bash
# In your app
import { useHealthKitDevTools } from 'apple-health';

export default function App() {
  useHealthKitDevTools();
  // ...
}
```

Then run CLI commands:

```bash
bunx apple-health <command>
```

## Commands

### Status & Authorization

```bash
# Check connection status
bunx apple-health status

# Check authorization for types
bunx apple-health auth status stepCount heartRate

# Request authorization
bunx apple-health auth request --read "stepCount,heartRate" --write "stepCount,heartRate"
```

### Writing Data

#### Quantity Samples

```bash
# Simple - uses default unit and current time
bunx apple-health write quantity heartRate 72

# With relative time
bunx apple-health write quantity heartRate 85 --start "today 8am"
bunx apple-health write quantity stepCount 5000 --start "yesterday" --duration "1d"

# With explicit unit
bunx apple-health write quantity bodyMass 75 --unit "kg" --start "today 7am"
```

#### Category Samples

```bash
# Sleep analysis (value: 0=inBed, 2=awake, 3=core, 4=deep, 5=REM)
bunx apple-health write category sleepAnalysis 3 --start "-8h" --duration "7h"

# Symptoms (value: 0=notPresent, 1=mild, 2=moderate, 3=severe)
bunx apple-health write category headache 2 --start "-2h"
bunx apple-health write category fatigue 3 --start "today 3pm"
```

#### Workouts

```bash
# Quick workout (defaults: start=-30m, duration=30m)
bunx apple-health write workout running

# With details
bunx apple-health write workout cycling --start "today 7am" --duration "1h" --energy 450 --distance 25000
```

### Querying Data

```bash
# Query recent samples
bunx apple-health query quantity heartRate --limit 10
bunx apple-health query category sleepAnalysis --limit 5
bunx apple-health query workouts --limit 5

# With date range
bunx apple-health query quantity stepCount --start "-7d" --end "now" --limit 100
```

### Statistics

```bash
# Single stat
bunx apple-health stats stepCount

# With aggregations
bunx apple-health stats heartRate --aggregations "discreteAverage,discreteMin,discreteMax"

# Time-bucketed (daily, weekly, etc.)
bunx apple-health stats stepCount --interval day --start "-7d"
bunx apple-health stats heartRate --interval hour --start "today"
```

### List Types

```bash
# All types
bunx apple-health types

# Filter by category
bunx apple-health types --category Vitals
bunx apple-health types --category Nutrition
```

## Batch Mode

Write multiple samples from stdin using NDJSON (newline-delimited JSON):

```bash
cat << 'EOF' | bunx apple-health batch
{"kind":"quantity","type":"heartRate","value":72,"start":"today 8am"}
{"kind":"quantity","type":"heartRate","value":85,"start":"today 12pm"}
{"kind":"quantity","type":"stepCount","value":5000,"start":"yesterday","duration":"1d"}
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-8h","duration":"7h"}
{"kind":"workout","activityType":"running","start":"-1h","duration":"30m","energy":250}
EOF
```

### Batch Format

**Quantity samples:**
```json
{"kind":"quantity","type":"heartRate","value":72,"unit":"count/min","start":"today 8am"}
```

**Category samples:**
```json
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-8h","duration":"7h"}
```

**Workouts:**
```json
{"kind":"workout","activityType":"running","start":"-1h","duration":"30m","energy":250,"distance":5000}
```

## Interactive REPL

Start an interactive session with a persistent connection:

```bash
bunx apple-health repl
```

```
healthkit> write quantity heartRate 72
Saved heartRate: 72 count/min

healthkit> write quantity stepCount 3000 yesterday 1d
Saved stepCount: 3000 count

healthkit> query quantity heartRate 5
heartRate (5 samples):
  1/4/2026, 2:00:00 PM: 72 count/min
  1/4/2026, 12:00:00 PM: 85 count/min
  ...

healthkit> stats stepCount day
Statistics for stepCount (day):
  2026-01-03: sum=3102 count
  2026-01-04: sum=5847 count

healthkit> types heart
Quantity Types:
  heartRate, restingHeartRate, walkingHeartRateAverage, heartRateVariabilitySDNN, heartRateRecoveryOneMinute

healthkit> exit
```

### REPL Commands

| Command | Description |
|---------|-------------|
| `write quantity <type> <value> [time] [duration]` | Write quantity sample |
| `write category <type> <value> [time] [duration]` | Write category sample |
| `write workout <activity> [time] [duration]` | Write workout |
| `query quantity <type> [limit]` | Query quantity samples |
| `query category <type> [limit]` | Query category samples |
| `query workouts [limit]` | Query workouts |
| `stats <type> [interval]` | Get statistics |
| `types [filter]` | List types (optionally filtered) |
| `help` | Show help |
| `exit` | Exit REPL |

## Date Formats

The CLI supports flexible date formats:

| Format | Example | Description |
|--------|---------|-------------|
| `now` | `--start now` | Current time |
| `today` | `--start today` | Start of today |
| `yesterday` | `--start yesterday` | Start of yesterday |
| `tomorrow` | `--start tomorrow` | Start of tomorrow |
| Relative days | `--start "-1d"` | 1 day ago |
| Relative hours | `--start "-2h"` | 2 hours ago |
| Relative minutes | `--start "-30m"` | 30 minutes ago |
| Day + time | `--start "today 8am"` | Today at 8:00 AM |
| Day + time | `--start "yesterday 10:30pm"` | Yesterday at 10:30 PM |
| Date only | `--start "2026-01-04"` | Start of that day |
| ISO8601 | `--start "2026-01-04T08:00:00Z"` | Exact timestamp |

### Duration Format

| Format | Example | Description |
|--------|---------|-------------|
| Minutes | `--duration 30m` | 30 minutes |
| Hours | `--duration 2h` | 2 hours |
| Days | `--duration 1d` | 1 day |
| Combined | `--duration 1h30m` | 1 hour 30 minutes |

## Available Types

### Quantity Types (with default units)

| Category | Types |
|----------|-------|
| Body | `bodyMass` (kg), `height` (m), `bodyFatPercentage` (%), `bodyMassIndex` |
| Fitness | `stepCount`, `distanceWalkingRunning` (m), `activeEnergyBurned` (kcal), `flightsClimbed`, `appleExerciseTime` (min) |
| Vitals | `heartRate` (count/min), `restingHeartRate`, `bloodPressureSystolic` (mmHg), `oxygenSaturation` (%), `respiratoryRate` |
| Nutrition | `dietaryCaffeine` (mg), `dietaryWater` (mL), `dietaryEnergyConsumed` (kcal), `dietaryProtein` (g) |

### Category Types

| Category | Types | Values |
|----------|-------|--------|
| Sleep | `sleepAnalysis` | 0=inBed, 2=awake, 3=core, 4=deep, 5=REM |
| Symptoms | `headache`, `fatigue`, `nausea`, `dizziness`, etc. | 0=notPresent, 1=mild, 2=moderate, 3=severe |
| Heart | `highHeartRateEvent`, `lowHeartRateEvent`, `irregularHeartRhythmEvent` | 0=notSet |
| Mindfulness | `mindfulSession` | 0 |

### Workout Types

`running`, `walking`, `cycling`, `swimming`, `yoga`, `hiking`, `highIntensityIntervalTraining`, `traditionalStrengthTraining`, and 70+ more.

Use `bunx apple-health types` to see all available types.

## Options

All commands support these flags:

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | Expo devtools port | 8081 |
| `--json` | Output as JSON | false |

## Notes

- **Authorization**: HealthKit requires explicit user permission. Use `auth request` before writing data.
- **Read permissions**: HealthKit hides read authorization status for privacy. Query data to verify access.
- **Simulator**: The iOS Simulator has limited HealthKit data. Use a real device for full testing.
