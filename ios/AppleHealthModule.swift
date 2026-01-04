import ExpoModulesCore
import HealthKit
import HealthKitUI

public class AppleHealthModule: Module {
  private let healthStoreLock = NSLock()
  private var _healthStore: HKHealthStore?
  private var healthStoreInitialized = false

  private var healthStore: HKHealthStore? {
    healthStoreLock.lock()
    defer { healthStoreLock.unlock() }

    if !healthStoreInitialized {
      healthStoreInitialized = true
      if HKHealthStore.isHealthDataAvailable() {
        _healthStore = HKHealthStore()
      }
    }
    return _healthStore
  }

  private let dateFormatterWithFractionalSeconds: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private let dateFormatterWithoutFractionalSeconds: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
  }()

  private let dateFormatterDateOnly: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    return formatter
  }()

  /// Parses a date string supporting multiple formats:
  /// - ISO8601 with fractional seconds: 2024-01-15T10:30:00.000Z
  /// - ISO8601 without fractional seconds: 2024-01-15T10:30:00Z
  /// - Date only: 2024-01-15
  /// - Unix timestamp (ms): 1705312200000
  private func parseDate(_ dateString: String) -> Date? {
    // Try ISO8601 with fractional seconds first
    if let date = dateFormatterWithFractionalSeconds.date(from: dateString) {
      return date
    }

    // Try ISO8601 without fractional seconds
    if let date = dateFormatterWithoutFractionalSeconds.date(from: dateString) {
      return date
    }

    // Try date-only format
    if let date = dateFormatterDateOnly.date(from: dateString) {
      return date
    }

    // Try Unix timestamp in milliseconds
    if let timestamp = Double(dateString), timestamp > 1_000_000_000_000 {
      return Date(timeIntervalSince1970: timestamp / 1000)
    }

    return nil
  }

  /// Formats a date to ISO8601 with fractional seconds
  private func formatDate(_ date: Date) -> String {
    return dateFormatterWithFractionalSeconds.string(from: date)
  }

  public func definition() -> ModuleDefinition {
    Name("AppleHealth")

    Events("onHealthKitUpdate", "onBackgroundDelivery")

    // ─────────────────────────────────────────────────────────────────────────────
    // Shared Objects
    // ─────────────────────────────────────────────────────────────────────────────

    Class(HealthKitQuery.self) {
      Constructor {
        return HealthKitQuery()
      }

      Function("setType") { (query: HealthKitQuery, identifier: String, kind: String) in
        query.setType(identifier, kind: kind)
      }

      Function("setDateRange") { (query: HealthKitQuery, start: String?, end: String?) in
        query.setDateRange(start: start, end: end)
      }

      Function("setLimit") { (query: HealthKitQuery, limit: Int) in
        query.setLimit(limit)
      }

      Function("setAscending") { (query: HealthKitQuery, ascending: Bool) in
        query.setAscending(ascending)
      }

      Function("setAggregations") { (query: HealthKitQuery, aggregations: [String]) in
        query.setAggregations(aggregations)
      }

      Function("setInterval") { (query: HealthKitQuery, interval: String) in
        query.setInterval(interval)
      }

      AsyncFunction("execute") { (query: HealthKitQuery) -> [[String: Any]] in
        return try await query.execute()
      }

      AsyncFunction("executeStatistics") { (query: HealthKitQuery) -> Any in
        return try await query.executeStatistics()
      }

      Function("release") { (query: HealthKitQuery) in
        query.release()
      }

      AsyncFunction("executeSamples") { (query: HealthKitQuery) -> [HealthKitSample] in
        return try await query.executeSamples()
      }
    }

    Class(QuantitySampleObject.self) {
      Property("uuid") { (sample: QuantitySampleObject) in sample.uuid }
      Property("quantityType") { (sample: QuantitySampleObject) in sample.quantityType }
      Property("value") { (sample: QuantitySampleObject) in sample.value }
      Property("unit") { (sample: QuantitySampleObject) in sample.unit }
      Property("startDate") { (sample: QuantitySampleObject) in sample.startDate }
      Property("endDate") { (sample: QuantitySampleObject) in sample.endDate }
      Property("sourceName") { (sample: QuantitySampleObject) in sample.sourceName }
      Property("sourceId") { (sample: QuantitySampleObject) in sample.sourceId }
      Property("device") { (sample: QuantitySampleObject) in sample.device }
      Property("metadata") { (sample: QuantitySampleObject) in sample.metadata }

      AsyncFunction("delete") { (sample: QuantitySampleObject) -> Bool in
        return try await sample.delete()
      }

      Function("toJSON") { (sample: QuantitySampleObject) -> [String: Any] in
        return sample.toJSON()
      }
    }

    Class(CategorySampleObject.self) {
      Property("uuid") { (sample: CategorySampleObject) in sample.uuid }
      Property("categoryType") { (sample: CategorySampleObject) in sample.categoryType }
      Property("value") { (sample: CategorySampleObject) in sample.value }
      Property("startDate") { (sample: CategorySampleObject) in sample.startDate }
      Property("endDate") { (sample: CategorySampleObject) in sample.endDate }
      Property("sourceName") { (sample: CategorySampleObject) in sample.sourceName }
      Property("sourceId") { (sample: CategorySampleObject) in sample.sourceId }
      Property("metadata") { (sample: CategorySampleObject) in sample.metadata }

      AsyncFunction("delete") { (sample: CategorySampleObject) -> Bool in
        return try await sample.delete()
      }

      Function("toJSON") { (sample: CategorySampleObject) -> [String: Any] in
        return sample.toJSON()
      }
    }

    Class(WorkoutSampleObject.self) {
      Property("uuid") { (sample: WorkoutSampleObject) in sample.uuid }
      Property("workoutActivityType") { (sample: WorkoutSampleObject) in sample.workoutActivityType }
      Property("duration") { (sample: WorkoutSampleObject) in sample.duration }
      Property("totalEnergyBurned") { (sample: WorkoutSampleObject) in sample.totalEnergyBurned }
      Property("totalDistance") { (sample: WorkoutSampleObject) in sample.totalDistance }
      Property("startDate") { (sample: WorkoutSampleObject) in sample.startDate }
      Property("endDate") { (sample: WorkoutSampleObject) in sample.endDate }
      Property("sourceName") { (sample: WorkoutSampleObject) in sample.sourceName }
      Property("sourceId") { (sample: WorkoutSampleObject) in sample.sourceId }
      Property("metadata") { (sample: WorkoutSampleObject) in sample.metadata }

      AsyncFunction("delete") { (sample: WorkoutSampleObject) -> Bool in
        return try await sample.delete()
      }

      Function("toJSON") { (sample: WorkoutSampleObject) -> [String: Any] in
        return sample.toJSON()
      }
    }

    Class(HealthKitSubscription.self) {
      Constructor {
        return HealthKitSubscription()
      }

      Property("type") { (sub: HealthKitSubscription) in sub.type }
      Property("isActive") { (sub: HealthKitSubscription) in sub.isActive }
      Property("lastUpdate") { (sub: HealthKitSubscription) in sub.lastUpdate }

      Function("start") { [weak self] (sub: HealthKitSubscription, typeIdentifier: String) in
        try sub.start(typeIdentifier: typeIdentifier) { [weak self] in
          self?.sendEvent("onHealthKitUpdate", [
            "typeIdentifier": typeIdentifier,
            "subscriptionId": ObjectIdentifier(sub).hashValue
          ])
        }
      }

      Function("pause") { (sub: HealthKitSubscription) in
        sub.pause()
      }

      Function("resume") { (sub: HealthKitSubscription) in
        sub.resume()
      }

      Function("unsubscribe") { (sub: HealthKitSubscription) in
        sub.unsubscribe()
      }

      Function("getId") { (sub: HealthKitSubscription) -> Int in
        return ObjectIdentifier(sub).hashValue
      }
    }

    Class(HealthKitAnchor.self) {
      Constructor {
        return HealthKitAnchor()
      }

      Property("type") { (anchor: HealthKitAnchor) in anchor.type }
      Property("kind") { (anchor: HealthKitAnchor) in anchor.kind }
      Property("hasMore") { (anchor: HealthKitAnchor) in anchor.hasMore }

      Function("configure") { (anchor: HealthKitAnchor, typeIdentifier: String, kind: String) in
        anchor.configure(typeIdentifier: typeIdentifier, kind: kind)
      }

      Function("restore") { (anchor: HealthKitAnchor, serialized: String) -> Bool in
        return anchor.restore(from: serialized)
      }

      Function("serialize") { (anchor: HealthKitAnchor) -> String? in
        return anchor.serialize()
      }

      Function("reset") { (anchor: HealthKitAnchor) in
        anchor.reset()
      }

      AsyncFunction("fetchNext") { (anchor: HealthKitAnchor, limit: Int) -> [String: Any] in
        return try await anchor.fetchNext(limit: limit)
      }

      AsyncFunction("fetchNextSamples") { (anchor: HealthKitAnchor, limit: Int) -> [String: Any] in
        return try await anchor.fetchNextSamples(limit: limit)
      }
    }

    Class(HealthKitSampleBuilder.self) {
      Constructor {
        return HealthKitSampleBuilder()
      }

      Function("setQuantityType") { (builder: HealthKitSampleBuilder, identifier: String) in
        builder.setQuantityType(identifier)
      }

      Function("setCategoryType") { (builder: HealthKitSampleBuilder, identifier: String) in
        builder.setCategoryType(identifier)
      }

      Function("setWorkoutType") { (builder: HealthKitSampleBuilder, activityType: String) in
        builder.setWorkoutType(activityType)
      }

      Function("setValue") { (builder: HealthKitSampleBuilder, value: Double) in
        builder.setValue(value)
      }

      Function("setCategoryValue") { (builder: HealthKitSampleBuilder, value: Int) in
        builder.setCategoryValue(value)
      }

      Function("setUnit") { (builder: HealthKitSampleBuilder, unit: String) in
        builder.setUnit(unit)
      }

      Function("setStartDate") { (builder: HealthKitSampleBuilder, dateString: String) in
        builder.setStartDate(dateString)
      }

      Function("setEndDate") { (builder: HealthKitSampleBuilder, dateString: String) in
        builder.setEndDate(dateString)
      }

      Function("setMetadata") { (builder: HealthKitSampleBuilder, metadata: [String: Any]?) in
        builder.setMetadata(metadata)
      }

      Function("setTotalEnergyBurned") { (builder: HealthKitSampleBuilder, value: Double) in
        builder.setTotalEnergyBurned(value)
      }

      Function("setTotalDistance") { (builder: HealthKitSampleBuilder, value: Double) in
        builder.setTotalDistance(value)
      }

      Function("reset") { (builder: HealthKitSampleBuilder) in
        builder.reset()
      }

      AsyncFunction("save") { (builder: HealthKitSampleBuilder) -> [String: Any] in
        return try await builder.save()
      }

      AsyncFunction("saveSample") { (builder: HealthKitSampleBuilder) -> HealthKitSample in
        return try await builder.saveSample()
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────────

    View(ActivityRingView.self) {
      Prop("summary") { (view: ActivityRingView, summary: [String: Any]?) in
        view.setSummary(summary)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Availability
    // ─────────────────────────────────────────────────────────────────────────────

    Function("isAvailable") {
      return HKHealthStore.isHealthDataAvailable()
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Authorization
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("requestAuthorization") { (permissions: HealthKitPermissions) -> [String: Any] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }

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

    AsyncFunction("getAuthorizationStatus") { (dataTypes: [String]) -> [String: String] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }

      var result: [String: String] = [:]
      for type in dataTypes {
        if let objectType = TypeIdentifiers.objectType(for: type) {
          result[type] = authorizationStatusString(store.authorizationStatus(for: objectType))
        }
      }
      return result
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Characteristics
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("getDateOfBirth") { () -> String? in
      guard let store = self.healthStore else { return nil }
      guard let components = try? store.dateOfBirthComponents(),
            let date = Calendar.current.date(from: components) else {
        return nil
      }
      return self.formatDate(date)
    }

    AsyncFunction("getBiologicalSex") { () -> String? in
      guard let store = self.healthStore else { return nil }
      guard let biologicalSex = try? store.biologicalSex().biologicalSex else {
        return nil
      }
      switch biologicalSex {
      case .female: return "female"
      case .male: return "male"
      case .other: return "other"
      case .notSet: return nil
      @unknown default: return nil
      }
    }

    AsyncFunction("getBloodType") { () -> String? in
      guard let store = self.healthStore else { return nil }
      guard let bloodType = try? store.bloodType().bloodType else {
        return nil
      }
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

    AsyncFunction("getFitzpatrickSkinType") { () -> Int? in
      guard let store = self.healthStore else { return nil }
      guard let skinType = try? store.fitzpatrickSkinType().skinType else {
        return nil
      }
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

    AsyncFunction("getWheelchairUse") { () -> Bool? in
      guard let store = self.healthStore else { return nil }
      guard let wheelchairUse = try? store.wheelchairUse().wheelchairUse else {
        return nil
      }
      switch wheelchairUse {
      case .notSet: return nil
      case .no: return false
      case .yes: return true
      @unknown default: return nil
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Quantity Samples
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("queryQuantitySamples") { (typeIdentifier: String, options: QueryOptions?) -> [[String: Any]] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let opts = options ?? QueryOptions()
      let predicate = self.createPredicate(startDate: opts.startDate, endDate: opts.endDate)
      let limit = opts.limit ?? HKObjectQueryNoLimit
      let ascending = opts.ascending ?? false
      let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: ascending)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKSampleQuery(
          sampleType: quantityType,
          predicate: predicate,
          limit: limit,
          sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          let results = (samples as? [HKQuantitySample])?.compactMap { sample -> [String: Any]? in
            return SampleConverters.convertQuantitySample(sample, typeIdentifier: typeIdentifier)
          } ?? []

          continuation.resume(returning: results)
        }
        store.execute(query)
      }
    }

    AsyncFunction("saveQuantitySample") { (typeIdentifier: String, value: Double, unit: String, startDate: String, endDate: String, metadata: [String: Any]?) -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }
      guard let hkUnit = UnitMapping.unit(for: unit) else {
        throw InvalidUnitException(unit)
      }
      guard let start = self.parseDate(startDate),
            let end = self.parseDate(endDate) else {
        throw InvalidDateException()
      }

      let quantity = HKQuantity(unit: hkUnit, doubleValue: value)
      let sample = HKQuantitySample(type: quantityType, quantity: quantity, start: start, end: end, metadata: metadata)

      try await store.save(sample)
      return true
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Category Samples
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("queryCategorySamples") { (typeIdentifier: String, options: QueryOptions?) -> [[String: Any]] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let categoryType = TypeIdentifiers.categoryType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let opts = options ?? QueryOptions()
      let predicate = self.createPredicate(startDate: opts.startDate, endDate: opts.endDate)
      let limit = opts.limit ?? HKObjectQueryNoLimit
      let ascending = opts.ascending ?? false
      let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: ascending)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKSampleQuery(
          sampleType: categoryType,
          predicate: predicate,
          limit: limit,
          sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          let results = (samples as? [HKCategorySample])?.compactMap { sample -> [String: Any]? in
            return SampleConverters.convertCategorySample(sample, typeIdentifier: typeIdentifier)
          } ?? []

          continuation.resume(returning: results)
        }
        store.execute(query)
      }
    }

    AsyncFunction("saveCategorySample") { (typeIdentifier: String, value: Int, startDate: String, endDate: String, metadata: [String: Any]?) -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let categoryType = TypeIdentifiers.categoryType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }
      guard let start = self.parseDate(startDate),
            let end = self.parseDate(endDate) else {
        throw InvalidDateException()
      }

      let sample = HKCategorySample(type: categoryType, value: value, start: start, end: end, metadata: metadata)

      try await store.save(sample)
      return true
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("queryStatistics") { (typeIdentifier: String, aggregations: [String], options: QueryOptions?) -> [String: Any] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let opts = options ?? QueryOptions()
      let predicate = self.createPredicate(startDate: opts.startDate, endDate: opts.endDate)
      let statisticsOptions = self.statisticsOptions(from: aggregations, for: quantityType)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKStatisticsQuery(
          quantityType: quantityType,
          quantitySamplePredicate: predicate,
          options: statisticsOptions
        ) { _, statistics, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          guard let stats = statistics else {
            continuation.resume(returning: [:])
            return
          }

          let result = SampleConverters.convertStatistics(stats, typeIdentifier: typeIdentifier)
          continuation.resume(returning: result)
        }
        store.execute(query)
      }
    }

    AsyncFunction("queryStatisticsCollection") { (typeIdentifier: String, aggregations: [String], options: StatisticsCollectionOptions) -> [[String: Any]] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let predicate = self.createPredicate(startDate: options.startDate, endDate: options.endDate)
      let statisticsOptions = self.statisticsOptions(from: aggregations, for: quantityType)
      let interval = self.dateComponents(for: options.interval)

      guard let startDate = options.startDate.flatMap({ self.parseDate($0) }) ?? Calendar.current.date(byAdding: .day, value: -7, to: Date()),
            let endDate = options.endDate.flatMap({ self.parseDate($0) }) ?? Date() as Date? else {
        throw InvalidDateException()
      }

      let anchorDate = Calendar.current.startOfDay(for: startDate)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKStatisticsCollectionQuery(
          quantityType: quantityType,
          quantitySamplePredicate: predicate,
          options: statisticsOptions,
          anchorDate: anchorDate,
          intervalComponents: interval
        )

        query.initialResultsHandler = { _, collection, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          var results: [[String: Any]] = []
          collection?.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
            let result = SampleConverters.convertStatistics(statistics, typeIdentifier: typeIdentifier)
            results.append(result)
          }

          continuation.resume(returning: results)
        }

        store.execute(query)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Anchored Queries
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("queryQuantitySamplesWithAnchor") { (typeIdentifier: String, anchorString: String?, limit: Int?) -> [String: Any] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      var anchor: HKQueryAnchor? = nil
      if let anchorString = anchorString,
         let anchorData = Data(base64Encoded: anchorString) {
        anchor = try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: anchorData)
      }

      let queryLimit = limit ?? 100

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKAnchoredObjectQuery(
          type: quantityType,
          predicate: nil,
          anchor: anchor,
          limit: queryLimit
        ) { _, samples, deletedObjects, newAnchor, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          let sampleResults = (samples as? [HKQuantitySample])?.compactMap {
            SampleConverters.convertQuantitySample($0, typeIdentifier: typeIdentifier)
          } ?? []

          let deletedResults = deletedObjects?.map { ["uuid": $0.uuid.uuidString] } ?? []

          var newAnchorString: String? = nil
          if let newAnchor = newAnchor,
             let anchorData = try? NSKeyedArchiver.archivedData(withRootObject: newAnchor, requiringSecureCoding: true) {
            newAnchorString = anchorData.base64EncodedString()
          }

          continuation.resume(returning: [
            "samples": sampleResults,
            "deletedObjects": deletedResults,
            "anchor": newAnchorString as Any,
            "hasMore": samples?.count == queryLimit
          ])
        }
        store.execute(query)
      }
    }

    AsyncFunction("queryCategorySamplesWithAnchor") { (typeIdentifier: String, anchorString: String?, limit: Int?) -> [String: Any] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let categoryType = TypeIdentifiers.categoryType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      var anchor: HKQueryAnchor? = nil
      if let anchorString = anchorString,
         let anchorData = Data(base64Encoded: anchorString) {
        anchor = try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: anchorData)
      }

      let queryLimit = limit ?? 100

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKAnchoredObjectQuery(
          type: categoryType,
          predicate: nil,
          anchor: anchor,
          limit: queryLimit
        ) { _, samples, deletedObjects, newAnchor, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          let sampleResults = (samples as? [HKCategorySample])?.compactMap {
            SampleConverters.convertCategorySample($0, typeIdentifier: typeIdentifier)
          } ?? []

          let deletedResults = deletedObjects?.map { ["uuid": $0.uuid.uuidString] } ?? []

          var newAnchorString: String? = nil
          if let newAnchor = newAnchor,
             let anchorData = try? NSKeyedArchiver.archivedData(withRootObject: newAnchor, requiringSecureCoding: true) {
            newAnchorString = anchorData.base64EncodedString()
          }

          continuation.resume(returning: [
            "samples": sampleResults,
            "deletedObjects": deletedResults,
            "anchor": newAnchorString as Any,
            "hasMore": samples?.count == queryLimit
          ])
        }
        store.execute(query)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Workouts
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("queryWorkouts") { (options: QueryOptions?) -> [[String: Any]] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }

      let opts = options ?? QueryOptions()
      let predicate = self.createPredicate(startDate: opts.startDate, endDate: opts.endDate)
      let limit = opts.limit ?? HKObjectQueryNoLimit
      let ascending = opts.ascending ?? false
      let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: ascending)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKSampleQuery(
          sampleType: HKObjectType.workoutType(),
          predicate: predicate,
          limit: limit,
          sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          let results = (samples as? [HKWorkout])?.compactMap { workout -> [String: Any]? in
            return SampleConverters.convertWorkout(workout)
          } ?? []

          continuation.resume(returning: results)
        }
        store.execute(query)
      }
    }

    AsyncFunction("saveWorkout") { (activityType: String, startDate: String, endDate: String, totalEnergyBurned: Double?, totalDistance: Double?, metadata: [String: Any]?) -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let start = self.parseDate(startDate),
            let end = self.parseDate(endDate) else {
        throw InvalidDateException()
      }

      let workoutType = TypeIdentifiers.workoutActivityType(for: activityType)

      var energyBurnedQuantity: HKQuantity? = nil
      if let energy = totalEnergyBurned {
        energyBurnedQuantity = HKQuantity(unit: .kilocalorie(), doubleValue: energy)
      }

      var distanceQuantity: HKQuantity? = nil
      if let distance = totalDistance {
        distanceQuantity = HKQuantity(unit: .meter(), doubleValue: distance)
      }

      let workout = HKWorkout(
        activityType: workoutType,
        start: start,
        end: end,
        duration: end.timeIntervalSince(start),
        totalEnergyBurned: energyBurnedQuantity,
        totalDistance: distanceQuantity,
        metadata: metadata
      )

      try await store.save(workout)
      return true
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Activity Summary
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("queryActivitySummary") { (startDate: String, endDate: String) -> [[String: Any]] in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let start = self.parseDate(startDate),
            let end = self.parseDate(endDate) else {
        throw InvalidDateException()
      }

      let calendar = Calendar.current
      var startComponents = calendar.dateComponents([.year, .month, .day], from: start)
      var endComponents = calendar.dateComponents([.year, .month, .day], from: end)
      startComponents.calendar = calendar
      endComponents.calendar = calendar

      let predicate = HKQuery.predicate(forActivitySummariesBetweenStart: startComponents, end: endComponents)

      return try await withCheckedThrowingContinuation { continuation in
        let query = HKActivitySummaryQuery(predicate: predicate) { _, summaries, error in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          let results = summaries?.map { summary in
            SampleConverters.convertActivitySummary(summary)
          } ?? []

          continuation.resume(returning: results)
        }
        store.execute(query)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Delete
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("deleteSamples") { (typeIdentifier: String, startDate: String, endDate: String) -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let sampleType = TypeIdentifiers.sampleType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let predicate = self.createPredicate(startDate: startDate, endDate: endDate)

      try await store.deleteObjects(of: sampleType, predicate: predicate ?? HKQuery.predicateForSamples(withStart: nil, end: nil, options: []))
      return true
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Subscriptions
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("subscribeToChanges") { (typeIdentifier: String) -> String in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let sampleType = TypeIdentifiers.sampleType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let subscriptionId = UUID().uuidString

      let query = HKObserverQuery(sampleType: sampleType, predicate: nil) { [weak self] _, completionHandler, error in
        if error == nil {
          self?.sendEvent("onHealthKitUpdate", [
            "typeIdentifier": typeIdentifier
          ])
        }
        completionHandler()
      }

      store.execute(query)
      ObserverQueryManager.shared.addQuery(query, id: subscriptionId)

      return subscriptionId
    }

    AsyncFunction("unsubscribe") { (subscriptionId: String) in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }

      if let query = ObserverQueryManager.shared.removeQuery(id: subscriptionId) {
        store.stop(query)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Background Delivery
    // ─────────────────────────────────────────────────────────────────────────────

    AsyncFunction("enableBackgroundDelivery") { (typeIdentifier: String, frequency: String) -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let sampleType = TypeIdentifiers.sampleType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      let updateFrequency: HKUpdateFrequency
      switch frequency {
      case "immediate": updateFrequency = .immediate
      case "hourly": updateFrequency = .hourly
      case "daily": updateFrequency = .daily
      default: updateFrequency = .immediate
      }

      try await store.enableBackgroundDelivery(for: sampleType, frequency: updateFrequency)
      return true
    }

    AsyncFunction("disableBackgroundDelivery") { (typeIdentifier: String) -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }
      guard let sampleType = TypeIdentifiers.sampleType(for: typeIdentifier) else {
        throw InvalidTypeIdentifierException(typeIdentifier)
      }

      try await store.disableBackgroundDelivery(for: sampleType)
      return true
    }

    AsyncFunction("disableAllBackgroundDelivery") { () -> Bool in
      guard let store = self.healthStore else {
        throw HealthKitNotAvailableException()
      }

      try await store.disableAllBackgroundDelivery()
      return true
    }
  }

  // MARK: - Helper Methods

  private func createPredicate(startDate: String?, endDate: String?) -> NSPredicate? {
    let start = startDate.flatMap { parseDate($0) }
    let end = endDate.flatMap { parseDate($0) }

    if start != nil || end != nil {
      return HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
    }
    return nil
  }

  private func statisticsOptions(from aggregations: [String], for quantityType: HKQuantityType) -> HKStatisticsOptions {
    let isCumulative = quantityType.aggregationStyle == .cumulative
    var options: HKStatisticsOptions = []

    for agg in aggregations {
      switch agg {
      case "cumulativeSum", "sum":
        if isCumulative {
          options.insert(.cumulativeSum)
        }
      case "discreteAverage", "average":
        if !isCumulative {
          options.insert(.discreteAverage)
        }
      case "discreteMin", "min":
        if !isCumulative {
          options.insert(.discreteMin)
        }
      case "discreteMax", "max":
        if !isCumulative {
          options.insert(.discreteMax)
        }
      case "mostRecent":
        options.insert(.mostRecent)
      default:
        break
      }
    }

    // Ensure we have at least one valid option based on the type's aggregation style
    if options.isEmpty {
      if isCumulative {
        options.insert(.cumulativeSum)
      } else {
        options.insert(.discreteAverage)
      }
    }

    return options
  }

  private func dateComponents(for interval: String) -> DateComponents {
    switch interval {
    case "hour": return DateComponents(hour: 1)
    case "day": return DateComponents(day: 1)
    case "week": return DateComponents(weekOfYear: 1)
    case "month": return DateComponents(month: 1)
    case "year": return DateComponents(year: 1)
    default: return DateComponents(day: 1)
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
