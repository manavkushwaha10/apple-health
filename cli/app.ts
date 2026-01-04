import { buildApplication, buildRouteMap } from "@stricli/core";
import { queryRoute } from "./commands/query";
import { writeRoute } from "./commands/write";
import { statsCommand } from "./commands/stats";
import { authRoute } from "./commands/auth";
import { typesCommand } from "./commands/types";
import { characteristicsCommand } from "./commands/characteristics";
import { deleteCommand } from "./commands/delete";
import { statusCommand } from "./commands/status";

const routes = buildRouteMap({
  routes: {
    query: queryRoute,
    write: writeRoute,
    stats: statsCommand,
    auth: authRoute,
    types: typesCommand,
    characteristics: characteristicsCommand,
    delete: deleteCommand,
    status: statusCommand,
  },
  docs: {
    brief: "HealthKit CLI - Query and write health data via Expo devtools",
    hideRoute: {},
  },
});

export const app = buildApplication(routes, {
  name: "healthkit",
  versionInfo: {
    currentVersion: "1.0.0",
  },
});
