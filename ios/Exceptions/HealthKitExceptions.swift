import ExpoModulesCore

internal final class HealthKitNotAvailableException: Exception {
  override var reason: String {
    "HealthKit is not available on this device"
  }
}

internal final class InvalidTypeIdentifierException: GenericException<String> {
  override var reason: String {
    "Invalid HealthKit type identifier: \(param)"
  }
}

internal final class InvalidUnitException: GenericException<String> {
  override var reason: String {
    "Invalid unit: \(param)"
  }
}

internal final class InvalidDateException: Exception {
  override var reason: String {
    "Invalid date format. Expected ISO8601 format."
  }
}

internal final class NotADictionaryException: Exception {
  override var reason: String {
    "Given value is not a dictionary"
  }
}
