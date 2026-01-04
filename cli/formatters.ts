import type {
  QuantitySample,
  CategorySample,
  WorkoutSample,
  ActivitySummary,
} from "./types";

export function formatTypeName(type: string): string {
  // Convert camelCase to Title Case with spaces
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

export function formatValue(value: number, unit: string): string {
  const formatted = value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  return `${formatted} ${unit}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatSamplesTable(samples: QuantitySample[]): string {
  const lines: string[] = [];
  const header = `  ${"Date".padEnd(24)} ${"Value".padStart(12)} ${"Source".padEnd(20)}`;
  lines.push(header);

  for (const sample of samples) {
    const date = formatDate(sample.startDate);
    const value = formatValue(sample.value, sample.unit);
    const source = sample.sourceName.substring(0, 20);
    lines.push(`  ${date.padEnd(24)} ${value.padStart(12)} ${source.padEnd(20)}`);
  }

  return lines.join("\n");
}

export function formatCategorySamplesTable(samples: CategorySample[]): string {
  const lines: string[] = [];
  const header = `  ${"Date".padEnd(24)} ${"Value".padStart(8)} ${"Source".padEnd(20)}`;
  lines.push(header);

  for (const sample of samples) {
    const date = formatDate(sample.startDate);
    const source = sample.sourceName.substring(0, 20);
    lines.push(`  ${date.padEnd(24)} ${String(sample.value).padStart(8)} ${source.padEnd(20)}`);
  }

  return lines.join("\n");
}

export function formatWorkoutsTable(workouts: WorkoutSample[]): string {
  const lines: string[] = [];
  const header = `  ${"Date".padEnd(20)} ${"Activity".padEnd(20)} ${"Duration".padStart(10)} ${"Energy".padStart(10)}`;
  lines.push(header);

  for (const workout of workouts) {
    const date = formatDate(workout.startDate).substring(0, 20);
    const activity = formatTypeName(workout.workoutActivityType).substring(0, 20);
    const duration = formatDuration(workout.duration);
    const energy = workout.totalEnergyBurned
      ? `${Math.round(workout.totalEnergyBurned)} kcal`
      : "-";

    lines.push(
      `  ${date.padEnd(20)} ${activity.padEnd(20)} ${duration.padStart(10)} ${energy.padStart(10)}`
    );
  }

  return lines.join("\n");
}

export function formatActivityTable(summaries: ActivitySummary[]): string {
  const lines: string[] = [];
  const header = `  ${"Date".padEnd(12)} ${"Move".padStart(12)} ${"Exercise".padStart(12)} ${"Stand".padStart(12)}`;
  lines.push(header);

  for (const summary of summaries) {
    const { year, month, day } = summary.dateComponents;
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const move = `${Math.round(summary.activeEnergyBurned)}/${Math.round(summary.activeEnergyBurnedGoal)}`;
    const exercise = `${summary.appleExerciseTime}/${summary.appleExerciseTimeGoal}m`;
    const stand = `${summary.appleStandHours}/${summary.appleStandHoursGoal}h`;

    lines.push(
      `  ${date.padEnd(12)} ${move.padStart(12)} ${exercise.padStart(12)} ${stand.padStart(12)}`
    );
  }

  return lines.join("\n");
}
