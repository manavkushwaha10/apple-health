import ExpoModulesCore
import HealthKit

/// A shared object for building and executing HealthKit queries.
/// Stays alive across React component lifecycles and can be reused.
public final class HealthKitQuery: SharedObject {
  // Query configuration
  private var typeIdentifier: String?
  private var queryKind: QueryKind = .quantity
  private var startDate: Date?
  private var endDate: Date?
  private var limitValue: Int = HKObjectQueryNoLimit
  private var ascendingValue: Bool = false
  private var aggregations: [String] = []
  private var interval: DateComponents = DateComponents(day: 1)

  private let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  enum QueryKind: String {
    case quantity
    case category
    case workout
    case statistics
    case statisticsCollection
  }

  // MARK: - Builder Methods (called from JS)

  func setType(_ identifier: String, kind: String) {
    self.typeIdentifier = identifier
    self.queryKind = QueryKind(rawValue: kind) ?? .quantity
  }

  func setDateRange(start: String?, end: String?) {
    self.startDate = start.flatMap { parseDate($0) }
    self.endDate = end.flatMap { parseDate($0) }
  }

  func setLimit(_ limit: Int) {
    self.limitValue = limit > 0 ? limit : HKObjectQueryNoLimit
  }

  func setAscending(_ ascending: Bool) {
    self.ascendingValue = ascending
  }

  func setAggregations(_ aggs: [String]) {
    self.aggregations = aggs
  }

  func setInterval(_ intervalString: String) {
    self.interval = dateComponents(for: intervalString)
  }

  // MARK: - Query Execution

  func execute() async throws -> [[String: Any]] {
    guard let store = getHealthStore() else {
      throw HealthKitNotAvailableException()
    }

    switch queryKind {
    case .quantity:
      return try await executeQuantityQuery(store: store)
    case .category:
      return try await executeCategoryQuery(store: store)
    case .workout:
      return try await executeWorkoutQuery(store: store)
    case .statistics, .statisticsCollection:
      throw GenericHealthKitException("Use executeStatistics() for statistics queries")
    }
  }

  func executeStatistics() async throws -> Any {
    guard let store = getHealthStore() else {
      throw HealthKitNotAvailableException()
    }

    switch queryKind {
    case .statistics:
      return try await executeSingleStatistics(store: store)
    case .statisticsCollection:
      return try await executeStatisticsCollection(store: store)
    default:
      throw GenericHealthKitException("Query kind must be 'statistics' or 'statisticsCollection'")
    }
  }

  /// Releases any cached resources (no-op for now, reserved for future use)
  func release() {
    // Reserved for future caching implementation
  }

  // MARK: - Private Query Implementations

  private func executeQuantityQuery(store: HKHealthStore) async throws -> [[String: Any]] {
    guard let typeId = typeIdentifier,
          let quantityType = TypeIdentifiers.quantityType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }

    let predicate = createPredicate()
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: ascendingValue)
    let limit = limitValue

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

        let results = (samples as? [HKQuantitySample])?.compactMap { sample in
          SampleConverters.convertQuantitySample(sample, typeIdentifier: typeId)
        } ?? []

        continuation.resume(returning: results)
      }
      store.execute(query)
    }
  }

  private func executeCategoryQuery(store: HKHealthStore) async throws -> [[String: Any]] {
    guard let typeId = typeIdentifier,
          let categoryType = TypeIdentifiers.categoryType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }

    let predicate = createPredicate()
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: ascendingValue)
    let limit = limitValue

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

        let results = (samples as? [HKCategorySample])?.compactMap { sample in
          SampleConverters.convertCategorySample(sample, typeIdentifier: typeId)
        } ?? []

        continuation.resume(returning: results)
      }
      store.execute(query)
    }
  }

  private func executeWorkoutQuery(store: HKHealthStore) async throws -> [[String: Any]] {
    let predicate = createPredicate()
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: ascendingValue)
    let limit = limitValue

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

        let results = (samples as? [HKWorkout])?.compactMap { workout in
          SampleConverters.convertWorkout(workout)
        } ?? []

        continuation.resume(returning: results)
      }
      store.execute(query)
    }
  }

  private func executeSingleStatistics(store: HKHealthStore) async throws -> [String: Any] {
    guard let typeId = typeIdentifier,
          let quantityType = TypeIdentifiers.quantityType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }

    let predicate = createPredicate()
    let options = statisticsOptions(from: aggregations)

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKStatisticsQuery(
        quantityType: quantityType,
        quantitySamplePredicate: predicate,
        options: options
      ) { _, statistics, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        guard let stats = statistics else {
          continuation.resume(returning: [:])
          return
        }

        let result = SampleConverters.convertStatistics(stats, typeIdentifier: typeId)
        continuation.resume(returning: result)
      }
      store.execute(query)
    }
  }

  private func executeStatisticsCollection(store: HKHealthStore) async throws -> [[String: Any]] {
    guard let typeId = typeIdentifier,
          let quantityType = TypeIdentifiers.quantityType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }

    let predicate = createPredicate()
    let options = statisticsOptions(from: aggregations)

    let queryStartDate = startDate ?? Calendar.current.date(byAdding: .day, value: -7, to: Date())!
    let queryEndDate = endDate ?? Date()
    let anchorDate = Calendar.current.startOfDay(for: queryStartDate)
    let intervalComponents = interval

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKStatisticsCollectionQuery(
        quantityType: quantityType,
        quantitySamplePredicate: predicate,
        options: options,
        anchorDate: anchorDate,
        intervalComponents: intervalComponents
      )

      query.initialResultsHandler = { _, collection, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        var results: [[String: Any]] = []
        collection?.enumerateStatistics(from: queryStartDate, to: queryEndDate) { statistics, _ in
          let result = SampleConverters.convertStatistics(statistics, typeIdentifier: typeId)
          results.append(result)
        }

        continuation.resume(returning: results)
      }

      store.execute(query)
    }
  }

  // MARK: - Helpers

  private func getHealthStore() -> HKHealthStore? {
    guard HKHealthStore.isHealthDataAvailable() else { return nil }
    return HKHealthStore()
  }

  private func createPredicate() -> NSPredicate? {
    if startDate != nil || endDate != nil {
      return HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
    }
    return nil
  }

  private func parseDate(_ dateString: String) -> Date? {
    if let date = dateFormatter.date(from: dateString) {
      return date
    }

    // Try without fractional seconds
    let formatterNoFraction = ISO8601DateFormatter()
    formatterNoFraction.formatOptions = [.withInternetDateTime]
    if let date = formatterNoFraction.date(from: dateString) {
      return date
    }

    // Try Unix timestamp in milliseconds
    if let timestamp = Double(dateString), timestamp > 1_000_000_000_000 {
      return Date(timeIntervalSince1970: timestamp / 1000)
    }

    return nil
  }

  private func statisticsOptions(from aggregations: [String]) -> HKStatisticsOptions {
    var options: HKStatisticsOptions = []
    for agg in aggregations {
      switch agg {
      case "cumulativeSum", "sum": options.insert(.cumulativeSum)
      case "discreteAverage", "average": options.insert(.discreteAverage)
      case "discreteMin", "min": options.insert(.discreteMin)
      case "discreteMax", "max": options.insert(.discreteMax)
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
}

// MARK: - Generic Exception

internal final class GenericHealthKitException: GenericException<String> {
  override var reason: String {
    param
  }
}
