# Apple HealthKit Expo Module - Technical Proposal

## Executive Summary

This proposal outlines the implementation of a comprehensive iOS-only Expo native module for Apple HealthKit. The module will provide full read/write access to all HealthKit data types, advanced query capabilities including statistics and anchored queries, real-time subscriptions via observer queries, and background delivery support.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Requirements](#2-requirements)
3. [Architecture](#3-architecture)
4. [TypeScript API Design](#4-typescript-api-design)
5. [Swift Native Implementation](#5-swift-native-implementation)
6. [Config Plugin](#6-config-plugin)
7. [Implementation Phases](#7-implementation-phases)
8. [File Structure](#8-file-structure)
9. [Data Types Reference](#9-data-types-reference)

---

## 1. Project Overview

### Current State

The project at `/Users/evanbacon/Documents/GitHub/bacons/apple-health` is an Expo module scaffold with:

- Basic Expo module structure (iOS, Android, Web)
- Placeholder Swift/Kotlin implementations
- WebView-based example component
- No actual HealthKit integration

### Goal

Transform this scaffold into a production-ready HealthKit integration module that provides:

- Complete access to all HealthKit data types
- High-performance queries with multiple strategies
- Bidirectional data sync (read and write)
- Real-time updates and background processing
- Type-safe TypeScript API

---

## 2. Requirements

### Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Data Types** | Support all 100+ HealthKit types (quantity, category, characteristic, correlation, workout) |
| **Authorization** | Request and check permissions for read/write access |
| **Querying** | Sample queries, statistics queries, anchored queries for incremental sync |
| **Statistics** | Aggregations (sum, avg, min, max, most recent) with time intervals |
| **Writing** | Save quantity samples, category samples, and workouts |
| **Subscriptions** | Observer queries for real-time updates |
| **Background** | Background delivery with configurable frequency (immediate, hourly, daily) |

### Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Platform** | iOS 15.1+ only (HealthKit not available on other platforms) |
| **Performance** | Efficient batch queries, pagination support |
| **Type Safety** | Full TypeScript definitions for all APIs |
| **Configuration** | Expo config plugin for automatic setup |

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Native App                          │
├─────────────────────────────────────────────────────────────────┤
│                     TypeScript API Layer                         │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ AppleHealth   │  │ Types &      │  │ React Hooks        │   │
│  │ Module        │  │ Interfaces   │  │ (optional)         │   │
│  └───────────────┘  └──────────────┘  └────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Expo Modules Core Bridge                      │
├─────────────────────────────────────────────────────────────────┤
│                     Swift Native Layer                           │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ HealthStore   │  │ Query        │  │ Background         │   │
│  │ Manager       │  │ Executors    │  │ Delivery Manager   │   │
│  └───────────────┘  └──────────────┘  └────────────────────┘   │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Sample        │  │ Observer     │  │ Type Identifiers   │   │
│  │ Writers       │  │ Manager      │  │ & Converters       │   │
│  └───────────────┘  └──────────────┘  └────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Apple HealthKit Framework                   │
├─────────────────────────────────────────────────────────────────┤
│                        Health Database                           │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **HealthStoreManager** | Singleton `HKHealthStore`, authorization handling |
| **Query Executors** | `HKSampleQuery`, `HKStatisticsQuery`, `HKStatisticsCollectionQuery`, `HKAnchoredObjectQuery` |
| **Sample Writers** | Save samples and workouts to HealthKit |
| **Observer Manager** | `HKObserverQuery` management, subscription lifecycle |
| **Background Delivery** | Enable/disable background updates |
| **Type Identifiers** | Map JS strings to `HKTypeIdentifier` enums |
| **Sample Converters** | Serialize `HKSample` to JSON-compatible dictionaries |

---

## 4. TypeScript API Design

### 4.1 Data Type Identifiers

```typescript
// Quantity Types (70+ types)
export type QuantityTypeIdentifier =
  // Body Measurements
  | 'bodyMassIndex'
  | 'bodyFatPercentage'
  | 'height'
  | 'bodyMass'
  | 'leanBodyMass'
  | 'waistCircumference'
  // Fitness
  | 'stepCount'
  | 'distanceWalkingRunning'
  | 'distanceCycling'
  | 'distanceWheelchair'
  | 'distanceSwimming'
  | 'distanceDownhillSnowSports'
  | 'basalEnergyBurned'
  | 'activeEnergyBurned'
  | 'flightsClimbed'
  | 'appleExerciseTime'
  | 'appleMoveTime'
  | 'appleStandTime'
  | 'vo2Max'
  | 'walkingSpeed'
  | 'walkingDoubleSupportPercentage'
  | 'walkingAsymmetryPercentage'
  | 'walkingStepLength'
  | 'sixMinuteWalkTestDistance'
  | 'stairAscentSpeed'
  | 'stairDescentSpeed'
  | 'runningStrideLength'
  | 'runningVerticalOscillation'
  | 'runningGroundContactTime'
  | 'runningPower'
  | 'runningSpeed'
  // Vitals
  | 'heartRate'
  | 'bodyTemperature'
  | 'basalBodyTemperature'
  | 'bloodPressureSystolic'
  | 'bloodPressureDiastolic'
  | 'respiratoryRate'
  | 'restingHeartRate'
  | 'walkingHeartRateAverage'
  | 'heartRateVariabilitySDNN'
  | 'heartRateRecoveryOneMinute'
  | 'oxygenSaturation'
  | 'peripheralPerfusionIndex'
  // Results
  | 'bloodGlucose'
  | 'electrodermalActivity'
  | 'forcedExpiratoryVolume1'
  | 'forcedVitalCapacity'
  | 'inhalerUsage'
  | 'insulinDelivery'
  | 'numberOfTimesFallen'
  | 'peakExpiratoryFlowRate'
  | 'bloodAlcoholContent'
  // Nutrition (30+ types)
  | 'dietaryFatTotal'
  | 'dietaryFatPolyunsaturated'
  | 'dietaryFatMonounsaturated'
  | 'dietaryFatSaturated'
  | 'dietaryCholesterol'
  | 'dietarySodium'
  | 'dietaryCarbohydrates'
  | 'dietaryFiber'
  | 'dietarySugar'
  | 'dietaryEnergyConsumed'
  | 'dietaryProtein'
  | 'dietaryVitaminA'
  | 'dietaryVitaminB6'
  | 'dietaryVitaminB12'
  | 'dietaryVitaminC'
  | 'dietaryVitaminD'
  | 'dietaryVitaminE'
  | 'dietaryVitaminK'
  | 'dietaryCalcium'
  | 'dietaryIron'
  | 'dietaryThiamin'
  | 'dietaryRiboflavin'
  | 'dietaryNiacin'
  | 'dietaryFolate'
  | 'dietaryBiotin'
  | 'dietaryPantothenicAcid'
  | 'dietaryPhosphorus'
  | 'dietaryIodine'
  | 'dietaryMagnesium'
  | 'dietaryZinc'
  | 'dietarySelenium'
  | 'dietaryCopper'
  | 'dietaryManganese'
  | 'dietaryChromium'
  | 'dietaryMolybdenum'
  | 'dietaryChloride'
  | 'dietaryPotassium'
  | 'dietaryCaffeine'
  | 'dietaryWater'
  // Other
  | 'uvExposure'
  | 'environmentalAudioExposure'
  | 'headphoneAudioExposure'
  | 'numberOfAlcoholicBeverages'
  | 'atrialFibrillationBurden'
  | 'underwaterDepth'
  | 'waterTemperature';

// Category Types (40+ types)
export type CategoryTypeIdentifier =
  // Sleep
  | 'sleepAnalysis'
  // Activity
  | 'appleStandHour'
  | 'lowCardioFitnessEvent'
  // Reproductive Health
  | 'menstrualFlow'
  | 'intermenstrualBleeding'
  | 'infrequentMenstrualCycles'
  | 'irregularMenstrualCycles'
  | 'persistentIntermenstrualBleeding'
  | 'prolongedMenstrualPeriods'
  | 'cervicalMucusQuality'
  | 'ovulationTestResult'
  | 'pregnancy'
  | 'pregnancyTestResult'
  | 'lactation'
  | 'contraceptive'
  | 'sexualActivity'
  // Mindfulness
  | 'mindfulSession'
  // Heart
  | 'highHeartRateEvent'
  | 'lowHeartRateEvent'
  | 'irregularHeartRhythmEvent'
  // Hearing
  | 'audioExposureEvent'
  | 'environmentalAudioExposureEvent'
  | 'headphoneAudioExposureEvent'
  // Other
  | 'toothbrushingEvent'
  | 'handwashingEvent'
  // Symptoms (30+ types)
  | 'abdominalCramps'
  | 'acne'
  | 'appetiteChanges'
  | 'bladderIncontinence'
  | 'bloating'
  | 'breastPain'
  | 'chestTightnessOrPain'
  | 'chills'
  | 'constipation'
  | 'coughing'
  | 'diarrhea'
  | 'dizziness'
  | 'drySkin'
  | 'fainting'
  | 'fatigue'
  | 'fever'
  | 'generalizedBodyAche'
  | 'hairLoss'
  | 'headache'
  | 'heartburn'
  | 'hotFlashes'
  | 'lossOfSmell'
  | 'lossOfTaste'
  | 'lowerBackPain'
  | 'memoryLapse'
  | 'moodChanges'
  | 'nausea'
  | 'nightSweats'
  | 'pelvicPain'
  | 'rapidPoundingOrFlutteringHeartbeat'
  | 'runnyNose'
  | 'shortnessOfBreath'
  | 'sinusCongestion'
  | 'skippedHeartbeat'
  | 'sleepChanges'
  | 'soreThroat'
  | 'vaginalDryness'
  | 'vomiting'
  | 'wheezing';

// Characteristic Types
export type CharacteristicTypeIdentifier =
  | 'biologicalSex'
  | 'bloodType'
  | 'dateOfBirth'
  | 'fitzpatrickSkinType'
  | 'wheelchairUse'
  | 'activityMoveMode';

// Workout Activity Types (80+ types)
export type WorkoutActivityType =
  | 'americanFootball'
  | 'archery'
  | 'australianFootball'
  | 'badminton'
  | 'barre'
  | 'baseball'
  | 'basketball'
  | 'bowling'
  | 'boxing'
  | 'cardioDance'
  | 'climbing'
  | 'cooldown'
  | 'coreTraining'
  | 'cricket'
  | 'crossCountrySkiing'
  | 'crossTraining'
  | 'curling'
  | 'cycling'
  | 'dance'
  | 'discSports'
  | 'downhillSkiing'
  | 'elliptical'
  | 'equestrianSports'
  | 'fencing'
  | 'fishing'
  | 'fitnessGaming'
  | 'flexibility'
  | 'functionalStrengthTraining'
  | 'golf'
  | 'gymnastics'
  | 'handCycling'
  | 'handball'
  | 'highIntensityIntervalTraining'
  | 'hiking'
  | 'hockey'
  | 'hunting'
  | 'jumpRope'
  | 'kickboxing'
  | 'lacrosse'
  | 'martialArts'
  | 'mindAndBody'
  | 'mixedCardio'
  | 'paddleSports'
  | 'pickleball'
  | 'pilates'
  | 'play'
  | 'preparationAndRecovery'
  | 'racquetball'
  | 'rowing'
  | 'rugby'
  | 'running'
  | 'sailing'
  | 'skatingSports'
  | 'snowboarding'
  | 'snowSports'
  | 'soccer'
  | 'socialDance'
  | 'softball'
  | 'squash'
  | 'stairClimbing'
  | 'stairs'
  | 'stepTraining'
  | 'surfingSports'
  | 'swimming'
  | 'tableTennis'
  | 'taiChi'
  | 'tennis'
  | 'trackAndField'
  | 'traditionalStrengthTraining'
  | 'transition'
  | 'volleyball'
  | 'walking'
  | 'waterFitness'
  | 'waterPolo'
  | 'waterSports'
  | 'wheelchairRunPace'
  | 'wheelchairWalkPace'
  | 'wrestling'
  | 'yoga'
  | 'other';
```

### 4.2 Authorization Types

```typescript
export interface HealthKitPermissions {
  read: HealthKitDataType[];
  write: HealthKitDataType[];
}

export type AuthorizationStatus =
  | 'notDetermined'
  | 'sharingDenied'
  | 'sharingAuthorized';

export interface AuthorizationResult {
  status: AuthorizationStatus;
  permissions: {
    read: Record<string, AuthorizationStatus>;
    write: Record<string, AuthorizationStatus>;
  };
}
```

### 4.3 Sample Types

```typescript
export interface QuantitySample {
  uuid: string;
  quantityType: QuantityTypeIdentifier;
  value: number;
  unit: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  sourceName: string;
  sourceId: string;
  device?: DeviceInfo;
  metadata?: Record<string, unknown>;
}

export interface CategorySample {
  uuid: string;
  categoryType: CategoryTypeIdentifier;
  value: number;
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export interface WorkoutSample {
  uuid: string;
  workoutActivityType: WorkoutActivityType;
  duration: number; // seconds
  totalEnergyBurned?: number; // kilocalories
  totalDistance?: number; // meters
  startDate: string;
  endDate: string;
  sourceName: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceInfo {
  name?: string;
  manufacturer?: string;
  model?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  softwareVersion?: string;
  localIdentifier?: string;
  udiDeviceIdentifier?: string;
}
```

### 4.4 Query Types

```typescript
export interface QueryOptions {
  startDate?: string;  // ISO 8601
  endDate?: string;    // ISO 8601
  limit?: number;
  ascending?: boolean;
}

export interface StatisticsOptions extends QueryOptions {
  interval?: 'hour' | 'day' | 'week' | 'month' | 'year';
}

export type StatisticsAggregation =
  | 'cumulativeSum'
  | 'discreteAverage'
  | 'discreteMin'
  | 'discreteMax'
  | 'mostRecent';

export interface StatisticsResult {
  quantityType: QuantityTypeIdentifier;
  startDate: string;
  endDate: string;
  sumQuantity?: number;
  averageQuantity?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  mostRecentQuantity?: number;
  unit: string;
}

export interface AnchoredQueryResult<T> {
  samples: T[];
  deletedObjects: Array<{ uuid: string }>;
  anchor: string; // Base64 encoded HKQueryAnchor
  hasMore: boolean;
}
```

### 4.5 Event Types

```typescript
export interface HealthKitUpdateEvent {
  typeIdentifier: string;
  anchor?: string;
}

export interface AppleHealthModuleEvents {
  onHealthKitUpdate: (event: HealthKitUpdateEvent) => void;
  onBackgroundDelivery: (event: HealthKitUpdateEvent) => void;
}
```

### 4.6 Module API

```typescript
import { NativeModule, requireNativeModule } from 'expo';

declare class AppleHealthModule extends NativeModule<AppleHealthModuleEvents> {
  // ─────────────────────────────────────────────────────────────
  // Availability
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if HealthKit is available on this device.
   * Returns false on iPad, macOS (non-Apple Silicon), and simulators without HealthKit.
   */
  isAvailable(): boolean;

  // ─────────────────────────────────────────────────────────────
  // Authorization
  // ─────────────────────────────────────────────────────────────

  /**
   * Request authorization to read and/or write specific HealthKit data types.
   * This presents the system authorization sheet to the user.
   *
   * @param permissions - Object containing arrays of data types for read and write access
   * @returns Promise resolving to authorization result with per-type status
   */
  requestAuthorization(permissions: HealthKitPermissions): Promise<AuthorizationResult>;

  /**
   * Get the current authorization status for specific data types.
   * Note: For privacy, read authorization always returns notDetermined.
   *
   * @param dataTypes - Array of data type identifiers to check
   * @returns Promise resolving to status map
   */
  getAuthorizationStatus(dataTypes: string[]): Promise<Record<string, AuthorizationStatus>>;

  // ─────────────────────────────────────────────────────────────
  // Quantity Samples
  // ─────────────────────────────────────────────────────────────

  /**
   * Query quantity samples (numeric health data like steps, heart rate, etc.)
   *
   * @param typeIdentifier - The quantity type to query
   * @param options - Query options (date range, limit, sort order)
   * @returns Promise resolving to array of quantity samples
   */
  queryQuantitySamples(
    typeIdentifier: QuantityTypeIdentifier,
    options?: QueryOptions
  ): Promise<QuantitySample[]>;

  /**
   * Save a quantity sample to HealthKit.
   *
   * @param typeIdentifier - The quantity type
   * @param value - Numeric value
   * @param unit - Unit string (e.g., "count", "kcal", "mg/dL")
   * @param startDate - ISO 8601 start date
   * @param endDate - ISO 8601 end date
   * @param metadata - Optional metadata dictionary
   * @returns Promise resolving to success boolean
   */
  saveQuantitySample(
    typeIdentifier: QuantityTypeIdentifier,
    value: number,
    unit: string,
    startDate: string,
    endDate: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────
  // Category Samples
  // ─────────────────────────────────────────────────────────────

  /**
   * Query category samples (discrete health data like sleep, symptoms, etc.)
   *
   * @param typeIdentifier - The category type to query
   * @param options - Query options
   * @returns Promise resolving to array of category samples
   */
  queryCategorySamples(
    typeIdentifier: CategoryTypeIdentifier,
    options?: QueryOptions
  ): Promise<CategorySample[]>;

  /**
   * Save a category sample to HealthKit.
   *
   * @param typeIdentifier - The category type
   * @param value - Category value (enum integer)
   * @param startDate - ISO 8601 start date
   * @param endDate - ISO 8601 end date
   * @param metadata - Optional metadata dictionary
   * @returns Promise resolving to success boolean
   */
  saveCategorySample(
    typeIdentifier: CategoryTypeIdentifier,
    value: number,
    startDate: string,
    endDate: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────

  /**
   * Query aggregated statistics for a quantity type over a time range.
   *
   * @param typeIdentifier - The quantity type
   * @param aggregations - Array of aggregation types to compute
   * @param options - Query options (date range)
   * @returns Promise resolving to statistics result
   */
  queryStatistics(
    typeIdentifier: QuantityTypeIdentifier,
    aggregations: StatisticsAggregation[],
    options?: QueryOptions
  ): Promise<StatisticsResult>;

  /**
   * Query statistics bucketed by time intervals (daily steps, hourly heart rate, etc.)
   *
   * @param typeIdentifier - The quantity type
   * @param aggregations - Array of aggregation types
   * @param options - Query options including interval
   * @returns Promise resolving to array of statistics per interval
   */
  queryStatisticsCollection(
    typeIdentifier: QuantityTypeIdentifier,
    aggregations: StatisticsAggregation[],
    options: StatisticsOptions
  ): Promise<StatisticsResult[]>;

  // ─────────────────────────────────────────────────────────────
  // Anchored Queries (Incremental Sync)
  // ─────────────────────────────────────────────────────────────

  /**
   * Query quantity samples with anchor for incremental synchronization.
   * Returns only new/updated samples since the last anchor.
   *
   * @param typeIdentifier - The quantity type
   * @param anchor - Base64 anchor from previous query (null for initial query)
   * @param limit - Maximum samples to return
   * @returns Promise resolving to samples, deleted objects, and new anchor
   */
  queryQuantitySamplesWithAnchor(
    typeIdentifier: QuantityTypeIdentifier,
    anchor?: string | null,
    limit?: number
  ): Promise<AnchoredQueryResult<QuantitySample>>;

  /**
   * Query category samples with anchor for incremental synchronization.
   */
  queryCategorySamplesWithAnchor(
    typeIdentifier: CategoryTypeIdentifier,
    anchor?: string | null,
    limit?: number
  ): Promise<AnchoredQueryResult<CategorySample>>;

  // ─────────────────────────────────────────────────────────────
  // Workouts
  // ─────────────────────────────────────────────────────────────

  /**
   * Query workout samples.
   *
   * @param options - Query options
   * @returns Promise resolving to array of workout samples
   */
  queryWorkouts(options?: QueryOptions): Promise<WorkoutSample[]>;

  /**
   * Save a workout to HealthKit.
   *
   * @param activityType - Workout activity type
   * @param startDate - ISO 8601 start date
   * @param endDate - ISO 8601 end date
   * @param totalEnergyBurned - Optional total calories burned
   * @param totalDistance - Optional total distance in meters
   * @param metadata - Optional metadata dictionary
   * @returns Promise resolving to success boolean
   */
  saveWorkout(
    activityType: WorkoutActivityType,
    startDate: string,
    endDate: string,
    totalEnergyBurned?: number,
    totalDistance?: number,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────
  // Characteristics (Read-Only)
  // ─────────────────────────────────────────────────────────────

  /** Get user's date of birth */
  getDateOfBirth(): Promise<string | null>;

  /** Get user's biological sex ('female' | 'male' | 'other' | null) */
  getBiologicalSex(): Promise<string | null>;

  /** Get user's blood type ('A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) */
  getBloodType(): Promise<string | null>;

  /** Get user's Fitzpatrick skin type (1-6 | null) */
  getFitzpatrickSkinType(): Promise<number | null>;

  /** Get whether user uses wheelchair */
  getWheelchairUse(): Promise<boolean | null>;

  // ─────────────────────────────────────────────────────────────
  // Observer Queries (Real-time Subscriptions)
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to changes for a specific data type.
   * When changes occur, the 'onHealthKitUpdate' event is emitted.
   *
   * @param typeIdentifier - Data type to observe
   * @returns Promise resolving to subscription ID
   */
  subscribeToChanges(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier
  ): Promise<string>;

  /**
   * Unsubscribe from a specific subscription.
   *
   * @param subscriptionId - ID returned from subscribeToChanges
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Background Delivery
  // ─────────────────────────────────────────────────────────────

  /**
   * Enable background delivery for a data type.
   * When new data is available, 'onBackgroundDelivery' event is emitted.
   *
   * @param typeIdentifier - Data type for background updates
   * @param frequency - Update frequency ('immediate' | 'hourly' | 'daily')
   * @returns Promise resolving to success boolean
   */
  enableBackgroundDelivery(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier,
    frequency: 'immediate' | 'hourly' | 'daily'
  ): Promise<boolean>;

  /**
   * Disable background delivery for a specific data type.
   */
  disableBackgroundDelivery(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier
  ): Promise<boolean>;

  /**
   * Disable all background delivery.
   */
  disableAllBackgroundDelivery(): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────

  /**
   * Delete samples of a specific type within a date range.
   * Only deletes samples created by this app.
   *
   * @param typeIdentifier - Data type to delete
   * @param startDate - ISO 8601 start date
   * @param endDate - ISO 8601 end date
   * @returns Promise resolving to success boolean
   */
  deleteSamples(
    typeIdentifier: QuantityTypeIdentifier | CategoryTypeIdentifier,
    startDate: string,
    endDate: string
  ): Promise<boolean>;
}

export default requireNativeModule<AppleHealthModule>('AppleHealth');
```

---

## 5. Swift Native Implementation

### 5.1 Main Module

```swift
// ios/AppleHealthModule.swift

import ExpoModulesCore
import HealthKit

public class AppleHealthModule: Module {
  private lazy var healthStoreManager = HealthStoreManager.shared
  private lazy var observerManager = ObserverQueryManager(appContext: appContext)

  public func definition() -> ModuleDefinition {
    Name("AppleHealth")

    // Events for real-time updates
    Events("onHealthKitUpdate", "onBackgroundDelivery")

    // ─────────────────────────────────────────────────────────────
    // Availability
    // ─────────────────────────────────────────────────────────────

    Function("isAvailable") {
      return HKHealthStore.isHealthDataAvailable()
    }

    // ─────────────────────────────────────────────────────────────
    // Authorization
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("requestAuthorization") { (permissions: HealthKitPermissions) -> [String: Any] in
      return try await self.healthStoreManager.requestAuthorization(permissions: permissions)
    }

    AsyncFunction("getAuthorizationStatus") { (dataTypes: [String]) -> [String: String] in
      return self.healthStoreManager.getAuthorizationStatus(for: dataTypes)
    }

    // ─────────────────────────────────────────────────────────────
    // Quantity Samples
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("queryQuantitySamples") {
      (typeIdentifier: String, options: QueryOptions?) -> [[String: Any]] in
      let executor = SampleQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryQuantitySamples(
        typeIdentifier: typeIdentifier,
        options: options ?? QueryOptions()
      )
    }

    AsyncFunction("saveQuantitySample") {
      (typeIdentifier: String, value: Double, unit: String,
       startDate: String, endDate: String, metadata: [String: Any]?) -> Bool in
      let writer = SampleWriter(healthStore: self.healthStoreManager.store)
      return try await writer.saveQuantitySample(
        typeIdentifier: typeIdentifier,
        value: value,
        unit: unit,
        startDate: startDate,
        endDate: endDate,
        metadata: metadata
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Category Samples
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("queryCategorySamples") {
      (typeIdentifier: String, options: QueryOptions?) -> [[String: Any]] in
      let executor = SampleQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryCategorySamples(
        typeIdentifier: typeIdentifier,
        options: options ?? QueryOptions()
      )
    }

    AsyncFunction("saveCategorySample") {
      (typeIdentifier: String, value: Int,
       startDate: String, endDate: String, metadata: [String: Any]?) -> Bool in
      let writer = SampleWriter(healthStore: self.healthStoreManager.store)
      return try await writer.saveCategorySample(
        typeIdentifier: typeIdentifier,
        value: value,
        startDate: startDate,
        endDate: endDate,
        metadata: metadata
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("queryStatistics") {
      (typeIdentifier: String, aggregations: [String], options: QueryOptions?) -> [String: Any] in
      let executor = StatisticsQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryStatistics(
        typeIdentifier: typeIdentifier,
        aggregations: aggregations,
        options: options ?? QueryOptions()
      )
    }

    AsyncFunction("queryStatisticsCollection") {
      (typeIdentifier: String, aggregations: [String], options: StatisticsCollectionOptions) -> [[String: Any]] in
      let executor = StatisticsQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryStatisticsCollection(
        typeIdentifier: typeIdentifier,
        aggregations: aggregations,
        options: options
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Anchored Queries
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("queryQuantitySamplesWithAnchor") {
      (typeIdentifier: String, anchor: String?, limit: Int?) -> [String: Any] in
      let executor = AnchoredQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryQuantitySamples(
        typeIdentifier: typeIdentifier,
        anchor: anchor,
        limit: limit ?? 100
      )
    }

    AsyncFunction("queryCategorySamplesWithAnchor") {
      (typeIdentifier: String, anchor: String?, limit: Int?) -> [String: Any] in
      let executor = AnchoredQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryCategorySamples(
        typeIdentifier: typeIdentifier,
        anchor: anchor,
        limit: limit ?? 100
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Workouts
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("queryWorkouts") { (options: QueryOptions?) -> [[String: Any]] in
      let executor = SampleQueryExecutor(healthStore: self.healthStoreManager.store)
      return try await executor.queryWorkouts(options: options ?? QueryOptions())
    }

    AsyncFunction("saveWorkout") {
      (activityType: String, startDate: String, endDate: String,
       totalEnergyBurned: Double?, totalDistance: Double?, metadata: [String: Any]?) -> Bool in
      let writer = WorkoutWriter(healthStore: self.healthStoreManager.store)
      return try await writer.saveWorkout(
        activityType: activityType,
        startDate: startDate,
        endDate: endDate,
        totalEnergyBurned: totalEnergyBurned,
        totalDistance: totalDistance,
        metadata: metadata
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Characteristics
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("getDateOfBirth") { () -> String? in
      return try? self.healthStoreManager.getDateOfBirth()?.ISO8601Format()
    }

    AsyncFunction("getBiologicalSex") { () -> String? in
      return try? self.healthStoreManager.getBiologicalSex()
    }

    AsyncFunction("getBloodType") { () -> String? in
      return try? self.healthStoreManager.getBloodType()
    }

    AsyncFunction("getFitzpatrickSkinType") { () -> Int? in
      return try? self.healthStoreManager.getFitzpatrickSkinType()
    }

    AsyncFunction("getWheelchairUse") { () -> Bool? in
      return try? self.healthStoreManager.getWheelchairUse()
    }

    // ─────────────────────────────────────────────────────────────
    // Observer Queries
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("subscribeToChanges") { (typeIdentifier: String) -> String in
      return try await self.observerManager.subscribe(
        to: typeIdentifier
      ) { [weak self] anchor in
        self?.sendEvent("onHealthKitUpdate", [
          "typeIdentifier": typeIdentifier,
          "anchor": anchor as Any
        ])
      }
    }

    AsyncFunction("unsubscribe") { (subscriptionId: String) in
      self.observerManager.unsubscribe(subscriptionId: subscriptionId)
    }

    // ─────────────────────────────────────────────────────────────
    // Background Delivery
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("enableBackgroundDelivery") {
      (typeIdentifier: String, frequency: String) -> Bool in
      let manager = BackgroundDeliveryManager(healthStore: self.healthStoreManager.store)
      return try await manager.enable(
        for: typeIdentifier,
        frequency: frequency
      ) { [weak self] in
        self?.sendEvent("onBackgroundDelivery", [
          "typeIdentifier": typeIdentifier
        ])
      }
    }

    AsyncFunction("disableBackgroundDelivery") { (typeIdentifier: String) -> Bool in
      let manager = BackgroundDeliveryManager(healthStore: self.healthStoreManager.store)
      return try await manager.disable(for: typeIdentifier)
    }

    AsyncFunction("disableAllBackgroundDelivery") { () -> Bool in
      let manager = BackgroundDeliveryManager(healthStore: self.healthStoreManager.store)
      return try await manager.disableAll()
    }

    // ─────────────────────────────────────────────────────────────
    // Delete
    // ─────────────────────────────────────────────────────────────

    AsyncFunction("deleteSamples") {
      (typeIdentifier: String, startDate: String, endDate: String) -> Bool in
      let writer = SampleWriter(healthStore: self.healthStoreManager.store)
      return try await writer.deleteSamples(
        typeIdentifier: typeIdentifier,
        startDate: startDate,
        endDate: endDate
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────

    OnDestroy {
      self.observerManager.unsubscribeAll()
    }
  }
}
```

### 5.2 HealthStore Manager

```swift
// ios/HealthStore/HealthStoreManager.swift

import HealthKit

class HealthStoreManager {
  static let shared = HealthStoreManager()

  let store: HKHealthStore

  private init() {
    guard HKHealthStore.isHealthDataAvailable() else {
      fatalError("HealthKit is not available on this device")
    }
    self.store = HKHealthStore()
  }

  func requestAuthorization(permissions: HealthKitPermissions) async throws -> [String: Any] {
    let readTypes = permissions.read.compactMap { TypeIdentifiers.objectType(for: $0) }
    let writeTypes = permissions.write.compactMap { TypeIdentifiers.sampleType(for: $0) }

    try await store.requestAuthorization(toShare: Set(writeTypes), read: Set(readTypes))

    var readStatuses: [String: String] = [:]
    var writeStatuses: [String: String] = [:]

    for type in permissions.read {
      if let objectType = TypeIdentifiers.objectType(for: type) {
        readStatuses[type] = authorizationStatusString(store.authorizationStatus(for: objectType))
      }
    }

    for type in permissions.write {
      if let sampleType = TypeIdentifiers.sampleType(for: type) {
        writeStatuses[type] = authorizationStatusString(store.authorizationStatus(for: sampleType))
      }
    }

    return [
      "status": "sharingAuthorized",
      "permissions": [
        "read": readStatuses,
        "write": writeStatuses
      ]
    ]
  }

  func getAuthorizationStatus(for dataTypes: [String]) -> [String: String] {
    var result: [String: String] = [:]
    for type in dataTypes {
      if let objectType = TypeIdentifiers.objectType(for: type) {
        result[type] = authorizationStatusString(store.authorizationStatus(for: objectType))
      }
    }
    return result
  }

  func getDateOfBirth() throws -> Date? {
    let components = try store.dateOfBirthComponents()
    return Calendar.current.date(from: components)
  }

  func getBiologicalSex() throws -> String? {
    let sex = try store.biologicalSex().biologicalSex
    switch sex {
    case .female: return "female"
    case .male: return "male"
    case .other: return "other"
    case .notSet: return nil
    @unknown default: return nil
    }
  }

  func getBloodType() throws -> String? {
    let bloodType = try store.bloodType().bloodType
    switch bloodType {
    case .aPositive: return "A+"
    case .aNegative: return "A-"
    case .bPositive: return "B+"
    case .bNegative: return "B-"
    case .abPositive: return "AB+"
    case .abNegative: return "AB-"
    case .oPositive: return "O+"
    case .oNegative: return "O-"
    case .notSet: return nil
    @unknown default: return nil
    }
  }

  func getFitzpatrickSkinType() throws -> Int? {
    let skinType = try store.fitzpatrickSkinType().skinType
    switch skinType {
    case .notSet: return nil
    case .I: return 1
    case .II: return 2
    case .III: return 3
    case .IV: return 4
    case .V: return 5
    case .VI: return 6
    @unknown default: return nil
    }
  }

  func getWheelchairUse() throws -> Bool? {
    let wheelchairUse = try store.wheelchairUse().wheelchairUse
    switch wheelchairUse {
    case .notSet: return nil
    case .no: return false
    case .yes: return true
    @unknown default: return nil
    }
  }

  private func authorizationStatusString(_ status: HKAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .sharingDenied: return "sharingDenied"
    case .sharingAuthorized: return "sharingAuthorized"
    @unknown default: return "notDetermined"
    }
  }
}
```

### 5.3 Type Identifiers (Partial - Full implementation has all 100+ types)

```swift
// ios/Types/TypeIdentifiers.swift

import HealthKit

struct TypeIdentifiers {

  // MARK: - Quantity Types

  static func quantityType(for identifier: String) -> HKQuantityType? {
    guard let hkIdentifier = quantityTypeIdentifier(for: identifier) else {
      return nil
    }
    return HKQuantityType.quantityType(forIdentifier: hkIdentifier)
  }

  private static func quantityTypeIdentifier(for identifier: String) -> HKQuantityTypeIdentifier? {
    let mapping: [String: HKQuantityTypeIdentifier] = [
      // Body Measurements
      "bodyMassIndex": .bodyMassIndex,
      "bodyFatPercentage": .bodyFatPercentage,
      "height": .height,
      "bodyMass": .bodyMass,
      "leanBodyMass": .leanBodyMass,
      "waistCircumference": .waistCircumference,

      // Fitness
      "stepCount": .stepCount,
      "distanceWalkingRunning": .distanceWalkingRunning,
      "distanceCycling": .distanceCycling,
      "distanceWheelchair": .distanceWheelchair,
      "distanceSwimming": .distanceSwimming,
      "basalEnergyBurned": .basalEnergyBurned,
      "activeEnergyBurned": .activeEnergyBurned,
      "flightsClimbed": .flightsClimbed,
      "appleExerciseTime": .appleExerciseTime,
      "appleStandTime": .appleStandTime,
      "vo2Max": .vo2Max,

      // Vitals
      "heartRate": .heartRate,
      "bodyTemperature": .bodyTemperature,
      "basalBodyTemperature": .basalBodyTemperature,
      "bloodPressureSystolic": .bloodPressureSystolic,
      "bloodPressureDiastolic": .bloodPressureDiastolic,
      "respiratoryRate": .respiratoryRate,
      "restingHeartRate": .restingHeartRate,
      "walkingHeartRateAverage": .walkingHeartRateAverage,
      "heartRateVariabilitySDNN": .heartRateVariabilitySDNN,
      "oxygenSaturation": .oxygenSaturation,

      // Results
      "bloodGlucose": .bloodGlucose,
      "bloodAlcoholContent": .bloodAlcoholContent,

      // Nutrition
      "dietaryEnergyConsumed": .dietaryEnergyConsumed,
      "dietaryCarbohydrates": .dietaryCarbohydrates,
      "dietaryProtein": .dietaryProtein,
      "dietaryFatTotal": .dietaryFatTotal,
      "dietaryWater": .dietaryWater,
      "dietaryCaffeine": .dietaryCaffeine,

      // ... (all other quantity types)
    ]
    return mapping[identifier]
  }

  // MARK: - Category Types

  static func categoryType(for identifier: String) -> HKCategoryType? {
    guard let hkIdentifier = categoryTypeIdentifier(for: identifier) else {
      return nil
    }
    return HKCategoryType.categoryType(forIdentifier: hkIdentifier)
  }

  private static func categoryTypeIdentifier(for identifier: String) -> HKCategoryTypeIdentifier? {
    let mapping: [String: HKCategoryTypeIdentifier] = [
      "sleepAnalysis": .sleepAnalysis,
      "appleStandHour": .appleStandHour,
      "mindfulSession": .mindfulSession,
      "menstrualFlow": .menstrualFlow,
      "ovulationTestResult": .ovulationTestResult,
      "cervicalMucusQuality": .cervicalMucusQuality,
      "sexualActivity": .sexualActivity,
      "highHeartRateEvent": .highHeartRateEvent,
      "lowHeartRateEvent": .lowHeartRateEvent,
      "irregularHeartRhythmEvent": .irregularHeartRhythmEvent,
      // ... (all other category types)
    ]
    return mapping[identifier]
  }

  // MARK: - Object/Sample Types

  static func objectType(for identifier: String) -> HKObjectType? {
    if let quantityType = quantityType(for: identifier) {
      return quantityType
    }
    if let categoryType = categoryType(for: identifier) {
      return categoryType
    }
    if let characteristicType = characteristicType(for: identifier) {
      return characteristicType
    }
    if identifier == "workoutType" {
      return HKObjectType.workoutType()
    }
    return nil
  }

  static func sampleType(for identifier: String) -> HKSampleType? {
    if let quantityType = quantityType(for: identifier) {
      return quantityType
    }
    if let categoryType = categoryType(for: identifier) {
      return categoryType
    }
    if identifier == "workoutType" {
      return HKObjectType.workoutType()
    }
    return nil
  }

  // MARK: - Characteristic Types

  static func characteristicType(for identifier: String) -> HKCharacteristicType? {
    let mapping: [String: HKCharacteristicTypeIdentifier] = [
      "biologicalSex": .biologicalSex,
      "bloodType": .bloodType,
      "dateOfBirth": .dateOfBirth,
      "fitzpatrickSkinType": .fitzpatrickSkinType,
      "wheelchairUse": .wheelchairUse,
    ]
    guard let id = mapping[identifier] else { return nil }
    return HKCharacteristicType.characteristicType(forIdentifier: id)
  }

  // MARK: - Workout Activity Types

  static func workoutActivityType(for identifier: String) -> HKWorkoutActivityType {
    let mapping: [String: HKWorkoutActivityType] = [
      "running": .running,
      "walking": .walking,
      "cycling": .cycling,
      "swimming": .swimming,
      "yoga": .yoga,
      "hiking": .hiking,
      "traditionalStrengthTraining": .traditionalStrengthTraining,
      "functionalStrengthTraining": .functionalStrengthTraining,
      "highIntensityIntervalTraining": .highIntensityIntervalTraining,
      "other": .other,
      // ... (all other workout types)
    ]
    return mapping[identifier] ?? .other
  }

  static func workoutActivityTypeString(for type: HKWorkoutActivityType) -> String {
    // Reverse mapping for serialization
    switch type {
    case .running: return "running"
    case .walking: return "walking"
    case .cycling: return "cycling"
    case .swimming: return "swimming"
    case .yoga: return "yoga"
    case .hiking: return "hiking"
    case .traditionalStrengthTraining: return "traditionalStrengthTraining"
    case .functionalStrengthTraining: return "functionalStrengthTraining"
    case .highIntensityIntervalTraining: return "highIntensityIntervalTraining"
    // ... (all other workout types)
    default: return "other"
    }
  }
}
```

---

## 6. Config Plugin

### 6.1 Plugin Structure

```
plugin/
  src/
    index.ts                        # Main export
    withHealthKit.ts                # Combined plugin
    withHealthKitEntitlements.ts    # Entitlements modification
    withHealthKitInfoPlist.ts       # Info.plist modification
    withHealthKitBackgroundModes.ts # Background modes
  tsconfig.json
  build/                            # Compiled output
```

### 6.2 Plugin Implementation

```typescript
// plugin/src/index.ts

import { ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';
import { withHealthKit } from './withHealthKit';

const pkg = require('../../package.json');

export interface HealthKitPluginProps {
  /** Custom message for reading health data permission */
  healthSharePermission?: string;
  /** Custom message for writing health data permission */
  healthUpdatePermission?: string;
  /** Enable clinical records access (requires Apple approval) */
  isClinicalDataEnabled?: boolean;
  /** Enable background delivery for health data updates */
  backgroundDelivery?: boolean;
}

const withHealthKitPlugin: ConfigPlugin<HealthKitPluginProps | void> = (config, props) => {
  return withHealthKit(config, props ?? {});
};

export default createRunOncePlugin(withHealthKitPlugin, pkg.name, pkg.version);
```

```typescript
// plugin/src/withHealthKit.ts

import { ConfigPlugin, withPlugins } from '@expo/config-plugins';
import { withHealthKitEntitlements } from './withHealthKitEntitlements';
import { withHealthKitInfoPlist } from './withHealthKitInfoPlist';
import { withHealthKitBackgroundModes } from './withHealthKitBackgroundModes';
import { HealthKitPluginProps } from './index';

export const withHealthKit: ConfigPlugin<HealthKitPluginProps> = (config, props) => {
  return withPlugins(config, [
    [withHealthKitEntitlements, props],
    [withHealthKitInfoPlist, props],
    [withHealthKitBackgroundModes, props],
  ]);
};
```

```typescript
// plugin/src/withHealthKitEntitlements.ts

import { ConfigPlugin, withEntitlementsPlist } from '@expo/config-plugins';
import { HealthKitPluginProps } from './index';

export const withHealthKitEntitlements: ConfigPlugin<HealthKitPluginProps> = (
  config,
  { isClinicalDataEnabled = false, backgroundDelivery = false }
) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true;

    const accessArray: string[] = [];
    if (isClinicalDataEnabled) {
      accessArray.push('health-records');
    }
    config.modResults['com.apple.developer.healthkit.access'] = accessArray;

    if (backgroundDelivery) {
      config.modResults['com.apple.developer.healthkit.background-delivery'] = true;
    }

    return config;
  });
};
```

```typescript
// plugin/src/withHealthKitInfoPlist.ts

import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';
import { HealthKitPluginProps } from './index';

const DEFAULT_SHARE_PERMISSION = 'Allow $(PRODUCT_NAME) to access your health data.';
const DEFAULT_UPDATE_PERMISSION = 'Allow $(PRODUCT_NAME) to update your health data.';

export const withHealthKitInfoPlist: ConfigPlugin<HealthKitPluginProps> = (
  config,
  { healthSharePermission, healthUpdatePermission }
) => {
  return withInfoPlist(config, (config) => {
    config.modResults['NSHealthShareUsageDescription'] =
      healthSharePermission ?? DEFAULT_SHARE_PERMISSION;
    config.modResults['NSHealthUpdateUsageDescription'] =
      healthUpdatePermission ?? DEFAULT_UPDATE_PERMISSION;

    const capabilities = config.modResults['UIRequiredDeviceCapabilities'] ?? [];
    if (!capabilities.includes('healthkit')) {
      capabilities.push('healthkit');
    }
    config.modResults['UIRequiredDeviceCapabilities'] = capabilities;

    return config;
  });
};
```

```typescript
// plugin/src/withHealthKitBackgroundModes.ts

import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';
import { HealthKitPluginProps } from './index';

export const withHealthKitBackgroundModes: ConfigPlugin<HealthKitPluginProps> = (
  config,
  { backgroundDelivery = false }
) => {
  if (!backgroundDelivery) {
    return config;
  }

  return withInfoPlist(config, (config) => {
    const existingModes = (config.modResults['UIBackgroundModes'] as string[]) ?? [];

    if (!existingModes.includes('processing')) {
      existingModes.push('processing');
    }

    config.modResults['UIBackgroundModes'] = existingModes;

    return config;
  });
};
```

### 6.3 Usage in app.json

```json
{
  "expo": {
    "plugins": [
      [
        "apple-health",
        {
          "healthSharePermission": "Allow MyApp to read your health data for tracking.",
          "healthUpdatePermission": "Allow MyApp to save workout data.",
          "backgroundDelivery": true,
          "isClinicalDataEnabled": false
        }
      ]
    ]
  }
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation & Configuration
**Goal:** Set up project structure and configuration

1. Update `expo-module.config.json` to iOS-only
2. Update `ios/AppleHealth.podspec` with HealthKit framework
3. Create config plugin directory structure
4. Implement config plugin (entitlements, Info.plist, background modes)
5. Create `HealthStoreManager` singleton
6. Create `TypeIdentifiers` with all 100+ type mappings
7. Create `HealthKitExceptions` for error handling

**Deliverables:**
- Working config plugin
- HealthKit framework integrated
- Type mapping infrastructure

### Phase 2: Authorization & Characteristics
**Goal:** Implement permission system and read-only characteristics

1. Implement `requestAuthorization` async function
2. Implement `getAuthorizationStatus` function
3. Implement `isAvailable` function
4. Implement characteristic getters (dateOfBirth, biologicalSex, bloodType, etc.)
5. Update TypeScript types for authorization

**Deliverables:**
- Full authorization flow
- Characteristic queries
- TypeScript permission types

### Phase 3: Sample Queries
**Goal:** Implement data querying capabilities

1. Create `SampleQueryExecutor` class
2. Implement `queryQuantitySamples`
3. Implement `queryCategorySamples`
4. Implement `queryWorkouts`
5. Create `SampleConverters` for serialization
6. Create `UnitMapping` for unit handling

**Deliverables:**
- All sample query functions
- Proper date/unit handling
- Pagination support

### Phase 4: Statistics Queries
**Goal:** Implement aggregated statistics

1. Create `StatisticsQueryExecutor` class
2. Implement `queryStatistics` (single statistics)
3. Implement `queryStatisticsCollection` (time-bucketed)
4. Support all aggregation types (sum, avg, min, max, mostRecent)
5. Support all intervals (hour, day, week, month, year)

**Deliverables:**
- Statistics queries
- Time interval bucketing
- Multiple aggregation support

### Phase 5: Anchored Queries
**Goal:** Implement incremental sync support

1. Create `AnchoredQueryExecutor` class
2. Implement `queryQuantitySamplesWithAnchor`
3. Implement `queryCategorySamplesWithAnchor`
4. Handle anchor serialization (Base64)
5. Track deleted objects

**Deliverables:**
- Anchored query support
- Deleted object tracking
- Efficient incremental sync

### Phase 6: Write Support
**Goal:** Implement data writing capabilities

1. Create `SampleWriter` class
2. Implement `saveQuantitySample`
3. Implement `saveCategorySample`
4. Implement `deleteSamples`
5. Create `WorkoutWriter` class
6. Implement `saveWorkout`

**Deliverables:**
- All write functions
- Proper unit handling for writes
- Delete functionality

### Phase 7: Subscriptions & Background
**Goal:** Implement real-time updates and background delivery

1. Create `ObserverQueryManager` class
2. Implement `subscribeToChanges`
3. Implement `unsubscribe`
4. Create `BackgroundDeliveryManager` class
5. Implement `enableBackgroundDelivery`
6. Implement `disableBackgroundDelivery`
7. Wire up event emission

**Deliverables:**
- Real-time subscriptions
- Background delivery
- Event system

### Phase 8: Polish & Documentation
**Goal:** Finalize implementation

1. Complete TypeScript type definitions
2. Remove unused files (WebView, Android, Web implementations)
3. Update example app with comprehensive demos
4. Add inline documentation
5. Test all functions
6. Performance optimization

**Deliverables:**
- Complete TypeScript API
- Clean codebase
- Working example app

---

## 8. File Structure

### Final Project Structure

```
apple-health/
├── ios/
│   ├── AppleHealthModule.swift           # Main module (rewritten)
│   ├── AppleHealth.podspec               # Updated with HealthKit
│   ├── HealthStore/
│   │   └── HealthStoreManager.swift      # HKHealthStore singleton
│   ├── Types/
│   │   ├── TypeIdentifiers.swift         # String -> HK type mapping
│   │   ├── UnitMapping.swift             # Unit conversions
│   │   └── SampleConverters.swift        # HKSample -> Dictionary
│   ├── Queries/
│   │   ├── SampleQueryExecutor.swift     # HKSampleQuery
│   │   ├── StatisticsQueryExecutor.swift # HKStatisticsQuery
│   │   ├── AnchoredQueryExecutor.swift   # HKAnchoredObjectQuery
│   │   └── ObserverQueryManager.swift    # HKObserverQuery
│   ├── Writers/
│   │   ├── SampleWriter.swift            # Save/delete samples
│   │   └── WorkoutWriter.swift           # Save workouts
│   ├── BackgroundDelivery/
│   │   └── BackgroundDeliveryManager.swift
│   └── Exceptions/
│       └── HealthKitExceptions.swift
├── src/
│   ├── index.ts                          # Main exports
│   ├── AppleHealth.types.ts              # All TypeScript types
│   └── AppleHealthModule.ts              # Native module declaration
├── plugin/
│   ├── src/
│   │   ├── index.ts
│   │   ├── withHealthKit.ts
│   │   ├── withHealthKitEntitlements.ts
│   │   ├── withHealthKitInfoPlist.ts
│   │   └── withHealthKitBackgroundModes.ts
│   ├── tsconfig.json
│   └── build/
├── example/
│   ├── App.tsx                           # Demo app (updated)
│   └── ...
├── expo-module.config.json               # iOS-only
├── package.json                          # Updated with plugin
└── tsconfig.json
```

### Files to Remove

- `ios/AppleHealthView.swift` (WebView not needed)
- `src/AppleHealthView.tsx`
- `src/AppleHealthView.web.tsx`
- `src/AppleHealthModule.web.ts`
- `android/` directory (entire)

---

## 9. Data Types Reference

### Quantity Types by Category

| Category | Types |
|----------|-------|
| **Body Measurements** | bodyMassIndex, bodyFatPercentage, height, bodyMass, leanBodyMass, waistCircumference |
| **Fitness** | stepCount, distanceWalkingRunning, distanceCycling, distanceWheelchair, distanceSwimming, basalEnergyBurned, activeEnergyBurned, flightsClimbed, appleExerciseTime, appleStandTime, vo2Max, walkingSpeed, runningSpeed, runningPower |
| **Vitals** | heartRate, bodyTemperature, bloodPressureSystolic, bloodPressureDiastolic, respiratoryRate, restingHeartRate, walkingHeartRateAverage, heartRateVariabilitySDNN, oxygenSaturation |
| **Results** | bloodGlucose, bloodAlcoholContent, electrodermalActivity, forcedExpiratoryVolume1, forcedVitalCapacity, insulinDelivery |
| **Nutrition** | dietaryEnergyConsumed, dietaryCarbohydrates, dietaryProtein, dietaryFatTotal, dietaryWater, dietaryCaffeine, + 30 more vitamins/minerals |
| **Audio** | environmentalAudioExposure, headphoneAudioExposure |

### Category Types by Category

| Category | Types |
|----------|-------|
| **Sleep** | sleepAnalysis |
| **Activity** | appleStandHour, lowCardioFitnessEvent |
| **Reproductive** | menstrualFlow, cervicalMucusQuality, ovulationTestResult, pregnancy, lactation, contraceptive, sexualActivity |
| **Mindfulness** | mindfulSession |
| **Heart** | highHeartRateEvent, lowHeartRateEvent, irregularHeartRhythmEvent |
| **Symptoms** | 30+ symptom types (headache, fever, nausea, fatigue, etc.) |

### Workout Activity Types

80+ activity types including: running, walking, cycling, swimming, yoga, hiking, basketball, soccer, tennis, golf, skiing, snowboarding, rowing, climbing, crossTraining, highIntensityIntervalTraining, etc.

---

## Appendix A: Usage Examples

### Basic Authorization

```typescript
import AppleHealth from 'apple-health';

// Check availability
const isAvailable = AppleHealth.isAvailable();

// Request permissions
const result = await AppleHealth.requestAuthorization({
  read: ['stepCount', 'heartRate', 'sleepAnalysis', 'workoutType'],
  write: ['stepCount', 'workoutType']
});
```

### Querying Data

```typescript
// Get today's steps
const steps = await AppleHealth.queryQuantitySamples('stepCount', {
  startDate: new Date().toISOString(),
  limit: 100
});

// Get daily step totals for last week
const weeklySteps = await AppleHealth.queryStatisticsCollection(
  'stepCount',
  ['cumulativeSum'],
  {
    startDate: sevenDaysAgo.toISOString(),
    endDate: new Date().toISOString(),
    interval: 'day'
  }
);

// Get sleep data
const sleep = await AppleHealth.queryCategorySamples('sleepAnalysis', {
  startDate: yesterday.toISOString()
});
```

### Writing Data

```typescript
// Save a step count
await AppleHealth.saveQuantitySample(
  'stepCount',
  1000,
  'count',
  startDate.toISOString(),
  endDate.toISOString()
);

// Save a workout
await AppleHealth.saveWorkout(
  'running',
  startDate.toISOString(),
  endDate.toISOString(),
  350, // calories
  5000 // meters
);
```

### Subscriptions

```typescript
import { useEvent } from 'expo';

// Subscribe to step changes
const subscriptionId = await AppleHealth.subscribeToChanges('stepCount');

// Listen for updates
useEvent(AppleHealth, 'onHealthKitUpdate', (event) => {
  console.log('HealthKit updated:', event.typeIdentifier);
  // Refetch data
});

// Cleanup
await AppleHealth.unsubscribe(subscriptionId);
```

### Background Delivery

```typescript
// Enable background updates for steps
await AppleHealth.enableBackgroundDelivery('stepCount', 'hourly');

// Handle background updates
useEvent(AppleHealth, 'onBackgroundDelivery', (event) => {
  // App was woken to receive health data
  syncHealthData(event.typeIdentifier);
});
```

---

## Appendix B: Error Handling

```swift
// ios/Exceptions/HealthKitExceptions.swift

import ExpoModulesCore

enum HealthKitError: Error {
  case notAvailable
  case invalidTypeIdentifier(String)
  case authorizationFailed(Error)
  case queryFailed(Error)
  case writeFailed(Error)
  case invalidUnit(String)
  case invalidDate(String)
}

extension HealthKitError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .notAvailable:
      return "HealthKit is not available on this device"
    case .invalidTypeIdentifier(let id):
      return "Invalid HealthKit type identifier: \(id)"
    case .authorizationFailed(let error):
      return "Authorization failed: \(error.localizedDescription)"
    case .queryFailed(let error):
      return "Query failed: \(error.localizedDescription)"
    case .writeFailed(let error):
      return "Write failed: \(error.localizedDescription)"
    case .invalidUnit(let unit):
      return "Invalid unit: \(unit)"
    case .invalidDate(let date):
      return "Invalid date format: \(date)"
    }
  }
}
```

---

*This proposal provides a complete technical specification for implementing a comprehensive Apple HealthKit Expo module. The implementation follows Expo module best practices and provides a type-safe, feature-complete API for React Native applications.*
