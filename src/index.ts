export { default } from "./AppleHealthModule";
export * from "./AppleHealth.types";
export { ActivityRingView } from "./ActivityRingView";
export type { ActivityRingViewProps } from "./ActivityRingView";

// Shared object query builder
export { HealthKitQuery } from "./HealthKitQuery";
export type {
  HealthKitQueryConfig,
  QueryKind,
  IntervalUnit,
} from "./HealthKitQuery";

// Shared object samples (with delete() method)
export {
  HealthKitSampleBase,
  QuantitySample,
  CategorySample,
  WorkoutSample,
} from "./HealthKitSample";
export type { HealthKitSample, SampleTypename } from "./HealthKitSample";

// Subscription and anchor shared objects
export { HealthKitSubscription, HealthKitAnchor } from "./HealthKitSubscription";
export type { AnchorKind, AnchoredQueryResult } from "./HealthKitSubscription";

// Sample builder for creating and saving samples
export { HealthKitSampleBuilder } from "./HealthKitSampleBuilder";

// React hooks
export {
  useHealthKitQuery,
  useHealthKitStatistics,
  useHealthKitSubscription,
  useHealthKitAnchor,
} from "./hooks";
export type {
  UseHealthKitQueryConfig,
  UseHealthKitQueryResult,
  UseHealthKitStatisticsConfig,
  UseHealthKitStatisticsResult,
  UseHealthKitSubscriptionConfig,
  UseHealthKitSubscriptionResult,
  UseHealthKitAnchorConfig,
  UseHealthKitAnchorResult,
} from "./hooks";
