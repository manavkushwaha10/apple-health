import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";
import { formatSamplesTable, formatTypeName } from "../../formatters";

interface QuantityQueryFlags {
  start?: string;
  end?: string;
  limit: number;
  json: boolean;
  port: number;
  asc: boolean;
}

async function queryQuantity(
  flags: QuantityQueryFlags,
  type: string
): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const samples = await client.queryQuantitySamples(type, {
      startDate: flags.start,
      endDate: flags.end,
      limit: flags.limit,
      ascending: flags.asc,
    });

    if (flags.json) {
      console.log(JSON.stringify({ type, count: samples.length, samples }, null, 2));
    } else {
      console.log(`\n${formatTypeName(type)} (${samples.length} samples)`);
      console.log("─".repeat(70));
      if (samples.length === 0) {
        console.log("  No samples found");
      } else {
        console.log(formatSamplesTable(samples));
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
  loader: async () => ({ default: queryQuantity }),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Quantity type (e.g., stepCount, heartRate)",
          parse: String,
          displayName: "type",
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
        brief: "Maximum samples to return",
        default: 100,
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
    brief: "Query quantity samples from HealthKit",
  },
});
