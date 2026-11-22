import { applicationServices } from "./service-directory";

const baseServices = [
  {
    id: "enrollment-ru",
    title: "Справка об обучении",
    language: "На русском языке",
    description: "Для работы, банка или по месту требования",
    term: "Мгновенно в электронном виде",
    automatic: true,
    icon: "file",
    fields: ["organization"],
  },
  {
    id: "enrollment-en",
    title: "Справка об обучении",
    language: "На английском языке",
    description: "Подтверждение обучения для зарубежных организаций",
    term: "Мгновенно в электронном виде",
    automatic: true,
    icon: "globe",
    fields: ["latinName", "organization"],
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
    id: "study-period",
    title: "Справка о периоде обучения",
    language: "На русском языке",
    description: "Подтверждает даты и результаты обучения, например, при переводе",
    term: "До 3 рабочих дней в демо",
    automatic: false,
    icon: "book",
    fields: ["organization"],
  },
  {
    id: "tuition-payment",
    title: "Справка об оплате обучения",
    language: "На русском языке",
    description: "Показывает учтённую оплату за 2025/2026 учебный год",
    category: "finance",
    department: "Бухгалтерия",
    term: "До 3 рабочих дней в демо",
    automatic: false,
    icon: "file",
    fields: ["organization"],
  },
  {
    id: "scholarship-amount",
    title: "Справка о размере стипендии",
    language: "На русском языке",
    description: "Показывает начисления за сентябрь — ноябрь 2025 года",
    category: "finance",
    department: "Бухгалтерия",
    term: "До 3 рабочих дней в демо",
    automatic: false,
    icon: "file",
    fields: ["organization"],
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
  {
    id: "feedback",
    title: "Сообщение о проблеме",
    language: "Обратная связь",
    description: "Обращение к координатору сервисного центра",
    automatic: false,
    icon: "message",
    fields: ["feedbackReason", "message"],
  },
] as const;
type BaseService = (typeof baseServices)[number];
export type DocumentService = Exclude<
  BaseService,
  { id: "question" | "feedback" }
>;
export const services = [
  ...baseServices,
  ...applicationServices.map((service) => ({
    ...service,
    language: "Первичный запрос",
    automatic: false,
    fields: [],
  })),
] as const;

export function isDocumentService(id: string) {
  return baseServices.some(
    (service) =>
      service.id === id &&
      service.id !== "question" &&
      service.id !== "feedback",
  );
}

export const feedbackDepartment = "Координатор сервисного центра";
export const feedbackReasons = [
  { id: "delay", label: "Задержка или пропущенный срок" },
  { id: "quality", label: "Ошибка в документе или ответе" },
  { id: "communication", label: "Сложности в общении" },
  { id: "technical", label: "Техническая проблема" },
  { id: "academic", label: "Проблема в учебном процессе" },
  { id: "campus", label: "Проблема на кампусе" },
  { id: "suggestion", label: "Предложение по улучшению" },
  { id: "other", label: "Другое" },
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
    department: "Учебный офис",
  },
  {
    id: "mobility",
    label: "Обмен и международные программы",
    department: "Международный отдел",
  },
  { id: "finance", label: "Оплата и договор", department: "Договорной отдел" },
  { id: "library", label: "Библиотека и электронные ресурсы", department: "Библиотека" },
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
  issued: "Выдано",
  cancelled: "Отменена",
};
export type Student = {
  timetable_group?: string | null;
  language_stream?: string | null;
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
  related_request_id?: string | null;
  evidence?: { name: string; mediaType: string; byteSize: number } | null;
  status: string;
  created_at: string;
  due_at: string;
  ready_at?: string | null;
  issued_at?: string | null;
  cancelled_at?: string | null;
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
  slot?: number;
  stream?: string;
  location?: string;
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
  oldRoomId?: string;
  changeDate?: string;
};
export type Notice = {
  id: string;
  title: string;
  text: string;
  type: string;
  date: string;
  read: boolean;
  link?: string;
  lessonDate?: string;
  lessonId?: string;
  requestId?: string;
  actionLabel?: string;
  audience?: string;
};
export type Announcement = {
  id: string;
  audience: string;
  title: string;
  message: string;
  published_at: string;
  withdrawn_at: string | null;
};
export type AnnouncementBoard = { groups: string[]; messages: Announcement[] };
export function dateLabel(value: string, time = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}
