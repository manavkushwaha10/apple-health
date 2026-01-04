import { useCallback, useEffect, useRef, useState } from 'react';

import { requireNativeModule } from 'expo';

import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
} from '../AppleHealth.types';
import type { HealthKitSample } from '../HealthKitSample';
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
 * React hook for real-time HealthKit change notifications.
 *
 * Notifies you when data changes so you can refetch.
 * Does NOT fetch data itself - combine with `useHealthKitQuery`.
 *
 * For **paginated data sync**, use `useHealthKitAnchor` instead.
 *
 * @example
 * ```tsx
 * function HeartRateMonitor() {
 *   const { data, refetch } = useHealthKitQuery({
 *     type: 'heartRate',
 *     limit: 10,
 *   });
 *
 *   // Refetch when HealthKit data changes
 *   useHealthKitSubscription({
 *     type: 'heartRate',
 *     onUpdate: refetch,
 *   });
 *
 *   return <Text>Latest: {data?.[0]?.value} bpm</Text>;
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

export interface UseHealthKitAnchorResult {
  /** Accumulated samples from all fetches (with delete() method) */
  samples: HealthKitSample[];
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
 * React hook for paginated incremental sync with HealthKit.
 *
 * Fetches data in batches and tracks sync state. Ideal for loading
 * large datasets or syncing to a local database.
 *
 * For **real-time notifications**, use `useHealthKitSubscription` instead.
 *
 * Returns sample objects with methods like `delete()` and `toJSON()`.
 *
 * @example
 * ```tsx
 * function SyncedSteps() {
 *   const { samples, hasMore, fetchMore, isLoading, deletedObjects } = useHealthKitAnchor({
 *     type: 'stepCount',
 *     limit: 50,
 *   });
 *
 *   // Handle deletions
 *   useEffect(() => {
 *     for (const { uuid } of deletedObjects) {
 *       removeFromLocalDB(uuid);
 *     }
 *   }, [deletedObjects]);
 *
 *   return (
 *     <FlatList
 *       data={samples}
 *       onEndReached={() => hasMore && !isLoading && fetchMore()}
 *       renderItem={({ item }) => (
 *         <Text>{item.__typename === 'QuantitySample' ? `${item.value} steps` : ''}</Text>
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function useHealthKitAnchor(
  config: UseHealthKitAnchorConfig
): UseHealthKitAnchorResult {
  const [samples, setSamples] = useState<HealthKitSample[]>([]);
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
      const result = await anchorRef.current.fetchNext(limit);

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
