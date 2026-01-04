# HealthKit DevTools CLI Plan

A command-line interface for reading and writing HealthKit data during development. This enables Claude Code to directly interact with HealthKit through simple terminal commands.

## Overview

The CLI connects to a running Expo dev server and communicates with the app via the devtools WebSocket protocol. This allows:

- **Query** any HealthKit data type with filters
- **Write** test samples directly to HealthKit
- **Inspect** authorization status
- **Monitor** real-time subscription events
- **Export** data as JSON

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Expo App (iOS)    │◄───────►│  healthkit CLI      │
│                     │   WS    │                     │
│  useHealthKitPlugin │         │  $ healthkit query  │
│         ▼           │         │  $ healthkit write  │
│  AppleHealthModule  │         │  $ healthkit auth   │
│         ▼           │         │                     │
│     HealthKit       │         │  JSON output        │
└─────────────────────┘         └─────────────────────┘
```

**Communication Flow:**
1. CLI connects to Expo devtools WebSocket (same as browser plugins)
2. CLI sends command: `{ type: 'queryQuantitySamples', payload: {...} }`
3. App-side hook executes query via `AppleHealthModule`
4. App sends results back as JSON
5. CLI prints formatted output to stdout

## CLI Commands

### Query Commands

```bash
# Query quantity samples
healthkit query quantity stepCount
healthkit query quantity heartRate --start 2024-01-01 --end 2024-01-31 --limit 100

# Query category samples
healthkit query category sleepAnalysis --start 2024-01-01

# Query workouts
healthkit query workouts --start 2024-01-01 --limit 50

# Query statistics (single)
healthkit stats stepCount --aggregations sum,avg --start 2024-01-01

# Query statistics collection (time-bucketed)
healthkit stats stepCount --interval day --start 2024-01-01 --end 2024-01-31

# Query activity summaries
healthkit query activity --start 2024-01-01 --end 2024-01-07

# Get characteristics
healthkit characteristics
```

### Write Commands

```bash
# Write quantity sample
healthkit write quantity stepCount 1000 --unit count --start "2024-01-15T10:00:00Z"

# Write with duration
healthkit write quantity heartRate 72 --unit "count/min" \
  --start "2024-01-15T10:00:00Z" --end "2024-01-15T10:05:00Z"

# Write category sample
healthkit write category sleepAnalysis 1 \
  --start "2024-01-15T22:00:00Z" --end "2024-01-16T06:00:00Z"

# Write workout
healthkit write workout running \
  --start "2024-01-15T07:00:00Z" --end "2024-01-15T07:30:00Z" \
  --energy 250 --distance 5000

# Write with metadata
healthkit write quantity bodyMass 70 --unit kg \
  --metadata '{"HKWasUserEntered": true}'

# Delete samples
healthkit delete stepCount --start 2024-01-01 --end 2024-01-02
```

### Authorization Commands

```bash
# Check authorization status for types
healthkit auth status stepCount heartRate sleepAnalysis

# Check all types
healthkit auth status --all

# Request authorization
healthkit auth request --read stepCount,heartRate --write stepCount
```

### Subscription Commands

```bash
# Subscribe to changes (streams events)
healthkit subscribe stepCount heartRate

# List active subscriptions
healthkit subscriptions list

# Unsubscribe
healthkit subscriptions remove <subscription-id>
```

### Utility Commands

```bash
# List all available types
healthkit types --category quantity
healthkit types --category category
healthkit types --category workout

# Check if HealthKit is available
healthkit status

# Connect to specific port
healthkit --port 8081 query quantity stepCount
```

## Output Formats

### Default (human-readable)

```
$ healthkit query quantity stepCount --limit 3

Step Count (3 samples)
──────────────────────────────────────────────────────
  Date                    Value     Source
  2024-01-15 10:30:00     1,234     iPhone
  2024-01-15 09:15:00       892     Apple Watch
  2024-01-14 18:45:00     3,456     iPhone
```

### JSON (for piping/Claude Code)

```bash
$ healthkit query quantity stepCount --limit 3 --json
```

```json
{
  "type": "stepCount",
  "count": 3,
  "samples": [
    {
      "uuid": "ABC-123",
      "quantityType": "stepCount",
      "value": 1234,
      "unit": "count",
      "startDate": "2024-01-15T10:30:00Z",
      "endDate": "2024-01-15T10:30:00Z",
      "sourceName": "iPhone",
      "sourceId": "com.apple.health"
    }
  ]
}
```

## File Structure

```
cli/
├── index.ts                      # CLI entry point
├── app.ts                        # Stricli app definition
├── client.ts                     # WebSocket client for devtools
├── commands/
│   ├── query/
│   │   ├── index.ts              # Query subcommands router
│   │   ├── quantity.ts           # Query quantity samples
│   │   ├── category.ts           # Query category samples
│   │   ├── workouts.ts           # Query workouts
│   │   └── activity.ts           # Query activity summaries
│   ├── write/
│   │   ├── index.ts              # Write subcommands router
│   │   ├── quantity.ts           # Write quantity sample
│   │   ├── category.ts           # Write category sample
│   │   └── workout.ts            # Write workout
│   ├── stats.ts                  # Statistics queries
│   ├── auth.ts                   # Authorization commands
│   ├── subscribe.ts              # Subscription commands
│   ├── types.ts                  # List types command
│   ├── characteristics.ts        # Get characteristics
│   ├── delete.ts                 # Delete samples
│   └── status.ts                 # Status/health check
├── formatters/
│   ├── table.ts                  # Human-readable tables
│   └── json.ts                   # JSON output
├── utils/
│   ├── dates.ts                  # Date parsing helpers
│   ├── units.ts                  # Unit validation
│   └── types.ts                  # Type metadata (all HK types)
└── types.ts                      # TypeScript types

# App-side hook (in main package)
src/
├── devtools/
│   ├── index.ts                  # Export hook
│   └── useHealthKitDevTools.ts   # Message handler
```

## Package Configuration

### Root package.json

```json
{
  "name": "apple-health",
  "bin": {
    "healthkit": "cli/index.ts"
  },
  "scripts": {
    "cli": "bun cli/index.ts"
  }
}
```

### CLI Entry Point

```typescript
// cli/index.ts
#!/usr/bin/env bun
import { run } from "@stricli/core";
import { app } from "./app";

await run(app, process.argv.slice(2), {
  process,
});
```

## Stricli App Definition

```typescript
// cli/app.ts
import { buildApplication, buildRouteMap } from "@stricli/core";
import { queryRoute } from "./commands/query";
import { writeRoute } from "./commands/write";
import { statsCommand } from "./commands/stats";
import { authCommand } from "./commands/auth";
import { subscribeCommand } from "./commands/subscribe";
import { typesCommand } from "./commands/types";
import { characteristicsCommand } from "./commands/characteristics";
import { deleteCommand } from "./commands/delete";
import { statusCommand } from "./commands/status";

const routes = buildRouteMap({
  routes: {
    query: queryRoute,
    write: writeRoute,
    stats: statsCommand,
    auth: authCommand,
    subscribe: subscribeCommand,
    types: typesCommand,
    characteristics: characteristicsCommand,
    delete: deleteCommand,
    status: statusCommand,
  },
});

export const app = buildApplication(routes, {
  name: "healthkit",
  versionInfo: {
    currentVersion: "1.0.0",
  },
});
```

## Example Command Definition

```typescript
// cli/commands/query/quantity.ts
import { buildCommand } from "@stricli/core";
import { HealthKitClient } from "../../client";

interface QuantityQueryFlags {
  start?: string;
  end?: string;
  limit?: number;
  json?: boolean;
  port?: number;
}

async function queryQuantity(
  flags: QuantityQueryFlags,
  type: string
): Promise<void> {
  const client = new HealthKitClient();
  await client.connect(flags.port ?? 8081);

  const samples = await client.queryQuantitySamples(type, {
    startDate: flags.start,
    endDate: flags.end,
    limit: flags.limit ?? 100,
  });

  if (flags.json) {
    console.log(JSON.stringify({ type, count: samples.length, samples }, null, 2));
  } else {
    // Human-readable table output
    console.log(`\n${formatTypeName(type)} (${samples.length} samples)`);
    console.log("─".repeat(60));
    for (const sample of samples) {
      console.log(`  ${sample.startDate}  ${sample.value} ${sample.unit}  ${sample.sourceName}`);
    }
  }

  await client.disconnect();
}

export const quantityCommand = buildCommand({
  loader: async () => ({ default: queryQuantity }),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "The quantity type to query (e.g., stepCount, heartRate)",
          parse: String,
        },
      ],
    },
    flags: {
      start: {
        kind: "parsed",
        parse: String,
        brief: "Start date (ISO8601 or YYYY-MM-DD)",
        optional: true,
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "End date (ISO8601 or YYYY-MM-DD)",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: Number,
        brief: "Maximum number of samples to return",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON",
        optional: true,
      },
      port: {
        kind: "parsed",
        parse: Number,
        brief: "Expo devtools port",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Query quantity samples from HealthKit",
  },
});
```

## WebSocket Client

```typescript
// cli/client.ts
const DEVTOOLS_PORT = 8081;

export class HealthKitClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: Function; reject: Function }>();

  async connect(port = DEVTOOLS_PORT): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${port}/devtools/plugin/healthkit`);

      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (e) => reject(e));
      this.ws.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
  }

  private handleMessage(msg: { id: string; type: string; data?: unknown; error?: string }) {
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    this.pending.delete(msg.id);
    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.data);
    }
  }

  private async send<T>(type: string, payload: unknown): Promise<T> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, type, payload }));

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  async queryQuantitySamples(type: string, options?: QueryOptions) {
    return this.send<QuantitySample[]>("queryQuantitySamples", { type, options });
  }

  async queryCategorySamples(type: string, options?: QueryOptions) {
    return this.send<CategorySample[]>("queryCategorySamples", { type, options });
  }

  async queryWorkouts(options?: QueryOptions) {
    return this.send<WorkoutSample[]>("queryWorkouts", { options });
  }

  async queryStatistics(type: string, aggregations: string[], options?: QueryOptions) {
    return this.send<StatisticsResult>("queryStatistics", { type, aggregations, options });
  }

  async saveQuantitySample(
    type: string,
    value: number,
    unit: string,
    startDate: string,
    endDate?: string,
    metadata?: Record<string, unknown>
  ) {
    return this.send<{ success: boolean }>("saveQuantitySample", {
      type,
      value,
      unit,
      startDate,
      endDate: endDate ?? startDate,
      metadata,
    });
  }

  async getAuthorizationStatus(types: string[]) {
    return this.send<Record<string, string>>("getAuthorizationStatus", { types });
  }

  async getCharacteristics() {
    return this.send<Characteristics>("getCharacteristics", {});
  }

  // ... other methods
}
```

## App-Side Hook

```typescript
// src/devtools/useHealthKitDevTools.ts
import { useEffect } from "react";
import { useDevToolsPluginClient } from "expo/devtools";
import AppleHealth from "../AppleHealthModule";

export function useHealthKitDevTools() {
  const client = useDevToolsPluginClient("healthkit");

  useEffect(() => {
    if (!client) return;

    // Query handlers
    client.addMessageListener("queryQuantitySamples", async (msg: any) => {
      const { type, options } = msg.payload;
      try {
        const samples = await AppleHealth.queryQuantitySamples(type, options);
        client.sendMessage("result", { id: msg.id, data: samples });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("queryCategorySamples", async (msg: any) => {
      const { type, options } = msg.payload;
      try {
        const samples = await AppleHealth.queryCategorySamples(type, options);
        client.sendMessage("result", { id: msg.id, data: samples });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("queryWorkouts", async (msg: any) => {
      try {
        const samples = await AppleHealth.queryWorkouts(msg.payload.options);
        client.sendMessage("result", { id: msg.id, data: samples });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("queryStatistics", async (msg: any) => {
      const { type, aggregations, options } = msg.payload;
      try {
        const result = await AppleHealth.queryStatistics(type, aggregations, options);
        client.sendMessage("result", { id: msg.id, data: result });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("queryStatisticsCollection", async (msg: any) => {
      const { type, aggregations, options } = msg.payload;
      try {
        const result = await AppleHealth.queryStatisticsCollection(type, aggregations, options);
        client.sendMessage("result", { id: msg.id, data: result });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("queryActivitySummary", async (msg: any) => {
      const { startDate, endDate } = msg.payload;
      try {
        const result = await AppleHealth.queryActivitySummary(startDate, endDate);
        client.sendMessage("result", { id: msg.id, data: result });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    // Write handlers
    client.addMessageListener("saveQuantitySample", async (msg: any) => {
      const { type, value, unit, startDate, endDate, metadata } = msg.payload;
      try {
        const success = await AppleHealth.saveQuantitySample(
          type,
          value,
          unit,
          startDate,
          endDate,
          metadata
        );
        client.sendMessage("result", { id: msg.id, data: { success } });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("saveCategorySample", async (msg: any) => {
      const { type, value, startDate, endDate, metadata } = msg.payload;
      try {
        const success = await AppleHealth.saveCategorySample(
          type,
          value,
          startDate,
          endDate,
          metadata
        );
        client.sendMessage("result", { id: msg.id, data: { success } });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("saveWorkout", async (msg: any) => {
      const { activityType, startDate, endDate, energy, distance, metadata } = msg.payload;
      try {
        const success = await AppleHealth.saveWorkout(
          activityType,
          startDate,
          endDate,
          energy,
          distance,
          metadata
        );
        client.sendMessage("result", { id: msg.id, data: { success } });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("deleteSamples", async (msg: any) => {
      const { type, startDate, endDate } = msg.payload;
      try {
        const success = await AppleHealth.deleteSamples(type, startDate, endDate);
        client.sendMessage("result", { id: msg.id, data: { success } });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    // Authorization handlers
    client.addMessageListener("getAuthorizationStatus", async (msg: any) => {
      const { types } = msg.payload;
      try {
        const status = await AppleHealth.getAuthorizationStatus(types);
        client.sendMessage("result", { id: msg.id, data: status });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    client.addMessageListener("requestAuthorization", async (msg: any) => {
      const { read, write } = msg.payload;
      try {
        const result = await AppleHealth.requestAuthorization({ read, write });
        client.sendMessage("result", { id: msg.id, data: result });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    // Characteristics
    client.addMessageListener("getCharacteristics", async (msg: any) => {
      try {
        const [dateOfBirth, biologicalSex, bloodType, fitzpatrickSkinType, wheelchairUse] =
          await Promise.all([
            AppleHealth.getDateOfBirth().catch(() => null),
            AppleHealth.getBiologicalSex().catch(() => null),
            AppleHealth.getBloodType().catch(() => null),
            AppleHealth.getFitzpatrickSkinType().catch(() => null),
            AppleHealth.getWheelchairUse().catch(() => null),
          ]);
        client.sendMessage("result", {
          id: msg.id,
          data: { dateOfBirth, biologicalSex, bloodType, fitzpatrickSkinType, wheelchairUse },
        });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });

    // Status
    client.addMessageListener("getStatus", async (msg: any) => {
      try {
        const isAvailable = AppleHealth.isAvailable();
        client.sendMessage("result", { id: msg.id, data: { isAvailable } });
      } catch (e: any) {
        client.sendMessage("error", { id: msg.id, error: e.message });
      }
    });
  }, [client]);
}
```

## expo-module.config.json Update

Add devtools configuration to the existing config:

```json
{
  "name": "apple-health",
  "platforms": ["ios"],
  "devtools": {
    "name": "HealthKit",
    "id": "healthkit"
  }
}
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Create `cli/` directory structure
2. Add `@stricli/core` dependency
3. Create WebSocket client (`cli/client.ts`)
4. Set up Stricli app with basic routing (`cli/app.ts`)
5. Add bin entry to package.json
6. Add app-side hook `useHealthKitDevTools` to `src/devtools/`

### Phase 2: Query Commands
1. Implement `query quantity <type>` command
2. Implement `query category <type>` command
3. Implement `query workouts` command
4. Implement `stats` command for statistics
5. Implement `query activity` for activity summaries
6. Implement `characteristics` command

### Phase 3: Write Commands
1. Implement `write quantity` command
2. Implement `write category` command
3. Implement `write workout` command
4. Implement `delete` command
5. Add metadata JSON parsing

### Phase 4: Authorization
1. Implement `auth status` command
2. Implement `auth request` command
3. Add `--all` flag to show all types

### Phase 5: Subscriptions & Utility
1. Implement `subscribe` command (streaming output)
2. Implement `types` command to list all types
3. Implement `status` command
4. Add connection retry logic

### Phase 6: Polish
1. Add human-readable table formatting
2. Add date parsing helpers (relative dates like "yesterday")
3. Add unit validation
4. Error handling and helpful messages

## Usage with Claude Code

Claude Code can use this CLI to interact with HealthKit:

```bash
# Query recent step counts
bun cli/index.ts query quantity stepCount --limit 10 --json

# Or if installed globally / via bin
healthkit query quantity stepCount --limit 10 --json

# Write test data
healthkit write quantity stepCount 5000 --unit count --start "2024-01-15T12:00:00Z"

# Check what's authorized
healthkit auth status --all --json

# Monitor changes in real-time
healthkit subscribe stepCount heartRate
```

The `--json` flag ensures machine-readable output for parsing.

## Dependencies

Add to root package.json:

```json
{
  "devDependencies": {
    "@stricli/core": "^1.0.0"
  }
}
```

Bun has built-in WebSocket support, so no additional WebSocket library is needed.
