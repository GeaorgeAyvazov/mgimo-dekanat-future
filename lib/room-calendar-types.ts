export type RoomClass = {
  start: string;
  end: string;
  subject: string;
  group: string;
};
export type RoomCalendarDay = {
  roomKey: string;
  date: string;
  timezone: "Europe/Moscow";
  source: "demo";
  lessons: RoomClass[];
};
export type AvailableRoom = {
  key: string;
  name: string;
  floor: string;
  seats: number;
  equipment: RoomEquipment[];
};
export const roomEquipment = {
  projector: "Проектор",
  monitor: "Монитор",
  board: "Доска",
  microphone: "Микрофон",
} as const;
export type RoomEquipment = keyof typeof roomEquipment;
export const teachingBuildings = ["Корпус Б", "Корпус В", "Корпус Г", "Новый корпус", "Библиотека"];
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
export function mondayOf(date: string) {
  return addCalendarDays(date, -((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7));
}

export function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T12:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function moscowClock(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
}
