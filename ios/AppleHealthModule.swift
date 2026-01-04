import ExpoModulesCore
import HealthKit
import HealthKitUI

public class AppleHealthModule: Module {
  private lazy var healthStore: HKHealthStore? = {
    guard HKHealthStore.isHealthDataAvailable() else { return nil }
    return HKHealthStore()
  }()

  private let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  public func definition() -> ModuleDefinition {
    Name("AppleHealth")

    Events("onHealthKitUpdate", "onBackgroundDelivery")

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
      return self.dateFormatter.string(from: date)
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
      guard let start = self.dateFormatter.date(from: startDate),
            let end = self.dateFormatter.date(from: endDate) else {
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
      guard let start = self.dateFormatter.date(from: startDate),
            let end = self.dateFormatter.date(from: endDate) else {
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
      let statisticsOptions = self.statisticsOptions(from: aggregations)

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
      let statisticsOptions = self.statisticsOptions(from: aggregations)
      let interval = self.dateComponents(for: options.interval)

      guard let startDate = options.startDate.flatMap({ self.dateFormatter.date(from: $0) }) ?? Calendar.current.date(byAdding: .day, value: -7, to: Date()),
            let endDate = options.endDate.flatMap({ self.dateFormatter.date(from: $0) }) ?? Date() as Date? else {
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
      guard let start = self.dateFormatter.date(from: startDate),
            let end = self.dateFormatter.date(from: endDate) else {
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
      guard let start = self.dateFormatter.date(from: startDate),
            let end = self.dateFormatter.date(from: endDate) else {
        throw InvalidDateException()
      }

      let calendar = Calendar.current
      let startComponents = calendar.dateComponents([.year, .month, .day], from: start)
      let endComponents = calendar.dateComponents([.year, .month, .day], from: end)

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
    let start = startDate.flatMap { dateFormatter.date(from: $0) }
    let end = endDate.flatMap { dateFormatter.date(from: $0) }

    if start != nil || end != nil {
      return HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
    }
    return nil
  }

  private func statisticsOptions(from aggregations: [String]) -> HKStatisticsOptions {
    var options: HKStatisticsOptions = []
    for agg in aggregations {
      switch agg {
      case "cumulativeSum": options.insert(.cumulativeSum)
      case "discreteAverage": options.insert(.discreteAverage)
      case "discreteMin": options.insert(.discreteMin)
      case "discreteMax": options.insert(.discreteMax)
      case "mostRecent": options.insert(.mostRecent)
      default: break
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
