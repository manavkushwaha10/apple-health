import { ViewStyle, StyleProp } from "react-native";

import { ActivitySummary } from "./AppleHealth.types";

export interface ActivityRingViewProps {
  /**
   * The activity summary data to display in the rings.
   * Contains Move (activeEnergyBurned), Exercise (appleExerciseTime), and Stand (appleStandHours) data.
   */
  summary?: Omit<ActivitySummary, "dateComponents">;
  style?: StyleProp<ViewStyle>;
}

/**
 * A no-op shim for ActivityRingView on unsupported platforms.
 * Returns null as HealthKitUI is not available.
 */
export function ActivityRingView(_props: ActivityRingViewProps): null {
  return null;
}
