import { NativeModule, requireNativeModule } from 'expo';

import {
  AppleHealthModuleEvents,
  AuthorizationResult,
  HealthKitPermissions,
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
  WorkoutActivityType,
  QueryOptions,
  StatisticsOptions,
  StatisticsAggregation,
  QuantitySample,
  CategorySample,
  WorkoutSample,
  StatisticsResult,
  AnchoredQueryResult,
  ActivitySummary,
} from './AppleHealth.types';

declare class AppleHealthModule extends NativeModule<AppleHealthModuleEvents> {
  // ─────────────────────────────────────────────────────────────────────────────
  // Availability
  // ─────────────────────────────────────────────────────────────────────────────

  isAvailable(): boolean;

  // ─────────────────────────────────────────────────────────────────────────────
  // Authorization
  // ─────────────────────────────────────────────────────────────────────────────

  requestAuthorization(permissions: HealthKitPermissions): Promise<AuthorizationResult>;
  getAuthorizationStatus(dataTypes: string[]): Promise<Record<string, string>>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Quantity Samples
  // ─────────────────────────────────────────────────────────────────────────────

  queryQuantitySamples(
    typeIdentifier: QuantityTypeIdentifier,
    options?: QueryOptions
  ): Promise<QuantitySample[]>;

  saveQuantitySample(
    typeIdentifier: QuantityTypeIdentifier,
    value: number,
    unit: string,
    startDate: string,
    endDate: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Category Samples
  // ─────────────────────────────────────────────────────────────────────────────

  queryCategorySamples(
    typeIdentifier: CategoryTypeIdentifier,
    options?: QueryOptions
  ): Promise<CategorySample[]>;

  saveCategorySample(
    typeIdentifier: CategoryTypeIdentifier,
    value: number,
    startDate: string,
    endDate: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  queryStatistics(
    typeIdentifier: QuantityTypeIdentifier,
    aggregations: StatisticsAggregation[],
    options?: QueryOptions
  ): Promise<StatisticsResult>;

  queryStatisticsCollection(
    typeIdentifier: QuantityTypeIdentifier,
    aggregations: StatisticsAggregation[],
    options: StatisticsOptions
  ): Promise<StatisticsResult[]>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Anchored Queries
  // ─────────────────────────────────────────────────────────────────────────────

  queryQuantitySamplesWithAnchor(
    typeIdentifier: QuantityTypeIdentifier,
    anchor?: string | null,
    limit?: number
  ): Promise<AnchoredQueryResult<QuantitySample>>;

  queryCategorySamplesWithAnchor(
    typeIdentifier: CategoryTypeIdentifier,
    anchor?: string | null,
    limit?: number
  ): Promise<AnchoredQueryResult<CategorySample>>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Workouts
  // ─────────────────────────────────────────────────────────────────────────────

  queryWorkouts(options?: QueryOptions): Promise<WorkoutSample[]>;

  saveWorkout(
    activityType: WorkoutActivityType,
    startDate: string,
    endDate: string,
    totalEnergyBurned?: number,
    totalDistance?: number,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Activity Summary
  // ─────────────────────────────────────────────────────────────────────────────

  queryActivitySummary(startDate: string, endDate: string): Promise<ActivitySummary[]>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Characteristics
  // ─────────────────────────────────────────────────────────────────────────────

  getDateOfBirth(): Promise<string | null>;
  getBiologicalSex(): Promise<string | null>;
  getBloodType(): Promise<string | null>;
  getFitzpatrickSkinType(): Promise<number | null>;
  getWheelchairUse(): Promise<boolean | null>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────────

  subscribeToChanges(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier
  ): Promise<string>;

  unsubscribe(subscriptionId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Background Delivery
  // ─────────────────────────────────────────────────────────────────────────────

  enableBackgroundDelivery(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier,
    frequency: 'immediate' | 'hourly' | 'daily'
  ): Promise<boolean>;

  disableBackgroundDelivery(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier
  ): Promise<boolean>;

  disableAllBackgroundDelivery(): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────────

  deleteSamples(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier,
    startDate: string,
    endDate: string
  ): Promise<boolean>;
}

export default requireNativeModule<AppleHealthModule>('AppleHealth');
