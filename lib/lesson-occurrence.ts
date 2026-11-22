import type { Lesson } from "./catalog";

/** Resolve a weekly lesson against the date when its room assignment changed. */
export function lessonOnDate(lesson: Lesson, date: string): Lesson {
  if (!lesson.changeDate || date === lesson.changeDate) return lesson;
  const { changeDate, oldRoom, oldRoomId, ...occurrence } = lesson;
  delete occurrence.change;
  if (date < changeDate && oldRoom) {
    occurrence.room = oldRoom;
    occurrence.roomId = oldRoomId;
  }
  return occurrence;
}
