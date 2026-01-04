export {
  useHealthKitQuery,
  useHealthKitSamples,
  useHealthKitStatistics,
  useHealthKitStatisticsCollection,
} from './useHealthKitQuery';

export type {
  UseHealthKitQueryConfig,
  UseHealthKitQueryResult,
  UseHealthKitStatisticsConfig,
  UseHealthKitStatisticsResult,
  UseHealthKitStatisticsCollectionConfig,
  UseHealthKitStatisticsCollectionResult,
} from './useHealthKitQuery';

/** @deprecated Use `UseHealthKitQueryResult` instead */
export type { UseHealthKitQueryResult as UseHealthKitSamplesResult } from './useHealthKitQuery';

export { useHealthKitSubscription, useHealthKitAnchor } from './useHealthKitSubscription';

export type {
  UseHealthKitSubscriptionConfig,
  UseHealthKitSubscriptionResult,
  UseHealthKitAnchorConfig,
  UseHealthKitAnchorResult,
} from './useHealthKitSubscription';
