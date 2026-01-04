import { useEvent } from "expo";
import AppleHealth, {
  ActivityRingView,
  ActivitySummary,
  HealthKitQuery,
  QuantitySample,
  buildQuantitySample,
  buildWorkout,
} from "apple-health";
import { useHealthKitDevTools } from "apple-health/dev-tools";
import {
  useHealthKitQuery,
  useHealthKitStatistics,
  useHealthKitSubscription,
} from "apple-health/hooks";
import { useState, useCallback } from "react";
import {
  Button,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";

export default function App() {
  // Enable CLI access to HealthKit in development
  useHealthKitDevTools();

  const [authorized, setAuthorized] = useState(false);
  const [biologicalSex, setBiologicalSex] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [activitySummary, setActivitySummary] =
    useState<ActivitySummary | null>(null);
  const [recentSamples, setRecentSamples] = useState<QuantitySample[]>([]);

  // Legacy event listener for comparison
  const healthKitUpdate = useEvent(AppleHealth, "onHealthKitUpdate");
  const isAvailable = AppleHealth.isAvailable();

  // ─────────────────────────────────────────────────────────────────────────────
  // New Hooks API - Reactive data fetching
  // ─────────────────────────────────────────────────────────────────────────────

  // Today's steps using the statistics hook
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const {
    data: stepsData,
    isLoading: stepsLoading,
    refetch: refetchSteps,
  } = useHealthKitStatistics({
    type: "stepCount",
    aggregations: ["cumulativeSum"],
    startDate: todayStart,
    endDate: new Date(),
    skip: !authorized,
  });

  // Latest heart rate using the query hook
  const {
    data: heartRateData,
    isLoading: heartRateLoading,
    refetch: refetchHeartRate,
  } = useHealthKitQuery({
    type: "heartRate",
    kind: "quantity",
    limit: 1,
    ascending: false,
    skip: !authorized,
  });

  // Real-time subscription to step count changes
  const { isActive: subscriptionActive } = useHealthKitSubscription({
    type: "stepCount",
    onUpdate: () => {
      // Automatically refetch when HealthKit data changes
      refetchSteps();
    },
    autoStart: authorized,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Authorization
  // ─────────────────────────────────────────────────────────────────────────────

  const requestAuthorization = async () => {
    try {
      const result = await AppleHealth.requestAuthorization({
        read: [
          "stepCount",
          "heartRate",
          "sleepAnalysis",
          "biologicalSex",
          "dateOfBirth",
          "workoutType",
          "activitySummaryType",
        ],
        write: ["stepCount", "workoutType"],
      });
      setAuthorized(true);
      Alert.alert("Authorization", `Status: ${result.status}`);
    } catch (error) {
      console.error("Authorization error:", error);
      Alert.alert("Error", String(error));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // New HealthKitQuery API - Fluent query builder
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchWeeklySteps = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // New fluent query builder API
      const query = new HealthKitQuery()
        .type("stepCount", "statisticsCollection")
        .dateRange(sevenDaysAgo, now)
        .aggregations(["cumulativeSum"])
        .interval("day");

      const result = await query.executeStatistics();
      const stats = Array.isArray(result) ? result : [result];

      const summary = stats
        .map(
          (day) =>
            `${new Date(day.startDate).toLocaleDateString()}: ${Math.round(
              day.sumQuantity ?? 0
            )} steps`
        )
        .join("\n");

      Alert.alert("Weekly Steps", summary || "No data");
    } catch (error) {
      console.error("Fetch weekly steps error:", error);
      Alert.alert("Error", String(error));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // New Sample Objects API - Query with delete capability
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchRecentSamplesWithDelete = async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // executeSamples() returns shared objects with delete() method
      const query = new HealthKitQuery()
        .type("stepCount")
        .dateRange(oneHourAgo, now)
        .limit(10)
        .ascending(false);

      const samples = await query.executeSamples();
      setRecentSamples(samples as QuantitySample[]);

      Alert.alert("Success", `Fetched ${samples.length} samples (tap to delete)`);
    } catch (error) {
      console.error("Fetch samples error:", error);
      Alert.alert("Error", String(error));
    }
  };

  const deleteSample = useCallback(async (sample: QuantitySample) => {
    try {
      await sample.delete();
      setRecentSamples((prev) => prev.filter((s) => s.uuid !== sample.uuid));
      Alert.alert("Deleted", "Sample removed from HealthKit");
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // New HealthKitSampleBuilder API - Fluent sample creation
  // ─────────────────────────────────────────────────────────────────────────────

  const saveStepsWithBuilder = async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // New fluent builder API
      const sample = await buildQuantitySample("stepCount")
        .value(100)
        .unit("count")
        .startDate(fiveMinutesAgo)
        .endDate(now)
        .save();

      Alert.alert("Success", `Saved ${sample.value} steps`);
      refetchSteps();
    } catch (error) {
      console.error("Save steps error:", error);
      Alert.alert("Error", String(error));
    }
  };

  const saveWorkoutWithBuilder = async () => {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // New fluent builder API for workouts
      const workout = await buildWorkout("running")
        .startDate(thirtyMinutesAgo)
        .endDate(now)
        .totalEnergyBurned(250)
        .totalDistance(5000)
        .metadata({ HKIndoorWorkout: false })
        .save();

      Alert.alert(
        "Success",
        `Saved ${Math.round(workout.duration / 60)} min running workout`
      );
    } catch (error) {
      console.error("Save workout error:", error);
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
      console.error("Fetch characteristics error:", error);
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
      console.error("Fetch activity summary error:", error);
      Alert.alert("Error", String(error));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const steps = stepsData?.sumQuantity ?? null;
  const heartRate = heartRateData?.[0]?.value
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

      <Group name="Authorization">
        <Button title="Request Authorization" onPress={requestAuthorization} />
        <Text style={styles.status}>
          Authorized: {authorized ? "Yes" : "No"}
        </Text>
      </Group>

      <Group name="Characteristics">
        <Button title="Fetch Characteristics" onPress={fetchCharacteristics} />
        <Text style={styles.status}>
          Biological Sex: {biologicalSex ?? "Unknown"}
        </Text>
        <Text style={styles.status}>
          Date of Birth: {dateOfBirth ?? "Unknown"}
        </Text>
      </Group>

      <Group name="Hooks API (Reactive)">
        <Text style={styles.apiLabel}>useHealthKitStatistics</Text>
        <Button
          title={stepsLoading ? "Loading..." : "Refetch Steps"}
          onPress={refetchSteps}
          disabled={!authorized}
        />
        <Text style={styles.status}>
          Steps Today: {steps !== null ? Math.round(steps) : "Not fetched"}
        </Text>

        <View style={styles.spacer} />

        <Text style={styles.apiLabel}>useHealthKitQuery</Text>
        <Button
          title={heartRateLoading ? "Loading..." : "Refetch Heart Rate"}
          onPress={refetchHeartRate}
          disabled={!authorized}
        />
        <Text style={styles.status}>
          Heart Rate: {heartRate ? `${heartRate} bpm` : "Not fetched"}
        </Text>

        <View style={styles.spacer} />

        <Text style={styles.apiLabel}>useHealthKitSubscription</Text>
        <Text style={styles.status}>
          Real-time Updates: {subscriptionActive ? "Active" : "Inactive"}
        </Text>
      </Group>

      <Group name="Query Builder API">
        <Text style={styles.apiLabel}>new HealthKitQuery()</Text>
        <Button title="Fetch Weekly Steps" onPress={fetchWeeklySteps} />
      </Group>

      <Group name="Sample Objects (with delete)">
        <Text style={styles.apiLabel}>query.executeSamples()</Text>
        <Button
          title="Fetch Recent Samples"
          onPress={fetchRecentSamplesWithDelete}
        />
        {recentSamples.length > 0 && (
          <View style={styles.sampleList}>
            <Text style={styles.sampleHeader}>
              Tap a sample to delete it:
            </Text>
            {recentSamples.map((sample) => (
              <TouchableOpacity
                key={sample.uuid}
                style={styles.sampleItem}
                onPress={() => deleteSample(sample)}
              >
                <Text style={styles.sampleText}>
                  {Math.round(sample.value)} {sample.unit}
                </Text>
                <Text style={styles.sampleDate}>
                  {new Date(sample.startDate).toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Group>

      <Group name="Sample Builder API">
        <Text style={styles.apiLabel}>buildQuantitySample() / buildWorkout()</Text>
        <Button title="Save 100 Steps" onPress={saveStepsWithBuilder} />
        <View style={styles.spacer} />
        <Button title="Save Running Workout" onPress={saveWorkoutWithBuilder} />
      </Group>

      <Group name="Activity Rings">
        <View style={styles.buttonRow}>
          <Button
            title="Fetch Today's Activity"
            onPress={fetchActivitySummary}
          />
          <Button
            title="Use Demo Data"
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

      <Group name="Events">
        <Text style={styles.status}>
          Last Update: {healthKitUpdate?.typeIdentifier ?? "None"}
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
    marginBottom: 12,
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
  status: {
    marginTop: 8,
    color: "#666",
  },
  spacer: {
    height: 12,
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
  buttonRow: {
    flexDirection: "row",
    gap: 8,
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
});
