import { requireNativeModule } from 'expo';

import type { QuantityTypeIdentifier, CategoryTypeIdentifier } from './AppleHealth.types';

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
  fetchNext(limit: number): Promise<AnchorFetchResult>;
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
 * A subscription to HealthKit data changes.
 * Automatically unsubscribes when garbage collected.
 *
 * @example
 * ```ts
 * const subscription = new HealthKitSubscription('heartRate');
 * subscription.start();
 *
 * // Later...
 * subscription.pause();  // Temporarily stop callbacks
 * subscription.resume(); // Resume callbacks
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

export interface AnchoredQueryResult<T> {
  /** New or updated samples */
  samples: T[];
  /** UUIDs of deleted samples */
  deletedObjects: Array<{ uuid: string }>;
  /** Whether there are more samples to fetch */
  hasMore: boolean;
}

/**
 * Manages anchored query state for incremental syncing.
 * The anchor state can be serialized for persistence across app sessions.
 *
 * @example
 * ```ts
 * const anchor = new HealthKitAnchor('stepCount');
 *
 * // Fetch initial batch
 * const { samples, hasMore } = await anchor.fetchNext(100);
 *
 * // Save anchor state
 * const serialized = anchor.serialize();
 * await AsyncStorage.setItem('steps-anchor', serialized);
 *
 * // Later, restore and continue syncing
 * const savedAnchor = await AsyncStorage.getItem('steps-anchor');
 * if (savedAnchor) {
 *   anchor.restore(savedAnchor);
 * }
 * const { samples: newSamples } = await anchor.fetchNext(100);
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
   * Fetch the next batch of samples as plain records.
   * @param limit Maximum number of samples to fetch
   */
  async fetchNext<T = Record<string, unknown>>(
    limit: number = 100
  ): Promise<AnchoredQueryResult<T>> {
    const result = await this.native.fetchNext(limit);
    return {
      samples: result.samples as T[],
      deletedObjects: result.deletedObjects,
      hasMore: result.hasMore,
    };
  }

  /**
   * Fetch the next batch of samples as shared objects with delete() method.
   * @param limit Maximum number of samples to fetch
   */
  async fetchNextSamples(limit: number = 100): Promise<AnchoredQueryResult<unknown>> {
    const result = await this.native.fetchNextSamples(limit);
    return {
      samples: result.samples,
      deletedObjects: result.deletedObjects,
      hasMore: result.hasMore,
    };
  }
}
