/**
 * Relative date parsing for CLI commands
 *
 * Supports:
 * - "now" - current time
 * - "today", "yesterday", "tomorrow" - start of day
 * - "today 8am", "yesterday 10:30pm" - day + time
 * - "-1d", "-7d", "+2d" - relative days from now
 * - "-1h", "-30m" - relative hours/minutes from now
 * - "-1d 8am" - relative day at specific time
 * - "2026-01-04" - date only (start of day)
 * - "2026-01-04 14:30" - date + time
 * - Full ISO8601 - passed through
 */

export function parseRelativeDate(input: string): string {
  const now = new Date();
  const trimmed = input.trim().toLowerCase();

  // Already ISO8601 with time component
  if (/^\d{4}-\d{2}-\d{2}T/.test(input)) {
    // Ensure fractional seconds for HealthKit
    if (!input.includes(".")) {
      return input.replace(/Z$/, ".000Z").replace(/([+-]\d{2}:\d{2})$/, ".000$1");
    }
    return input;
  }

  // Parse the input
  let baseDate = new Date(now);
  let timeSpec: string | null = null;

  // Split into date part and time part
  const parts = trimmed.split(/\s+/);
  const datePart = parts[0];
  const timePart = parts.slice(1).join(" ");

  // Handle date part
  if (datePart === "now") {
    baseDate = now;
  } else if (datePart === "today") {
    baseDate = startOfDay(now);
  } else if (datePart === "yesterday") {
    baseDate = startOfDay(addDays(now, -1));
  } else if (datePart === "tomorrow") {
    baseDate = startOfDay(addDays(now, 1));
  } else if (/^[+-]\d+d$/.test(datePart)) {
    // Relative days: -1d, +7d
    const days = parseInt(datePart.slice(0, -1));
    baseDate = startOfDay(addDays(now, days));
  } else if (/^[+-]\d+h$/.test(datePart)) {
    // Relative hours: -1h, +2h
    const hours = parseInt(datePart.slice(0, -1));
    baseDate = addHours(now, hours);
  } else if (/^[+-]\d+m$/.test(datePart)) {
    // Relative minutes: -30m, +15m
    const minutes = parseInt(datePart.slice(0, -1));
    baseDate = addMinutes(now, minutes);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    // Date only: 2026-01-04
    baseDate = new Date(datePart + "T00:00:00");
  } else {
    // Try to parse as-is
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return toISO8601(parsed);
    }
    throw new Error(`Cannot parse date: "${input}"`);
  }

  // Handle time part if present
  if (timePart) {
    const time = parseTime(timePart);
    if (time) {
      baseDate.setHours(time.hours, time.minutes, 0, 0);
    }
  }

  return toISO8601(baseDate);
}

function parseTime(input: string): { hours: number; minutes: number } | null {
  // 8am, 10pm, 8:30am, 10:30pm, 14:30, 8:00
  const match = input.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i
  );

  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  return { hours, minutes };
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + minutes * 60 * 1000);
  return result;
}

function toISO8601(date: Date): string {
  return date.toISOString(); // Always includes .000Z
}

/**
 * Parse duration string to end date
 * Supports: "1h", "30m", "1d", "1h30m"
 */
export function parseDuration(start: Date, duration: string): string {
  const result = new Date(start);
  const trimmed = duration.trim().toLowerCase();

  // Match patterns like "1h", "30m", "1d", "1h30m"
  const dayMatch = trimmed.match(/(\d+)d/);
  const hourMatch = trimmed.match(/(\d+)h/);
  const minMatch = trimmed.match(/(\d+)m(?!s)/); // m but not ms

  if (dayMatch) {
    result.setDate(result.getDate() + parseInt(dayMatch[1]));
  }
  if (hourMatch) {
    result.setTime(result.getTime() + parseInt(hourMatch[1]) * 60 * 60 * 1000);
  }
  if (minMatch) {
    result.setTime(result.getTime() + parseInt(minMatch[1]) * 60 * 1000);
  }

  return toISO8601(result);
}

/**
 * Get start and end of a day for daily aggregates
 */
export function dayRange(input: string): { start: string; end: string } {
  const date = new Date(parseRelativeDate(input));
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(-1);

  return {
    start: toISO8601(start),
    end: toISO8601(end),
  };
}
