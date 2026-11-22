import type { Lesson } from "./catalog";
import { addCalendarDays } from "./room-calendar-types";
import { lessonOnDate } from "./lesson-occurrence";

const encoder = new TextEncoder();

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/[;,]/g, "\\$&");
}

function fold(line: string) {
  let result = "";
  let size = 0;
  for (const char of line) {
    const width = encoder.encode(char).length;
    if (size + width > 75) {
      result += "\r\n ";
      size = 1;
    }
    result += char;
    size += width;
  }
  return result;
}

function utcStamp(date: Date) {
  return date.toISOString().slice(0, 19).replace(/[-:]/g, "") + "Z";
}

export function scheduleCalendar(week: string, lessons: Lesson[], group: string, now = new Date(), official = false) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Student Service Centre//Timetable//RU",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(`МГИМО · ${group} · ${official ? "РУЗ" : "демо"}`)}`,
  ];
  for (const template of lessons) {
    const date = addCalendarDays(week, template.day);
    const lesson = lessonOnDate(template, date);
    const at = (time: string) => utcStamp(new Date(`${date}T${time}:00+03:00`));
    const description = [official ? "РУЗ МГИМО" : "Демонстрационное занятие", `Группа ${group}`, lesson.kind];
    if (lesson.stream && lesson.stream !== group) description.push(lesson.stream);
    if (lesson.teacher) description.push(lesson.teacher);
    if (lesson.change) description.push(`${lesson.change}. Ранее: ${lesson.oldRoom}`);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(`${date}-${lesson.id}`)}@dekanat.example.test`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${at(lesson.start)}`,
      `DTEND:${at(lesson.end)}`,
      `SUMMARY:${escapeText(lesson.subject)}`,
      `LOCATION:${escapeText(lesson.location || `Аудитория ${lesson.room}`)}`,
      `DESCRIPTION:${escapeText(description.join("\n"))}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
