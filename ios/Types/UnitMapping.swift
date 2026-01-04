import HealthKit

struct UnitMapping {

  static func unit(for identifier: String) -> HKUnit? {
    let mapping: [String: HKUnit] = [
      // Count
      "count": .count(),
      "count/min": HKUnit.count().unitDivided(by: .minute()),

      // Length
      "m": .meter(),
      "km": .meterUnit(with: .kilo),
      "cm": .meterUnit(with: .centi),
      "mm": .meterUnit(with: .milli),
      "in": .inch(),
      "ft": .foot(),
      "mi": .mile(),

      // Mass
      "g": .gram(),
      "kg": .gramUnit(with: .kilo),
      "mg": .gramUnit(with: .milli),
      "mcg": .gramUnit(with: .micro),
      "oz": .ounce(),
      "lb": .pound(),
      "stone": .stone(),

      // Time
      "s": .second(),
      "min": .minute(),
      "hr": .hour(),
      "d": .day(),

      // Energy
      "J": .joule(),
      "kJ": .jouleUnit(with: .kilo),
      "cal": .smallCalorie(),
      "kcal": .kilocalorie(),
      "Cal": .largeCalorie(),

      // Temperature
      "degC": .degreeCelsius(),
      "degF": .degreeFahrenheit(),
      "K": .kelvin(),

      // Volume
      "L": .liter(),
      "mL": .literUnit(with: .milli),
      "fl_oz_us": .fluidOunceUS(),
      "cup_us": .cupUS(),
      "pt_us": .pintUS(),

      // Pressure
      "Pa": .pascal(),
      "mmHg": .millimeterOfMercury(),
      "cmAq": .centimeterOfWater(),
      "atm": .atmosphere(),
      "inHg": .inchesOfMercury(),

      // Speed
      "m/s": .meter().unitDivided(by: .second()),
      "km/hr": .meterUnit(with: .kilo).unitDivided(by: .hour()),
      "mi/hr": .mile().unitDivided(by: .hour()),

      // Percent
      "%": .percent(),

      // Blood glucose
      "mg/dL": .gramUnit(with: .milli).unitDivided(by: .literUnit(with: .deci)),
      "mmol/L": .moleUnit(with: .milli, molarMass: HKUnitMolarMassBloodGlucose).unitDivided(by: .liter()),

      // Frequency
      "Hz": .hertz(),

      // Electric
      "S": .siemen(),
      "V": .volt(),

      // Sound
      "dBASPL": .decibelAWeightedSoundPressureLevel(),

      // Pharmacology
      "IU": .internationalUnit(),

      // Special units
      "bpm": HKUnit.count().unitDivided(by: .minute()),
      "ms": .secondUnit(with: .milli),

      // Power (as string for compatibility)
      "W": HKUnit(from: "W"),
    ]

    return mapping[identifier]
  }

  static func preferredUnit(for quantityTypeIdentifier: String) -> HKUnit {
    switch quantityTypeIdentifier {
    // Body Measurements
    case "bodyMassIndex": return .count()
    case "bodyFatPercentage": return .percent()
    case "height": return .meter()
    case "bodyMass": return .gramUnit(with: .kilo)
    case "leanBodyMass": return .gramUnit(with: .kilo)
    case "waistCircumference": return .meter()

    // Fitness
    case "stepCount": return .count()
    case "distanceWalkingRunning", "distanceCycling", "distanceSwimming",
         "distanceWheelchair", "distanceDownhillSnowSports": return .meter()
    case "basalEnergyBurned", "activeEnergyBurned": return .kilocalorie()
    case "flightsClimbed": return .count()
    case "appleExerciseTime", "appleMoveTime", "appleStandTime": return .minute()
    case "vo2Max": return HKUnit.literUnit(with: .milli).unitDivided(by: .gramUnit(with: .kilo).unitMultiplied(by: .minute()))
    case "walkingSpeed", "runningSpeed", "stairAscentSpeed", "stairDescentSpeed":
      return .meter().unitDivided(by: .second())
    case "walkingDoubleSupportPercentage", "walkingAsymmetryPercentage": return .percent()
    case "walkingStepLength", "runningStrideLength": return .meter()
    case "sixMinuteWalkTestDistance": return .meter()
    case "runningVerticalOscillation": return .meterUnit(with: .centi)
    case "runningGroundContactTime": return .secondUnit(with: .milli)
    case "runningPower": return HKUnit(from: "W")

    // Vitals
    case "heartRate", "restingHeartRate", "walkingHeartRateAverage": return .count().unitDivided(by: .minute())
    case "bodyTemperature", "basalBodyTemperature": return .degreeCelsius()
    case "bloodPressureSystolic", "bloodPressureDiastolic": return .millimeterOfMercury()
    case "respiratoryRate": return .count().unitDivided(by: .minute())
    case "heartRateVariabilitySDNN": return .secondUnit(with: .milli)
    case "heartRateRecoveryOneMinute": return .count().unitDivided(by: .minute())
    case "oxygenSaturation": return .percent()
    case "peripheralPerfusionIndex": return .percent()

    // Results
    case "bloodGlucose": return .gramUnit(with: .milli).unitDivided(by: .literUnit(with: .deci))
    case "electrodermalActivity": return .siemen()
    case "forcedExpiratoryVolume1", "forcedVitalCapacity": return .liter()
    case "inhalerUsage": return .count()
    case "insulinDelivery": return .internationalUnit()
    case "numberOfTimesFallen": return .count()
    case "peakExpiratoryFlowRate": return .liter().unitDivided(by: .minute())
    case "bloodAlcoholContent": return .percent()

    // Nutrition
    case "dietaryEnergyConsumed": return .kilocalorie()
    case "dietaryFatTotal", "dietaryFatPolyunsaturated", "dietaryFatMonounsaturated",
         "dietaryFatSaturated", "dietaryCarbohydrates", "dietaryFiber", "dietarySugar",
         "dietaryProtein": return .gram()
    case "dietaryCholesterol", "dietarySodium", "dietaryCalcium", "dietaryIron",
         "dietaryMagnesium", "dietaryPhosphorus", "dietaryPotassium", "dietaryZinc",
         "dietaryCopper", "dietaryManganese", "dietaryChloride": return .gramUnit(with: .milli)
    case "dietaryVitaminA", "dietaryVitaminB6", "dietaryVitaminB12", "dietaryVitaminC",
         "dietaryVitaminD", "dietaryVitaminE", "dietaryVitaminK", "dietaryThiamin",
         "dietaryRiboflavin", "dietaryNiacin", "dietaryFolate", "dietaryBiotin",
         "dietaryPantothenicAcid", "dietaryIodine", "dietarySelenium", "dietaryChromium",
         "dietaryMolybdenum": return .gramUnit(with: .micro)
    case "dietaryCaffeine": return .gramUnit(with: .milli)
    case "dietaryWater": return .liter()

    // Other
    case "uvExposure": return .count()
    case "environmentalAudioExposure", "headphoneAudioExposure": return .decibelAWeightedSoundPressureLevel()
    case "numberOfAlcoholicBeverages": return .count()
    case "atrialFibrillationBurden": return .percent()
    case "underwaterDepth": return .meter()
    case "waterTemperature": return .degreeCelsius()
    case "appleSleepingWristTemperature": return .degreeCelsius()
    case "timeInDaylight": return .minute()
    case "physicalEffort": return HKUnit(from: "kcal/(kg*hr)")

    default: return .count()
    }
  }
}
