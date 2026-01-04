# Seeding HealthKit Data with Claude Code

Use Claude Code to generate realistic health data profiles for testing your app. This guide shows how to leverage AI to populate HealthKit with meaningful test data.

## Prerequisites

1. Your Expo app running with devtools enabled:
   ```tsx
   import { useHealthKitDevTools } from 'apple-health';

   export default function App() {
     useHealthKitDevTools();
     // ...
   }
   ```

2. HealthKit CLI available:
   ```bash
   bunx apple-health status
   ```

## Quick Start

Tell Claude Code what kind of health profile you want:

```
Seed my HealthKit with a week of data for a marathon runner in training
```

Claude will use the CLI to populate realistic data including heart rate zones, high step counts, running workouts, good sleep patterns, and appropriate nutrition.

## Example Prompts

### Fitness Profiles

**Marathon runner:**
```
Create health data for an elite marathon runner - high VO2 max,
lots of running workouts, good sleep, proper hydration
```

**Weekend warrior:**
```
Seed data for someone who only exercises on weekends but goes hard -
2-3 intense workouts per week, otherwise sedentary
```

**New to fitness:**
```
Create data for someone just starting their fitness journey -
gradually increasing step counts over 2 weeks, a few short walks
```

### Health Conditions

**Stressed professional:**
```
Populate HealthKit with data for a stressed software engineer -
elevated resting heart rate, poor sleep, high caffeine, low activity
```

**Recovering from illness:**
```
Create health data showing recovery from a cold -
elevated heart rate and poor sleep a week ago, gradually improving
```

**Sleep issues:**
```
Seed data for someone with insomnia - late bedtimes,
fragmented sleep, frequent wake-ups, low deep sleep
```

### Specific Scenarios

**Jet lag recovery:**
```
Create sleep data showing jet lag recovery over 5 days -
disrupted patterns normalizing gradually
```

**Training for a race:**
```
Generate 4 weeks of marathon training data with progressive
long runs, recovery days, and tapering
```

## Data Profiles

### Healthy Active Person
- Resting HR: 55-65 bpm
- Steps: 8,000-12,000/day
- Sleep: 7-8 hours, good quality
- Workouts: 4-5x/week
- Water: 2-3L/day

### Sedentary Office Worker
- Resting HR: 70-80 bpm
- Steps: 2,000-4,000/day
- Sleep: 5-6 hours, fragmented
- Workouts: 0-1x/week
- Caffeine: 300-500mg/day

### Elite Athlete
- Resting HR: 45-55 bpm
- Steps: 15,000-25,000/day
- Sleep: 8-9 hours, high quality
- Workouts: 10-14x/week (doubles)
- HRV: High variability

### Stressed Individual
- Resting HR: 80-95 bpm
- Steps: 2,000-3,500/day
- Sleep: 4-5 hours, poor quality
- Symptoms: headaches, fatigue
- Caffeine: 400-600mg/day

## Batch Data Format

Claude Code uses NDJSON for efficient batch writes:

```bash
cat << 'EOF' | bunx apple-health batch
{"kind":"quantity","type":"heartRate","value":72,"start":"today 8am"}
{"kind":"quantity","type":"stepCount","value":8500,"start":"yesterday","duration":"1d"}
{"kind":"category","type":"sleepAnalysis","value":4,"start":"-8h","duration":"2h"}
{"kind":"workout","activityType":"running","start":"-2h","duration":"45m","energy":450}
EOF
```

### Sample Types

**Quantity (measurements):**
```json
{"kind":"quantity","type":"heartRate","value":72,"start":"today 8am"}
{"kind":"quantity","type":"stepCount","value":10000,"start":"yesterday","duration":"1d"}
{"kind":"quantity","type":"dietaryCaffeine","value":150,"start":"today 7am"}
{"kind":"quantity","type":"activeEnergyBurned","value":350,"start":"today","duration":"1d"}
```

**Category (events/states):**
```json
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-7h","duration":"6h"}
{"kind":"category","type":"headache","value":2,"start":"today 2pm"}
{"kind":"category","type":"mindfulSession","value":0,"start":"-1h","duration":"15m"}
```

**Workouts:**
```json
{"kind":"workout","activityType":"running","start":"-1h","duration":"30m","energy":300,"distance":5000}
{"kind":"workout","activityType":"cycling","start":"today 7am","duration":"1h","energy":500,"distance":25000}
{"kind":"workout","activityType":"yoga","start":"yesterday 6am","duration":"45m","energy":150}
```

## Sleep Data Values

| Value | Meaning |
|-------|---------|
| 0 | In Bed |
| 2 | Awake |
| 3 | Core Sleep (light) |
| 4 | Deep Sleep |
| 5 | REM Sleep |

Realistic sleep pattern:
```json
{"kind":"category","type":"sleepAnalysis","value":0,"start":"-8h","duration":"8h"}
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-7h45m","duration":"45m"}
{"kind":"category","type":"sleepAnalysis","value":4,"start":"-7h","duration":"1h"}
{"kind":"category","type":"sleepAnalysis","value":5,"start":"-6h","duration":"30m"}
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-5h30m","duration":"2h"}
{"kind":"category","type":"sleepAnalysis","value":5,"start":"-3h30m","duration":"45m"}
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-2h45m","duration":"2h"}
{"kind":"category","type":"sleepAnalysis","value":2,"start":"-45m","duration":"10m"}
{"kind":"category","type":"sleepAnalysis","value":3,"start":"-35m","duration":"35m"}
```

## Symptom Values

| Value | Meaning |
|-------|---------|
| 0 | Not Present |
| 1 | Mild |
| 2 | Moderate |
| 3 | Severe |

## Tips for Claude Code

1. **Be specific about timeframes:**
   ```
   Create 2 weeks of data starting from today going backwards
   ```

2. **Describe patterns, not just values:**
   ```
   Heart rate should be elevated in the afternoons due to work stress
   ```

3. **Include realistic variations:**
   ```
   Some days should be better than others - not perfectly consistent
   ```

4. **Consider correlations:**
   ```
   On days with poor sleep, heart rate should be higher
   and step count lower
   ```

5. **Request verification:**
   ```
   After seeding, query the data to confirm it looks right
   ```

## Example Session

```
You: Seed HealthKit with 3 days of data for someone recovering from
     a marathon - sore, tired, low activity, extra sleep

Claude: I'll create recovery data with:
        - Elevated resting HR (body recovering)
        - Very low step counts (rest days)
        - Extra sleep (9-10 hours)
        - Muscle soreness symptoms
        - No workouts (active recovery only)

        [writes batch data via CLI]

        Done! Here's a summary:
        - 3 days of heart rate data (avg 68 bpm, elevated from normal)
        - Step counts: 1,200 / 2,400 / 3,800 (gradually increasing)
        - Sleep: 9.5h / 10h / 8.5h (extra recovery sleep)
        - Logged muscle soreness and fatigue symptoms
```

## Clearing Test Data

To remove seeded data:

```bash
bunx apple-health delete stepCount --start "-30d" --end "now"
bunx apple-health delete heartRate --start "-30d" --end "now"
```

Or ask Claude:
```
Delete all the test health data from the last week
```
