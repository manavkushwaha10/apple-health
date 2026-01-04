import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";
import { parseRelativeDate, parseDuration } from "../../utils/dates";

interface WorkoutWriteFlags {
  start?: string;
  end?: string;
  duration?: string;
  energy?: number;
  distance?: number;
  metadata?: string;
  json: boolean;
  port: number;
}

async function writeWorkout(
  flags: WorkoutWriteFlags,
  activityType: string
): Promise<void> {
  try {
    const client = await getClient(flags.port);

    let metadata: Record<string, unknown> | undefined;
    if (flags.metadata) {
      try {
        metadata = JSON.parse(flags.metadata);
      } catch {
        console.error("Error: Invalid JSON in --metadata");
        process.exit(1);
      }
    }

    // Parse dates with relative date support
    const startDate = parseRelativeDate(flags.start ?? "-1h");
    let endDate: string;

    if (flags.duration) {
      endDate = parseDuration(new Date(startDate), flags.duration);
    } else if (flags.end) {
      endDate = parseRelativeDate(flags.end);
    } else {
      // Default to 30 min workout
      endDate = parseDuration(new Date(startDate), "30m");
    }

    const result = await client.saveWorkout(
      activityType,
      startDate,
      endDate,
      flags.energy,
      flags.distance,
      metadata
    );

    if (flags.json) {
      console.log(
        JSON.stringify(
          {
            activityType,
            start: startDate,
            end: endDate,
            energy: flags.energy,
            distance: flags.distance,
            ...result,
          },
          null,
          2
        )
      );
    } else {
      if (result.success) {
        const parts = [`Saved workout: ${activityType}`];
        if (flags.energy) parts.push(`energy=${flags.energy}kcal`);
        if (flags.distance) parts.push(`distance=${flags.distance}m`);
        console.log(parts.join(", "));
      } else {
        console.log(`Failed to save workout`);
      }
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const workoutCommand = buildCommand({
  loader: async () => ({ default: writeWorkout }),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Workout activity type (e.g., running, cycling, swimming)",
          parse: String,
          displayName: "activityType",
        },
      ],
    },
    flags: {
      start: {
        kind: "parsed",
        parse: String,
        brief: "Start date (e.g., '-1h', 'today 8am', ISO8601)",
        optional: true,
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "End date (e.g., 'now', 'today 9am', ISO8601)",
        optional: true,
      },
      duration: {
        kind: "parsed",
        parse: String,
        brief: "Duration (e.g., '30m', '1h', '1h30m')",
        optional: true,
      },
      energy: {
        kind: "parsed",
        parse: Number,
        brief: "Total energy burned (kcal)",
        optional: true,
      },
      distance: {
        kind: "parsed",
        parse: Number,
        brief: "Total distance (meters)",
        optional: true,
      },
      metadata: {
        kind: "parsed",
        parse: String,
        brief: "Metadata as JSON string",
        optional: true,
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
    },
  },
  docs: {
    brief: "Write a workout to HealthKit",
  },
});
