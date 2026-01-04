import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";

interface WorkoutWriteFlags {
  start: string;
  end: string;
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

    const result = await client.saveWorkout(
      activityType,
      flags.start,
      flags.end,
      flags.energy,
      flags.distance,
      metadata
    );

    if (flags.json) {
      console.log(
        JSON.stringify(
          {
            activityType,
            start: flags.start,
            end: flags.end,
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
        brief: "Start date (ISO8601)",
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "End date (ISO8601)",
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
