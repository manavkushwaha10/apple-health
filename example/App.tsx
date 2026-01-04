import { useEvent } from "expo";
import AppleHealth, {
  ActivityRingView,
  ActivitySummary,
  HealthKitQuery,
  HealthKitSampleBuilder,
  QuantitySample,
  HealthKitSample,
} from "apple-health";
import { useHealthKitDevTools } from "apple-health/dev-tools";
import {
  useHealthKitQuery,
  useHealthKitStatistics,
  useHealthKitSubscription,
  useHealthKitAnchor,
  usePermissions,
  PermissionStatus,
} from "apple-health/hooks";
import { useState, useCallback, useEffect } from "react";
import {
  Button,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";

export default function App() {
  // Enable CLI access to HealthKit in development
  useHealthKitDevTools();

  const [biologicalSex, setBiologicalSex] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [activitySummary, setActivitySummary] =
    useState<ActivitySummary | null>(null);

  // Legacy event listener for comparison
  const healthKitUpdate = useEvent(AppleHealth, "onHealthKitUpdate");
  const isAvailable = AppleHealth.isAvailable();

  // ─────────────────────────────────────────────────────────────────────────────
  // Authorization (usePermissions hook)
  // ─────────────────────────────────────────────────────────────────────────────

  const [permissionStatus, requestPermission] = usePermissions({
    read: [
      "stepCount",
      "heartRate",
      "sleepAnalysis",
      "biologicalSex",
      "dateOfBirth",
      "workoutType",
      "activitySummaryType",
    ],
    write: ["stepCount", "sleepAnalysis", "workoutType"],
  });

  // Use the granted property to determine if we can proceed.
  // Note: HealthKit hides read permission status for privacy, so `granted`
  // only reflects write permissions. For read-only access, check data directly.
  const authorized = permissionStatus?.granted ?? false;

  // ─────────────────────────────────────────────────────────────────────────────
  // useHealthKitQuery - Fetch samples with delete capability
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    data: heartRateData,
    isLoading: heartRateLoading,
    refetch: refetchHeartRate,
    deleteSample,
  } = useHealthKitQuery({
    type: "heartRate",
    kind: "quantity",
    limit: 5,
    ascending: false,
    skip: !authorized,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // useHealthKitStatistics - Single result or time-bucketed
  // ─────────────────────────────────────────────────────────────────────────────

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Single statistics (no interval)
  const {
    data: todaySteps,
    isLoading: stepsLoading,
    refetch: refetchSteps,
  } = useHealthKitStatistics({
    type: "stepCount",
    aggregations: ["cumulativeSum"],
    startDate: todayStart,
    endDate: new Date(),
    skip: !authorized,
  });

  // Time-bucketed statistics (with interval)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const {
    data: weeklySteps,
    isLoading: weeklyLoading,
    refetch: refetchWeekly,
  } = useHealthKitStatistics({
    type: "stepCount",
    aggregations: ["cumulativeSum"],
    interval: "day",
    startDate: weekAgo,
    endDate: new Date(),
    skip: !authorized,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // useHealthKitSubscription - Push notifications when data changes
  //
  // Use this when you want to be NOTIFIED of changes.
  // Does NOT fetch data - combine with useHealthKitQuery to refetch.
  // ─────────────────────────────────────────────────────────────────────────────

  const [updateCount, setUpdateCount] = useState(0);

  const {
    isActive: subscriptionActive,
    lastUpdate,
    pause: pauseSubscription,
    resume: resumeSubscription,
  } = useHealthKitSubscription({
    type: "stepCount",
    onUpdate: () => {
      // Called whenever HealthKit data changes
      setUpdateCount((c) => c + 1);
      refetchSteps(); // Refetch our data
    },
    autoStart: authorized,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // useHealthKitAnchor - Paginated incremental sync
  //
  // Use this when you need to FETCH data in batches and track sync state.
  // Ideal for syncing to a local database or loading large datasets.
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    samples: anchorSamples,
    deletedObjects,
    hasMore,
    isLoading: anchorLoading,
    fetchMore,
    reset: resetAnchor,
  } = useHealthKitAnchor({
    type: "stepCount",
    kind: "quantity",
    limit: 10, // Fetch 10 at a time
    skip: !authorized,
  });

  // Track deleted samples in a real app you'd remove from local DB
  useEffect(() => {
    if (deletedObjects.length > 0) {
      console.log(
        "Deleted samples:",
        deletedObjects.map((d) => d.uuid)
      );
    }
  }, [deletedObjects]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HealthKitQuery - Fluent query builder for imperative use
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchSleepData = async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const samples = await new HealthKitQuery()
        .type("sleepAnalysis", "category")
        .dateRange(yesterday, new Date())
        .ascending(false)
        .limit(10)
        .execute();

      const sleepStates = [
        "inBed",
        "asleepUnspecified",
        "awake",
        "asleepCore",
        "asleepDeep",
        "asleepREM",
      ];
      const summary = samples
        .map((s) => {
          if (s.__typename === "CategorySample") {
            const state = sleepStates[s.value] ?? `unknown(${s.value})`;
            const duration = Math.round(
              (new Date(s.endDate).getTime() -
                new Date(s.startDate).getTime()) /
                60000
            );
            return `${state}: ${duration} min`;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");

      Alert.alert("Sleep Data", summary || "No sleep data found");
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HealthKitSampleBuilder - Create and save samples
  // ─────────────────────────────────────────────────────────────────────────────

  const saveSteps = async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const sample = await new HealthKitSampleBuilder()
        .quantityType("stepCount")
        .value(100)
        .unit("count")
        .startDate(fiveMinutesAgo)
        .endDate(now)
        .save();

      Alert.alert(
        "Success",
        `Saved 100 steps (uuid: ${sample.uuid.slice(0, 8)}...)`
      );
      refetchSteps();
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const saveWorkout = async () => {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      await new HealthKitSampleBuilder()
        .workoutType("running")
        .startDate(thirtyMinutesAgo)
        .endDate(now)
        .totalEnergyBurned(250)
        .totalDistance(5000)
        .metadata({ HKIndoorWorkout: false })
        .save();

      Alert.alert("Success", "Saved 30 min running workout");
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Other data fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchCharacteristics = async () => {
    try {
      const [sex, dob] = await Promise.all([
        AppleHealth.getBiologicalSex(),
        AppleHealth.getDateOfBirth(),
      ]);
      setBiologicalSex(sex);
      setDateOfBirth(dob ? new Date(dob).toLocaleDateString() : null);
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const fetchActivitySummary = async () => {
    try {
      const today = new Date();
      const summaries = await AppleHealth.queryActivitySummary(
        today.toISOString(),
        today.toISOString()
      );
      if (summaries.length > 0) {
        setActivitySummary(summaries[0]);
      } else {
        Alert.alert("No Data", "No activity summary found for today");
      }
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const steps =
    todaySteps && !Array.isArray(todaySteps) ? todaySteps.sumQuantity : null;
  const latestHeartRate =
    heartRateData?.[0]?.__typename === "QuantitySample"
      ? Math.round(heartRateData[0].value)
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.header}>Apple HealthKit</Text>

      <Group name="Availability">
        <Text>HealthKit Available: {isAvailable ? "Yes" : "No"}</Text>
      </Group>

      <Group name="usePermissions">
        <Text style={styles.description}>
          Expo-style permission hook with automatic status fetching.
        </Text>
        <Text style={styles.apiLabel}>usePermissions</Text>
        <Button title="Request Permission" onPress={requestPermission} />
        <Text style={styles.status}>
          Status: {permissionStatus?.status ?? "loading..."}
        </Text>
        <Text style={styles.status}>
          Granted: {permissionStatus?.granted ? "Yes" : "No"}
        </Text>
        <Text style={styles.status}>
          Can Ask Again: {permissionStatus?.canAskAgain ? "Yes" : "No"}
        </Text>
      </Group>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SUBSCRIPTION vs ANCHOR comparison */}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <Group name="Subscription (Push Notifications)">
        <Text style={styles.description}>
          Get notified when HealthKit data changes. Use with useHealthKitQuery
          to refetch data on updates.
        </Text>
        <Text style={styles.apiLabel}>useHealthKitSubscription</Text>
        <View style={styles.row}>
          <Text style={styles.status}>
            Status: {subscriptionActive ? "Active" : "Paused"}
          </Text>
          <Button
            title={subscriptionActive ? "Pause" : "Resume"}
            onPress={
              subscriptionActive ? pauseSubscription : resumeSubscription
            }
          />
        </View>
        <Text style={styles.status}>Updates received: {updateCount}</Text>
        <Text style={styles.status}>Last update: {lastUpdate ?? "Never"}</Text>
        <View style={styles.spacer} />
        <Text style={styles.status}>
          Today's Steps: {steps != null ? Math.round(steps) : "Loading..."}
        </Text>
      </Group>

      <Group name="Anchor (Paginated Sync)">
        <Text style={styles.description}>
          Fetch data in batches with pagination. Ideal for syncing to a local
          database or loading large datasets incrementally.
        </Text>
        <Text style={styles.apiLabel}>useHealthKitAnchor</Text>
        <View style={styles.row}>
          <Button
            title={
              anchorLoading
                ? "Loading..."
                : `Fetch More (${anchorSamples.length} loaded)`
            }
            onPress={fetchMore}
            disabled={!hasMore || anchorLoading || !authorized}
          />
          <Button title="Reset" onPress={resetAnchor} disabled={!authorized} />
        </View>
        <Text style={styles.status}>Has more: {hasMore ? "Yes" : "No"}</Text>
        <Text style={styles.status}>
          Deleted objects tracked: {deletedObjects.length}
        </Text>
        {anchorSamples.length > 0 && (
          <View style={styles.sampleList}>
            {anchorSamples.slice(0, 5).map((sample) => (
              <View key={sample.uuid} style={styles.sampleItem}>
                <Text style={styles.sampleText}>
                  {sample.__typename === "QuantitySample"
                    ? `${Math.round(sample.value)} ${sample.unit}`
                    : sample.__typename}
                </Text>
                <Text style={styles.sampleDate}>
                  {new Date(sample.startDate).toLocaleString()}
                </Text>
              </View>
            ))}
            {anchorSamples.length > 5 && (
              <Text style={styles.moreText}>
                +{anchorSamples.length - 5} more samples
              </Text>
            )}
          </View>
        )}
      </Group>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* Query hooks */}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <Group name="useHealthKitQuery">
        <Text style={styles.description}>
          Fetch samples with automatic lifecycle management. Samples have
          delete() method.
        </Text>
        <Button
          title={heartRateLoading ? "Loading..." : "Refetch Heart Rate"}
          onPress={refetchHeartRate}
          disabled={!authorized}
        />
        <Text style={styles.status}>
          Latest: {latestHeartRate ? `${latestHeartRate} bpm` : "No data"}
        </Text>
        {heartRateData && heartRateData.length > 0 && (
          <View style={styles.sampleList}>
            <Text style={styles.sampleHeader}>Tap to delete:</Text>
            {heartRateData.map((sample) => (
              <TouchableOpacity
                key={sample.uuid}
                style={styles.sampleItem}
                onPress={() => deleteSample(sample)}
              >
                <Text style={styles.sampleText}>
                  {sample.__typename === "QuantitySample"
                    ? `${Math.round(sample.value)} bpm`
                    : sample.__typename}
                </Text>
                <Text style={styles.sampleDate}>
                  {new Date(sample.startDate).toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Group>

      <Group name="useHealthKitStatistics">
        <Text style={styles.description}>
          Aggregate statistics. Omit interval for single result, include
          interval for time-bucketed array.
        </Text>
        <Button
          title={weeklyLoading ? "Loading..." : "Refetch Weekly"}
          onPress={refetchWeekly}
          disabled={!authorized}
        />
        {Array.isArray(weeklySteps) && weeklySteps.length > 0 && (
          <View style={styles.statsList}>
            {weeklySteps.map((day, i) => (
              <View key={i} style={styles.statsItem}>
                <Text style={styles.statsDate}>
                  {new Date(day.startDate).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </Text>
                <Text style={styles.statsValue}>
                  {Math.round(day.sumQuantity ?? 0).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Group>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* Imperative APIs */}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <Group name="HealthKitQuery (Imperative)">
        <Text style={styles.description}>
          Fluent query builder for one-off queries outside React.
        </Text>
        <Text style={styles.apiLabel}>new HealthKitQuery()</Text>
        <Button title="Fetch Sleep Data" onPress={fetchSleepData} />
      </Group>

      <Group name="HealthKitSampleBuilder">
        <Text style={styles.description}>
          Create and save samples with a fluent builder API.
        </Text>
        <Text style={styles.apiLabel}>new HealthKitSampleBuilder()</Text>
        <View style={styles.row}>
          <Button title="Save 100 Steps" onPress={saveSteps} />
          <Button title="Save Workout" onPress={saveWorkout} />
        </View>
      </Group>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* Other features */}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <Group name="Characteristics">
        <Button title="Fetch Characteristics" onPress={fetchCharacteristics} />
        <Text style={styles.status}>
          Biological Sex: {biologicalSex ?? "Unknown"}
        </Text>
        <Text style={styles.status}>
          Date of Birth: {dateOfBirth ?? "Unknown"}
        </Text>
      </Group>

      <Group name="Activity Rings">
        <View style={styles.row}>
          <Button title="Fetch Today" onPress={fetchActivitySummary} />
          <Button
            title="Demo Data"
            onPress={() => {
              setActivitySummary({
                dateComponents: { year: 2024, month: 1, day: 1 },
                activeEnergyBurned: 420,
                activeEnergyBurnedGoal: 500,
                appleExerciseTime: 25,
                appleExerciseTimeGoal: 30,
                appleStandHours: 10,
                appleStandHoursGoal: 12,
              });
            }}
          />
        </View>
        <View style={styles.ringsContainer}>
          <ActivityRingView
            summary={
              activitySummary ?? {
                activeEnergyBurned: 0,
                activeEnergyBurnedGoal: 500,
                appleExerciseTime: 0,
                appleExerciseTimeGoal: 30,
                appleStandHours: 0,
                appleStandHoursGoal: 12,
              }
            }
            style={styles.activityRings}
          />
        </View>
        {activitySummary && (
          <View style={styles.ringStats}>
            <Text style={styles.status}>
              Move: {Math.round(activitySummary.activeEnergyBurned)}/
              {Math.round(activitySummary.activeEnergyBurnedGoal)} kcal
            </Text>
            <Text style={styles.status}>
              Exercise: {Math.round(activitySummary.appleExerciseTime)}/
              {Math.round(activitySummary.appleExerciseTimeGoal)} min
            </Text>
            <Text style={styles.status}>
              Stand: {Math.round(activitySummary.appleStandHours)}/
              {Math.round(activitySummary.appleStandHoursGoal)} hrs
            </Text>
          </View>
        )}
      </Group>

      <Group name="Raw Events">
        <Text style={styles.status}>
          Last HealthKit Event: {healthKitUpdate?.typeIdentifier ?? "None"}
        </Text>
      </Group>
    </ScrollView>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 30,
    margin: 20,
    fontWeight: "bold",
  },
  groupHeader: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: "600",
  },
  group: {
    margin: 16,
    marginTop: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 18,
  },
  status: {
    marginTop: 8,
    color: "#666",
  },
  spacer: {
    height: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  ringsContainer: {
    alignItems: "center",
    marginVertical: 16,
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
  },
  activityRings: {
    width: 150,
    height: 150,
  },
  ringStats: {
    marginTop: 8,
  },
  apiLabel: {
    fontSize: 12,
    color: "#007AFF",
    fontFamily: "Menlo",
    marginBottom: 8,
  },
  sampleList: {
    marginTop: 12,
  },
  sampleHeader: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  sampleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 4,
  },
  sampleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sampleDate: {
    fontSize: 12,
    color: "#666",
  },
  moreText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  statsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  statsItem: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
    alignItems: "center",
  },
  statsDate: {
    fontSize: 11,
    color: "#666",
  },
  statsValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
});
