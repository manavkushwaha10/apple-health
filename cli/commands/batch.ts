import { buildCommand } from "@stricli/core";
import { getClient } from "../client";
import { parseRelativeDate, parseDuration } from "../utils/dates";
import { QUANTITY_TYPE_INFO } from "../utils/types";
import type { HealthKitClient } from "../client";

/**
 * Batch sample format (NDJSON - one JSON object per line):
 *
 * Quantity sample:
 * {"kind": "quantity", "type": "heartRate", "value": 72, "unit": "count/min", "start": "today 8am"}
 *
 * Category sample:
 * {"kind": "category", "type": "sleepAnalysis", "value": 3, "start": "-8h", "duration": "8h"}
 *
 * Workout:
 * {"kind": "workout", "activityType": "running", "start": "-1h", "duration": "30m", "energy": 250}
 *
 * Date fields support relative dates: "now", "today 8am", "-1d", "-2h", etc.
 */

interface BatchFlags {
  quiet: boolean;
  json: boolean;
  port: number;
}

interface BaseSample {
  start?: string;
  end?: string;
  duration?: string;
  metadata?: Record<string, unknown>;
}

interface QuantitySample extends BaseSample {
  kind: "quantity";
  type: string;
  value: number;
  unit?: string;
}

interface CategorySample extends BaseSample {
  kind: "category";
  type: string;
  value: number;
}

interface WorkoutSample extends BaseSample {
  kind: "workout";
  activityType: string;
  energy?: number;
  distance?: number;
}

type Sample = QuantitySample | CategorySample | WorkoutSample;

async function writeSample(
  client: HealthKitClient,
  sample: Sample,
  quiet: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const startDate = parseRelativeDate(sample.start ?? "now");
    let endDate: string | undefined;

    if (sample.duration) {
      endDate = parseDuration(new Date(startDate), sample.duration);
    } else if (sample.end) {
      endDate = parseRelativeDate(sample.end);
    }

    if (sample.kind === "quantity") {
      const unit = sample.unit ?? QUANTITY_TYPE_INFO[sample.type]?.unit;
      if (!unit) {
        return { success: false, error: `No unit for ${sample.type}` };
      }
      await client.saveQuantitySample(
        sample.type,
        sample.value,
        unit,
        startDate,
        endDate,
        sample.metadata
      );
      if (!quiet) console.log(`  + ${sample.type}: ${sample.value} ${unit}`);
    } else if (sample.kind === "category") {
      await client.saveCategorySample(
        sample.type,
        sample.value,
        startDate,
        endDate,
        sample.metadata
      );
      if (!quiet) console.log(`  + ${sample.type}: value=${sample.value}`);
    } else if (sample.kind === "workout") {
      await client.saveWorkout(
        sample.activityType,
        startDate,
        endDate ?? parseDuration(new Date(startDate), "30m"),
        sample.energy,
        sample.distance,
        sample.metadata
      );
      if (!quiet) console.log(`  + workout: ${sample.activityType}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function batchWrite(flags: BatchFlags): Promise<void> {
  try {
    // Read all of stdin
    const input = await Bun.stdin.text();
    const lines = input.trim().split("\n").filter((l) => l.trim());

    if (lines.length === 0) {
      console.error("No input received. Pipe NDJSON to stdin.");
      console.error("\nExample:");
      console.error('  echo \'{"kind":"quantity","type":"heartRate","value":72}\' | bun cli/index.ts batch');
      process.exit(1);
    }

    const client = await getClient(flags.port);

    if (!flags.quiet) {
      console.log(`\nWriting ${lines.length} samples...`);
    }

    const results: { line: number; success: boolean; error?: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        const sample = JSON.parse(line) as Sample;
        const result = await writeSample(client, sample, flags.quiet);
        results.push({ line: i + 1, ...result });
      } catch (error) {
        results.push({
          line: i + 1,
          success: false,
          error: `Invalid JSON: ${(error as Error).message}`,
        });
        if (!flags.quiet) {
          console.error(`  ! Line ${i + 1}: Invalid JSON`);
        }
      }
    }

    await client.disconnect();

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (flags.json) {
      console.log(JSON.stringify({ total: lines.length, succeeded, failed, results }, null, 2));
    } else if (!flags.quiet) {
      console.log(`\nDone: ${succeeded} succeeded, ${failed} failed`);
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const batchCommand = buildCommand({
  loader: async () => ({ default: batchWrite }),
  parameters: {
    flags: {
      quiet: {
        kind: "boolean",
        brief: "Suppress output (only show errors)",
        default: false,
      },
      json: {
        kind: "boolean",
        brief: "Output results as JSON",
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
    brief: "Write multiple samples from stdin (NDJSON format)",
  },
});
