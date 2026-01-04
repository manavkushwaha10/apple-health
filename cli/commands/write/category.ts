import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";
import { parseRelativeDate, parseDuration } from "../../utils/dates";

interface CategoryWriteFlags {
  start?: string;
  end?: string;
  duration?: string;
  metadata?: string;
  json: boolean;
  port: number;
}

async function writeCategory(
  flags: CategoryWriteFlags,
  type: string,
  value: number
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
    const startDate = parseRelativeDate(flags.start ?? "now");
    let endDate: string | undefined;

    if (flags.duration) {
      endDate = parseDuration(new Date(startDate), flags.duration);
    } else if (flags.end) {
      endDate = parseRelativeDate(flags.end);
    }

    const result = await client.saveCategorySample(
      type,
      value,
      startDate,
      endDate,
      metadata
    );

    if (flags.json) {
      console.log(JSON.stringify({ type, value, ...result }, null, 2));
    } else {
      if (result.success) {
        console.log(`Saved ${type}: value=${value}`);
      } else {
        console.log(`Failed to save ${type}`);
      }
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const categoryCommand = buildCommand({
  loader: async () => ({ default: writeCategory }),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Category type (e.g., sleepAnalysis, mindfulSession)",
          parse: String,
          displayName: "type",
        },
        {
          brief: "Category value (integer)",
          parse: Number,
          displayName: "value",
        },
      ],
    },
    flags: {
      start: {
        kind: "parsed",
        parse: String,
        brief: "Start date (e.g., 'now', 'today 8am', '-1d', ISO8601)",
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
        brief: "Duration from start (e.g., '1h', '30m', '8h')",
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
    brief: "Write a category sample to HealthKit",
  },
});
