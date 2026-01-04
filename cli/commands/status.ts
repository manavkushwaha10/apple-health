import { buildCommand } from "@stricli/core";
import { getClient } from "../client";

interface StatusFlags {
  json: boolean;
  port: number;
}

async function checkStatus(flags: StatusFlags): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const status = await client.getStatus();

    if (flags.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log("\nHealthKit Status");
      console.log("─".repeat(30));
      console.log(`  Available: ${status.isAvailable ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"}`);
      console.log(`  Connected: \x1b[32mYes\x1b[0m`);
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    console.error("\nMake sure:");
    console.error("  1. Expo dev server is running (npx expo start)");
    console.error("  2. The app is running on a device/simulator");
    console.error("  3. useHealthKitDevTools() hook is active in the app");
    process.exit(1);
  }
}

export const statusCommand = buildCommand({
  loader: async () => ({ default: checkStatus }),
  parameters: {
    flags: {
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
    brief: "Check HealthKit and connection status",
  },
});
