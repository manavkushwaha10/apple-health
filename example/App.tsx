import AppleHealth, {
  ActivityRingView,
  HealthKitSampleBuilder,
} from "apple-health";
import { useHealthKitDevTools } from "apple-health/dev-tools";
import {
  usePermissions,
  useHealthKitQuery,
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
      <SleepSection />
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
      "sleepAnalysis",
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
// 4. Steps - Query and write step data using useHealthKitStatistics
// ─────────────────────────────────────────────────────────────────────────────

function StepsSection() {
  const [showWeekly, setShowWeekly] = useState(false);

  // Get today's start
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today's steps (single statistic)
  const {
    data: todayStats,
    isLoading: todayLoading,
    error: todayError,
    refetch: refetchToday,
  } = useHealthKitStatistics({
    type: "stepCount",
    aggregations: ["cumulativeSum"],
    startDate: todayStart,
    endDate: new Date(),
  });

  // Weekly steps (with interval - returns array)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const {
    data: weeklyStats,
    isLoading: weeklyLoading,
    refetch: refetchWeekly,
  } = useHealthKitStatistics({
    type: "stepCount",
    aggregations: ["cumulativeSum"],
    interval: "day",
    startDate: weekAgo,
    endDate: new Date(),
  });

  const todaySteps = todayStats && !Array.isArray(todayStats)
    ? Math.round(todayStats.sumQuantity ?? 0)
    : 0;

  const weeklyData = Array.isArray(weeklyStats) ? weeklyStats : [];

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
      refetchToday();
      refetchWeekly();
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
          {todayLoading ? "..." : todaySteps.toLocaleString()}
        </Text>
        <Text style={styles.statsUnit}>steps</Text>
      </View>

      {todayError && <Text style={styles.error}>{todayError.message}</Text>}

      <View style={styles.buttonRow}>
        <Button title="Refresh" onPress={() => { refetchToday(); refetchWeekly(); }} />
        <Button title="Add 100 Steps" onPress={saveSteps} />
      </View>

      <View style={styles.spacer} />
      <Button
        title={showWeekly ? "Hide Weekly" : "Show Weekly"}
        onPress={() => setShowWeekly(!showWeekly)}
      />

      {showWeekly && (
        <View style={styles.weeklyContainer}>
          {weeklyLoading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : weeklyData.length > 0 ? (
            weeklyData.map((day, index) => (
              <View key={index} style={styles.weeklyItem}>
                <Text style={styles.weeklyDay}>
                  {new Date(day.startDate).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </Text>
                <View style={styles.weeklyBar}>
                  <View
                    style={[
                      styles.weeklyBarFill,
                      {
                        width: `${Math.min(100, ((day.sumQuantity ?? 0) / 10000) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weeklySteps}>
                  {Math.round(day.sumQuantity ?? 0).toLocaleString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No data for this week</Text>
          )}
        </View>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sleep - Query sleep analysis data using useHealthKitQuery
// ─────────────────────────────────────────────────────────────────────────────

const SLEEP_STATES: Record<number, { label: string; color: string }> = {
  0: { label: "In Bed", color: "#8E8E93" },
  1: { label: "Asleep", color: "#5E5CE6" },
  2: { label: "Awake", color: "#FF9F0A" },
  3: { label: "Core", color: "#30D158" },
  4: { label: "Deep", color: "#0A84FF" },
  5: { label: "REM", color: "#BF5AF2" },
};

function SleepSection() {
  // Query last 24 hours of sleep data using the hook
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data, isLoading, error, refetch } = useHealthKitQuery({
    type: "sleepAnalysis",
    kind: "category",
    startDate: yesterday,
    endDate: new Date(),
    ascending: true,
  });

  // Process sleep samples
  const sleepData = (data ?? []).map((sample) => {
    const value = sample.__typename === "CategorySample" ? sample.value : 0;
    const stateInfo = SLEEP_STATES[value] ?? { label: `Unknown (${value})`, color: "#666" };
    const start = new Date(sample.startDate).getTime();
    const end = new Date(sample.endDate).getTime();
    const duration = Math.round((end - start) / 60000); // minutes

    return {
      state: stateInfo.label,
      duration,
      color: stateInfo.color,
    };
  });

  // Calculate total sleep (exclude "In Bed" and "Awake")
  const totalSleep = sleepData
    .filter((s) => !["In Bed", "Awake"].includes(s.state))
    .reduce((sum, s) => sum + s.duration, 0);

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card title="Sleep Analysis">
      <Text style={styles.description}>
        View last night's sleep stages from Apple Watch or other sources.
      </Text>

      <Button
        title={isLoading ? "Loading..." : "Refresh"}
        onPress={refetch}
        disabled={isLoading}
      />

      {error && <Text style={styles.error}>{error.message}</Text>}

      {totalSleep > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsLabel}>Total Sleep</Text>
          <Text style={[styles.statsValue, { color: "#5E5CE6" }]}>
            {formatDuration(totalSleep)}
          </Text>
        </View>
      )}

      {sleepData.length > 0 && (
        <View style={styles.sleepList}>
          {sleepData.map((item, index) => (
            <View key={index} style={styles.sleepItem}>
              <View style={[styles.sleepDot, { backgroundColor: item.color }]} />
              <Text style={styles.sleepState}>{item.state}</Text>
              <Text style={styles.sleepDuration}>{formatDuration(item.duration)}</Text>
            </View>
          ))}
        </View>
      )}

      {sleepData.length === 0 && !isLoading && (
        <Text style={styles.emptyText}>
          No sleep data found. Sleep data requires an Apple Watch or compatible sleep tracking app.
        </Text>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Activity Rings - Display the activity rings view
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
  sleepList: {
    marginTop: 16,
  },
  sleepItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  sleepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sleepState: {
    flex: 1,
    fontSize: 16,
  },
  sleepDuration: {
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginTop: 16,
    textAlign: "center",
  },
  weeklyContainer: {
    marginTop: 16,
  },
  weeklyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  weeklyDay: {
    width: 40,
    fontSize: 14,
    color: "#666",
  },
  weeklyBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  weeklyBarFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  weeklySteps: {
    width: 60,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
});
