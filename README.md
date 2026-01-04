# apple-health

Apple HealthKit bindings for Expo.

## API documentation

- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/apple-health/)
- [Documentation for the main branch](https://docs.expo.dev/versions/unversioned/sdk/apple-health/)

## Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

## Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install apple-health
```

### Configure for iOS

Run `npx pod-install` after installing the npm package.

---

## CLI & DevTools

This package includes a CLI for querying and writing HealthKit data during development. Perfect for testing your health app with realistic data.

### Quick Start

1. Enable devtools in your app:

   ```tsx
   import { useHealthKitDevTools } from "apple-health/dev-tools";

   export default function App() {
     useHealthKitDevTools();
     return <YourApp />;
   }
   ```

2. Run CLI commands:

   ```bash
   # Check connection
   bunx apple-health status

   # Write data with natural date formats
   bunx apple-health write quantity heartRate 72 --start "today 8am"
   bunx apple-health write quantity stepCount 8000 --start "yesterday" --duration "1d"

   # Query data
   bunx apple-health query quantity heartRate --limit 10

   # Get statistics
   bunx apple-health stats stepCount --interval day --start "-7d"

   # Interactive mode
   bunx apple-health repl
   ```

### Seeding Test Data with Claude Code

Use AI to generate realistic health data profiles:

```
> Seed HealthKit with a week of data for a stressed software engineer -
  poor sleep, high caffeine, low activity, elevated heart rate
```

Claude Code will batch-write realistic data matching the profile.

### Documentation

- **[CLI Reference](docs/cli.md)** - Complete command reference, date formats, batch mode
- **[Seeding Data Guide](docs/seeding-data.md)** - Using Claude Code to generate test data

---

## Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide](https://github.com/expo/expo#contributing).
