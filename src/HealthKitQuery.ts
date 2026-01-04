import { requireNativeModule } from 'expo';

import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  StatisticsResult,
  StatisticsAggregation,
} from './AppleHealth.types';
import { wrapNativeSamples, type HealthKitSample } from './HealthKitSample';

// Native shared object interface
interface NativeHealthKitQuery {
  setType(identifier: string, kind: string): void;
  setDateRange(start: string | null, end: string | null): void;
  setLimit(limit: number): void;
  setAscending(ascending: boolean): void;
  setAggregations(aggregations: string[]): void;
  setInterval(interval: string): void;
  executeSamples(): Promise<unknown[]>;
  executeStatistics(): Promise<Record<string, unknown> | Record<string, unknown>[]>;
  release(): void;
}

// Module with shared object class
interface AppleHealthModuleWithQuery {
  HealthKitQuery: new () => NativeHealthKitQuery;
}

const AppleHealthModule = requireNativeModule<AppleHealthModuleWithQuery>('AppleHealth');

export type QueryKind = 'quantity' | 'category' | 'workout' | 'statistics';

/** @internal Used internally for collection queries */
type InternalQueryKind = QueryKind | 'statisticsCollection';

export type IntervalUnit = 'hour' | 'day' | 'week' | 'month' | 'year';

export interface HealthKitQueryConfig {
  type: QuantityTypeIdentifier | CategoryTypeIdentifier | 'workout';
  kind?: QueryKind;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  ascending?: boolean;
  aggregations?: StatisticsAggregation[];
  interval?: IntervalUnit;
}

/**
 * A fluent query builder for HealthKit data.
 *
 * Creates a native shared object that persists across React renders,
 * enabling efficient query reuse and automatic memory management.
 *
 * @example
 * ```ts
 * const query = new HealthKitQuery()
 *   .type('stepCount')
 *   .dateRange(weekAgo, now)
 *   .limit(100);
 *
 * const samples = await query.execute();
 * const total = samples.reduce((sum, s) => sum + s.value, 0);
 *
 * // Delete a sample
 * await samples[0].delete();
 *
 * // Serialize for storage
 * const json = samples.map(s => s.toJSON());
 * ```
 */
export class HealthKitQuery {
  private native: NativeHealthKitQuery;
  private queryKind: InternalQueryKind = 'quantity';
  private typeIdentifier: string = '';
  private hasInterval: boolean = false;

  constructor(config?: HealthKitQueryConfig) {
    this.native = new AppleHealthModule.HealthKitQuery();

    if (config) {
      this.applyConfig(config);
    }
  }

  private applyConfig(config: HealthKitQueryConfig): void {
    if (config.type) {
      this.type(config.type, config.kind);
    }
    if (config.startDate !== undefined || config.endDate !== undefined) {
      this.dateRange(config.startDate, config.endDate);
    }
    if (config.limit !== undefined) {
      this.limit(config.limit);
    }
    if (config.ascending !== undefined) {
      this.ascending(config.ascending);
    }
    if (config.aggregations) {
      this.aggregations(config.aggregations);
    }
    if (config.interval) {
      this.interval(config.interval);
    }
  }

  /**
   * Set the HealthKit type to query.
   *
   * @param identifier - The type identifier (e.g., 'stepCount', 'heartRate')
   * @param kind - Query kind: 'quantity', 'category', 'workout', 'statistics'
   */
  type(
    identifier: QuantityTypeIdentifier | CategoryTypeIdentifier | 'workout',
    kind?: QueryKind
  ): this {
    this.typeIdentifier = identifier;
    this.queryKind = kind ?? (identifier === 'workout' ? 'workout' : 'quantity');
    this.native.setType(identifier, this.queryKind);
    return this;
  }

  /**
   * Set the date range for the query.
   *
   * @param start - Start date (Date object or ISO string)
   * @param end - End date (Date object or ISO string)
   */
  dateRange(start?: Date | string, end?: Date | string): this {
    const startStr = start ? this.formatDate(start) : null;
    const endStr = end ? this.formatDate(end) : null;
    this.native.setDateRange(startStr, endStr);
    return this;
  }

  /**
   * Set the maximum number of results to return.
   */
  limit(count: number): this {
    this.native.setLimit(count);
    return this;
  }

  /**
   * Set sort order (by start date).
   *
   * @param asc - true for oldest first, false for newest first (default)
   */
  ascending(asc: boolean): this {
    this.native.setAscending(asc);
    return this;
  }

  /**
   * Set statistics aggregations (for statistics queries).
   *
   * @param aggs - Array of aggregation types: 'sum', 'average', 'min', 'max', 'mostRecent'
   */
  aggregations(aggs: StatisticsAggregation[]): this {
    this.native.setAggregations(aggs);
    return this;
  }

  /**
   * Set the time interval for statistics queries.
   * When set, the query returns an array of results bucketed by the interval.
   *
   * @param unit - Time unit: 'hour', 'day', 'week', 'month', 'year'
   */
  interval(unit: IntervalUnit): this {
    this.hasInterval = true;
    this.native.setInterval(unit);
    return this;
  }

  /**
   * Execute the query and return sample objects.
   *
   * Returns shared objects that maintain a reference to the native HKSample,
   * enabling operations like `delete()`. Use `toJSON()` for serialization.
   *
   * @returns Array of sample objects with `delete()` and `toJSON()` methods
   *
   * @example
   * ```ts
   * const samples = await query.execute();
   * for (const sample of samples) {
   *   if (sample instanceof QuantitySample) {
   *     console.log(`${sample.value} ${sample.unit}`);
   *   }
   *   // Delete samples you don't need
   *   await sample.delete();
   * }
   *
   * // For serialization
   * const json = samples.map(s => s.toJSON());
   * ```
   */
  async execute(): Promise<HealthKitSample[]> {
    const natives = await this.native.executeSamples();
    return wrapNativeSamples(natives);
  }

  /**
   * Execute a statistics query.
   *
   * Returns a single result, or an array if `interval()` was called.
   *
   * @example
   * ```ts
   * // Single statistics result
   * const stats = await new HealthKitQuery()
   *   .type('stepCount', 'statistics')
   *   .dateRange(weekAgo, now)
   *   .aggregations(['sum', 'average'])
   *   .executeStatistics();
   *
   * // Time-bucketed results (array)
   * const daily = await new HealthKitQuery()
   *   .type('stepCount', 'statistics')
   *   .dateRange(weekAgo, now)
   *   .aggregations(['sum'])
   *   .interval('day')
   *   .executeStatistics();
   * ```
   */
  async executeStatistics(): Promise<StatisticsResult | StatisticsResult[]> {
    // Update the native kind based on whether interval is set
    if (this.queryKind === 'statistics' && this.hasInterval) {
      this.native.setType(this.typeIdentifier, 'statisticsCollection');
    }
    const results = await this.native.executeStatistics();
    return results as unknown as StatisticsResult | StatisticsResult[];
  }

  /**
   * Release cached native samples to free memory.
   * Called automatically when the object is garbage collected,
   * but can be called manually for immediate cleanup.
   */
  release(): void {
    this.native.release();
  }

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }
    return date.toISOString();
  }
}

