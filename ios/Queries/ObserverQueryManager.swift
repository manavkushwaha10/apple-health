import HealthKit

class ObserverQueryManager {
  static let shared = ObserverQueryManager()

  private var queries: [String: HKObserverQuery] = [:]
  private let lock = NSLock()

  private init() {}

  func addQuery(_ query: HKObserverQuery, id: String) {
    lock.lock()
    defer { lock.unlock() }
    queries[id] = query
  }

  func removeQuery(id: String) -> HKObserverQuery? {
    lock.lock()
    defer { lock.unlock() }
    return queries.removeValue(forKey: id)
  }

  func removeAllQueries() -> [HKObserverQuery] {
    lock.lock()
    defer { lock.unlock() }
    let allQueries = Array(queries.values)
    queries.removeAll()
    return allQueries
  }
}
