import { useEvent } from "expo";
import AppleHealth, { ActivityRingView, ActivitySummary } from "apple-health";
import { useState } from "react";
import {
  Button,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
} from "react-native";

export default function App() {
  const [authorized, setAuthorized] = useState(false);
  const [steps, setSteps] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [biologicalSex, setBiologicalSex] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);

  const healthKitUpdate = useEvent(AppleHealth, "onHealthKitUpdate");

  const isAvailable = AppleHealth.isAvailable();

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

  const fetchSteps = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await AppleHealth.queryStatistics(
        "stepCount",
        ["cumulativeSum"],
        {
          startDate: today.toISOString(),
          endDate: new Date().toISOString(),
        }
      );

      setSteps(result.sumQuantity ?? 0);
    } catch (error) {
      console.error("Fetch steps error:", error);
      Alert.alert("Error", String(error));
    }
  };

  const fetchHeartRate = async () => {
    try {
      const samples = await AppleHealth.queryQuantitySamples("heartRate", {
        limit: 1,
        ascending: false,
      });

      if (samples.length > 0) {
        setHeartRate(Math.round(samples[0].value));
      }
    } catch (error) {
      console.error("Fetch heart rate error:", error);
      Alert.alert("Error", String(error));
    }
  };

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

  const saveSteps = async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      await AppleHealth.saveQuantitySample(
        "stepCount",
        100,
        "count",
        fiveMinutesAgo.toISOString(),
        now.toISOString()
      );
      Alert.alert("Success", "Saved 100 steps");
    } catch (error) {
      console.error("Save steps error:", error);
      Alert.alert("Error", String(error));
    }
  };

  const saveWorkout = async () => {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      await AppleHealth.saveWorkout(
        "running",
        thirtyMinutesAgo.toISOString(),
        now.toISOString(),
        250,
        5000
      );
      Alert.alert("Success", "Saved 30 min running workout");
    } catch (error) {
      console.error("Save workout error:", error);
      Alert.alert("Error", String(error));
    }
  };

  const fetchWeeklySteps = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = await AppleHealth.queryStatisticsCollection(
        "stepCount",
        ["cumulativeSum"],
        {
          startDate: sevenDaysAgo.toISOString(),
          endDate: now.toISOString(),
          interval: "day",
        }
      );

      const summary = result
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

      <Group name="Read Data">
        <Button title="Fetch Today's Steps" onPress={fetchSteps} />
        <Text style={styles.status}>Steps Today: {steps ?? "Not fetched"}</Text>

        <View style={styles.spacer} />

        <Button title="Fetch Latest Heart Rate" onPress={fetchHeartRate} />
        <Text style={styles.status}>
          Heart Rate: {heartRate ? `${heartRate} bpm` : "Not fetched"}
        </Text>

        <View style={styles.spacer} />

        <Button title="Fetch Weekly Steps" onPress={fetchWeeklySteps} />
      </Group>

      <Group name="Write Data">
        <Button title="Save 100 Steps" onPress={saveSteps} />
        <View style={styles.spacer} />
        <Button title="Save Running Workout" onPress={saveWorkout} />
      </Group>

      <Group name="Activity Rings">
        <Button title="Fetch Today's Activity" onPress={fetchActivitySummary} />
        <View style={styles.ringsContainer}>
          <ActivityRingView
            summary={activitySummary ?? {
              activeEnergyBurned: 0,
              activeEnergyBurnedGoal: 500,
              appleExerciseTime: 0,
              appleExerciseTimeGoal: 30,
              appleStandHours: 0,
              appleStandHoursGoal: 12,
            }}
            style={styles.activityRings}
          />
        </View>
        {activitySummary && (
          <View style={styles.ringStats}>
            <Text style={styles.status}>
              Move: {Math.round(activitySummary.activeEnergyBurned)}/{Math.round(activitySummary.activeEnergyBurnedGoal)} kcal
            </Text>
            <Text style={styles.status}>
              Exercise: {Math.round(activitySummary.appleExerciseTime)}/{Math.round(activitySummary.appleExerciseTimeGoal)} min
            </Text>
            <Text style={styles.status}>
              Stand: {Math.round(activitySummary.appleStandHours)}/{Math.round(activitySummary.appleStandHoursGoal)} hrs
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
});
