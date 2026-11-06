export type RoomInterval = {
  start: string;
  end: string;
  state: "free" | "busy";
};
export type RoomCalendarDay = {
  roomKey: string;
  date: string;
  today: string;
  timezone: "Europe/Moscow";
  source: "demo";
  asOf: string;
  intervals: RoomInterval[];
  current?: { state: "free" | "busy" | "closed"; until?: string };
};
export function moscowDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (name: string) => parts.find((part) => part.type === name)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function addCalendarDays(date: string, days: number) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
