import ExpoModulesCore

struct HealthKitPermissions: Convertible, AnyArgument {
  let read: [String]
  let write: [String]

  static func convert(from value: Any?, appContext: AppContext) throws -> HealthKitPermissions {
    guard let dict = value as? [String: Any] else {
      throw NotADictionaryException()
    }

    let read = (dict["read"] as? [String]) ?? []
    let write = (dict["write"] as? [String]) ?? []

    return HealthKitPermissions(read: read, write: write)
  }
}
