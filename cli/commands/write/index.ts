import { buildRouteMap } from "@stricli/core";
import { quantityCommand } from "./quantity";
import { categoryCommand } from "./category";
import { workoutCommand } from "./workout";

export const writeRoute = buildRouteMap({
  routes: {
    quantity: quantityCommand,
    category: categoryCommand,
    workout: workoutCommand,
  },
  docs: {
    brief: "Write samples to HealthKit",
  },
});
