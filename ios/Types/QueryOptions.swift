import ExpoModulesCore

struct QueryOptions: Convertible, AnyArgument {
  let startDate: String?
  let endDate: String?
  let limit: Int?
  let ascending: Bool?

  init(startDate: String? = nil, endDate: String? = nil, limit: Int? = nil, ascending: Bool? = nil) {
    self.startDate = startDate
    self.endDate = endDate
    self.limit = limit
    self.ascending = ascending
  }

  static func convert(from value: Any?, appContext: AppContext) throws -> QueryOptions {
    guard let dict = value as? [String: Any] else {
      throw NotADictionaryException()
    }

    return QueryOptions(
      startDate: dict["startDate"] as? String,
      endDate: dict["endDate"] as? String,
      limit: dict["limit"] as? Int,
      ascending: dict["ascending"] as? Bool
    )
  }
}

struct StatisticsCollectionOptions: Convertible, AnyArgument {
  let startDate: String?
  let endDate: String?
  let limit: Int?
  let ascending: Bool?
  let interval: String

  static func convert(from value: Any?, appContext: AppContext) throws -> StatisticsCollectionOptions {
    guard let dict = value as? [String: Any] else {
      throw NotADictionaryException()
    }

    return StatisticsCollectionOptions(
      startDate: dict["startDate"] as? String,
      endDate: dict["endDate"] as? String,
      limit: dict["limit"] as? Int,
      ascending: dict["ascending"] as? Bool,
      interval: (dict["interval"] as? String) ?? "day"
    )
  }
}
