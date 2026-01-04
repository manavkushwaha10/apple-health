import { buildCommand } from "@stricli/core";
import { getClient } from "../client";

interface CharacteristicsFlags {
  json: boolean;
  port: number;
}

async function getCharacteristics(flags: CharacteristicsFlags): Promise<void> {
  try {
    const client = await getClient(flags.port);

    const characteristics = await client.getCharacteristics();

    if (flags.json) {
      console.log(JSON.stringify(characteristics, null, 2));
    } else {
      console.log("\nUser Characteristics");
      console.log("─".repeat(40));
      console.log(`  Date of Birth:     ${characteristics.dateOfBirth ?? "Not set"}`);
      console.log(`  Biological Sex:    ${characteristics.biologicalSex ?? "Not set"}`);
      console.log(`  Blood Type:        ${characteristics.bloodType ?? "Not set"}`);
      console.log(`  Skin Type:         ${characteristics.fitzpatrickSkinType ?? "Not set"}`);
      console.log(`  Wheelchair Use:    ${characteristics.wheelchairUse ?? "Not set"}`);
    }

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export const characteristicsCommand = buildCommand({
  loader: async () => ({ default: getCharacteristics }),
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
    brief: "Get user characteristics from HealthKit",
  },
});
