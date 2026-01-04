import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";

interface CategoryWriteFlags {
  start: string;
  end?: string;
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

    const result = await client.saveCategorySample(
      type,
      value,
      flags.start,
      flags.end,
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
        brief: "Start date (ISO8601)",
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "End date (ISO8601, defaults to start)",
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
