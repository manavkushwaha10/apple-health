import HealthKit

struct TypeIdentifiers {

  // MARK: - Quantity Types

  static func quantityType(for identifier: String) -> HKQuantityType? {
    guard let hkIdentifier = quantityTypeIdentifier(for: identifier) else {
      return nil
    }
    return HKQuantityType.quantityType(forIdentifier: hkIdentifier)
  }

  private static func quantityTypeIdentifier(for identifier: String) -> HKQuantityTypeIdentifier? {
    // Base types available in iOS 15.1+
    var mapping: [String: HKQuantityTypeIdentifier] = [
      // Body Measurements
      "bodyMassIndex": .bodyMassIndex,
      "bodyFatPercentage": .bodyFatPercentage,
      "height": .height,
      "bodyMass": .bodyMass,
      "leanBodyMass": .leanBodyMass,
      "waistCircumference": .waistCircumference,

      // Fitness
      "stepCount": .stepCount,
      "distanceWalkingRunning": .distanceWalkingRunning,
      "distanceCycling": .distanceCycling,
      "distanceWheelchair": .distanceWheelchair,
      "distanceSwimming": .distanceSwimming,
      "distanceDownhillSnowSports": .distanceDownhillSnowSports,
      "basalEnergyBurned": .basalEnergyBurned,
      "activeEnergyBurned": .activeEnergyBurned,
      "flightsClimbed": .flightsClimbed,
      "appleExerciseTime": .appleExerciseTime,
      "appleMoveTime": .appleMoveTime,
      "appleStandTime": .appleStandTime,
      "vo2Max": .vo2Max,
      "walkingSpeed": .walkingSpeed,
      "walkingDoubleSupportPercentage": .walkingDoubleSupportPercentage,
      "walkingAsymmetryPercentage": .walkingAsymmetryPercentage,
      "walkingStepLength": .walkingStepLength,
      "sixMinuteWalkTestDistance": .sixMinuteWalkTestDistance,
      "stairAscentSpeed": .stairAscentSpeed,
      "stairDescentSpeed": .stairDescentSpeed,

      // Vitals
      "heartRate": .heartRate,
      "bodyTemperature": .bodyTemperature,
      "basalBodyTemperature": .basalBodyTemperature,
      "bloodPressureSystolic": .bloodPressureSystolic,
      "bloodPressureDiastolic": .bloodPressureDiastolic,
      "respiratoryRate": .respiratoryRate,
      "restingHeartRate": .restingHeartRate,
      "walkingHeartRateAverage": .walkingHeartRateAverage,
      "heartRateVariabilitySDNN": .heartRateVariabilitySDNN,
      "oxygenSaturation": .oxygenSaturation,
      "peripheralPerfusionIndex": .peripheralPerfusionIndex,

      // Results
      "bloodGlucose": .bloodGlucose,
      "electrodermalActivity": .electrodermalActivity,
      "forcedExpiratoryVolume1": .forcedExpiratoryVolume1,
      "forcedVitalCapacity": .forcedVitalCapacity,
      "inhalerUsage": .inhalerUsage,
      "insulinDelivery": .insulinDelivery,
      "numberOfTimesFallen": .numberOfTimesFallen,
      "peakExpiratoryFlowRate": .peakExpiratoryFlowRate,
      "bloodAlcoholContent": .bloodAlcoholContent,

      // Nutrition
      "dietaryFatTotal": .dietaryFatTotal,
      "dietaryFatPolyunsaturated": .dietaryFatPolyunsaturated,
      "dietaryFatMonounsaturated": .dietaryFatMonounsaturated,
      "dietaryFatSaturated": .dietaryFatSaturated,
      "dietaryCholesterol": .dietaryCholesterol,
      "dietarySodium": .dietarySodium,
      "dietaryCarbohydrates": .dietaryCarbohydrates,
      "dietaryFiber": .dietaryFiber,
      "dietarySugar": .dietarySugar,
      "dietaryEnergyConsumed": .dietaryEnergyConsumed,
      "dietaryProtein": .dietaryProtein,
      "dietaryVitaminA": .dietaryVitaminA,
      "dietaryVitaminB6": .dietaryVitaminB6,
      "dietaryVitaminB12": .dietaryVitaminB12,
      "dietaryVitaminC": .dietaryVitaminC,
      "dietaryVitaminD": .dietaryVitaminD,
      "dietaryVitaminE": .dietaryVitaminE,
      "dietaryVitaminK": .dietaryVitaminK,
      "dietaryCalcium": .dietaryCalcium,
      "dietaryIron": .dietaryIron,
      "dietaryThiamin": .dietaryThiamin,
      "dietaryRiboflavin": .dietaryRiboflavin,
      "dietaryNiacin": .dietaryNiacin,
      "dietaryFolate": .dietaryFolate,
      "dietaryBiotin": .dietaryBiotin,
      "dietaryPantothenicAcid": .dietaryPantothenicAcid,
      "dietaryPhosphorus": .dietaryPhosphorus,
      "dietaryIodine": .dietaryIodine,
      "dietaryMagnesium": .dietaryMagnesium,
      "dietaryZinc": .dietaryZinc,
      "dietarySelenium": .dietarySelenium,
      "dietaryCopper": .dietaryCopper,
      "dietaryManganese": .dietaryManganese,
      "dietaryChromium": .dietaryChromium,
      "dietaryMolybdenum": .dietaryMolybdenum,
      "dietaryChloride": .dietaryChloride,
      "dietaryPotassium": .dietaryPotassium,
      "dietaryCaffeine": .dietaryCaffeine,
      "dietaryWater": .dietaryWater,

      // Other
      "uvExposure": .uvExposure,
      "environmentalAudioExposure": .environmentalAudioExposure,
      "headphoneAudioExposure": .headphoneAudioExposure,
      "numberOfAlcoholicBeverages": .numberOfAlcoholicBeverages,
    ]

    // iOS 16.0+ types
    if #available(iOS 16.0, *) {
      mapping["runningStrideLength"] = .runningStrideLength
      mapping["runningVerticalOscillation"] = .runningVerticalOscillation
      mapping["runningGroundContactTime"] = .runningGroundContactTime
      mapping["runningPower"] = .runningPower
      mapping["runningSpeed"] = .runningSpeed
      mapping["heartRateRecoveryOneMinute"] = .heartRateRecoveryOneMinute
      mapping["atrialFibrillationBurden"] = .atrialFibrillationBurden
      mapping["underwaterDepth"] = .underwaterDepth
      mapping["waterTemperature"] = .waterTemperature
      mapping["appleSleepingWristTemperature"] = .appleSleepingWristTemperature
    }

    // iOS 17.0+ types
    if #available(iOS 17.0, *) {
      mapping["physicalEffort"] = .physicalEffort
      mapping["timeInDaylight"] = .timeInDaylight
    }

    return mapping[identifier]
  }

  // MARK: - Category Types

  static func categoryType(for identifier: String) -> HKCategoryType? {
    guard let hkIdentifier = categoryTypeIdentifier(for: identifier) else {
      return nil
    }
    return HKCategoryType.categoryType(forIdentifier: hkIdentifier)
  }

  private static func categoryTypeIdentifier(for identifier: String) -> HKCategoryTypeIdentifier? {
    // Base types available in iOS 15.1+
    var mapping: [String: HKCategoryTypeIdentifier] = [
      // Sleep
      "sleepAnalysis": .sleepAnalysis,

      // Activity
      "appleStandHour": .appleStandHour,
      "lowCardioFitnessEvent": .lowCardioFitnessEvent,

      // Reproductive Health
      "menstrualFlow": .menstrualFlow,
      "intermenstrualBleeding": .intermenstrualBleeding,
      "cervicalMucusQuality": .cervicalMucusQuality,
      "ovulationTestResult": .ovulationTestResult,
      "pregnancy": .pregnancy,
      "pregnancyTestResult": .pregnancyTestResult,
      "lactation": .lactation,
      "contraceptive": .contraceptive,
      "sexualActivity": .sexualActivity,

      // Mindfulness
      "mindfulSession": .mindfulSession,

      // Heart
      "highHeartRateEvent": .highHeartRateEvent,
      "lowHeartRateEvent": .lowHeartRateEvent,
      "irregularHeartRhythmEvent": .irregularHeartRhythmEvent,

      // Hearing
      "environmentalAudioExposureEvent": .environmentalAudioExposureEvent,
      "headphoneAudioExposureEvent": .headphoneAudioExposureEvent,

      // Other
      "toothbrushingEvent": .toothbrushingEvent,
      "handwashingEvent": .handwashingEvent,

      // Symptoms
      "abdominalCramps": .abdominalCramps,
      "acne": .acne,
      "appetiteChanges": .appetiteChanges,
      "bladderIncontinence": .bladderIncontinence,
      "bloating": .bloating,
      "breastPain": .breastPain,
      "chestTightnessOrPain": .chestTightnessOrPain,
      "chills": .chills,
      "constipation": .constipation,
      "coughing": .coughing,
      "diarrhea": .diarrhea,
      "dizziness": .dizziness,
      "drySkin": .drySkin,
      "fainting": .fainting,
      "fatigue": .fatigue,
      "fever": .fever,
      "generalizedBodyAche": .generalizedBodyAche,
      "hairLoss": .hairLoss,
      "headache": .headache,
      "heartburn": .heartburn,
      "hotFlashes": .hotFlashes,
      "lossOfSmell": .lossOfSmell,
      "lossOfTaste": .lossOfTaste,
      "lowerBackPain": .lowerBackPain,
      "memoryLapse": .memoryLapse,
      "moodChanges": .moodChanges,
      "nausea": .nausea,
      "nightSweats": .nightSweats,
      "pelvicPain": .pelvicPain,
      "rapidPoundingOrFlutteringHeartbeat": .rapidPoundingOrFlutteringHeartbeat,
      "runnyNose": .runnyNose,
      "shortnessOfBreath": .shortnessOfBreath,
      "sinusCongestion": .sinusCongestion,
      "skippedHeartbeat": .skippedHeartbeat,
      "sleepChanges": .sleepChanges,
      "soreThroat": .soreThroat,
      "vaginalDryness": .vaginalDryness,
      "vomiting": .vomiting,
      "wheezing": .wheezing,
    ]

    // iOS 16.0+ types
    if #available(iOS 16.0, *) {
      mapping["infrequentMenstrualCycles"] = .infrequentMenstrualCycles
      mapping["irregularMenstrualCycles"] = .irregularMenstrualCycles
      mapping["persistentIntermenstrualBleeding"] = .persistentIntermenstrualBleeding
      mapping["prolongedMenstrualPeriods"] = .prolongedMenstrualPeriods
    }

    return mapping[identifier]
  }

  // MARK: - Characteristic Types

  static func characteristicType(for identifier: String) -> HKCharacteristicType? {
    let mapping: [String: HKCharacteristicTypeIdentifier] = [
      "biologicalSex": .biologicalSex,
      "bloodType": .bloodType,
      "dateOfBirth": .dateOfBirth,
      "fitzpatrickSkinType": .fitzpatrickSkinType,
      "wheelchairUse": .wheelchairUse,
      "activityMoveMode": .activityMoveMode,
    ]
    guard let id = mapping[identifier] else { return nil }
    return HKCharacteristicType.characteristicType(forIdentifier: id)
  }

  // MARK: - Object/Sample Types

  static func objectType(for identifier: String) -> HKObjectType? {
    if let quantityType = quantityType(for: identifier) {
      return quantityType
    }
    if let categoryType = categoryType(for: identifier) {
      return categoryType
    }
    if let characteristicType = characteristicType(for: identifier) {
      return characteristicType
    }
    if identifier == "workoutType" {
      return HKObjectType.workoutType()
    }
    if identifier == "activitySummaryType" {
      return HKObjectType.activitySummaryType()
    }
    return nil
  }

  static func sampleType(for identifier: String) -> HKSampleType? {
    if let quantityType = quantityType(for: identifier) {
      return quantityType
    }
    if let categoryType = categoryType(for: identifier) {
      return categoryType
    }
    if identifier == "workoutType" {
      return HKObjectType.workoutType()
    }
    return nil
  }

  // MARK: - Workout Activity Types

  static func workoutActivityType(for identifier: String) -> HKWorkoutActivityType {
    var mapping: [String: HKWorkoutActivityType] = [
      "americanFootball": .americanFootball,
      "archery": .archery,
      "australianFootball": .australianFootball,
      "badminton": .badminton,
      "barre": .barre,
      "baseball": .baseball,
      "basketball": .basketball,
      "bowling": .bowling,
      "boxing": .boxing,
      "cardioDance": .cardioDance,
      "climbing": .climbing,
      "cooldown": .cooldown,
      "coreTraining": .coreTraining,
      "cricket": .cricket,
      "crossCountrySkiing": .crossCountrySkiing,
      "crossTraining": .crossTraining,
      "curling": .curling,
      "cycling": .cycling,
      "socialDance": .socialDance,
      "discSports": .discSports,
      "downhillSkiing": .downhillSkiing,
      "elliptical": .elliptical,
      "equestrianSports": .equestrianSports,
      "fencing": .fencing,
      "fishing": .fishing,
      "fitnessGaming": .fitnessGaming,
      "flexibility": .flexibility,
      "functionalStrengthTraining": .functionalStrengthTraining,
      "golf": .golf,
      "gymnastics": .gymnastics,
      "handCycling": .handCycling,
      "handball": .handball,
      "highIntensityIntervalTraining": .highIntensityIntervalTraining,
      "hiking": .hiking,
      "hockey": .hockey,
      "hunting": .hunting,
      "jumpRope": .jumpRope,
      "kickboxing": .kickboxing,
      "lacrosse": .lacrosse,
      "martialArts": .martialArts,
      "mindAndBody": .mindAndBody,
      "mixedCardio": .mixedCardio,
      "paddleSports": .paddleSports,
      "pickleball": .pickleball,
      "pilates": .pilates,
      "play": .play,
      "preparationAndRecovery": .preparationAndRecovery,
      "racquetball": .racquetball,
      "rowing": .rowing,
      "rugby": .rugby,
      "running": .running,
      "sailing": .sailing,
      "skatingSports": .skatingSports,
      "snowboarding": .snowboarding,
      "snowSports": .snowSports,
      "soccer": .soccer,
      "softball": .softball,
      "squash": .squash,
      "stairClimbing": .stairClimbing,
      "stairs": .stairs,
      "stepTraining": .stepTraining,
      "surfingSports": .surfingSports,
      "swimming": .swimming,
      "tableTennis": .tableTennis,
      "taiChi": .taiChi,
      "tennis": .tennis,
      "trackAndField": .trackAndField,
      "traditionalStrengthTraining": .traditionalStrengthTraining,
      "volleyball": .volleyball,
      "walking": .walking,
      "waterFitness": .waterFitness,
      "waterPolo": .waterPolo,
      "waterSports": .waterSports,
      "wheelchairRunPace": .wheelchairRunPace,
      "wheelchairWalkPace": .wheelchairWalkPace,
      "wrestling": .wrestling,
      "yoga": .yoga,
      "other": .other,
    ]

    // iOS 16.0+ types
    if #available(iOS 16.0, *) {
      mapping["transition"] = .transition
    }

    return mapping[identifier] ?? .other
  }

  static func workoutActivityTypeString(for type: HKWorkoutActivityType) -> String {
    switch type {
    case .americanFootball: return "americanFootball"
    case .archery: return "archery"
    case .australianFootball: return "australianFootball"
    case .badminton: return "badminton"
    case .barre: return "barre"
    case .baseball: return "baseball"
    case .basketball: return "basketball"
    case .bowling: return "bowling"
    case .boxing: return "boxing"
    case .cardioDance: return "cardioDance"
    case .climbing: return "climbing"
    case .cooldown: return "cooldown"
    case .coreTraining: return "coreTraining"
    case .cricket: return "cricket"
    case .crossCountrySkiing: return "crossCountrySkiing"
    case .crossTraining: return "crossTraining"
    case .curling: return "curling"
    case .cycling: return "cycling"
    case .socialDance: return "socialDance"
    case .discSports: return "discSports"
    case .downhillSkiing: return "downhillSkiing"
    case .elliptical: return "elliptical"
    case .equestrianSports: return "equestrianSports"
    case .fencing: return "fencing"
    case .fishing: return "fishing"
    case .fitnessGaming: return "fitnessGaming"
    case .flexibility: return "flexibility"
    case .functionalStrengthTraining: return "functionalStrengthTraining"
    case .golf: return "golf"
    case .gymnastics: return "gymnastics"
    case .handCycling: return "handCycling"
    case .handball: return "handball"
    case .highIntensityIntervalTraining: return "highIntensityIntervalTraining"
    case .hiking: return "hiking"
    case .hockey: return "hockey"
    case .hunting: return "hunting"
    case .jumpRope: return "jumpRope"
    case .kickboxing: return "kickboxing"
    case .lacrosse: return "lacrosse"
    case .martialArts: return "martialArts"
    case .mindAndBody: return "mindAndBody"
    case .mixedCardio: return "mixedCardio"
    case .paddleSports: return "paddleSports"
    case .pickleball: return "pickleball"
    case .pilates: return "pilates"
    case .play: return "play"
    case .preparationAndRecovery: return "preparationAndRecovery"
    case .racquetball: return "racquetball"
    case .rowing: return "rowing"
    case .rugby: return "rugby"
    case .running: return "running"
    case .sailing: return "sailing"
    case .skatingSports: return "skatingSports"
    case .snowboarding: return "snowboarding"
    case .snowSports: return "snowSports"
    case .soccer: return "soccer"
    case .softball: return "softball"
    case .squash: return "squash"
    case .stairClimbing: return "stairClimbing"
    case .stairs: return "stairs"
    case .stepTraining: return "stepTraining"
    case .surfingSports: return "surfingSports"
    case .swimming: return "swimming"
    case .tableTennis: return "tableTennis"
    case .taiChi: return "taiChi"
    case .tennis: return "tennis"
    case .trackAndField: return "trackAndField"
    case .traditionalStrengthTraining: return "traditionalStrengthTraining"
    case .volleyball: return "volleyball"
    case .walking: return "walking"
    case .waterFitness: return "waterFitness"
    case .waterPolo: return "waterPolo"
    case .waterSports: return "waterSports"
    case .wheelchairRunPace: return "wheelchairRunPace"
    case .wheelchairWalkPace: return "wheelchairWalkPace"
    case .wrestling: return "wrestling"
    case .yoga: return "yoga"
    default: return "other"
    }
  }
}
