import mapCatalog from "../public/maps/indoor.json";
import { demoUsers, lessons } from "./demo-data";
import { roomIsVisible, type MapFloor } from "./indoor-map";
import type { AvailableRoom, RoomClass, RoomEquipment } from "./room-calendar-types";
import type { Lesson } from "./catalog";
import { addCalendarDays, mondayOf, moscowDate } from "./room-calendar-types";
import { lessonOnDate } from "./lesson-occurrence";
import ruz from "./ruz-snapshot.json";

const rooms: AvailableRoom[] = mapCatalog.floors.flatMap((floor) =>
  floor.rooms
    .filter(
      (room) =>
        ["2", "3"].includes(room.type) &&
        roomIsVisible(room, floor as MapFloor),
    )
    .map((room) => {
      const key = `${floor.key}:${room.id}`;
      // The plan does not include capacity or equipment. These demo values are stable per room.
      const seed = Array.from(key).reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
      const equipment: RoomEquipment[] = ["board"];
      if (seed % 3 !== 0) equipment.push("projector");
      if (seed % 4 === 0) equipment.push("monitor");
      if (seed % 7 === 0) equipment.push("microphone");
      return { key, name: room.name, floor: floor.name, seats: [12, 18, 24, 32, 48, 64, 110][seed % 7], equipment };
    }),
);
const roomKeys = new Set(rooms.map((room) => room.key));
const roomNames = new Map(rooms.map((room) => [room.key, room.name]));
const students = demoUsers.filter((user) => user.role === "student").flatMap((user) =>
  lessons(user.id).map((lesson) => ({ lesson, group: user.group })),
);

// Illustrative grids only. Each fictional group can be assigned any teaching
// room. Personal demo timetables and the two room endpoints share these bookings.
const grids = [
  {
    group: "МЭО",
    slots: [
      ["09:20", "10:50"],
      ["11:10", "12:40"],
      ["13:30", "15:00"],
    ],
    subjects: ["Мировая экономика", "Финансы", "Эконометрика"],
  },
  {
    group: "МП",
    slots: [
      ["09:00", "10:20"],
      ["10:30", "11:50"],
      ["12:10", "13:40"],
    ],
    subjects: ["Гражданское право", "Теория права", "Международное право"],
  },
  {
    group: "ЖУР",
    slots: [
      ["10:00", "11:30"],
      ["12:00", "13:30"],
      ["14:30", "16:00"],
    ],
    subjects: ["Медиапрактика", "Редактирование", "История журналистики"],
  },
];

export const scheduleGroups = [
  ...ruz.groups.map(({ group, course }) => ({ code: group, course, source: "ruz" })),
  ...demoUsers.filter((user) => user.role === "student").map((user) => ({ code: user.group, course: user.course })),
  { code: "МП-21", course: 2 },
  ...grids.flatMap(({ group }) => Array.from({ length: 18 }, (_, index) => ({
    code: `${group}-${31 + index}`,
    course: Math.floor((31 + index) / 10),
  }))),
];

export const ruzCoverage = { from: ruz.from, to: ruz.to, capturedOn: ruz.capturedOn, url: ruz.source };
const mappedRooms = mapCatalog.floors.flatMap(floor => floor.rooms
  .filter(room => roomIsVisible(room, floor as MapFloor))
  .map(room => ({ key: floor.key + ":" + room.id, name: room.name.toLocaleLowerCase("ru"), newBuilding: floor.key.startsWith("n") })));
const importedClasses = ruz.groups.flatMap(({ group, entries }) => entries.map(entry => {
  const matches = mappedRooms.filter(room => room.name === entry.room.toLocaleLowerCase("ru")
    && room.newBuilding === entry.location.includes("(Новый корпус)"));
  const lesson: Lesson = {
    id: entry.id, day: weekday(entry.date), start: entry.start, end: entry.end,
    kind: entry.kind === "семинар" ? "Семинар" : entry.kind, subject: entry.subject,
    teacher: entry.teacher, slot: entry.slot, stream: entry.stream, room: entry.room,
    location: entry.location, roomId: matches.length === 1 ? matches[0].key : undefined,
  };
  return { group, date: entry.date, lesson };
}));

export function isRuzGroup(code: string) {
  return ruz.groups.some(group => group.group === code);
}

export function languageStreams(code: string) {
  const group = ruz.groups.find(item => item.group === code);
  return [...new Set(group?.entries.map(e => e.stream).filter(stream =>
    /^\d+-[а-яё]+\/[а-яё]+\s/i.test(stream) && stream.endsWith("(" + code + ")")))].sort();
}

export function groupSchedule(code: string, week = mondayOf(moscowDate())): Lesson[] | undefined {
  if (!scheduleGroups.some((group) => group.code === code)) return undefined;
  if (isRuzGroup(code)) {
    const end = addCalendarDays(week, 7);
    return importedClasses.filter(entry => entry.group === code && entry.date >= week && entry.date < end)
      .map(entry => entry.lesson).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  }
  const student = demoUsers.find((user) => user.group === code);
  if (student) {
    return lessons(student.id).map((lesson) => lessonOnDate(lesson, addCalendarDays(week, lesson.day)));
  }
  // This grid uses the same room assignments as the room availability view.
  return [0, 1, 2, 3, 4].flatMap((day) => {
    const entries: Lesson[] = [];
    for (const [roomId, bookings] of roomBookings(addCalendarDays(week, day))) {
      for (const { group, start, end, subject } of bookings) {
        if (group !== code) continue;
        entries.push({
          id: `${code}-${day}-${start}`, day, start, end, subject,
          room: roomNames.get(roomId)!, roomId,
          kind: "Занятие", teacher: "",
        });
      }
    }
    return entries.sort((a, b) => a.start.localeCompare(b.start));
  });
}

function overlaps(start: string, end: string, lesson: RoomClass) {
  return lesson.start < end && start < lesson.end;
}

function roomBookings(date: string) {
  const day = weekday(date);
  const bookings = new Map<string, RoomClass[]>();

  function book(key: string, entry: RoomClass) {
    const entries = bookings.get(key) || [];
    entries.push(entry);
    bookings.set(key, entries);
  }

  for (const entry of importedClasses) {
    const { roomId, start, end, subject } = entry.lesson;
    if (entry.date === date && roomId && roomKeys.has(roomId)) {
      book(roomId, { start, end, subject, group: entry.group });
    }
  }
  if (day >= 5) return bookings;

  for (const { lesson, group } of students) {
    if (lesson.day !== day) continue;
    const { roomId, start, end, subject } = lessonOnDate(lesson, date);
    if (roomId && roomKeys.has(roomId)) book(roomId, { start, end, subject, group });
  }
  // A shared room with differently timed groups, for the Friday demo.
  if (day === 4) {
    book("b3:3018", {
      start: "12:10",
      end: "13:40",
      subject: "Международное право",
      group: "МП-21",
    });
  }
  grids.forEach(({ group, slots, subjects }, gridIndex) => {
    for (let index = 0; index < 18; index++) {
      slots.forEach(([start, end], slot) => {
        const offset =
          (day * 47 + gridIndex * 61 + index * 13 + slot * 29) % rooms.length;
        for (let step = 0; step < rooms.length; step++) {
          const { key } = rooms[(offset + step) % rooms.length];
          if (bookings.get(key)?.some((entry) => overlaps(start, end, entry)))
            continue;
          book(key, {
            start,
            end,
            subject: subjects[(day + slot) % subjects.length],
            group: `${group}-${31 + index}`,
          });
          break;
        }
      });
    }
  });
  return bookings;
}

export function isTeachingRoom(key: string) {
  return roomKeys.has(key);
}

function weekday(date: string) {
  return (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
}

export function buildRoomCalendar(roomKey: string, date: string) {
  const lessons = roomBookings(date).get(roomKey) || [];
  return {
    roomKey,
    date,
    source: "demo",
    timezone: "Europe/Moscow",
    lessons: lessons.sort((a, b) => a.start.localeCompare(b.start)),
  } as const;
}

export function findAvailableRooms(date: string, start: string, end: string) {
  const bookings = roomBookings(date);
  return rooms.filter(
    ({ key }) =>
      !bookings.get(key)?.some((entry) => overlaps(start, end, entry)),
  );
}

export function validRoomInterval(start: string, end: string) {
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return (
    clock.test(start) &&
    clock.test(end) &&
    start >= "08:00" &&
    end <= "21:00" &&
    start < end
  );
}
