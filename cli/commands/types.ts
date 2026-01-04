import { buildCommand } from "@stricli/core";
import {
  QUANTITY_TYPES,
  CATEGORY_TYPES,
  WORKOUT_TYPES,
  QUANTITY_TYPE_INFO,
  CATEGORY_TYPE_INFO,
} from "../utils/types";

interface TypesFlags {
  category?: string;
  json: boolean;
}

async function listTypes(flags: TypesFlags): Promise<void> {
  const output: Record<string, string[]> = {};

  if (!flags.category || flags.category === "quantity") {
    output.quantity = QUANTITY_TYPES;
  }
  if (!flags.category || flags.category === "category") {
    output.category = CATEGORY_TYPES;
  }
  if (!flags.category || flags.category === "workout") {
    output.workout = WORKOUT_TYPES;
  }

  if (flags.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (output.quantity) {
      console.log("\nQuantity Types");
      console.log("─".repeat(50));
      for (const type of output.quantity) {
        const info = QUANTITY_TYPE_INFO[type];
        if (info) {
          console.log(`  ${type} (${info.category}) [${info.unit}]`);
        } else {
          console.log(`  ${type}`);
        }
      }
    }

    if (output.category) {
      console.log("\nCategory Types");
      console.log("─".repeat(50));
      for (const type of output.category) {
        const info = CATEGORY_TYPE_INFO[type];
        if (info) {
          console.log(`  ${type} (${info.category})`);
        } else {
          console.log(`  ${type}`);
        }
      }
    }

    if (output.workout) {
      console.log("\nWorkout Activity Types");
      console.log("─".repeat(50));
      for (const type of output.workout) {
        console.log(`  ${type}`);
      }
    }
  }
}

export const typesCommand = buildCommand({
  loader: async () => ({ default: listTypes }),
  parameters: {
    flags: {
      category: {
        kind: "parsed",
        parse: String,
        brief: "Filter by category: quantity, category, workout",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output as JSON",
        default: false,
      },
    },
  },
  docs: {
    brief: "List available HealthKit data types",
  },
});
