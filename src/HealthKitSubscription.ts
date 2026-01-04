import { requireNativeModule } from 'expo';

import type { QuantityTypeIdentifier, CategoryTypeIdentifier } from './AppleHealth.types';
import { wrapNativeSamples, type HealthKitSample } from './HealthKitSample';

// Native shared object interfaces
interface NativeHealthKitSubscription {
  readonly type: string;
  readonly isActive: boolean;
  readonly lastUpdate: string | null;
  start(typeIdentifier: string): void;
  pause(): void;
  resume(): void;
  unsubscribe(): void;
  getId(): number;
}

interface NativeHealthKitAnchor {
  readonly type: string;
  readonly kind: string;
  readonly hasMore: boolean;
  configure(typeIdentifier: string, kind: string): void;
  restore(serialized: string): boolean;
  serialize(): string | null;
  reset(): void;
  fetchNextSamples(limit: number): Promise<AnchorFetchResult>;
}

interface AnchorFetchResult {
  samples: unknown[];
  deletedObjects: Array<{ uuid: string }>;
  hasMore: boolean;
}

// Module with shared object classes
interface AppleHealthModuleWithSubscription {
  HealthKitSubscription: new () => NativeHealthKitSubscription;
  HealthKitAnchor: new () => NativeHealthKitAnchor;
}

const AppleHealthModule =
  requireNativeModule<AppleHealthModuleWithSubscription>('AppleHealth');

/**
 * Real-time observer for HealthKit data changes.
 *
 * Use this when you need **push notifications** about data changes.
 * Does NOT fetch data - use with `useHealthKitQuery` to refetch on updates.
 *
 * For **paginated data fetching**, use `HealthKitAnchor` instead.
 *
 * @example
 * ```ts
 * const subscription = new HealthKitSubscription('heartRate');
 * subscription.start();
 *
 * // Listen for changes via module events
 * AppleHealth.addListener('onHealthKitUpdate', (event) => {
 *   if (event.typeIdentifier === 'heartRate') {
 *     // Refetch your data here
 *   }
 * });
 *
 * // Control the subscription
 * subscription.pause();     // Temporarily stop callbacks
 * subscription.resume();    // Resume callbacks
 * subscription.unsubscribe(); // Stop completely
 * ```
 */
export class HealthKitSubscription {
  private native: NativeHealthKitSubscription;
  private typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier;

  constructor(type: QuantityTypeIdentifier | CategoryTypeIdentifier) {
    this.native = new AppleHealthModule.HealthKitSubscription();
    this.typeIdentifier = type;
  }

  /** The type being observed */
  get type(): QuantityTypeIdentifier | CategoryTypeIdentifier {
    return this.typeIdentifier;
  }

  /** Whether the subscription is currently active and not paused */
  get isActive(): boolean {
    return this.native.isActive;
  }

  /** ISO8601 timestamp of last update, or null if never updated */
  get lastUpdate(): string | null {
    return this.native.lastUpdate;
  }

  /** Unique identifier for this subscription instance */
  get id(): number {
    return this.native.getId();
  }

  /**
   * Start observing changes.
   * Updates will be delivered via the module's onHealthKitUpdate event.
   */
  start(): void {
    this.native.start(this.typeIdentifier);
  }

  /** Pause the subscription (stops callbacks but keeps query alive) */
  pause(): void {
    this.native.pause();
  }

  /** Resume the subscription after pausing */
  resume(): void {
    this.native.resume();
  }

  /** Stop the subscription and release resources */
  unsubscribe(): void {
    this.native.unsubscribe();
  }
}

export type AnchorKind = 'quantity' | 'category';

export interface AnchoredQueryResult {
  /** New or updated samples (shared objects with delete() method) */
  samples: HealthKitSample[];
  /** UUIDs of deleted samples */
  deletedObjects: Array<{ uuid: string }>;
  /** Whether there are more samples to fetch */
  hasMore: boolean;
}

/**
 * Paginated incremental sync for HealthKit data.
 *
 * Use this when you need to **fetch data in batches** and track what
 * you've already synced. Ideal for syncing to a local database.
 *
 * For **real-time change notifications**, use `HealthKitSubscription` instead.
 *
 * Key features:
 * - Fetch data incrementally with pagination
 * - Track deleted samples (for sync)
 * - Serialize/restore anchor state for persistence
 *
 * @example
 * ```ts
 * const anchor = new HealthKitAnchor('stepCount');
 *
 * // Fetch batches until done
 * while (anchor.hasMore) {
 *   const { samples, deletedObjects } = await anchor.fetchNext(100);
 *
 *   // Sync to local DB
 *   await db.upsertSamples(samples.map(s => s.toJSON()));
 *   await db.deleteSamples(deletedObjects.map(d => d.uuid));
 * }
 *
 * // Save anchor for next session
 * const state = anchor.serialize();
 * await AsyncStorage.setItem('steps-anchor', state);
 *
 * // Later: restore and sync only new changes
 * anchor.restore(await AsyncStorage.getItem('steps-anchor'));
 * const { samples } = await anchor.fetchNext(100);
 * ```
 */
export class HealthKitAnchor {
  private native: NativeHealthKitAnchor;
  private typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier;
  private queryKind: AnchorKind;

  constructor(
    type: QuantityTypeIdentifier | CategoryTypeIdentifier,
    kind: AnchorKind = 'quantity'
  ) {
    this.native = new AppleHealthModule.HealthKitAnchor();
    this.typeIdentifier = type;
    this.queryKind = kind;
    this.native.configure(type, kind);
  }

  /** The type being queried */
  get type(): QuantityTypeIdentifier | CategoryTypeIdentifier {
    return this.typeIdentifier;
  }

  /** The query kind (quantity or category) */
  get kind(): AnchorKind {
    return this.queryKind;
  }

  /** Whether there are more samples to fetch */
  get hasMore(): boolean {
    return this.native.hasMore;
  }

  /**
   * Restore anchor state from a serialized string.
   * @returns true if restoration was successful
   */
  restore(serialized: string): boolean {
    return this.native.restore(serialized);
  }

  /**
   * Serialize the current anchor state for persistence.
   * @returns Base64-encoded anchor data, or null if no anchor exists
   */
  serialize(): string | null {
    return this.native.serialize();
  }

  /** Reset the anchor to start fresh from the beginning */
  reset(): void {
    this.native.reset();
  }

  /**
   * Fetch the next batch of samples.
   *
   * Returns sample objects with methods like `delete()` and `toJSON()`.
   *
   * @param limit Maximum number of samples to fetch (default: 100)
   *
   * @example
   * ```ts
   * const { samples, hasMore, deletedObjects } = await anchor.fetchNext(50);
   *
   * // Process new/updated samples
   * for (const sample of samples) {
   *   if (sample.__typename === 'QuantitySample') {
   *     console.log(`${sample.value} ${sample.unit}`);
   *   }
   * }
   *
   * // Handle deleted samples
   * for (const { uuid } of deletedObjects) {
   *   removeFromLocalDB(uuid);
   * }
   *
   * // Continue fetching if more available
   * if (hasMore) {
   *   const more = await anchor.fetchNext(50);
   * }
   * ```
   */
  async fetchNext(limit: number = 100): Promise<AnchoredQueryResult> {
    const result = await this.native.fetchNextSamples(limit);
    return {
      samples: wrapNativeSamples(result.samples),
      deletedObjects: result.deletedObjects,
      hasMore: result.hasMore,
    };
  }
}
