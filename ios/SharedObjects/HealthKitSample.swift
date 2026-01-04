import ExpoModulesCore
import HealthKit

// MARK: - Base Sample Class

/// Base shared object for HealthKit samples.
/// Holds a reference to the native HKSample for operations like delete.
public class HealthKitSample: SharedObject {
  internal var nativeSample: HKSample?
  internal var sampleUUID: UUID?

  private let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  // MARK: - Common Properties

  var uuid: String {
    return nativeSample?.uuid.uuidString ?? sampleUUID?.uuidString ?? ""
  }

  var startDate: String {
    guard let sample = nativeSample else { return "" }
    return dateFormatter.string(from: sample.startDate)
  }

  var endDate: String {
    guard let sample = nativeSample else { return "" }
    return dateFormatter.string(from: sample.endDate)
  }

  var sourceName: String {
    return nativeSample?.sourceRevision.source.name ?? ""
  }

  var sourceId: String {
    return nativeSample?.sourceRevision.source.bundleIdentifier ?? ""
  }

  var metadata: [String: Any]? {
    guard let meta = nativeSample?.metadata, !meta.isEmpty else { return nil }
    return SampleConverters.convertMetadata(meta)
  }

  // MARK: - Methods

  /// Delete this sample from HealthKit
  func delete() async throws -> Bool {
    guard let sample = nativeSample else {
      throw GenericHealthKitException("Sample not available for deletion")
    }

    guard let store = getHealthStore() else {
      throw HealthKitNotAvailableException()
    }

    try await store.delete(sample)
    nativeSample = nil
    return true
  }

  /// Convert to a plain dictionary (for serialization)
  func toJSON() -> [String: Any] {
    return [:]  // Override in subclasses
  }

  // MARK: - Helpers

  internal func getHealthStore() -> HKHealthStore? {
    guard HKHealthStore.isHealthDataAvailable() else { return nil }
    return HKHealthStore()
  }
}

// MARK: - Quantity Sample

/// Shared object representing a HealthKit quantity sample (steps, heart rate, etc.)
public final class QuantitySampleObject: HealthKitSample {
  private var quantitySample: HKQuantitySample? {
    return nativeSample as? HKQuantitySample
  }

  private var typeId: String = ""
  private var cachedValue: Double = 0
  private var cachedUnit: String = ""

  /// Create from native sample
  static func create(from sample: HKQuantitySample, typeIdentifier: String) -> QuantitySampleObject {
    let obj = QuantitySampleObject()
    obj.nativeSample = sample
    obj.sampleUUID = sample.uuid
    obj.typeId = typeIdentifier

    // Cache value and unit
    let preferredUnit = UnitMapping.preferredUnit(for: typeIdentifier)
    obj.cachedValue = sample.quantity.doubleValue(for: preferredUnit)
    obj.cachedUnit = preferredUnit.unitString

    return obj
  }

  // MARK: - Properties

  var quantityType: String {
    return typeId
  }

  var value: Double {
    return cachedValue
  }

  var unit: String {
    return cachedUnit
  }

  var device: [String: Any]? {
    guard let device = nativeSample?.device else { return nil }
    return SampleConverters.convertDevice(device)
  }

  // MARK: - Methods

  override func toJSON() -> [String: Any] {
    var result: [String: Any] = [
      "uuid": uuid,
      "quantityType": quantityType,
      "value": value,
      "unit": unit,
      "startDate": startDate,
      "endDate": endDate,
      "sourceName": sourceName,
      "sourceId": sourceId,
    ]

    if let device = device {
      result["device"] = device
    }

    if let metadata = metadata {
      result["metadata"] = metadata
    }

    return result
  }
}

// MARK: - Category Sample

/// Shared object representing a HealthKit category sample (sleep, symptoms, etc.)
public final class CategorySampleObject: HealthKitSample {
  private var categorySample: HKCategorySample? {
    return nativeSample as? HKCategorySample
  }

  private var typeId: String = ""
  private var cachedValue: Int = 0

  /// Create from native sample
  static func create(from sample: HKCategorySample, typeIdentifier: String) -> CategorySampleObject {
    let obj = CategorySampleObject()
    obj.nativeSample = sample
    obj.sampleUUID = sample.uuid
    obj.typeId = typeIdentifier
    obj.cachedValue = sample.value
    return obj
  }

  // MARK: - Properties

  var categoryType: String {
    return typeId
  }

  var value: Int {
    return cachedValue
  }

  // MARK: - Methods

  override func toJSON() -> [String: Any] {
    var result: [String: Any] = [
      "uuid": uuid,
      "categoryType": categoryType,
      "value": value,
      "startDate": startDate,
      "endDate": endDate,
      "sourceName": sourceName,
      "sourceId": sourceId,
    ]

    if let metadata = metadata {
      result["metadata"] = metadata
    }

    return result
  }
}

// MARK: - Workout Sample

/// Shared object representing a HealthKit workout
public final class WorkoutSampleObject: HealthKitSample {
  private var workout: HKWorkout? {
    return nativeSample as? HKWorkout
  }

  private var cachedActivityType: String = ""
  private var cachedDuration: Double = 0
  private var cachedEnergyBurned: Double?
  private var cachedDistance: Double?

  /// Create from native sample
  static func create(from workout: HKWorkout) -> WorkoutSampleObject {
    let obj = WorkoutSampleObject()
    obj.nativeSample = workout
    obj.sampleUUID = workout.uuid
    obj.cachedActivityType = TypeIdentifiers.workoutActivityTypeString(for: workout.workoutActivityType)
    obj.cachedDuration = workout.duration

    if let energy = workout.totalEnergyBurned {
      obj.cachedEnergyBurned = energy.doubleValue(for: .kilocalorie())
    }

    if let distance = workout.totalDistance {
      obj.cachedDistance = distance.doubleValue(for: .meter())
    }

    return obj
  }

  // MARK: - Properties

  var workoutActivityType: String {
    return cachedActivityType
  }

  var duration: Double {
    return cachedDuration
  }

  var totalEnergyBurned: Double? {
    return cachedEnergyBurned
  }

  var totalDistance: Double? {
    return cachedDistance
  }

  // MARK: - Methods

  override func toJSON() -> [String: Any] {
    var result: [String: Any] = [
      "uuid": uuid,
      "workoutActivityType": workoutActivityType,
      "duration": duration,
      "startDate": startDate,
      "endDate": endDate,
      "sourceName": sourceName,
      "sourceId": sourceId,
    ]

    if let energy = totalEnergyBurned {
      result["totalEnergyBurned"] = energy
    }

    if let distance = totalDistance {
      result["totalDistance"] = distance
    }

    if let metadata = metadata {
      result["metadata"] = metadata
    }

    return result
  }
}
