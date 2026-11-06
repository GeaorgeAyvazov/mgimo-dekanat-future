import type { Lesson, Notice } from "./catalog";
// Entirely invented examples, imported only on the server.
export const demoUsers = [
  {
    id: "student-alina",
    login: "alina.demo",
    name: "Алина Сергеевна Лебедева",
    faculty: "Факультет международных отношений",
    program: "Международные отношения",
    course: 2,
    group: "МО-21",
    latin: "Alina Lebedeva",
    email: "alina@example.test",
    role: "student",
    grades: [
      {
        subject: "Международные отношения",
        type: "Экзамен",
        score: 92,
        result: "Отлично",
        teacher: "В. А. Соколов",
        date: "2026-06-19",
      },
      {
        subject: "Английский язык",
        type: "Экзамен",
        score: 88,
        result: "Хорошо",
        teacher: "Е. И. Морозова",
        date: "2026-06-22",
      },
      {
        subject: "Экономическая теория",
        type: "Экзамен",
        score: 95,
        result: "Отлично",
        teacher: "М. О. Белова",
        date: "2026-06-25",
      },
      {
        subject: "История дипломатии",
        type: "Зачёт",
        score: null,
        result: "Зачтено",
        teacher: "П. Л. Волков",
        date: "2026-06-15",
      },
      {
        subject: "Право международных организаций",
        type: "Зачёт",
        score: null,
        result: "Зачтено",
        teacher: "А. Д. Орлова",
        date: "2026-06-16",
      },
      {
        subject: "Физическая культура",
        type: "Зачёт",
        score: null,
        result: "Зачтено",
        teacher: "О. С. Мельников",
        date: "2026-06-11",
      },
    ],
  },
  {
    id: "student-maxim",
    login: "maxim.demo",
    name: "Максим Ильич Крылов",
    faculty: "Факультет управления и бизнеса",
    program: "Бизнес-информатика",
    course: 3,
    group: "БИ-31",
    latin: "Maxim Krylov",
    email: "maxim@example.test",
    role: "student",
    grades: [
      {
        subject: "Базы данных",
        type: "Экзамен",
        score: 96,
        result: "Отлично",
        teacher: "А. П. Ким",
        date: "2026-06-20",
      },
      {
        subject: "Менеджмент",
        type: "Экзамен",
        score: 79,
        result: "Хорошо",
        teacher: "И. А. Новикова",
        date: "2026-06-24",
      },
      {
        subject: "Статистика",
        type: "Экзамен",
        score: 64,
        result: "Удовлетворительно",
        teacher: "Д. Ю. Петров",
        date: "2026-06-27",
      },
      {
        subject: "Английский язык",
        type: "Зачёт",
        score: null,
        result: "Зачтено",
        teacher: "Е. И. Морозова",
        date: "2026-06-16",
      },
      {
        subject: "Проектный практикум",
        type: "Зачёт",
        score: null,
        result: "Зачтено",
        teacher: "А. П. Ким",
        date: "2026-06-18",
      },
    ],
  },
  {
    id: "staff-demo",
    login: "office.demo",
    name: "Марина Александровна Светлова",
    faculty: "Студенческий сервисный центр",
    program: "Обработка обращений",
    course: 0,
    group: "Сотрудник",
    latin: "Marina Svetlova",
    email: "office@example.test",
    role: "staff",
    grades: [],
  },
];
export function lessons(userId: string): Lesson[] {
  const a = userId === "student-alina";
  const titles = a
    ? [
        "Международные отношения",
        "Английский язык",
        "История дипломатии",
        "Экономическая теория",
        "Право международных организаций",
      ]
    : [
        "Базы данных",
        "Английский язык",
        "Проектный практикум",
        "Менеджмент",
        "Статистика",
      ];
  const teachers = a
    ? [
        "В. А. Соколов",
        "Е. И. Морозова",
        "П. Л. Волков",
        "М. О. Белова",
        "А. Д. Орлова",
      ]
    : [
        "А. П. Ким",
        "Е. И. Морозова",
        "А. П. Ким",
        "И. А. Новикова",
        "Д. Ю. Петров",
      ];
  return [0, 1, 2, 3, 4].flatMap((day) =>
    [0, 1, 2].map((slot) => {
      const n = (day + slot) % 5,
        changed = day === 4 && slot === 1;
      // Real room IDs from the public Moscow campus map. Lessons and students
      // are fictional. Keeping the explicit floor key avoids guessing an ID.
      const rooms = a
        ? [
            "2009",
            "2010",
            "2011",
            "2016",
            "2017",
            "2039",
            "2040",
            "2041",
            "2042",
            "2043",
            "2045",
          ]
        : [
            "3018",
            "3019",
            "3041",
            "3042",
            "3043",
            "3045",
            "3046",
            "3047",
            "3048",
            "3051",
          ];
      const originalRoom = rooms[(day * 3 + slot) % rooms.length];
      const actualRoom = changed ? (a ? "3018" : "2009") : originalRoom;
      const actualFloor = changed ? (a ? "b3" : "b2") : a ? "b2" : "b3";
      return {
        id: `${userId}-${day}-${slot}`,
        day,
        start: ["09:00", "10:40", "13:00"][slot],
        end: ["10:20", "12:00", "14:20"][slot],
        subject: titles[n],
        teacher: teachers[n],
        kind: slot === 0 ? "Лекция" : "Семинар",
        room: actualRoom,
        roomId: `${actualFloor}:${actualRoom}`,
        ...(changed
          ? { change: "Изменилась аудитория", oldRoom: originalRoom }
          : {}),
      };
    }),
  );
}
export function notices(userId: string): Omit<Notice, "read">[] {
  const date = "2026-11-05T09:00:00.000Z";
  return [
    {
      id: "room-change",
      title: "Новая аудитория в пятницу",
      text: `Вторая пара пройдёт в ${userId === "student-alina" ? "3018 вместо 2011" : "2009 вместо 3042"}. В расписании уже указана новая аудитория.`,
      type: "schedule",
      date,
      link: "schedule",
    },
    {
      id: "exchange-deadline",
      title: "Заявки на академическую мобильность",
      text: "До 20 ноября можно подать учебную заявку на обмен. Для пакета документов пригодится транскрипт на английском.",
      type: "deadline",
      date,
      link: "services",
    },
    {
      id: `${userId}-welcome`,
      title: "Заказ документов в сервисном центре",
      text: "Выберите документ, проверьте данные и способ получения. Статус и готовый файл появятся здесь, в личном кабинете.",
      type: "news",
      date,
      link: "services",
    },
  ];
}
