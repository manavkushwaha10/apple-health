export { default } from "./AppleHealthModule";
export * from "./AppleHealth.types";
export { ActivityRingView } from "./ActivityRingView";
export type { ActivityRingViewProps } from "./ActivityRingView";

// Shared object query builder
export {
  HealthKitQuery,
  queryQuantity,
  queryCategory,
  queryWorkouts,
  queryStatistics,
  queryStatisticsCollection,
} from "./HealthKitQuery";
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
export type { HealthKitSample } from "./HealthKitSample";

// Subscription and anchor shared objects
export { HealthKitSubscription, HealthKitAnchor } from "./HealthKitSubscription";
export type { AnchorKind, AnchoredQueryResult } from "./HealthKitSubscription";

// Sample builder for creating and saving samples
export {
  HealthKitSampleBuilder,
  buildQuantitySample,
  buildCategorySample,
  buildWorkout,
} from "./HealthKitSampleBuilder";

// React hooks
export {
  useHealthKitQuery,
  useHealthKitSamples,
  useHealthKitStatistics,
  useHealthKitStatisticsCollection,
  useHealthKitSubscription,
  useHealthKitAnchor,
} from "./hooks";
export type {
  UseHealthKitQueryConfig,
  UseHealthKitQueryResult,
  UseHealthKitSamplesResult,
  UseHealthKitStatisticsConfig,
  UseHealthKitStatisticsResult,
  UseHealthKitStatisticsCollectionConfig,
  UseHealthKitStatisticsCollectionResult,
  UseHealthKitSubscriptionConfig,
  UseHealthKitSubscriptionResult,
  UseHealthKitAnchorConfig,
  UseHealthKitAnchorResult,
} from "./hooks";
