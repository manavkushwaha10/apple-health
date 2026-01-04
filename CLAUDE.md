Expo module for interacting with Apple HealthKit on Apple devices.

## Progress

- [ ] Docs for usage and setup instructions
- [x] Marshalling-style API for reading and writing health data
- [x] Querying API (samples, statistics, statistics collections, anchored queries)
- [x] HealthKit UI elements https://developer.apple.com/documentation/healthkitui
- [x] Config Plugin for setting up HealthKit permissions and entitlements
- [x] Permissions that follow Expo's permission model
- [x] TypeScript typings for all methods and options
- [x] Real-time subscriptions (observer queries)
- [x] Background delivery support
- [x] Debugging CLI for interacting with data

## Known Issues

- iOS 16+ types (e.g., `runningPower`, `underwaterDepth`) require `#available` checks
- Dates must include fractional seconds for ISO8601 parsing (handled internally)

## Coding

- ALWAYS use the skills/expo-modules/SKILL.md guidelines when working on the module.
- ALWAYS use the skills/device-testing/SKILL.md guidelines when verifying the module works.

## Verification

- Run `yarn expo run:ios --no-bundler` in `./example` to compile the source.

## References

- https://developer.apple.com/documentation/healthkit/data-types
- https://developer.apple.com/documentation/healthkit/accessing-sample-data-in-the-simulator
- https://developer.apple.com/documentation/healthkit
- https://developer.apple.com/documentation/healthkit/protecting-user-privacy
