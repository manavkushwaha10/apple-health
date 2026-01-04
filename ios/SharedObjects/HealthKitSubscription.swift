import ExpoModulesCore
import HealthKit

/// A shared object for managing HealthKit observer queries.
/// Provides lifecycle management and automatic cleanup when deallocated.
public final class HealthKitSubscription: SharedObject {
  private var observerQuery: HKObserverQuery?
  private var healthStore: HKHealthStore?
  private var typeIdentifier: String = ""
  private var isActiveValue: Bool = false
  private var lastUpdateValue: Date?
  private var isPaused: Bool = false

  private let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  // Callback for updates - stored to allow pause/resume
  private var updateHandler: (() -> Void)?

  // MARK: - Properties

  var type: String {
    return typeIdentifier
  }

  var isActive: Bool {
    return isActiveValue && !isPaused
  }

  var lastUpdate: String? {
    guard let date = lastUpdateValue else { return nil }
    return dateFormatter.string(from: date)
  }

  // MARK: - Lifecycle

  /// Start observing changes for the specified type
  func start(typeIdentifier: String, onUpdate: @escaping () -> Void) throws {
    guard HKHealthStore.isHealthDataAvailable() else {
      throw HealthKitNotAvailableException()
    }

    guard let sampleType = TypeIdentifiers.sampleType(for: typeIdentifier) else {
      throw InvalidTypeIdentifierException(typeIdentifier)
    }

    self.typeIdentifier = typeIdentifier
    self.updateHandler = onUpdate
    self.healthStore = HKHealthStore()

    let query = HKObserverQuery(sampleType: sampleType, predicate: nil) { [weak self] _, completionHandler, error in
      guard let self = self, error == nil else {
        completionHandler()
        return
      }

      self.lastUpdateValue = Date()

      if !self.isPaused {
        self.updateHandler?()
      }

      completionHandler()
    }

    healthStore?.execute(query)
    self.observerQuery = query
    self.isActiveValue = true
  }

  /// Pause the subscription (stops callbacks but keeps query alive)
  func pause() {
    isPaused = true
  }

  /// Resume the subscription after pausing
  func resume() {
    isPaused = false
  }

  /// Stop the subscription and release resources
  func unsubscribe() {
    if let query = observerQuery, let store = healthStore {
      store.stop(query)
    }
    observerQuery = nil
    healthStore = nil
    isActiveValue = false
    updateHandler = nil
  }

  // MARK: - Cleanup

  deinit {
    unsubscribe()
  }
}

// MARK: - Anchor Query

/// A shared object for managing anchored HealthKit queries.
/// Maintains query state for incremental syncing across sessions.
public final class HealthKitAnchor: SharedObject {
  private var typeIdentifier: String = ""
  private var queryKind: String = "quantity"
  private var anchor: HKQueryAnchor?
  private var hasMoreValue: Bool = false

  private let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  // MARK: - Properties

  var type: String {
    return typeIdentifier
  }

  var kind: String {
    return queryKind
  }

  var hasMore: Bool {
    return hasMoreValue
  }

  // MARK: - Configuration

  func configure(typeIdentifier: String, kind: String) {
    self.typeIdentifier = typeIdentifier
    self.queryKind = kind
  }

  /// Restore anchor state from a serialized string
  func restore(from serialized: String) -> Bool {
    guard let anchorData = Data(base64Encoded: serialized),
          let restoredAnchor = try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: anchorData) else {
      return false
    }
    self.anchor = restoredAnchor
    return true
  }

  /// Serialize the current anchor state for persistence
  func serialize() -> String? {
    guard let anchor = anchor,
          let anchorData = try? NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true) else {
      return nil
    }
    return anchorData.base64EncodedString()
  }

  /// Reset the anchor to start fresh
  func reset() {
    anchor = nil
    hasMoreValue = false
  }

  // MARK: - Query Execution

  /// Fetch the next batch of samples
  func fetchNext(limit: Int) async throws -> [String: Any] {
    guard HKHealthStore.isHealthDataAvailable() else {
      throw HealthKitNotAvailableException()
    }

    let store = HKHealthStore()

    switch queryKind {
    case "quantity":
      return try await fetchQuantitySamples(store: store, limit: limit)
    case "category":
      return try await fetchCategorySamples(store: store, limit: limit)
    default:
      throw GenericHealthKitException("Unsupported query kind for anchor: \(queryKind)")
    }
  }

  /// Fetch the next batch as shared sample objects
  func fetchNextSamples(limit: Int) async throws -> [String: Any] {
    guard HKHealthStore.isHealthDataAvailable() else {
      throw HealthKitNotAvailableException()
    }

    let store = HKHealthStore()

    switch queryKind {
    case "quantity":
      return try await fetchQuantitySampleObjects(store: store, limit: limit)
    case "category":
      return try await fetchCategorySampleObjects(store: store, limit: limit)
    default:
      throw GenericHealthKitException("Unsupported query kind for anchor: \(queryKind)")
    }
  }

  // MARK: - Private Query Implementations

  private func fetchQuantitySamples(store: HKHealthStore, limit: Int) async throws -> [String: Any] {
    guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
      throw InvalidTypeIdentifierException(typeIdentifier)
    }

    let typeId = typeIdentifier

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKAnchoredObjectQuery(
        type: quantityType,
        predicate: nil,
        anchor: anchor,
        limit: limit
      ) { [weak self] _, samples, deletedObjects, newAnchor, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        self?.anchor = newAnchor
        self?.hasMoreValue = (samples?.count ?? 0) == limit

        let sampleResults = (samples as? [HKQuantitySample])?.compactMap {
          SampleConverters.convertQuantitySample($0, typeIdentifier: typeId)
        } ?? []

        let deletedResults = deletedObjects?.map { ["uuid": $0.uuid.uuidString] } ?? []

        continuation.resume(returning: [
          "samples": sampleResults,
          "deletedObjects": deletedResults,
          "hasMore": self?.hasMoreValue ?? false
        ])
      }
      store.execute(query)
    }
  }

  private func fetchCategorySamples(store: HKHealthStore, limit: Int) async throws -> [String: Any] {
    guard let categoryType = TypeIdentifiers.categoryType(for: typeIdentifier) else {
      throw InvalidTypeIdentifierException(typeIdentifier)
    }

    let typeId = typeIdentifier

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKAnchoredObjectQuery(
        type: categoryType,
        predicate: nil,
        anchor: anchor,
        limit: limit
      ) { [weak self] _, samples, deletedObjects, newAnchor, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        self?.anchor = newAnchor
        self?.hasMoreValue = (samples?.count ?? 0) == limit

        let sampleResults = (samples as? [HKCategorySample])?.compactMap {
          SampleConverters.convertCategorySample($0, typeIdentifier: typeId)
        } ?? []

        let deletedResults = deletedObjects?.map { ["uuid": $0.uuid.uuidString] } ?? []

        continuation.resume(returning: [
          "samples": sampleResults,
          "deletedObjects": deletedResults,
          "hasMore": self?.hasMoreValue ?? false
        ])
      }
      store.execute(query)
    }
  }

  private func fetchQuantitySampleObjects(store: HKHealthStore, limit: Int) async throws -> [String: Any] {
    guard let quantityType = TypeIdentifiers.quantityType(for: typeIdentifier) else {
      throw InvalidTypeIdentifierException(typeIdentifier)
    }

    let typeId = typeIdentifier

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKAnchoredObjectQuery(
        type: quantityType,
        predicate: nil,
        anchor: anchor,
        limit: limit
      ) { [weak self] _, samples, deletedObjects, newAnchor, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        self?.anchor = newAnchor
        self?.hasMoreValue = (samples?.count ?? 0) == limit

        let sampleResults: [HealthKitSample] = (samples as? [HKQuantitySample])?.map {
          QuantitySampleObject.create(from: $0, typeIdentifier: typeId)
        } ?? []

        let deletedResults = deletedObjects?.map { ["uuid": $0.uuid.uuidString] } ?? []

        continuation.resume(returning: [
          "samples": sampleResults,
          "deletedObjects": deletedResults,
          "hasMore": self?.hasMoreValue ?? false
        ])
      }
      store.execute(query)
    }
  }

  private func fetchCategorySampleObjects(store: HKHealthStore, limit: Int) async throws -> [String: Any] {
    guard let categoryType = TypeIdentifiers.categoryType(for: typeIdentifier) else {
      throw InvalidTypeIdentifierException(typeIdentifier)
    }

    let typeId = typeIdentifier

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKAnchoredObjectQuery(
        type: categoryType,
        predicate: nil,
        anchor: anchor,
        limit: limit
      ) { [weak self] _, samples, deletedObjects, newAnchor, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        self?.anchor = newAnchor
        self?.hasMoreValue = (samples?.count ?? 0) == limit

        let sampleResults: [HealthKitSample] = (samples as? [HKCategorySample])?.map {
          CategorySampleObject.create(from: $0, typeIdentifier: typeId)
        } ?? []

        let deletedResults = deletedObjects?.map { ["uuid": $0.uuid.uuidString] } ?? []

        continuation.resume(returning: [
          "samples": sampleResults,
          "deletedObjects": deletedResults,
          "hasMore": self?.hasMoreValue ?? false
        ])
      }
      store.execute(query)
    }
  }
}
