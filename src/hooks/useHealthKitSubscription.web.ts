import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
} from '../AppleHealth.types';
import type { HealthKitSample } from '../HealthKitSample';
import { HealthKitSubscription, HealthKitAnchor, AnchorKind } from '../HealthKitSubscription';

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
 * No-op shim for unsupported platforms.
 */
export function useHealthKitSubscription(
  config: UseHealthKitSubscriptionConfig
): UseHealthKitSubscriptionResult {
  const [isActive, setIsActive] = useState(false);
  const [lastUpdate] = useState<string | null>(null);

  const subscriptionRef = useRef<HealthKitSubscription | null>(null);

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

  // Auto-start on mount if configured (no-op on web)
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
 * No-op shim for unsupported platforms.
 */
export function useHealthKitAnchor(
  config: UseHealthKitAnchorConfig
): UseHealthKitAnchorResult {
  const [samples] = useState<HealthKitSample[]>([]);
  const [deletedObjects] = useState<Array<{ uuid: string }>>([]);
  const [hasMore] = useState(false);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const anchorRef = useRef<HealthKitAnchor | null>(null);

  // Initialize anchor (no-op)
  useEffect(() => {
    const anchor = new HealthKitAnchor(config.type, config.kind ?? 'quantity');
    anchorRef.current = anchor;

    return () => {
      anchorRef.current = null;
    };
  }, [config.type, config.kind]);

  const fetchMore = useCallback(async () => {
    // No-op on unsupported platforms
  }, []);

  const reset = useCallback(async () => {
    anchorRef.current?.reset();
  }, []);

  const getAnchorState = useCallback(() => {
    return anchorRef.current?.serialize() ?? null;
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
