import { buildCommand, buildRouteMap } from "@stricli/core";
import { getClient } from "../client";
import { QUANTITY_TYPES, CATEGORY_TYPES } from "../utils/types";

interface AuthStatusFlags {
  all: boolean;
  json: boolean;
  port: number;
}

async function authStatus(
  flags: AuthStatusFlags,
  ...types: string[]
): Promise<void> {
  try {
    const client = await getClient(flags.port);

    let typesToCheck = types;
    if (flags.all || types.length === 0) {
      typesToCheck = [...QUANTITY_TYPES, ...CATEGORY_TYPES];
    }

    const status = await client.getAuthorizationStatus(typesToCheck);

    if (flags.json) {
      console.log(JSON.stringify({ status }, null, 2));
    } else {
      console.log("\nAuthorization Status");
      console.log("─".repeat(50));
      for (const [type, authStatus] of Object.entries(status)) {
        const icon =
          authStatus === "sharingAuthorized"
            ? "\x1b[32m✓\x1b[0m"
            : authStatus === "sharingDenied"
            ? "\x1b[31m✗\x1b[0m"
            : "\x1b[33m?\x1b[0m";
        console.log(`  ${icon} ${type}: ${authStatus}`);
      }
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

const statusCommand = buildCommand({
  loader: async () => ({ default: authStatus }),
  parameters: {
    positional: {
      kind: "array",
      parameter: {
        brief: "Types to check (or use --all)",
        parse: String,
        displayName: "types",
      },
    },
    flags: {
      all: {
        kind: "boolean",
        brief: "Check all known types",
        default: false,
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
    brief: "Check authorization status for data types",
  },
});

interface AuthRequestFlags {
  read: string;
  write: string;
  json: boolean;
  port: number;
}

async function authRequest(flags: AuthRequestFlags): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const readTypes = flags.read ? flags.read.split(",") : [];
    const writeTypes = flags.write ? flags.write.split(",") : [];

    const result = await client.requestAuthorization(readTypes, writeTypes);

    if (flags.json) {
      console.log(JSON.stringify({ read: readTypes, write: writeTypes, ...result }, null, 2));
    } else {
      console.log(`Authorization request completed: ${result.status}`);
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

const requestCommand = buildCommand({
  loader: async () => ({ default: authRequest }),
  parameters: {
    flags: {
      read: {
        kind: "parsed",
        parse: String,
        brief: "Comma-separated types to request read access",
        default: "",
      },
      write: {
        kind: "parsed",
        parse: String,
        brief: "Comma-separated types to request write access",
        default: "",
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
    brief: "Request authorization for data types",
  },
});

export const authRoute = buildRouteMap({
  routes: {
    status: statusCommand,
    request: requestCommand,
  },
  docs: {
    brief: "Manage HealthKit authorization",
  },
});
