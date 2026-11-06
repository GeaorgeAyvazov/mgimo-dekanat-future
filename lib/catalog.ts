export const services = [
  {
    id: "enrollment-ru",
    title: "Справка об обучении",
    language: "На русском языке",
    description: "Для работы, банка или по месту требования",
    term: "До 15 минут онлайн",
    automatic: true,
    icon: "file",
    fields: ["organization"],
  },
  {
    id: "enrollment-en",
    title: "Справка об обучении",
    language: "На английском языке",
    description: "Подтверждение обучения для зарубежных организаций",
    term: "До 3 рабочих дней",
    automatic: false,
    icon: "globe",
    fields: ["latinName", "phone", "organization"],
  },
  {
    id: "grades-ru",
    title: "Выписка из зачётной книжки",
    language: "На русском языке",
    description: "Все оценки и зачёты в одном документе",
    term: "До 3 рабочих дней",
    automatic: false,
    icon: "list",
    fields: [],
  },
  {
    id: "transcript-en",
    title: "Академический транскрипт",
    language: "На английском языке",
    description: "Результаты обучения для обмена или поступления",
    term: "До 3 рабочих дней",
    automatic: false,
    icon: "book",
    fields: ["latinName"],
  },
  {
    id: "english-level",
    title: "Справка об уровне английского",
    language: "На английском языке",
    description: "Подтверждение уровня владения языком",
    term: "До 3 рабочих дней",
    automatic: false,
    icon: "award",
    fields: ["latinName", "phone"],
  },
  {
    id: "question",
    title: "Обращение в сервисный центр",
    language: "Вопрос и ответ сотрудника",
    description: "Задайте вопрос — мы направим его в нужное подразделение",
    term: "До 3 рабочих дней",
    automatic: false,
    icon: "message",
    fields: ["topic", "message"],
  },
] as const;
export const topics = [
  {
    id: "documents",
    label: "Справки и документы",
    department: "Сервисный центр",
  },
  {
    id: "academic",
    label: "Учебный процесс",
    department: "Учебный офис филиала",
  },
  {
    id: "mobility",
    label: "Обмен и международные программы",
    department: "Международный отдел",
  },
  { id: "finance", label: "Оплата и договор", department: "Договорной отдел" },
  {
    id: "technical",
    label: "Доступ в учебные системы",
    department: "Поддержка цифровых сервисов",
  },
] as const;
export type Service = (typeof services)[number];
export const statuses: Record<string, string> = {
  created: "Заявка принята",
  working: "В работе",
  needs_info: "Нужен ваш ответ",
  ready: "Готово",
  cancelled: "Отменена",
};
export type Student = {
  id: string;
  role: string;
  name: string;
  faculty: string;
  program: string;
  course: number;
  student_group: string;
  latin_name: string;
  email: string;
  login: string;
};
export type Grade = {
  subject: string;
  type: string;
  score: number | null;
  result: string;
  teacher: string;
  date: string;
};
export type Case = {
  id: string;
  owner_id: string;
  service: string;
  format: string;
  organization: string;
  latin_name: string;
  phone: string;
  recipient: string;
  representative: string;
  topic?: string;
  message?: string;
  department?: string;
  status: string;
  created_at: string;
  due_at: string;
  student_name?: string;
  student_group?: string;
  events?: CaseEvent[];
};
export type CaseEvent = {
  id: string;
  status: string;
  comment: string;
  created_at: string;
};
export type Lesson = {
  id: string;
  day: number;
  start: string;
  end: string;
  subject: string;
  kind: string;
  room: string;
  roomId?: string;
  teacher: string;
  change?: string;
  oldRoom?: string;
};
export type Notice = {
  id: string;
  title: string;
  text: string;
  type: string;
  date: string;
  read: boolean;
  link?: string;
  requestId?: string;
  actionLabel?: string;
};
export function dateLabel(value: string, time = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}
