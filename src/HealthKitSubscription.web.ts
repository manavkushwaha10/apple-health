import type { QuantityTypeIdentifier, CategoryTypeIdentifier } from './AppleHealth.types';
import type { HealthKitSample } from './HealthKitSample';

export type AnchorKind = 'quantity' | 'category';

export interface AnchoredQueryResult {
  samples: HealthKitSample[];
  deletedObjects: Array<{ uuid: string }>;
  hasMore: boolean;
}

/**
 * A no-op shim for HealthKitSubscription on unsupported platforms.
 * All methods are safe to call but have no effect.
 */
export class HealthKitSubscription {
  private typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier;

  constructor(type: QuantityTypeIdentifier | CategoryTypeIdentifier) {
    this.typeIdentifier = type;
  }

  get type(): QuantityTypeIdentifier | CategoryTypeIdentifier {
    return this.typeIdentifier;
  }

  get isActive(): boolean {
    return false;
  }

  get lastUpdate(): string | null {
    return null;
  }

  get id(): number {
    return 0;
  }

  start(): void {}

  pause(): void {}

  resume(): void {}

  unsubscribe(): void {}
}

/**
 * A no-op shim for HealthKitAnchor on unsupported platforms.
 * All methods are safe to call but return empty results.
 */
export class HealthKitAnchor {
  private typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier;
  private queryKind: AnchorKind;

  constructor(
    type: QuantityTypeIdentifier | CategoryTypeIdentifier,
    kind: AnchorKind = 'quantity'
  ) {
    this.typeIdentifier = type;
    this.queryKind = kind;
  }

  get type(): QuantityTypeIdentifier | CategoryTypeIdentifier {
    return this.typeIdentifier;
  }

  get kind(): AnchorKind {
    return this.queryKind;
  }

  get hasMore(): boolean {
    return false;
  }

  restore(_serialized: string): boolean {
    return false;
  }

  serialize(): string | null {
    return null;
  }

  reset(): void {}

  async fetchNext(_limit: number = 100): Promise<AnchoredQueryResult> {
    return {
      samples: [],
      deletedObjects: [],
      hasMore: false,
    };
  }
}
