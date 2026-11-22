import type { Grade } from "./catalog";

export const examReasons = {
  absence: "Подтвердить уважительный пропуск",
  reschedule: "Запросить перенос экзамена или пересдачи",
} as const;

export const profileReasons = {
  profile: "Ошибка в профиле",
  studentId: "Ошибка в студенческом билете",
  official: "Официальное изменение данных",
} as const;

export const profileFields = {
  name: "Фамилия, имя или отчество",
  latinName: "Имя и фамилия латиницей",
  record: "Факультет, направление, курс или группа",
  idDocument: "Документ, удостоверяющий личность",
  other: "Другие сведения",
} as const;

export function getExamOptions(grades: readonly Grade[]) {
  return grades.flatMap((grade, index) =>
    grade.type === "Экзамен"
      ? [{ value: String(index), subject: grade.subject, date: grade.date }]
      : [],
  );
}
