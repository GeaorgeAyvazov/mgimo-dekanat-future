import { lessons } from "./demo-data";
import { moscowDate, type RoomCalendarDay } from "./room-calendar-types";

const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const time = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

// A separate, deterministic room calendar: includes both fixture groups and
// fictional occupancy elsewhere in the building. It is never inferred from
// the signed-in student's personal schedule and exposes no groups or names.
export function buildRoomCalendar(
  roomKey: string,
  date: string,
  now = new Date(),
): RoomCalendarDay {
  const weekday = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  const bookings: [number, number][] = [
    "student-alina",
    "student-maxim",
  ].flatMap((id) =>
    lessons(id)
      .filter((lesson) => lesson.day === weekday && lesson.roomId === roomKey)
      .map(
        (lesson) =>
          [minutes(lesson.start), minutes(lesson.end)] as [number, number],
      ),
  );
  let seed = 2166136261;
  for (const char of roomKey + date)
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  if (weekday < 5) {
    const starts = [540, 640, 780, 880, 980, 1080];
    starts.forEach((start, index) => {
      if ((seed >>> index) & 1) bookings.push([start, start + 80]);
    });
  }
  const merged: [number, number][] = [];
  for (const booking of bookings.sort((a, b) => a[0] - b[0])) {
    const previous = merged.at(-1);
    if (previous && booking[0] <= previous[1])
      previous[1] = Math.max(previous[1], booking[1]);
    else merged.push([...booking]);
  }
  const intervals: RoomCalendarDay["intervals"] = [];
  let cursor = 480;
  for (const [start, end] of merged) {
    if (start > cursor)
      intervals.push({ start: time(cursor), end: time(start), state: "free" });
    intervals.push({ start: time(start), end: time(end), state: "busy" });
    cursor = end;
  }
  if (cursor < 1260)
    intervals.push({ start: time(cursor), end: "21:00", state: "free" });
  const today = moscowDate(now);
  const result: RoomCalendarDay = {
    roomKey,
    date,
    today,
    timezone: "Europe/Moscow",
    source: "demo",
    asOf: now.toISOString(),
    intervals,
  };
  if (date === today) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const currentMinutes =
      Number(parts.find((part) => part.type === "hour")!.value) * 60 +
      Number(parts.find((part) => part.type === "minute")!.value);
    const active = intervals.find(
      (period) =>
        minutes(period.start) <= currentMinutes &&
        minutes(period.end) > currentMinutes,
    );
    result.current = active
      ? { state: active.state, until: active.end }
      : { state: "closed" };
  }
  return result;
}

export function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
