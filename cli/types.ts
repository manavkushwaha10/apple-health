// Re-export types from main package for CLI use
export interface QueryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  ascending?: boolean;
}

export interface StatisticsOptions extends QueryOptions {
  interval: "hour" | "day" | "week" | "month" | "year";
}

export type StatisticsAggregation =
  | "cumulativeSum"
  | "discreteAverage"
  | "discreteMin"
  | "discreteMax"
  | "mostRecent";

export interface QuantitySample {
  uuid: string;
  quantityType: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export interface CategorySample {
  uuid: string;
  categoryType: string;
  value: number;
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export interface WorkoutSample {
  uuid: string;
  workoutActivityType: string;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: number;
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export interface StatisticsResult {
  quantityType: string;
  startDate: string;
  endDate: string;
  sumQuantity?: number;
  averageQuantity?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  mostRecentQuantity?: number;
  unit: string;
}

export interface ActivitySummary {
  dateComponents: {
    year: number;
    month: number;
    day: number;
  };
  activeEnergyBurned: number;
  activeEnergyBurnedGoal: number;
  appleExerciseTime: number;
  appleExerciseTimeGoal: number;
  appleStandHours: number;
  appleStandHoursGoal: number;
}

export interface Characteristics {
  dateOfBirth: string | null;
  biologicalSex: string | null;
  bloodType: string | null;
  fitzpatrickSkinType: number | null;
  wheelchairUse: boolean | null;
}

export interface PluginMessage {
  id: string;
  type: string;
  payload?: unknown;
}

export interface PluginResponse {
  id: string;
  type: "result" | "error";
  data?: unknown;
  error?: string;
}
