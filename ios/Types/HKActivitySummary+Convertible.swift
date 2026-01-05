import ExpoModulesCore
import HealthKit

extension HKActivitySummary: @retroactive Convertible, AnyArgument {
  public static func convert(from value: Any?, appContext: AppContext) throws -> Self {
    guard let dict = value as? [String: Any] else {
      throw NotADictionaryException()
    }

    let summary = Self()

    if let value = toDouble(dict["activeEnergyBurned"]) {
      summary.activeEnergyBurned = HKQuantity(unit: .kilocalorie(), doubleValue: value)
    }
    if let value = toDouble(dict["activeEnergyBurnedGoal"]) {
      summary.activeEnergyBurnedGoal = HKQuantity(unit: .kilocalorie(), doubleValue: value)
    }
    if let value = toDouble(dict["appleExerciseTime"]) {
      summary.appleExerciseTime = HKQuantity(unit: .minute(), doubleValue: value)
    }
    if let value = toDouble(dict["appleExerciseTimeGoal"]) {
      summary.appleExerciseTimeGoal = HKQuantity(unit: .minute(), doubleValue: value)
    }
    if let value = toDouble(dict["appleStandHours"]) {
      summary.appleStandHours = HKQuantity(unit: .count(), doubleValue: value)
    }
    if let value = toDouble(dict["appleStandHoursGoal"]) {
      summary.appleStandHoursGoal = HKQuantity(unit: .count(), doubleValue: value)
    }

    return summary
  }

  private static func toDouble(_ value: Any?) -> Double? {
    if let d = value as? Double { return d }
    if let i = value as? Int { return Double(i) }
    if let n = value as? NSNumber { return n.doubleValue }
    return nil
  }
}
