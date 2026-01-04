import HealthKit

struct SampleConverters {

  private static let dateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  // MARK: - Quantity Sample

  static func convertQuantitySample(_ sample: HKQuantitySample, typeIdentifier: String) -> [String: Any] {
    let preferredUnit = UnitMapping.preferredUnit(for: typeIdentifier)
    let value = sample.quantity.doubleValue(for: preferredUnit)

    var result: [String: Any] = [
      "uuid": sample.uuid.uuidString,
      "quantityType": typeIdentifier,
      "value": value,
      "unit": preferredUnit.unitString,
      "startDate": dateFormatter.string(from: sample.startDate),
      "endDate": dateFormatter.string(from: sample.endDate),
      "sourceName": sample.sourceRevision.source.name,
      "sourceId": sample.sourceRevision.source.bundleIdentifier,
    ]

    if let device = sample.device {
      result["device"] = convertDevice(device)
    }

    if let metadata = sample.metadata, !metadata.isEmpty {
      result["metadata"] = convertMetadata(metadata)
    }

    return result
  }

  // MARK: - Category Sample

  static func convertCategorySample(_ sample: HKCategorySample, typeIdentifier: String) -> [String: Any] {
    var result: [String: Any] = [
      "uuid": sample.uuid.uuidString,
      "categoryType": typeIdentifier,
      "value": sample.value,
      "startDate": dateFormatter.string(from: sample.startDate),
      "endDate": dateFormatter.string(from: sample.endDate),
      "sourceName": sample.sourceRevision.source.name,
      "sourceId": sample.sourceRevision.source.bundleIdentifier,
    ]

    if let metadata = sample.metadata, !metadata.isEmpty {
      result["metadata"] = convertMetadata(metadata)
    }

    return result
  }

  // MARK: - Workout

  static func convertWorkout(_ workout: HKWorkout) -> [String: Any] {
    var result: [String: Any] = [
      "uuid": workout.uuid.uuidString,
      "workoutActivityType": TypeIdentifiers.workoutActivityTypeString(for: workout.workoutActivityType),
      "duration": workout.duration,
      "startDate": dateFormatter.string(from: workout.startDate),
      "endDate": dateFormatter.string(from: workout.endDate),
      "sourceName": workout.sourceRevision.source.name,
      "sourceId": workout.sourceRevision.source.bundleIdentifier,
    ]

    if let totalEnergyBurned = workout.totalEnergyBurned {
      result["totalEnergyBurned"] = totalEnergyBurned.doubleValue(for: .kilocalorie())
    }

    if let totalDistance = workout.totalDistance {
      result["totalDistance"] = totalDistance.doubleValue(for: .meter())
    }

    if let metadata = workout.metadata, !metadata.isEmpty {
      result["metadata"] = convertMetadata(metadata)
    }

    return result
  }

  // MARK: - Statistics

  static func convertStatistics(_ statistics: HKStatistics, typeIdentifier: String) -> [String: Any] {
    let preferredUnit = UnitMapping.preferredUnit(for: typeIdentifier)

    var result: [String: Any] = [
      "quantityType": typeIdentifier,
      "startDate": dateFormatter.string(from: statistics.startDate),
      "endDate": dateFormatter.string(from: statistics.endDate),
      "unit": preferredUnit.unitString,
    ]

    if let sumQuantity = statistics.sumQuantity() {
      result["sumQuantity"] = sumQuantity.doubleValue(for: preferredUnit)
    }

    if let averageQuantity = statistics.averageQuantity() {
      result["averageQuantity"] = averageQuantity.doubleValue(for: preferredUnit)
    }

    if let minimumQuantity = statistics.minimumQuantity() {
      result["minimumQuantity"] = minimumQuantity.doubleValue(for: preferredUnit)
    }

    if let maximumQuantity = statistics.maximumQuantity() {
      result["maximumQuantity"] = maximumQuantity.doubleValue(for: preferredUnit)
    }

    if let mostRecentQuantity = statistics.mostRecentQuantity() {
      result["mostRecentQuantity"] = mostRecentQuantity.doubleValue(for: preferredUnit)
    }

    return result
  }

  // MARK: - Device

  static func convertDevice(_ device: HKDevice) -> [String: Any] {
    var result: [String: Any] = [:]

    if let name = device.name {
      result["name"] = name
    }
    if let manufacturer = device.manufacturer {
      result["manufacturer"] = manufacturer
    }
    if let model = device.model {
      result["model"] = model
    }
    if let hardwareVersion = device.hardwareVersion {
      result["hardwareVersion"] = hardwareVersion
    }
    if let firmwareVersion = device.firmwareVersion {
      result["firmwareVersion"] = firmwareVersion
    }
    if let softwareVersion = device.softwareVersion {
      result["softwareVersion"] = softwareVersion
    }
    if let localIdentifier = device.localIdentifier {
      result["localIdentifier"] = localIdentifier
    }
    if let udiDeviceIdentifier = device.udiDeviceIdentifier {
      result["udiDeviceIdentifier"] = udiDeviceIdentifier
    }

    return result
  }

  // MARK: - Activity Summary

  static func convertActivitySummary(_ summary: HKActivitySummary) -> [String: Any] {
    let calendar = Calendar.current
    let dateComponents = summary.dateComponents(for: calendar)

    return [
      "dateComponents": [
        "year": dateComponents.year ?? 0,
        "month": dateComponents.month ?? 0,
        "day": dateComponents.day ?? 0
      ],
      "activeEnergyBurned": summary.activeEnergyBurned.doubleValue(for: .kilocalorie()),
      "activeEnergyBurnedGoal": summary.activeEnergyBurnedGoal.doubleValue(for: .kilocalorie()),
      "appleExerciseTime": summary.appleExerciseTime.doubleValue(for: .minute()),
      "appleExerciseTimeGoal": summary.appleExerciseTimeGoal.doubleValue(for: .minute()),
      "appleStandHours": summary.appleStandHours.doubleValue(for: .count()),
      "appleStandHoursGoal": summary.appleStandHoursGoal.doubleValue(for: .count())
    ]
  }

  // MARK: - Metadata

  static func convertMetadata(_ metadata: [String: Any]) -> [String: Any] {
    var result: [String: Any] = [:]

    for (key, value) in metadata {
      if let dateValue = value as? Date {
        result[key] = dateFormatter.string(from: dateValue)
      } else if let quantityValue = value as? HKQuantity {
        // Try to extract a reasonable double value
        if quantityValue.is(compatibleWith: .count()) {
          result[key] = quantityValue.doubleValue(for: .count())
        } else if quantityValue.is(compatibleWith: .meter()) {
          result[key] = quantityValue.doubleValue(for: .meter())
        } else if quantityValue.is(compatibleWith: .second()) {
          result[key] = quantityValue.doubleValue(for: .second())
        } else {
          result[key] = String(describing: quantityValue)
        }
      } else if let stringValue = value as? String {
        result[key] = stringValue
      } else if let numberValue = value as? NSNumber {
        result[key] = numberValue
      } else if let boolValue = value as? Bool {
        result[key] = boolValue
      } else {
        result[key] = String(describing: value)
      }
    }

    return result
  }
}
