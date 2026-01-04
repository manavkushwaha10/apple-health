import ExpoModulesCore
import HealthKit

/// Shared object for building and saving HealthKit samples with a fluent API.
public final class HealthKitSampleBuilder: SharedObject {
  private var typeIdentifier: String?
  private var sampleKind: SampleKind = .quantity
  private var value: Double?
  private var unit: String?
  private var categoryValue: Int?
  private var startDate: Date?
  private var endDate: Date?
  private var metadata: [String: Any]?

  // Workout-specific
  private var workoutActivityType: HKWorkoutActivityType?
  private var totalEnergyBurned: Double?
  private var totalDistance: Double?

  enum SampleKind: String {
    case quantity
    case category
    case workout
  }

  private static let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private static let dateFormatterNoFractional: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
  }()

  private func parseDate(_ dateString: String) -> Date? {
    if let date = Self.dateFormatter.date(from: dateString) {
      return date
    }
    if let date = Self.dateFormatterNoFractional.date(from: dateString) {
      return date
    }
    if let timestamp = Double(dateString), timestamp > 1_000_000_000_000 {
      return Date(timeIntervalSince1970: timestamp / 1000)
    }
    return nil
  }

  // MARK: - Configuration Methods

  func setQuantityType(_ identifier: String) {
    self.typeIdentifier = identifier
    self.sampleKind = .quantity
  }

  func setCategoryType(_ identifier: String) {
    self.typeIdentifier = identifier
    self.sampleKind = .category
  }

  func setWorkoutType(_ activityType: String) {
    self.workoutActivityType = TypeIdentifiers.workoutActivityType(for: activityType)
    self.sampleKind = .workout
  }

  func setValue(_ value: Double) {
    self.value = value
  }

  func setCategoryValue(_ value: Int) {
    self.categoryValue = value
  }

  func setUnit(_ unit: String) {
    self.unit = unit
  }

  func setStartDate(_ dateString: String) {
    self.startDate = parseDate(dateString)
  }

  func setEndDate(_ dateString: String) {
    self.endDate = parseDate(dateString)
  }

  func setMetadata(_ metadata: [String: Any]?) {
    self.metadata = metadata
  }

  func setTotalEnergyBurned(_ value: Double) {
    self.totalEnergyBurned = value
  }

  func setTotalDistance(_ value: Double) {
    self.totalDistance = value
  }

  // MARK: - Reset

  func reset() {
    typeIdentifier = nil
    sampleKind = .quantity
    value = nil
    unit = nil
    categoryValue = nil
    startDate = nil
    endDate = nil
    metadata = nil
    workoutActivityType = nil
    totalEnergyBurned = nil
    totalDistance = nil
  }

  // MARK: - Save Methods

  func save() async throws -> [String: Any] {
    guard let store = getHealthStore() else {
      throw HealthKitNotAvailableException()
    }

    switch sampleKind {
    case .quantity:
      return try await saveQuantitySample(store: store)
    case .category:
      return try await saveCategorySample(store: store)
    case .workout:
      return try await saveWorkout(store: store)
    }
  }

  func saveSample() async throws -> HealthKitSample {
    guard let store = getHealthStore() else {
      throw HealthKitNotAvailableException()
    }

    switch sampleKind {
    case .quantity:
      return try await saveQuantitySampleObject(store: store)
    case .category:
      return try await saveCategorySampleObject(store: store)
    case .workout:
      return try await saveWorkoutSampleObject(store: store)
    }
  }

  // MARK: - Private Save Implementations

  private func saveQuantitySample(store: HKHealthStore) async throws -> [String: Any] {
    guard let typeId = typeIdentifier,
          let quantityType = TypeIdentifiers.quantityType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }
    guard let value = value else {
      throw MissingValueException()
    }
    guard let unitStr = unit,
          let hkUnit = UnitMapping.unit(for: unitStr) else {
      throw InvalidUnitException(unit ?? "nil")
    }

    let start = startDate ?? Date()
    let end = endDate ?? start

    let quantity = HKQuantity(unit: hkUnit, doubleValue: value)
    let sample = HKQuantitySample(
      type: quantityType,
      quantity: quantity,
      start: start,
      end: end,
      metadata: metadata
    )

    try await store.save(sample)

    return SampleConverters.convertQuantitySample(sample, typeIdentifier: typeId)
  }

  private func saveQuantitySampleObject(store: HKHealthStore) async throws -> HealthKitSample {
    guard let typeId = typeIdentifier,
          let quantityType = TypeIdentifiers.quantityType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }
    guard let value = value else {
      throw MissingValueException()
    }
    guard let unitStr = unit,
          let hkUnit = UnitMapping.unit(for: unitStr) else {
      throw InvalidUnitException(unit ?? "nil")
    }

    let start = startDate ?? Date()
    let end = endDate ?? start

    let quantity = HKQuantity(unit: hkUnit, doubleValue: value)
    let sample = HKQuantitySample(
      type: quantityType,
      quantity: quantity,
      start: start,
      end: end,
      metadata: metadata
    )

    try await store.save(sample)

    return QuantitySampleObject.create(from: sample, typeIdentifier: typeId)
  }

  private func saveCategorySample(store: HKHealthStore) async throws -> [String: Any] {
    guard let typeId = typeIdentifier,
          let categoryType = TypeIdentifiers.categoryType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }
    guard let catValue = categoryValue else {
      throw MissingValueException()
    }

    let start = startDate ?? Date()
    let end = endDate ?? start

    let sample = HKCategorySample(
      type: categoryType,
      value: catValue,
      start: start,
      end: end,
      metadata: metadata
    )

    try await store.save(sample)

    return SampleConverters.convertCategorySample(sample, typeIdentifier: typeId)
  }

  private func saveCategorySampleObject(store: HKHealthStore) async throws -> HealthKitSample {
    guard let typeId = typeIdentifier,
          let categoryType = TypeIdentifiers.categoryType(for: typeId) else {
      throw InvalidTypeIdentifierException(typeIdentifier ?? "nil")
    }
    guard let catValue = categoryValue else {
      throw MissingValueException()
    }

    let start = startDate ?? Date()
    let end = endDate ?? start

    let sample = HKCategorySample(
      type: categoryType,
      value: catValue,
      start: start,
      end: end,
      metadata: metadata
    )

    try await store.save(sample)

    return CategorySampleObject.create(from: sample, typeIdentifier: typeId)
  }

  private func saveWorkout(store: HKHealthStore) async throws -> [String: Any] {
    guard let activityType = workoutActivityType else {
      throw InvalidTypeIdentifierException("workout")
    }

    let start = startDate ?? Date()
    let end = endDate ?? start

    var energyQuantity: HKQuantity? = nil
    if let energy = totalEnergyBurned {
      energyQuantity = HKQuantity(unit: .kilocalorie(), doubleValue: energy)
    }

    var distanceQuantity: HKQuantity? = nil
    if let distance = totalDistance {
      distanceQuantity = HKQuantity(unit: .meter(), doubleValue: distance)
    }

    let workout = HKWorkout(
      activityType: activityType,
      start: start,
      end: end,
      duration: end.timeIntervalSince(start),
      totalEnergyBurned: energyQuantity,
      totalDistance: distanceQuantity,
      metadata: metadata
    )

    try await store.save(workout)

    return SampleConverters.convertWorkout(workout)
  }

  private func saveWorkoutSampleObject(store: HKHealthStore) async throws -> HealthKitSample {
    guard let activityType = workoutActivityType else {
      throw InvalidTypeIdentifierException("workout")
    }

    let start = startDate ?? Date()
    let end = endDate ?? start

    var energyQuantity: HKQuantity? = nil
    if let energy = totalEnergyBurned {
      energyQuantity = HKQuantity(unit: .kilocalorie(), doubleValue: energy)
    }

    var distanceQuantity: HKQuantity? = nil
    if let distance = totalDistance {
      distanceQuantity = HKQuantity(unit: .meter(), doubleValue: distance)
    }

    let workout = HKWorkout(
      activityType: activityType,
      start: start,
      end: end,
      duration: end.timeIntervalSince(start),
      totalEnergyBurned: energyQuantity,
      totalDistance: distanceQuantity,
      metadata: metadata
    )

    try await store.save(workout)

    return WorkoutSampleObject.create(from: workout)
  }

  // MARK: - Helper

  private func getHealthStore() -> HKHealthStore? {
    guard HKHealthStore.isHealthDataAvailable() else { return nil }
    return HKHealthStore()
  }
}

// MARK: - Exceptions

internal final class MissingValueException: Exception {
  override var reason: String {
    "Sample value is required but was not set"
  }
}
