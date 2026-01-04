import { useCallback, useEffect, useRef, useState } from 'react';

import { requireNativeModule } from 'expo';

import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  QuantitySample,
  CategorySample,
} from '../AppleHealth.types';
import { HealthKitSubscription, HealthKitAnchor, AnchorKind } from '../HealthKitSubscription';

interface AppleHealthModuleEvents {
  addListener(event: string, callback: (data: unknown) => void): { remove: () => void };
}

const AppleHealthModule = requireNativeModule<AppleHealthModuleEvents>('AppleHealth');

export interface UseHealthKitSubscriptionConfig {
  /** The HealthKit type to subscribe to */
  type: QuantityTypeIdentifier | CategoryTypeIdentifier;
  /** Callback when data changes */
  onUpdate?: () => void;
  /** Start subscription automatically on mount (default: true) */
  autoStart?: boolean;
}

export interface UseHealthKitSubscriptionResult {
  /** Whether the subscription is active */
  isActive: boolean;
  /** Last update timestamp */
  lastUpdate: string | null;
  /** Start the subscription */
  start: () => void;
  /** Pause the subscription */
  pause: () => void;
  /** Resume the subscription */
  resume: () => void;
  /** Stop and cleanup the subscription */
  unsubscribe: () => void;
}

/**
 * React hook for subscribing to HealthKit data changes.
 * Automatically manages subscription lifecycle.
 *
 * @example
 * ```tsx
 * function HeartRateMonitor() {
 *   const [updates, setUpdates] = useState(0);
 *
 *   const { isActive, pause, resume } = useHealthKitSubscription({
 *     type: 'heartRate',
 *     onUpdate: () => {
 *       setUpdates(n => n + 1);
 *       // Refetch data here
 *     },
 *   });
 *
 *   return (
 *     <View>
 *       <Text>Updates: {updates}</Text>
 *       <Button title={isActive ? "Pause" : "Resume"}
 *               onPress={isActive ? pause : resume} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useHealthKitSubscription(
  config: UseHealthKitSubscriptionConfig
): UseHealthKitSubscriptionResult {
  const [isActive, setIsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const subscriptionRef = useRef<HealthKitSubscription | null>(null);
  const onUpdateRef = useRef(config.onUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onUpdateRef.current = config.onUpdate;
  }, [config.onUpdate]);

  const start = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const subscription = new HealthKitSubscription(config.type);
    subscription.start();
    subscriptionRef.current = subscription;
    setIsActive(true);
  }, [config.type]);

  const pause = useCallback(() => {
    subscriptionRef.current?.pause();
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    subscriptionRef.current?.resume();
    setIsActive(true);
  }, []);

  const unsubscribe = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setIsActive(false);
  }, []);

  // Listen for updates from the module
  useEffect(() => {
    const listener = AppleHealthModule.addListener('onHealthKitUpdate', (event: unknown) => {
      const data = event as { typeIdentifier: string; subscriptionId?: number };

      // Check if this update is for our subscription
      if (data.typeIdentifier === config.type) {
        if (subscriptionRef.current) {
          setLastUpdate(subscriptionRef.current.lastUpdate);
        }
        onUpdateRef.current?.();
      }
    });

    return () => listener.remove();
  }, [config.type]);

  // Auto-start on mount if configured
  useEffect(() => {
    if (config.autoStart !== false) {
      start();
    }

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  return { isActive, lastUpdate, start, pause, resume, unsubscribe };
}

export interface UseHealthKitAnchorConfig {
  /** The HealthKit type to query */
  type: QuantityTypeIdentifier | CategoryTypeIdentifier;
  /** Query kind (default: 'quantity') */
  kind?: AnchorKind;
  /** Number of samples per fetch (default: 100) */
  limit?: number;
  /** Key for persisting anchor state (optional) */
  persistKey?: string;
  /** Skip initial fetch on mount */
  skip?: boolean;
}

export interface UseHealthKitAnchorResult<T> {
  /** Accumulated samples from all fetches */
  samples: T[];
  /** UUIDs of deleted samples */
  deletedObjects: Array<{ uuid: string }>;
  /** Whether there are more samples to fetch */
  hasMore: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Fetch the next batch */
  fetchMore: () => Promise<void>;
  /** Reset and start over */
  reset: () => Promise<void>;
  /** Get serialized anchor for manual persistence */
  getAnchorState: () => string | null;
}

/**
 * React hook for incremental syncing with HealthKit using anchored queries.
 * Maintains anchor state and accumulates samples across fetches.
 *
 * @example
 * ```tsx
 * function SyncedSteps() {
 *   const { samples, hasMore, fetchMore, isLoading } = useHealthKitAnchor({
 *     type: 'stepCount',
 *     limit: 50,
 *   });
 *
 *   return (
 *     <FlatList
 *       data={samples}
 *       onEndReached={() => hasMore && !isLoading && fetchMore()}
 *       renderItem={({ item }) => <Text>{item.value} steps</Text>}
 *     />
 *   );
 * }
 * ```
 */
export function useHealthKitAnchor<T = QuantitySample | CategorySample>(
  config: UseHealthKitAnchorConfig
): UseHealthKitAnchorResult<T> {
  const [samples, setSamples] = useState<T[]>([]);
  const [deletedObjects, setDeletedObjects] = useState<Array<{ uuid: string }>>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(!config.skip);
  const [error, setError] = useState<Error | null>(null);

  const anchorRef = useRef<HealthKitAnchor | null>(null);
  const limit = config.limit ?? 100;

  // Initialize anchor
  useEffect(() => {
    const anchor = new HealthKitAnchor(config.type, config.kind ?? 'quantity');
    anchorRef.current = anchor;

    return () => {
      anchorRef.current = null;
    };
  }, [config.type, config.kind]);

  const fetchMore = useCallback(async () => {
    if (!anchorRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await anchorRef.current.fetchNext<T>(limit);

      setSamples((prev) => [...prev, ...result.samples]);
      setDeletedObjects((prev) => [...prev, ...result.deletedObjects]);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [limit, isLoading]);

  const reset = useCallback(async () => {
    anchorRef.current?.reset();
    setSamples([]);
    setDeletedObjects([]);
    setHasMore(true);
    setError(null);

    if (!config.skip) {
      await fetchMore();
    }
  }, [config.skip, fetchMore]);

  const getAnchorState = useCallback(() => {
    return anchorRef.current?.serialize() ?? null;
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!config.skip && anchorRef.current) {
      fetchMore();
    }
  }, []);

  return {
    samples,
    deletedObjects,
    hasMore,
    isLoading,
    error,
    fetchMore,
    reset,
    getAnchorState,
  };
}
