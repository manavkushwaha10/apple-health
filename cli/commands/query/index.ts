import { buildRouteMap } from "@stricli/core";
import { quantityCommand } from "./quantity";
import { categoryCommand } from "./category";
import { workoutsCommand } from "./workouts";
import { activityCommand } from "./activity";

export const queryRoute = buildRouteMap({
  routes: {
    quantity: quantityCommand,
    category: categoryCommand,
    workouts: workoutsCommand,
    activity: activityCommand,
  },
  docs: {
    brief: "Query HealthKit data",
  },
});
