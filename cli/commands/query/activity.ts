import { buildCommand } from "@stricli/core";
import { getClient } from "../../client";
import { formatActivityTable } from "../../formatters";

interface ActivityQueryFlags {
  start: string;
  end: string;
  json: boolean;
  port: number;
}

async function queryActivity(flags: ActivityQueryFlags): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const summaries = await client.queryActivitySummary(flags.start, flags.end);

    if (flags.json) {
      console.log(JSON.stringify({ count: summaries.length, summaries }, null, 2));
    } else {
      console.log(`\nActivity Summaries (${summaries.length} days)`);
      console.log("─".repeat(70));
      if (summaries.length === 0) {
        console.log("  No activity data found");
      } else {
        console.log(formatActivityTable(summaries));
      }
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const activityCommand = buildCommand({
  loader: async () => ({ default: queryActivity }),
  parameters: {
    flags: {
      start: {
        kind: "parsed",
        parse: String,
        brief: "Start date (YYYY-MM-DD)",
      },
      end: {
        kind: "parsed",
        parse: String,
        brief: "End date (YYYY-MM-DD)",
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
    brief: "Query activity ring summaries",
  },
});
