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

    if let activeEnergyBurned = dict["activeEnergyBurned"] as? Double {
      summary.activeEnergyBurned = HKQuantity(unit: .kilocalorie(), doubleValue: activeEnergyBurned)
    }
    if let activeEnergyBurnedGoal = dict["activeEnergyBurnedGoal"] as? Double {
      summary.activeEnergyBurnedGoal = HKQuantity(unit: .kilocalorie(), doubleValue: activeEnergyBurnedGoal)
    }
    if let appleExerciseTime = dict["appleExerciseTime"] as? Double {
      summary.appleExerciseTime = HKQuantity(unit: .minute(), doubleValue: appleExerciseTime)
    }
    if let appleExerciseTimeGoal = dict["appleExerciseTimeGoal"] as? Double {
      summary.appleExerciseTimeGoal = HKQuantity(unit: .minute(), doubleValue: appleExerciseTimeGoal)
    }
    if let appleStandHours = dict["appleStandHours"] as? Double {
      summary.appleStandHours = HKQuantity(unit: .count(), doubleValue: appleStandHours)
    }
    if let appleStandHoursGoal = dict["appleStandHoursGoal"] as? Double {
      summary.appleStandHoursGoal = HKQuantity(unit: .count(), doubleValue: appleStandHoursGoal)
    }

    ringView.setActivitySummary(summary, animated: true)
  }
}
