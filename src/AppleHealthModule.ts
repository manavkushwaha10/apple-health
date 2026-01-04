import { NativeModule, requireNativeModule } from 'expo';

import {
  AppleHealthModuleEvents,
  AuthorizationResult,
  HealthKitPermissions,
  QuantityTypeIdentifier,
  CategoryTypeIdentifier,
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
