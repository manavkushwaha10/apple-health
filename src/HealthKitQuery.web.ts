import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  StatisticsResult,
  StatisticsAggregation,
} from './AppleHealth.types';
import type { HealthKitSample } from './HealthKitSample';

export type QueryKind = 'quantity' | 'category' | 'workout' | 'statistics';
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
 * A no-op shim for HealthKitQuery on unsupported platforms.
 * All methods are safe to call but return empty results.
 */
export class HealthKitQuery {
  constructor(_config?: HealthKitQueryConfig) {}

  type(
    _identifier: QuantityTypeIdentifier | CategoryTypeIdentifier | 'workout',
    _kind?: QueryKind
  ): this {
    return this;
  }

  dateRange(_start?: Date | string, _end?: Date | string): this {
    return this;
  }

  limit(_count: number): this {
    return this;
  }

  ascending(_asc: boolean): this {
    return this;
  }

  aggregations(_aggs: StatisticsAggregation[]): this {
    return this;
  }

  interval(_unit: IntervalUnit): this {
    return this;
  }

  async execute(): Promise<HealthKitSample[]> {
    return [];
  }

  async executeStatistics(): Promise<StatisticsResult | StatisticsResult[]> {
    return [];
  }

  release(): void {}
}
