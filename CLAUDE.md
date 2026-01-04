Expo module for interacting with Apple HealthKit on Apple devices.

## Progress

- [x] Marshalling-style API for reading and writing health data
- [x] Querying API (samples, statistics, statistics collections, anchored queries)
- [x] HealthKit UI elements https://developer.apple.com/documentation/healthkitui
- [x] Config Plugin for setting up HealthKit permissions and entitlements
- [x] Permissions that follow Expo's permission model
- [ ] Docs for usage and setup instructions
- [x] TypeScript typings for all methods and options
- [x] Real-time subscriptions (observer queries)
- [x] Background delivery support
- [ ] Debugging UI for interacting with data

## Implemented Features

### Authorization

- `isAvailable()` - Check if HealthKit is available
- `requestAuthorization({ read, write })` - Request permissions
- `getAuthorizationStatus(types)` - Check authorization status for types

### Characteristics (read-only)

- `getDateOfBirth()`, `getBiologicalSex()`, `getBloodType()`
- `getFitzpatrickSkinType()`, `getWheelchairUse()`, `getActivityMoveMode()`

### Queries

- `queryQuantitySamples(type, options)` - Query quantity samples
- `queryCategorySamples(type, options)` - Query category samples
- `queryWorkouts(options)` - Query workouts
- `queryStatistics(type, aggregations, options)` - Single statistics query
- `queryStatisticsCollection(type, aggregations, options)` - Time-bucketed statistics
- `queryQuantitySamplesWithAnchor(type, anchor, limit)` - Incremental sync
- `queryCategorySamplesWithAnchor(type, anchor, limit)` - Incremental sync

### Writing

- `saveQuantitySample(type, value, unit, startDate, endDate, metadata?)`
- `saveCategorySample(type, value, startDate, endDate, metadata?)`
- `saveWorkout(activityType, startDate, endDate, energy?, distance?, metadata?)`
- `deleteSamples(type, startDate, endDate)`

### Subscriptions & Background

- `subscribeToChanges(type)` - Real-time observer queries
- `unsubscribe(subscriptionId)` - Remove subscription
- `enableBackgroundDelivery(type, frequency)` - Background updates
- `disableBackgroundDelivery(type)` / `disableAllBackgroundDelivery()`

### Activity Summary

- `queryActivitySummary(startDate, endDate)` - Query daily activity summaries

### UI Components

- `<ActivityRingView summary={...} />` - Apple Watch-style activity rings

### Events

- `onHealthKitUpdate` - Fired when subscribed data changes
- `onBackgroundDelivery` - Fired for background delivery updates

## File Structure

```
ios/
├── AppleHealthModule.swift          # Main module
├── AppleHealth.podspec
├── Types/
│   ├── TypeIdentifiers.swift        # 100+ HK type mappings
│   ├── UnitMapping.swift            # Unit string → HKUnit
│   └── SampleConverters.swift       # HKSample → Dictionary
├── Views/
│   └── ActivityRingView.swift       # HKActivityRingView wrapper
├── Queries/
│   └── ObserverQueryManager.swift   # Subscription management
└── Exceptions/
    └── HealthKitExceptions.swift    # Custom error types

src/
├── index.ts                         # Public exports
├── AppleHealthModule.ts             # Native module declaration
├── AppleHealth.types.ts             # TypeScript definitions
└── ActivityRingView.tsx             # Activity rings React component

plugin/src/
├── index.ts                         # Plugin entry
├── withHealthKit.ts                 # Combined plugin
├── withHealthKitEntitlements.ts     # Entitlements
├── withHealthKitInfoPlist.ts        # Info.plist
└── withHealthKitBackgroundModes.ts  # Background modes
```

## Known Issues

- iOS 16+ types (e.g., `runningPower`, `underwaterDepth`) require `#available` checks
- Dates must include fractional seconds for ISO8601 parsing (handled internally)

## Coding

- ALWAYS use the skills/expo-modules/SKILL.md guidelines when working on the module.
- ALWAYS use the skills/device-testing/SKILL.md guidelines when verifying the module works.

## Verification

- Run `yarn expo run:ios --no-bundler` in `./example` to compile the source.

## References

- https://developer.apple.com/documentation/healthkit/data-types
- https://developer.apple.com/documentation/healthkit/accessing-sample-data-in-the-simulator
- https://developer.apple.com/documentation/healthkit
- https://developer.apple.com/documentation/healthkit/protecting-user-privacy
