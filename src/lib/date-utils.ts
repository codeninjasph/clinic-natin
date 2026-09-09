/**
 * Philippine Standard Time (PHT, UTC+8) Date & Time Utilities
 * Enforces clinic schedule integrity regardless of client browser or server timezone.
 */

export const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_FULL_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface ManilaTimeInfo {
  isoDay: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun
  dayName: string; // "Wednesday"
  dayShort: string; // "Wed"
  hours: number; // 0..23
  minutes: number; // 0..59
  seconds: number; // 0..59
  minutesSinceMidnight: number; // 0..1439
  time24: string; // "14:30"
  time12: string; // "2:30 PM"
  dateString: string; // "YYYY-MM-DD"
}

export type ClinicSessionState =
  | 'CLOSED_TODAY'      // No schedule on this day of week
  | 'BEFORE_SESSION'   // Today is an active day, but clinic has not opened yet (e.g., 3:00 AM before 1:00 PM)
  | 'IN_SESSION'       // Currently within active consultation window
  | 'AFTER_SESSION';   // Today was an active day, but consultation hours have ended

/**
 * Returns current date and time anchored strictly to Asia/Manila (UTC+8).
 */
export function getManilaNow(): ManilaTimeInfo {
  const now = new Date();

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const weekday = partMap.weekday || 'Monday';
  const hours = parseInt(partMap.hour || '0', 10);
  const minutes = parseInt(partMap.minute || '0', 10);
  const seconds = parseInt(partMap.second || '0', 10);
  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';

  const weekdayMap: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };

  const isoDay = weekdayMap[weekday] || 1;
  const minutesSinceMidnight = hours * 60 + minutes;
  const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  
  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const time12 = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  const dateString = `${year}-${month}-${day}`;

  return {
    isoDay,
    dayName: weekday,
    dayShort: DAY_NAMES[isoDay] || 'Mon',
    hours,
    minutes,
    seconds,
    minutesSinceMidnight,
    time24,
    time12,
    dateString,
  };
}

/**
 * Parses time string (e.g. "13:30:00" or "13:30" or "1:30 PM") into minutes since midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;

  // Check 12-hour format e.g. "1:30 PM"
  const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3]?.toUpperCase();

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // 24-hour format e.g. "13:30:00"
  const parts = timeStr.split(':').map((s) => parseInt(s, 10));
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Formats a time string into standard Philippine 12-hour display e.g. "1:00 PM"
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Evaluates session state for a clinic schedule against Manila time.
 * @param schedule Today's schedule record (or undefined if no schedule today)
 * @param manilaNow Current Manila time info
 * @param earlyCheckinMinutes Allowance before start time (default 15 minutes)
 */
export function getClinicSessionState(
  schedule: { start_time: string; end_time: string; is_active?: boolean } | null | undefined,
  manilaNow: ManilaTimeInfo,
  earlyCheckinMinutes: number = 15
): {
  state: ClinicSessionState;
  startMinutes: number;
  endMinutes: number;
  startTimeDisplay: string;
  endTimeDisplay: string;
  minutesUntilStart: number;
  minutesAfterEnd: number;
} {
  if (!schedule || schedule.is_active === false) {
    return {
      state: 'CLOSED_TODAY',
      startMinutes: 0,
      endMinutes: 0,
      startTimeDisplay: '',
      endTimeDisplay: '',
      minutesUntilStart: 0,
      minutesAfterEnd: 0,
    };
  }

  const startMinutes = parseTimeToMinutes(schedule.start_time);
  const endMinutes = parseTimeToMinutes(schedule.end_time);
  const currentMinutes = manilaNow.minutesSinceMidnight;

  const minutesUntilStart = startMinutes - currentMinutes;
  const minutesAfterEnd = currentMinutes - endMinutes;

  const startTimeDisplay = formatTimeDisplay(schedule.start_time);
  const endTimeDisplay = formatTimeDisplay(schedule.end_time);

  // If more than earlyCheckinMinutes before opening (e.g. 3:00 AM before 1:00 PM clinic)
  if (currentMinutes < startMinutes - earlyCheckinMinutes) {
    return {
      state: 'BEFORE_SESSION',
      startMinutes,
      endMinutes,
      startTimeDisplay,
      endTimeDisplay,
      minutesUntilStart,
      minutesAfterEnd: 0,
    };
  }

  // If past consultation end time
  if (currentMinutes > endMinutes) {
    return {
      state: 'AFTER_SESSION',
      startMinutes,
      endMinutes,
      startTimeDisplay,
      endTimeDisplay,
      minutesUntilStart: 0,
      minutesAfterEnd,
    };
  }

  return {
    state: 'IN_SESSION',
    startMinutes,
    endMinutes,
    startTimeDisplay,
    endTimeDisplay,
    minutesUntilStart: 0,
    minutesAfterEnd: 0,
  };
}
