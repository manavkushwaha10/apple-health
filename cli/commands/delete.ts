import { buildCommand } from "@stricli/core";
import { getClient } from "../client";

interface DeleteFlags {
  start: string;
  end: string;
  json: boolean;
  port: number;
}

async function deleteSamples(
  flags: DeleteFlags,
  type: string
): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const result = await client.deleteSamples(type, flags.start, flags.end);

    if (flags.json) {
      console.log(JSON.stringify({ type, start: flags.start, end: flags.end, ...result }, null, 2));
    } else {
      if (result.success) {
        console.log(`Deleted ${type} samples from ${flags.start} to ${flags.end}`);
      } else {
        console.log(`Failed to delete ${type} samples`);
      }
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const deleteCommand = buildCommand({
  loader: async () => ({ default: deleteSamples }),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Type of samples to delete",
          parse: String,
          displayName: "type",
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
    brief: "Delete samples from HealthKit",
  },
});
