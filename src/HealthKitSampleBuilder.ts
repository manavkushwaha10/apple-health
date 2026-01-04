import { requireNativeModule } from 'expo';

import type {
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  WorkoutActivityType,
  QuantitySample as QuantitySampleRecord,
  CategorySample as CategorySampleRecord,
  WorkoutSample as WorkoutSampleRecord,
} from './AppleHealth.types';
import {
  wrapNativeSample,
  type HealthKitSample,
} from './HealthKitSample';

// Native shared object interface
interface NativeHealthKitSampleBuilder {
  setQuantityType(identifier: string): void;
  setCategoryType(identifier: string): void;
  setWorkoutType(activityType: string): void;
  setValue(value: number): void;
  setCategoryValue(value: number): void;
  setUnit(unit: string): void;
  setStartDate(dateString: string): void;
  setEndDate(dateString: string): void;
  setMetadata(metadata: Record<string, unknown> | null): void;
  setTotalEnergyBurned(value: number): void;
  setTotalDistance(value: number): void;
  reset(): void;
  save(): Promise<Record<string, unknown>>;
  saveSample(): Promise<unknown>;
}

// Module with shared object class
interface AppleHealthModuleWithBuilder {
  HealthKitSampleBuilder: new () => NativeHealthKitSampleBuilder;
}

const AppleHealthModule = requireNativeModule<AppleHealthModuleWithBuilder>('AppleHealth');

/**
 * A fluent builder for creating and saving HealthKit samples.
 *
 * Creates samples and persists them to HealthKit with a chainable API.
 * Requires write authorization for the sample type.
 *
 * @example
 * ```ts
 * // Save a step count sample
 * const sample = await new HealthKitSampleBuilder()
 *   .quantityType('stepCount')
 *   .value(1000)
 *   .unit('count')
 *   .startDate(new Date())
 *   .save();
 *
 * // Save a sleep sample
 * const sleep = await new HealthKitSampleBuilder()
 *   .categoryType('sleepAnalysis')
 *   .categoryValue(1) // asleepUnspecified
 *   .startDate(lastNight)
 *   .endDate(thisMonday)
 *   .save();
 *
 * // Save a workout
 * const workout = await new HealthKitSampleBuilder()
 *   .workoutType('running')
 *   .startDate(startTime)
 *   .endDate(endTime)
 *   .totalEnergyBurned(350)
 *   .totalDistance(5000)
 *   .save();
 * ```
 */
export class HealthKitSampleBuilder {
  private native: NativeHealthKitSampleBuilder;

  constructor() {
    this.native = new AppleHealthModule.HealthKitSampleBuilder();
  }

  /**
   * Set up to create a quantity sample.
   *
   * @param identifier - The quantity type (e.g., 'stepCount', 'heartRate')
   */
  quantityType(identifier: QuantityTypeIdentifier): this {
    this.native.setQuantityType(identifier);
    return this;
  }

  /**
   * Set up to create a category sample.
   *
   * @param identifier - The category type (e.g., 'sleepAnalysis')
   */
  categoryType(identifier: CategoryTypeIdentifier): this {
    this.native.setCategoryType(identifier);
    return this;
  }

  /**
   * Set up to create a workout sample.
   *
   * @param activityType - The workout activity type (e.g., 'running', 'cycling')
   */
  workoutType(activityType: WorkoutActivityType): this {
    this.native.setWorkoutType(activityType);
    return this;
  }

  /**
   * Set the numeric value for a quantity sample.
   *
   * @param val - The quantity value
   */
  value(val: number): this {
    this.native.setValue(val);
    return this;
  }

  /**
   * Set the category value for a category sample.
   * Values are type-specific integers (e.g., sleep states, symptom severity).
   *
   * @param val - The category value
   */
  categoryValue(val: number): this {
    this.native.setCategoryValue(val);
    return this;
  }

  /**
   * Set the unit of measurement for a quantity sample.
   *
   * @param unitStr - The unit string (e.g., 'count', 'count/min', 'kcal')
   */
  unit(unitStr: string): this {
    this.native.setUnit(unitStr);
    return this;
  }

  /**
   * Set the start date of the sample.
   *
   * @param date - Date object or ISO string
   */
  startDate(date: Date | string): this {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    this.native.setStartDate(dateStr);
    return this;
  }

  /**
   * Set the end date of the sample.
   * If not set, defaults to the start date.
   *
   * @param date - Date object or ISO string
   */
  endDate(date: Date | string): this {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    this.native.setEndDate(dateStr);
    return this;
  }

  /**
   * Set optional metadata for the sample.
   *
   * @param data - Key-value metadata pairs
   */
  metadata(data: Record<string, unknown>): this {
    this.native.setMetadata(data);
    return this;
  }

  /**
   * Set total energy burned for a workout (in kilocalories).
   */
  totalEnergyBurned(kcal: number): this {
    this.native.setTotalEnergyBurned(kcal);
    return this;
  }

  /**
   * Set total distance for a workout (in meters).
   */
  totalDistance(meters: number): this {
    this.native.setTotalDistance(meters);
    return this;
  }

  /**
   * Reset the builder to its initial state for reuse.
   */
  reset(): this {
    this.native.reset();
    return this;
  }

  /**
   * Save the sample to HealthKit and return the saved data as a plain object.
   *
   * @returns The saved sample data
   */
  async save(): Promise<QuantitySampleRecord | CategorySampleRecord | WorkoutSampleRecord> {
    const result = await this.native.save();
    return result as unknown as QuantitySampleRecord | CategorySampleRecord | WorkoutSampleRecord;
  }

  /**
   * Save the sample to HealthKit and return it as a shared object.
   * The returned sample has methods like `delete()`.
   *
   * @returns The saved sample as a shared object
   */
  async saveSample(): Promise<HealthKitSample> {
    const native = await this.native.saveSample();
    return wrapNativeSample(native);
  }
}

