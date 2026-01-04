export { default } from './AppleHealthModule';
export * from './AppleHealth.types';
export { ActivityRingView } from './ActivityRingView';
export type { ActivityRingViewProps } from './ActivityRingView';
export { useHealthKitDevTools } from './devtools';

// Shared object query builder
export {
  HealthKitQuery,
  queryQuantity,
  queryCategory,
  queryWorkouts,
  queryStatistics,
  queryStatisticsCollection,
} from './HealthKitQuery';
export type { HealthKitQueryConfig, QueryKind, IntervalUnit } from './HealthKitQuery';

// React hooks
export {
  useHealthKitQuery,
  useHealthKitStatistics,
  useHealthKitStatisticsCollection,
} from './hooks';
export type {
  UseHealthKitQueryConfig,
  UseHealthKitQueryResult,
  UseHealthKitStatisticsConfig,
  UseHealthKitStatisticsResult,
  UseHealthKitStatisticsCollectionConfig,
  UseHealthKitStatisticsCollectionResult,
} from './hooks';
