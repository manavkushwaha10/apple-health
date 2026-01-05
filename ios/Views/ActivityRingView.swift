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

  func setSummary(_ summary: HKActivitySummary?) {
    ringView.setActivitySummary(summary, animated: true)
  }
}
