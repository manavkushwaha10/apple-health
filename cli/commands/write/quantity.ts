import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";

interface QuantityWriteFlags {
  unit: string;
  start: string;
  end?: string;
  metadata?: string;
  json: boolean;
  port: number;
}

async function writeQuantity(
  flags: QuantityWriteFlags,
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

    const result = await client.saveQuantitySample(
      type,
      value,
      flags.unit,
      flags.start,
      flags.end,
      metadata
    );

    if (flags.json) {
      console.log(JSON.stringify({ type, value, unit: flags.unit, ...result }, null, 2));
    } else {
      if (result.success) {
        console.log(`Saved ${type}: ${value} ${flags.unit}`);
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

export const quantityCommand = buildCommand({
  loader: async () => ({ default: writeQuantity }),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Quantity type (e.g., stepCount, heartRate)",
          parse: String,
          displayName: "type",
        },
        {
          brief: "Value to save",
          parse: Number,
          displayName: "value",
        },
      ],
    },
    flags: {
      unit: {
        kind: "parsed",
        parse: String,
        brief: "Unit (e.g., count, count/min, kg)",
      },
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
    brief: "Write a quantity sample to HealthKit",
  },
});
