import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  WorkoutActivityType,
  QuantitySample as QuantitySampleRecord,
  CategorySample as CategorySampleRecord,
  WorkoutSample as WorkoutSampleRecord,
} from './AppleHealth.types';
import type { HealthKitSample } from './HealthKitSample';

/**
 * A no-op shim for HealthKitSampleBuilder on unsupported platforms.
 * All methods are safe to call but save() will throw an error.
 */
export class HealthKitSampleBuilder {
  constructor() {}

  quantityType(_identifier: QuantityTypeIdentifier): this {
    return this;
  }

  categoryType(_identifier: CategoryTypeIdentifier): this {
    return this;
  }

  workoutType(_activityType: WorkoutActivityType): this {
    return this;
  }

  value(_val: number): this {
    return this;
  }

  categoryValue(_val: number): this {
    return this;
  }

  unit(_unitStr: string): this {
    return this;
  }

  startDate(_date: Date | string): this {
    return this;
  }

  endDate(_date: Date | string): this {
    return this;
  }

  metadata(_data: Record<string, unknown>): this {
    return this;
  }

  totalEnergyBurned(_kcal: number): this {
    return this;
  }

  totalDistance(_meters: number): this {
    return this;
  }

  reset(): this {
    return this;
  }

  async save(): Promise<QuantitySampleRecord | CategorySampleRecord | WorkoutSampleRecord> {
    throw new Error('HealthKit is not available on this platform');
  }

  async saveSample(): Promise<HealthKitSample> {
    throw new Error('HealthKit is not available on this platform');
  }
}
