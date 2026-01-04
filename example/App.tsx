import AppleHealth, {
  ActivityRingView,
  HealthKitQuery,
  HealthKitSampleBuilder,
} from "apple-health";
import { useHealthKitDevTools } from "apple-health/dev-tools";
import {
  usePermissions,
  useHealthKitStatistics,
  PermissionStatus,
} from "apple-health/hooks";
import { useState } from "react";
import {
  Button,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
} from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  useHealthKitDevTools();

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.header}>Apple HealthKit</Text>

      <AvailabilitySection />
      <PermissionsSection />
      <CharacteristicsSection />
      <StepsSection />
      <ActivityRingsSection />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Availability - Check if HealthKit is available
// ─────────────────────────────────────────────────────────────────────────────

function AvailabilitySection() {
  const isAvailable = AppleHealth.isAvailable();

  return (
    <Card title="Availability">
      <Row label="HealthKit Available" value={isAvailable ? "Yes" : "No"} />
      {!isAvailable && (
        <Text style={styles.warning}>
          HealthKit is not available on this device.
        </Text>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Permissions - Request and check authorization
// ─────────────────────────────────────────────────────────────────────────────

function PermissionsSection() {
  const [status, requestPermission] = usePermissions({
    read: [
      "stepCount",
      "heartRate",
      "biologicalSex",
      "dateOfBirth",
      "activitySummaryType",
    ],
    write: ["stepCount"],
  });

  const statusText = status?.status ?? "checking...";
  const isGranted = status?.granted ?? false;

  return (
    <Card title="Permissions">
      <Text style={styles.description}>
        HealthKit requires explicit user permission to read health data.
      </Text>

      <Button title="Request Permission" onPress={requestPermission} />

      <View style={styles.spacer} />
      <Row label="Status" value={statusText} />
      <Row label="Write Access" value={isGranted ? "Granted" : "Not granted"} />

      {status?.status === PermissionStatus.DENIED && (
        <Text style={styles.warning}>
          Permission denied. Go to Settings → Privacy → Health to enable.
        </Text>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Characteristics - Read user profile data
// ─────────────────────────────────────────────────────────────────────────────

function CharacteristicsSection() {
  const [biologicalSex, setBiologicalSex] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCharacteristics = async () => {
    setLoading(true);
    try {
      const [sex, dob, blood] = await Promise.all([
        AppleHealth.getBiologicalSex(),
        AppleHealth.getDateOfBirth(),
        AppleHealth.getBloodType(),
      ]);

      setBiologicalSex(sex);
      setDateOfBirth(dob ? new Date(dob).toLocaleDateString() : null);
      setBloodType(blood);
    } catch (error) {
      Alert.alert("Error", String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="User Characteristics">
      <Text style={styles.description}>
        Read-only profile data set by the user in the Health app.
      </Text>

      <Button
        title={loading ? "Loading..." : "Fetch Characteristics"}
        onPress={fetchCharacteristics}
        disabled={loading}
      />

      <View style={styles.spacer} />
      <Row label="Biological Sex" value={biologicalSex ?? "Not set"} />
      <Row label="Date of Birth" value={dateOfBirth ?? "Not set"} />
      <Row label="Blood Type" value={bloodType ?? "Not set"} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Steps - Query and write step data
// ─────────────────────────────────────────────────────────────────────────────

function StepsSection() {
  // Get today's start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Use the statistics hook for today's steps
  const {
    data: todayStats,
    isLoading,
    error,
    refetch,
  } = useHealthKitStatistics({
    type: "stepCount",
    aggregations: ["cumulativeSum"],
    startDate: todayStart,
    endDate: new Date(),
  });

  const todaySteps = todayStats && !Array.isArray(todayStats)
    ? Math.round(todayStats.sumQuantity ?? 0)
    : 0;

  // Save steps using the builder
  const saveSteps = async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      await new HealthKitSampleBuilder()
        .quantityType("stepCount")
        .value(100)
        .unit("count")
        .startDate(fiveMinutesAgo)
        .endDate(now)
        .save();

      Alert.alert("Success", "Added 100 steps");
      refetch();
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  // Query weekly steps using HealthKitQuery
  const fetchWeeklySteps = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await new HealthKitQuery()
        .type("stepCount", "statistics")
        .dateRange(weekAgo, now)
        .aggregations(["cumulativeSum"])
        .interval("day")
        .executeStatistics();

      const stats = Array.isArray(result) ? result : [result];
      const summary = stats
        .map((day) => {
          const date = new Date(day.startDate).toLocaleDateString(undefined, {
            weekday: "short",
          });
          const steps = Math.round(day.sumQuantity ?? 0).toLocaleString();
          return `${date}: ${steps}`;
        })
        .join("\n");

      Alert.alert("Weekly Steps", summary || "No data");
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  return (
    <Card title="Step Count">
      <Text style={styles.description}>
        Read today's steps and add new step samples.
      </Text>

      <View style={styles.statsContainer}>
        <Text style={styles.statsLabel}>Today</Text>
        <Text style={styles.statsValue}>
          {isLoading ? "..." : todaySteps.toLocaleString()}
        </Text>
        <Text style={styles.statsUnit}>steps</Text>
      </View>

      {error && <Text style={styles.error}>{error.message}</Text>}

      <View style={styles.buttonRow}>
        <Button title="Refresh" onPress={refetch} />
        <Button title="Add 100 Steps" onPress={saveSteps} />
      </View>

      <View style={styles.spacer} />
      <Button title="View Weekly Steps" onPress={fetchWeeklySteps} />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Activity Rings - Display the activity rings view
// ─────────────────────────────────────────────────────────────────────────────

function ActivityRingsSection() {
  const [summary, setSummary] = useState<{
    activeEnergyBurned: number;
    activeEnergyBurnedGoal: number;
    appleExerciseTime: number;
    appleExerciseTimeGoal: number;
    appleStandHours: number;
    appleStandHoursGoal: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const fetchActivitySummary = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const summaries = await AppleHealth.queryActivitySummary(
        today.toISOString(),
        today.toISOString()
      );

      if (summaries.length > 0) {
        setSummary(summaries[0]);
      } else {
        Alert.alert("No Data", "No activity summary for today");
      }
    } catch (err) {
      Alert.alert("Error", String(err));
    } finally {
      setLoading(false);
    }
  };

  const useDemoData = () => {
    setSummary({
      activeEnergyBurned: 420,
      activeEnergyBurnedGoal: 500,
      appleExerciseTime: 25,
      appleExerciseTimeGoal: 30,
      appleStandHours: 10,
      appleStandHoursGoal: 12,
    });
  };

  const displaySummary = summary ?? {
    activeEnergyBurned: 0,
    activeEnergyBurnedGoal: 500,
    appleExerciseTime: 0,
    appleExerciseTimeGoal: 30,
    appleStandHours: 0,
    appleStandHoursGoal: 12,
  };

  return (
    <Card title="Activity Rings">
      <Text style={styles.description}>
        Native HKActivityRingView showing Move, Exercise, and Stand goals.
      </Text>

      <View style={styles.buttonRow}>
        <Button
          title={loading ? "Loading..." : "Fetch Today"}
          onPress={fetchActivitySummary}
          disabled={loading}
        />
        <Button title="Demo Data" onPress={useDemoData} />
      </View>

      <View style={styles.ringsContainer}>
        <ActivityRingView summary={displaySummary} style={styles.rings} />
      </View>

      {summary && (
        <View style={styles.ringStats}>
          <Row
            label="Move"
            value={`${Math.round(summary.activeEnergyBurned)}/${Math.round(summary.activeEnergyBurnedGoal)} kcal`}
          />
          <Row
            label="Exercise"
            value={`${Math.round(summary.appleExerciseTime)}/${Math.round(summary.appleExerciseTimeGoal)} min`}
          />
          <Row
            label="Stand"
            value={`${Math.round(summary.appleStandHours)}/${Math.round(summary.appleStandHoursGoal)} hrs`}
          />
        </View>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  header: {
    fontSize: 34,
    fontWeight: "bold",
    margin: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  rowLabel: {
    fontSize: 16,
    color: "#333",
  },
  rowValue: {
    fontSize: 16,
    color: "#666",
  },
  spacer: {
    height: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  warning: {
    fontSize: 14,
    color: "#ff9500",
    marginTop: 12,
    fontStyle: "italic",
  },
  error: {
    fontSize: 14,
    color: "#ff3b30",
    marginTop: 8,
  },
  statsContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  statsLabel: {
    fontSize: 14,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statsValue: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statsUnit: {
    fontSize: 16,
    color: "#666",
  },
  ringsContainer: {
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
  },
  rings: {
    width: 180,
    height: 180,
  },
  ringStats: {
    marginTop: 8,
  },
});
