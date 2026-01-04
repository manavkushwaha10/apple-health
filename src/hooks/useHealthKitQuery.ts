import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  StatisticsResult,
  StatisticsAggregation,
} from '../AppleHealth.types';
import { HealthKitQuery, IntervalUnit } from '../HealthKitQuery';
import type { HealthKitSample } from '../HealthKitSample';

export interface UseHealthKitQueryConfig {
  /** The HealthKit type identifier */
  type: QuantityTypeIdentifier | CategoryTypeIdentifier | 'workout';
  /** Query kind - inferred from type if not specified */
  kind?: 'quantity' | 'category' | 'workout';
  /** Start of date range */
  startDate?: Date | string;
  /** End of date range */
  endDate?: Date | string;
  /** Maximum number of results */
  limit?: number;
  /** Sort order: true = oldest first, false = newest first */
  ascending?: boolean;
  /** Skip initial fetch on mount */
  skip?: boolean;
}

export interface UseHealthKitQueryResult {
  /** The fetched sample objects with methods like delete() */
  data: HealthKitSample[] | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
  /** Delete a sample and remove it from the data array */
  deleteSample: (sample: HealthKitSample) => Promise<void>;
}

/**
 * React hook for querying HealthKit samples.
 *
 * Automatically manages the native query object lifecycle:
 * - Creates query on mount
 * - Releases cached samples on unmount or refetch
 * - Handles loading/error states
 *
 * Returns sample objects with methods like `delete()` and `toJSON()`.
 *
 * @example
 * ```tsx
 * function StepCounter() {
 *   const { data, isLoading, deleteSample } = useHealthKitQuery({
 *     type: 'stepCount',
 *     startDate: weekAgo,
 *     endDate: now,
 *     limit: 100,
 *   });
 *
 *   if (isLoading) return <Text>Loading...</Text>;
 *
 *   const total = data?.reduce((sum, s) => sum + s.value, 0) ?? 0;
 *   return (
 *     <View>
 *       <Text>{total} steps</Text>
 *       {data?.map(sample => (
 *         <Button key={sample.uuid} onPress={() => deleteSample(sample)} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useHealthKitQuery(config: UseHealthKitQueryConfig): UseHealthKitQueryResult {
  const [data, setData] = useState<HealthKitSample[] | null>(null);
  const [isLoading, setIsLoading] = useState(!config.skip);
  const [error, setError] = useState<Error | null>(null);

  // Keep query instance stable across renders
  const queryRef = useRef<HealthKitQuery | null>(null);

  // Memoize config to detect changes
  const configKey = useMemo(
    () =>
      JSON.stringify({
        type: config.type,
        kind: config.kind,
        startDate: config.startDate?.toString(),
        endDate: config.endDate?.toString(),
        limit: config.limit,
        ascending: config.ascending,
      }),
    [config.type, config.kind, config.startDate, config.endDate, config.limit, config.ascending]
  );

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Release previous query if exists
      if (queryRef.current) {
        queryRef.current.release();
      }

      // Create new query with current config
      const kind = config.kind ?? (config.type === 'workout' ? 'workout' : 'quantity');
      const query = new HealthKitQuery()
        .type(config.type, kind)
        .dateRange(config.startDate, config.endDate)
        .ascending(config.ascending ?? false);

      if (config.limit !== undefined) {
        query.limit(config.limit);
      }

      queryRef.current = query;

      const results = await query.execute();
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [configKey]);

  const deleteSample = useCallback(async (sample: HealthKitSample) => {
    await sample.delete();
    setData((prev) => prev?.filter((s) => s.uuid !== sample.uuid) ?? null);
  }, []);

  // Fetch on mount and when config changes
  useEffect(() => {
    if (!config.skip) {
      fetch();
    }

    // Cleanup on unmount
    return () => {
      if (queryRef.current) {
        queryRef.current.release();
        queryRef.current = null;
      }
    };
  }, [fetch, config.skip]);

  return { data, isLoading, error, refetch: fetch, deleteSample };
}

export interface UseHealthKitStatisticsConfig {
  /** The HealthKit quantity type identifier */
  type: QuantityTypeIdentifier;
  /** Aggregation types to compute */
  aggregations: StatisticsAggregation[];
  /** Start of date range */
  startDate?: Date | string;
  /** End of date range */
  endDate?: Date | string;
  /** Skip initial fetch on mount */
  skip?: boolean;
}

export interface UseHealthKitStatisticsResult {
  /** The statistics result */
  data: StatisticsResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
}

/**
 * React hook for querying HealthKit statistics.
 *
 * @example
 * ```tsx
 * function WeeklyStats() {
 *   const { data, isLoading } = useHealthKitStatistics({
 *     type: 'stepCount',
 *     aggregations: ['sum', 'average'],
 *     startDate: weekAgo,
 *     endDate: now,
 *   });
 *
 *   return (
 *     <View>
 *       <Text>Total: {data?.sumQuantity}</Text>
 *       <Text>Average: {data?.averageQuantity}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useHealthKitStatistics(
  config: UseHealthKitStatisticsConfig
): UseHealthKitStatisticsResult {
  const [data, setData] = useState<StatisticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(!config.skip);
  const [error, setError] = useState<Error | null>(null);

  const queryRef = useRef<HealthKitQuery | null>(null);

  const configKey = useMemo(
    () =>
      JSON.stringify({
        type: config.type,
        aggregations: config.aggregations,
        startDate: config.startDate?.toString(),
        endDate: config.endDate?.toString(),
      }),
    [config.type, config.aggregations, config.startDate, config.endDate]
  );

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (queryRef.current) {
        queryRef.current.release();
      }

      const query = new HealthKitQuery()
        .type(config.type, 'statistics')
        .dateRange(config.startDate, config.endDate)
        .aggregations(config.aggregations);

      queryRef.current = query;

      const results = await query.executeStatistics();
      setData(results as StatisticsResult);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [configKey]);

  useEffect(() => {
    if (!config.skip) {
      fetch();
    }

    return () => {
      if (queryRef.current) {
        queryRef.current.release();
        queryRef.current = null;
      }
    };
  }, [fetch, config.skip]);

  return { data, isLoading, error, refetch: fetch };
}

export interface UseHealthKitStatisticsCollectionConfig {
  /** The HealthKit quantity type identifier */
  type: QuantityTypeIdentifier;
  /** Aggregation types to compute */
  aggregations: StatisticsAggregation[];
  /** Time interval for bucketing */
  interval: IntervalUnit;
  /** Start of date range */
  startDate?: Date | string;
  /** End of date range */
  endDate?: Date | string;
  /** Skip initial fetch on mount */
  skip?: boolean;
}

export interface UseHealthKitStatisticsCollectionResult {
  /** Array of statistics results, one per time bucket */
  data: StatisticsResult[] | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Refetch the data */
  refetch: () => Promise<void>;
}

/**
 * React hook for querying HealthKit statistics collections (time-bucketed data).
 *
 * @example
 * ```tsx
 * function DailySteps() {
 *   const { data, isLoading } = useHealthKitStatisticsCollection({
 *     type: 'stepCount',
 *     aggregations: ['sum'],
 *     interval: 'day',
 *     startDate: monthAgo,
 *     endDate: now,
 *   });
 *
 *   return (
 *     <FlatList
 *       data={data}
 *       renderItem={({ item }) => (
 *         <Text>{item.startDate}: {item.sumQuantity} steps</Text>
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function useHealthKitStatisticsCollection(
  config: UseHealthKitStatisticsCollectionConfig
): UseHealthKitStatisticsCollectionResult {
  const [data, setData] = useState<StatisticsResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(!config.skip);
  const [error, setError] = useState<Error | null>(null);

  const queryRef = useRef<HealthKitQuery | null>(null);

  const configKey = useMemo(
    () =>
      JSON.stringify({
        type: config.type,
        aggregations: config.aggregations,
        interval: config.interval,
        startDate: config.startDate?.toString(),
        endDate: config.endDate?.toString(),
      }),
    [config.type, config.aggregations, config.interval, config.startDate, config.endDate]
  );

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (queryRef.current) {
        queryRef.current.release();
      }

      const query = new HealthKitQuery()
        .type(config.type, 'statisticsCollection')
        .dateRange(config.startDate, config.endDate)
        .aggregations(config.aggregations)
        .interval(config.interval);

      queryRef.current = query;

      const results = await query.executeStatistics();
      setData(results as StatisticsResult[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [configKey]);

  useEffect(() => {
    if (!config.skip) {
      fetch();
    }

    return () => {
      if (queryRef.current) {
        queryRef.current.release();
        queryRef.current = null;
      }
    };
  }, [fetch, config.skip]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * @deprecated Use `useHealthKitQuery` instead. It now returns sample objects with `delete()` method.
 */
export const useHealthKitSamples = useHealthKitQuery;
