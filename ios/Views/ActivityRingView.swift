import ExpoModulesCore
import HealthKit
import HealthKitUI

final class ActivityRingView: ExpoView {
  private let ringView = HKActivityRingView()

  required init(appContext: AppContext?) {
    super.init(appContext: appContext)
    clipsToBounds = true
    addSubview(ringView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    ringView.frame = bounds
  }

  func setSummary(_ summaryDict: [String: Any]?) {
    guard let dict = summaryDict else {
      ringView.setActivitySummary(nil, animated: true)
      return
    }

    let summary = HKActivitySummary()

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

    ringView.setActivitySummary(summary, animated: true)
  }

  private func toDouble(_ value: Any?) -> Double? {
    if let d = value as? Double { return d }
    if let i = value as? Int { return Double(i) }
    if let n = value as? NSNumber { return n.doubleValue }
    return nil
  }
}
