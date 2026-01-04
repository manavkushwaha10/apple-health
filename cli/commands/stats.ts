import { buildCommand } from "@stricli/core";
import { getClient } from "../client";
import type { StatisticsAggregation } from "../types";

interface StatsFlags {
  aggregations: string;
  start?: string;
  end?: string;
  interval?: string;
  json: boolean;
  port: number;
}

async function queryStats(flags: StatsFlags, type: string): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const aggregations = flags.aggregations.split(",") as StatisticsAggregation[];

    if (flags.interval) {
      // Statistics collection (time-bucketed)
      const results = await client.queryStatisticsCollection(type, aggregations, {
        startDate: flags.start,
        endDate: flags.end,
        interval: flags.interval as "hour" | "day" | "week" | "month" | "year",
      });

      if (flags.json) {
        console.log(JSON.stringify({ type, aggregations, interval: flags.interval, results }, null, 2));
      } else {
        console.log(`\nStatistics for ${type} (${flags.interval}ly)`);
        console.log("─".repeat(70));
        for (const result of results) {
          const date = result.startDate.split("T")[0];
          const values: string[] = [];
          if (result.sumQuantity !== undefined) values.push(`sum=${result.sumQuantity}`);
          if (result.averageQuantity !== undefined) values.push(`avg=${result.averageQuantity.toFixed(2)}`);
          if (result.minimumQuantity !== undefined) values.push(`min=${result.minimumQuantity}`);
          if (result.maximumQuantity !== undefined) values.push(`max=${result.maximumQuantity}`);
          if (result.mostRecentQuantity !== undefined) values.push(`recent=${result.mostRecentQuantity}`);
          console.log(`  ${date}  ${values.join(", ")} ${result.unit}`);
        }
      }
    } else {
      // Single statistics query
      const result = await client.queryStatistics(type, aggregations, {
        startDate: flags.start,
        endDate: flags.end,
      });

      if (flags.json) {
        console.log(JSON.stringify({ type, aggregations, result }, null, 2));
      } else {
        console.log(`\nStatistics for ${type}`);
        console.log("─".repeat(70));
        if (result.sumQuantity !== undefined) console.log(`  Sum:     ${result.sumQuantity} ${result.unit}`);
        if (result.averageQuantity !== undefined) console.log(`  Average: ${result.averageQuantity.toFixed(2)} ${result.unit}`);
        if (result.minimumQuantity !== undefined) console.log(`  Minimum: ${result.minimumQuantity} ${result.unit}`);
        if (result.maximumQuantity !== undefined) console.log(`  Maximum: ${result.maximumQuantity} ${result.unit}`);
        if (result.mostRecentQuantity !== undefined) console.log(`  Recent:  ${result.mostRecentQuantity} ${result.unit}`);
        console.log(`  Period:  ${result.startDate} to ${result.endDate}`);
      }
    }

    await client.disconnect();
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const statsCommand = buildCommand({
  loader: async () => ({ default: queryStats }),
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
      aggregations: {
        kind: "parsed",
        parse: String,
        brief: "Aggregations: cumulativeSum,discreteAverage,discreteMin,discreteMax,mostRecent",
        default: "cumulativeSum",
      },
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
      interval: {
        kind: "parsed",
        parse: String,
        brief: "Time interval: hour, day, week, month, year",
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
    brief: "Query statistics for a quantity type",
  },
});
