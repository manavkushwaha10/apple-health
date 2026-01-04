import { buildCommand } from "@stricli/core";
import { getClient, type HealthKitClient } from "../client";
import { parseRelativeDate, parseDuration } from "../utils/dates";
import { QUANTITY_TYPE_INFO, QUANTITY_TYPES, CATEGORY_TYPES, WORKOUT_TYPES } from "../utils/types";
import * as readline from "readline";

interface ReplFlags {
  port: number;
}

const HELP = `
Apple HealthKit REPL - Interactive health data shell

Commands:
  write quantity <type> <value> [time]     Write quantity sample
  write category <type> <value> [time] [duration]   Write category sample
  write workout <activity> [time] [duration]        Write workout

  query quantity <type> [limit]            Query quantity samples
  query category <type> [limit]            Query category samples
  query workouts [limit]                   Query workouts

  stats <type> [interval]                  Get statistics (interval: hour|day|week)

  types [filter]                           List available types
  help                                     Show this help
  exit                                     Exit REPL

Time formats:
  now, today, yesterday, -1d, -2h, "today 8am", "yesterday 10pm"

Examples:
  write quantity heartRate 72
  write quantity heartRate 85 "today 8am"
  write quantity stepCount 5000 yesterday 1d
  write category sleepAnalysis 3 "-8h" 8h
  write workout running -1h 30m
  query quantity heartRate 10
  stats stepCount day
`;

async function handleCommand(
  client: HealthKitClient,
  input: string
): Promise<void> {
  const parts = parseInput(input);
  if (parts.length === 0) return;

  const [cmd, ...args] = parts;

  try {
    switch (cmd.toLowerCase()) {
      case "help":
      case "?":
        console.log(HELP);
        break;

      case "exit":
      case "quit":
      case "q":
        await client.disconnect();
        process.exit(0);

      case "write":
        await handleWrite(client, args);
        break;

      case "query":
        await handleQuery(client, args);
        break;

      case "stats":
        await handleStats(client, args);
        break;

      case "types":
        handleTypes(args[0]);
        break;

      default:
        console.log(`Unknown command: ${cmd}. Type 'help' for commands.`);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
  }
}

function parseInput(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of input) {
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === " " && !inQuotes) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  return parts;
}

async function handleWrite(client: HealthKitClient, args: string[]): Promise<void> {
  const [kind, ...rest] = args;

  if (kind === "quantity" || kind === "q") {
    const [type, valueStr, timeStr, durationStr] = rest;
    if (!type || !valueStr) {
      console.log("Usage: write quantity <type> <value> [time] [duration]");
      return;
    }
    const value = parseFloat(valueStr);
    const unit = QUANTITY_TYPE_INFO[type]?.unit;
    if (!unit) {
      console.log(`Unknown type or no default unit: ${type}`);
      return;
    }
    const start = parseRelativeDate(timeStr ?? "now");
    const end = durationStr ? parseDuration(new Date(start), durationStr) : undefined;

    await client.saveQuantitySample(type, value, unit, start, end);
    console.log(`Saved ${type}: ${value} ${unit}`);
  } else if (kind === "category" || kind === "c") {
    const [type, valueStr, timeStr, durationStr] = rest;
    if (!type || !valueStr) {
      console.log("Usage: write category <type> <value> [time] [duration]");
      return;
    }
    const value = parseInt(valueStr);
    const start = parseRelativeDate(timeStr ?? "now");
    const end = durationStr ? parseDuration(new Date(start), durationStr) : undefined;

    await client.saveCategorySample(type, value, start, end);
    console.log(`Saved ${type}: value=${value}`);
  } else if (kind === "workout" || kind === "w") {
    const [activityType, timeStr, durationStr] = rest;
    if (!activityType) {
      console.log("Usage: write workout <activity> [time] [duration]");
      return;
    }
    const start = parseRelativeDate(timeStr ?? "-30m");
    const end = parseDuration(new Date(start), durationStr ?? "30m");

    await client.saveWorkout(activityType, start, end);
    console.log(`Saved workout: ${activityType}`);
  } else {
    console.log("Usage: write <quantity|category|workout> ...");
  }
}

async function handleQuery(client: HealthKitClient, args: string[]): Promise<void> {
  const [kind, type, limitStr] = args;
  const limit = limitStr ? parseInt(limitStr) : 5;

  if (kind === "quantity" || kind === "q") {
    if (!type) {
      console.log("Usage: query quantity <type> [limit]");
      return;
    }
    const results = await client.queryQuantitySamples(type, { limit });
    console.log(`\n${type} (${results.length} samples):`);
    for (const sample of results) {
      const date = new Date(sample.startDate).toLocaleString();
      console.log(`  ${date}: ${sample.quantity} ${sample.unit}`);
    }
  } else if (kind === "category" || kind === "c") {
    if (!type) {
      console.log("Usage: query category <type> [limit]");
      return;
    }
    const results = await client.queryCategorySamples(type, { limit });
    console.log(`\n${type} (${results.length} samples):`);
    for (const sample of results) {
      const date = new Date(sample.startDate).toLocaleString();
      console.log(`  ${date}: value=${sample.value}`);
    }
  } else if (kind === "workouts" || kind === "w") {
    const workoutLimit = type ? parseInt(type) : 5;
    const results = await client.queryWorkouts({ limit: workoutLimit });
    console.log(`\nWorkouts (${results.length}):`);
    for (const w of results) {
      const date = new Date(w.startDate).toLocaleString();
      const duration = Math.round(w.duration / 60);
      console.log(`  ${date}: ${w.activityType} (${duration}m)`);
    }
  } else {
    console.log("Usage: query <quantity|category|workouts> ...");
  }
}

async function handleStats(client: HealthKitClient, args: string[]): Promise<void> {
  const [type, interval] = args;
  if (!type) {
    console.log("Usage: stats <type> [interval]");
    return;
  }

  if (interval) {
    const results = await client.queryStatisticsCollection(
      type,
      ["cumulativeSum", "discreteAverage", "discreteMin", "discreteMax"],
      { interval: interval as "hour" | "day" | "week" | "month" | "year" }
    );
    console.log(`\nStatistics for ${type} (${interval}):`);
    for (const r of results.slice(-7)) {
      const date = r.startDate.split("T")[0];
      const parts: string[] = [];
      if (r.sumQuantity !== undefined) parts.push(`sum=${r.sumQuantity}`);
      if (r.averageQuantity !== undefined) parts.push(`avg=${r.averageQuantity.toFixed(1)}`);
      console.log(`  ${date}: ${parts.join(", ")} ${r.unit}`);
    }
  } else {
    const result = await client.queryStatistics(
      type,
      ["cumulativeSum", "discreteAverage", "discreteMin", "discreteMax"]
    );
    console.log(`\nStatistics for ${type}:`);
    if (result.sumQuantity !== undefined) console.log(`  Sum: ${result.sumQuantity} ${result.unit}`);
    if (result.averageQuantity !== undefined) console.log(`  Avg: ${result.averageQuantity.toFixed(1)} ${result.unit}`);
    if (result.minimumQuantity !== undefined) console.log(`  Min: ${result.minimumQuantity} ${result.unit}`);
    if (result.maximumQuantity !== undefined) console.log(`  Max: ${result.maximumQuantity} ${result.unit}`);
  }
}

function handleTypes(filter?: string): void {
  const filterLower = filter?.toLowerCase();

  console.log("\nQuantity Types:");
  const quantities = filterLower
    ? QUANTITY_TYPES.filter((t) => t.toLowerCase().includes(filterLower))
    : QUANTITY_TYPES.slice(0, 20);
  console.log("  " + quantities.join(", "));
  if (!filterLower && QUANTITY_TYPES.length > 20) {
    console.log(`  ... and ${QUANTITY_TYPES.length - 20} more`);
  }

  console.log("\nCategory Types:");
  const categories = filterLower
    ? CATEGORY_TYPES.filter((t) => t.toLowerCase().includes(filterLower))
    : CATEGORY_TYPES.slice(0, 15);
  console.log("  " + categories.join(", "));
  if (!filterLower && CATEGORY_TYPES.length > 15) {
    console.log(`  ... and ${CATEGORY_TYPES.length - 15} more`);
  }

  console.log("\nWorkout Types:");
  const workouts = filterLower
    ? WORKOUT_TYPES.filter((t) => t.toLowerCase().includes(filterLower))
    : WORKOUT_TYPES.slice(0, 15);
  console.log("  " + workouts.join(", "));
  if (!filterLower && WORKOUT_TYPES.length > 15) {
    console.log(`  ... and ${WORKOUT_TYPES.length - 15} more`);
  }

  if (filterLower) {
    console.log(`\n(filtered by "${filter}")`);
  } else {
    console.log('\nTip: Use "types <filter>" to search, e.g., "types heart"');
  }
}

async function startRepl(flags: ReplFlags): Promise<void> {
  console.log("Connecting to Expo devtools...");

  const client = await getClient(flags.port);

  console.log("Connected! Type 'help' for commands, 'exit' to quit.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "apple-health> ",
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (input) {
      await handleCommand(client, input);
    }
    rl.prompt();
  });

  rl.on("close", async () => {
    console.log("\nDisconnecting...");
    await client.disconnect();
    process.exit(0);
  });
}

export const replCommand = buildCommand({
  loader: async () => ({ default: startRepl }),
  parameters: {
    flags: {
      port: {
        kind: "parsed",
        parse: Number,
        brief: "Expo devtools port",
        default: 8081,
      },
    },
  },
  docs: {
    brief: "Interactive REPL for HealthKit queries and writes",
  },
});
