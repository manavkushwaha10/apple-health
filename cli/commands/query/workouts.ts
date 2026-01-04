import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";
import { formatWorkoutsTable } from "../../formatters";

interface WorkoutsQueryFlags {
  start?: string;
  end?: string;
  limit: number;
  json: boolean;
  port: number;
  asc: boolean;
}

async function queryWorkouts(flags: WorkoutsQueryFlags): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const samples = await client.queryWorkouts({
      startDate: flags.start,
      endDate: flags.end,
      limit: flags.limit,
      ascending: flags.asc,
    });

    if (flags.json) {
      console.log(JSON.stringify({ count: samples.length, workouts: samples }, null, 2));
    } else {
      console.log(`\nWorkouts (${samples.length} found)`);
      console.log("─".repeat(70));
      if (samples.length === 0) {
        console.log("  No workouts found");
      } else {
        console.log(formatWorkoutsTable(samples));
      }
    }

    await client.disconnect();
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const workoutsCommand = buildCommand({
  loader: async () => ({ default: queryWorkouts }),
  parameters: {
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
        brief: "Maximum workouts to return",
        default: 50,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON",
        default: false,
      },
      port: {
        kind: "parsed",
        parse: Number,
        brief: "Expo devtools port",
        default: 8081,
      },
      asc: {
        kind: "boolean",
        brief: "Sort ascending by date",
        default: false,
      },
    },
  },
  docs: {
    brief: "Query workouts from HealthKit",
  },
});
