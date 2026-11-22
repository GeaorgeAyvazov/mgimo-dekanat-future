"use client";
import { GradeOverview } from "@/components/grade-overview";
import { DocumentVerification } from "@/components/document-verification";
import { OfficeReport } from "@/components/office-report";
import { OfficeAnnouncements } from "@/components/office-announcements";
import { FeedbackForm } from "@/components/feedback-form";
import { CampusMap } from "@/components/campus-map";
import { RoomAvailability } from "@/components/room-availability";
import { StudyHub } from "@/components/study-hub";
import { LessonDetails, type SelectedLesson } from "@/components/lesson-details";
import { CalendarExport } from "@/components/calendar-export";
import { addCalendarDays, mondayOf, moscowClock, moscowDate, validCalendarDate } from "@/lib/room-calendar-types";
import { lessonOnDate } from "@/lib/lesson-occurrence";
import { NotificationPopover } from "@/components/notification-popover";
import { PortalSidebar } from "@/components/portal-sidebar";
import { EmployeeDirectory } from "@/components/employee-directory";
import {
  ServiceCenter,
  DocumentWallet,
  ContactChoice,
  AppealForm,
  OfficialServiceInfo,
} from "@/components/service-center";
import {
  useEffect,
  useState,
  useRef,
  Fragment,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  UsersRound,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Map as MapIcon,
  MapPin,
  UserRound,
  FileText,
  Bell,
  LayoutDashboard,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  Download,
  LogOut,
  ShieldCheck,
  Globe2,
  ListChecks,
  BookOpen,
  Award,
  Building2,
  Info,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Inbox,
  MessageCircle,
  LoaderCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  services,
  statuses,
  dateLabel,
  feedbackReasons,
  isDocumentService,
  type Service,
  type DocumentService,
  type Student,
  type Grade,
  type Case,
  type Lesson,
  type Notice,
} from "@/lib/catalog";
import { applicationServices, officialServices } from "@/lib/service-directory";
import { getExamOptions } from "@/lib/request-context";
type Data = {
  user: Student;
  requests: Case[];
  grades: Grade[];
  lessons: Lesson[];
  notices: Notice[];
  favorites: string[];
  today: string;
};
type ScheduleGroup = { code: string; course: number; source?: string };
type GroupWeek = { group: string; week: string; lessons: Lesson[]; streams: string[]; coverage?: { from: string; to: string; capturedOn: string } };
type View =
  | "today"
  | "schedule"
  | "grades"
  | "study"
  | "rooms"
  | "contact"
  | "services"
  | "profile"
  | "notifications"
  | "case"
  | "order"
  | "staff"
  | "staff-report"
  | "announcements"
  | "wallet"
  | "employees"
  | "map";
const navigation = [
  { id: "schedule", label: "Расписание", icon: CalendarDays },
  { id: "grades", label: "Успеваемость", short: "Оценки", icon: GraduationCap },
  { id: "study", label: "Учёба", icon: BookOpen },
  { id: "map", label: "Карта", icon: MapIcon },
  { id: "rooms", label: "Свободные аудитории", short: "Аудитории", icon: Building2 },
  {
    id: "today",
    label: "Центр сервиса",
    short: "Сервис",
    icon: LayoutDashboard,
  },
];
const profileNav = {
  id: "profile",
  label: "Мой профиль",
  short: "Профиль",
  icon: UserRound,
};
const serviceSections = [
  { id: "today", label: "Услуги" },
  { id: "services", label: "Обращения" },
  { id: "wallet", label: "Документы" },
  { id: "employees", label: "Сотрудники" },
] as const;
const titles: Record<string, string> = {
  today: "Центр сервиса",
  map: "Карта кампуса",
  schedule: "Расписание",
  grades: "Успеваемость",
  study: "Учёба",
  rooms: "Свободные аудитории",
  contact: "Написать в центр сервиса",
  services: "Мои обращения",
  wallet: "Мои документы",
  employees: "Сотрудники",
  profile: "Мой профиль",
  notifications: "Уведомления",
  case: "Моя заявка",
  order: "Заказать документ",
  staff: "Обращения студентов",
  "staff-report": "Отчёт по обращениям",
  announcements: "Объявления деканата",
};
const iconMap = {
  file: FileText,
  globe: Globe2,
  list: ListChecks,
  book: BookOpen,
  award: Award,
  message: MessageCircle,
  calendar: CalendarDays,
};
const DEMO_PASSWORD = "Student2026!";
async function api<T = Data>(path: string, data?: unknown): Promise<T> {
  const upload = data instanceof FormData;
  const response = await fetch("/api/portal/" + path, {
    credentials: "same-origin",
    headers: data
      ? { ...(!upload && { "Content-Type": "application/json" }), "X-Dekanat-Request": "1" }
      : {},
    ...(data ? { method: "POST", body: upload ? data : JSON.stringify(data) } : {}),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "Не удалось загрузить данные"),
      { status: response.status },
    );
  return result;
}
function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        студент<span className="brand-caption">Личный кабинет · МГИМО</span>
      </span>
    </div>
  );
}
function Spinner() {
  return <LoaderCircle className="spin" size={19} aria-hidden="true" />;
}
function Status({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`status status-${value}`}>
      <span />
      {label || statuses[value] || value}
    </span>
  );
}
function Empty({
  icon: Icon = Inbox,
  title,
  text,
  children,
}: {
  icon?: typeof Inbox;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={27} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
function ServiceIcon({ service }: { service: Service }) {
  const Icon = iconMap[service.icon];
  return (
    <span className="service-icon">
      <Icon size={26} strokeWidth={1.7} />
    </span>
  );
}
function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [login, setLogin] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("login", { login, password });
      await onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="mobile-brand">
          <Logo />
        </div>
        <div className="login-form">
          <span className="prototype-label">
            <span />
            Учебный прототип
          </span>
          <h2>Вход в личный кабинет</h2>
          <p className="muted">Введите логин и пароль учебной записи.</p>
          <form onSubmit={submit}>
            <label htmlFor="login">Логин</label>
            <input
              id="login"
              autoComplete="username"
              placeholder="Ваш учебный логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              maxLength={64}
            />
            <label htmlFor="password">Пароль</label>
            <div className="password-input">
              <input
                id="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={72}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  Войти в кабинет
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <details className="demo-access" open>
            <summary>Тестовые аккаунты для знакомства</summary>
            <p>
              Выберите роль — поля заполнятся. Пароль:{" "}
              <code>{DEMO_PASSWORD}</code>
            </p>
            <div className="demo-users">
              {[
                ["alina.demo", "АЛ", "Алина", "2 курс · МО-21"],
                ["maxim.demo", "МК", "Максим", "3 курс · БИ-31"],
                ["office.demo", "МС", "Сотрудник", "Сервисный центр"],
              ].map(([id, initials, name, caption]) => (
                <button
                  key={id}
                  onClick={() => {
                    setLogin(id);
                    setPassword(DEMO_PASSWORD);
                    setError("");
                  }}
                >
                  <span className="avatar">{initials}</span>
                  <span>
                    <strong>{name}</strong>
                    <small>{caption}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </details>
          <p className="login-note">
            <ShieldCheck size={16} />
            Данные учебных записей вымышлены. Это самостоятельный учебный
            проект.
          </p>
        </div>
      </section>
    </main>
  );
}
export default function Portal() {
  const [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [view, setView] = useState<View>("schedule"),
    [selectedLesson, setSelectedLesson] = useState<SelectedLesson | null>(null),
    [entity, setEntity] = useState(""),
    [toast, setToast] = useState(""),
    [selectedDay, setSelectedDay] = useState(-1),
    [week, setWeek] = useState(0),
    [scheduleMode, setScheduleMode] = useState("day"),
    [otherSchedule, setOtherSchedule] = useState(false),
    [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[] | null>(null),
    [scheduleCourse, setScheduleCourse] = useState(""),
    [groupCode, setGroupCode] = useState(""),
    [streamChoice, setStreamChoice] = useState<string | null>(null),
    [savingSchedule, setSavingSchedule] = useState(false),
    [groupLessons, setGroupLessons] = useState<GroupWeek | null>(null),
    [scheduleError, setScheduleError] = useState(""),
    [scheduleRetry, setScheduleRetry] = useState(0),
    [activeCase, setActiveCase] = useState<Case | null>(null),
    [caseError, setCaseError] = useState(""),
    [caseLoading, setCaseLoading] = useState(false),
    [caseTick, setCaseTick] = useState(0),
    [requestFilter, setRequestFilter] = useState("all"),
    [requestQuery, setRequestQuery] = useState(""),
    [requestLimit, setRequestLimit] = useState(20),
    [roomSearchDate, setRoomSearchDate] = useState(moscowDate),
    [roomSearchInterval, setRoomSearchInterval] = useState<{ start: string; end: string }>(),
    [mapRoom, setMapRoom] = useState<{
      label: string;
      id?: string;
      date: string;
      availableRooms?: string[];
    } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const caseStatus = view === "case" ? data?.requests.find(r => r.id === entity)?.status : null;
  const mapReturn = useRef<{ view: View; entity: string } | null>(null);
  const detailReturn = useRef<{
    target: string;
    view: View;
    entity: string;
  } | null>(null);
  const scheduleWeek = data?.today ? addCalendarDays(mondayOf(data.today), week * 7) : "";
  const officialPersonal = !!data?.user.timetable_group && (view === "study" || (!otherSchedule && !entity));
  const requestedGroup = officialPersonal ? data?.user.timetable_group || "" : (otherSchedule && view === "schedule" ? groupCode : "");
  async function refresh() {
    try {
      const d = await api("overview");
      setData(d);
      setLoadError("");
      return d as Data;
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setData(null);
        return null;
      }
      setLoadError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    api("overview")
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoadError("");
        }
      })
      .catch((e) => {
        if (!cancelled && e.status !== 401) setLoadError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!otherSchedule || scheduleGroups || data?.user.role !== "student") return;
    let active = true;
    api<{ groups: ScheduleGroup[] }>("group-schedule").then(({ groups }) => {
      if (active) setScheduleGroups(groups);
    }).catch((error: Error) => { if (active) setScheduleError(error.message); });
    return () => { active = false; };
  }, [otherSchedule, scheduleGroups, scheduleRetry, data?.user.role]);
  useEffect(() => {
    if (!requestedGroup || !scheduleWeek || data?.user.role !== "student") return;
    let active = true;
    const params = new URLSearchParams({ group: requestedGroup, week: scheduleWeek });
    api<GroupWeek>(`group-schedule?${params}`).then((result) => {
      if (active) setGroupLessons(result);
    }).catch((error: Error) => { if (active) setScheduleError(error.message); });
    return () => { active = false; };
  }, [requestedGroup, scheduleWeek, scheduleRetry, data?.user.role]);
  useEffect(() => {
    function read() {
      const [v, id] = location.hash.slice(1).split("/");
      setSelectedLesson(null);
      const home = data?.user.role === "staff" ? "staff" : "schedule";
      setView((Object.hasOwn(titles, v) ? v : home) as View);
      setEntity(id || "");
      if (v === "schedule" && id && data?.today) {
        const date = id.split("?")[0];
        if (validCalendarDate(date)) {
          const offset = Date.parse(mondayOf(date)) - Date.parse(mondayOf(data.today));
          setWeek(offset / (7 * 86400000));
          setSelectedDay((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7);
          setScheduleMode("day");
          setOtherSchedule(false);
        }
      }
    }
    queueMicrotask(read);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [data?.user.role, data?.today]);
  useEffect(() => {
    if (view !== "schedule" || !entity || otherSchedule || scheduleMode !== "day") return;
    const lessonId = new URLSearchParams(entity.split("?")[1]).get("lesson");
    if (!lessonId) return;
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`lesson-${lessonId}`);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, entity, otherSchedule, scheduleMode, selectedDay, week, data?.user.id]);
  useEffect(() => {
    const userId = data?.user.id;
    if (!userId) return;
    let alive = true,
      inFlight = false;
    async function sync() {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      try {
        const next = await api("overview");
        if (alive && next.user.id !== userId) {
          window.location.reload();
          return;
        }
        if (alive) {
          setData(next);
          setLoadError("");
        }
      } catch (e) {
        if (alive && (e as { status?: number }).status === 401) window.location.reload();
      } finally {
        inFlight = false;
      }
    }
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const interval = setInterval(() => void sync(), 30000);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [data?.user.id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (view !== "case" || !entity || !data?.user.id) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setActiveCase(null);
        setCaseError("");
        setCaseLoading(true);
      }
    });
    api<Case>("requests/" + encodeURIComponent(entity))
      .then((r) => {
        if (!cancelled) setActiveCase(r);
      })
      .catch((e) => {
        if (!cancelled) setCaseError(e.message);
      })
      .finally(() => {
        if (!cancelled) setCaseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, entity, data?.user.id, caseTick, caseStatus]);
  function go(v: View, id = "") {
    if (v === "map" && view !== "map") mapReturn.current = { view, entity };
    const hash = `#${v}${id ? "/" + id : ""}`;
    if ((v === "order" || v === "case") && v !== view && view !== "order")
      detailReturn.current = { target: hash, view, entity };
    if (location.hash === hash) {
      setView(v);
      setEntity(id);
    } else window.history.pushState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  }
  async function signOut() {
    try {
      await api("logout", {});
      setData(null);
      setOtherSchedule(false);
      setGroupCode("");
      setSelectedLesson(null);
      setStreamChoice(null);
      setScheduleCourse("");
      setGroupLessons(null);
      setScheduleError("");
      setActiveCase(null);
      setRequestFilter("all");
      setRequestQuery("");
      setRequestLimit(20);
      setMapRoom(null);
      detailReturn.current = null;
      mapReturn.current = null;
      window.history.replaceState(
        null,
        "",
        location.pathname + location.search,
      );
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      setToast("");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function readNotices(id = "all") {
    try {
      await api("notifications", { id });
      await refresh();
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function openLesson(date: string, lessonId: string) {
    go("schedule", date + "?" + new URLSearchParams({ lesson: lessonId }));
  }
  function clearLessonLink() {
    if (!entity) return;
    window.history.replaceState(null, "", "#schedule");
    setEntity("");
  }
  function openNotice(notice: Notice) {
    if (notice.link === "schedule") setOtherSchedule(false);
    if (!notice.read) void readNotices(notice.id);
    if (notice.lessonDate && notice.lessonId) openLesson(notice.lessonDate, notice.lessonId);
    else if (notice.requestId) go("case", notice.requestId);
    else if (notice.type === "deadline") go("order", "transcript-en");
    else go((notice.link || "today") as View);
  }
  if (loading)
    return (
      <div className="initial-load">
        <Logo />
        <Spinner />
        <p>Загрузка кабинета…</p>
      </div>
    );
  if (!data) {
    if (loadError)
      return (
        <main className="initial-load">
          <Logo />
          <Empty title="Кабинет пока не загрузился" text={loadError}>
            <button
              className="button primary"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
            >
              Попробовать снова
            </button>
          </Empty>
        </main>
      );
    return (
      <Login
        onLogin={async () => {
          const d = await refresh();
          if (d) go(d.user.role === "staff" ? "staff" : view, entity);
        }}
      />
    );
  }
  const { user, requests, grades, lessons, notices, today } = data,
    staff = user.role === "staff",
    firstName = user.name.split(" ")[0],
    initials = user.name
      .split(" ")
      .filter((_, i) => i === 0 || i === 2)
      .map((s) => s[0])
      .join(""),
    unread = notices.filter((n) => !n.read).length;
  const dayIndex = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const closedStatuses = ["ready", "issued", "cancelled"];
  const terms = requestQuery.toLocaleLowerCase("ru").trim().split(/\s+/).filter(Boolean);
  const visibleRequests = requests.filter((request) => {
    if (terms.length) {
      const service = services.find(s => s.id === request.service);
      const words = [request.id, service?.title, request.department, request.student_name, request.student_group]
        .filter(Boolean).join(" ").toLocaleLowerCase("ru");
      if (!terms.every(term => words.includes(term))) return false;
    }
    if (requestFilter === "all") return true;
    if (requestFilter === "reply") return request.status === "needs_info";
    if (requestFilter === "new") return request.status === "created";
    if (requestFilter === "feedback") return request.service === "feedback";
    if (requestFilter === "pickup")
      return request.status === "ready" && request.format === "paper";
    if (requestFilter === "ready")
      return ["ready", "issued"].includes(request.status);
    return !closedStatuses.includes(request.status);
  });
  if (staff && requestFilter !== "ready") {
    visibleRequests.sort(
      (a, b) =>
        Number(closedStatuses.includes(a.status)) -
          Number(closedStatuses.includes(b.status)) ||
        a.due_at.localeCompare(b.due_at),
    );
  }
  const nav = staff
    ? [
        { id: "staff", label: "Обращения", icon: Inbox },
        { id: "staff-report", label: "Отчёт", icon: ListChecks },
        { id: "employees", label: "Сотрудники", icon: UsersRound },
        { id: "map", label: "Карта", icon: MapIcon },
      ]
    : navigation;
  const activeDay = selectedDay < 0 ? dayIndex : selectedDay;
  const activeGroup = requestedGroup && groupLessons?.group === requestedGroup && groupLessons.week === scheduleWeek ? groupLessons : null;
  const streams = activeGroup?.streams || [];
  const previousStream = requestedGroup === user.timetable_group ? user.language_stream : "";
  const selectedStream = officialPersonal ? previousStream : streamChoice ?? (previousStream || streams.find(s => s.startsWith("27-")) || streams[0]);
  const displayedLessons = otherSchedule || officialPersonal ? (activeGroup?.lessons || []).filter(l =>
    !selectedStream || !streams.includes(l.stream || "") || l.stream === selectedStream) : lessons.map(
    (lesson) => lessonOnDate(lesson, addCalendarDays(scheduleWeek, lesson.day)),
  );
  const selectedLessons = displayedLessons.filter((lesson) => lesson.day === activeDay);
  const nowClock = moscowClock();
  const nextToday = week === 0 && displayedLessons.find((lesson) => lesson.day === dayIndex && lesson.end > nowClock);
  const otherGroups = (scheduleGroups || []).filter(({ code }) => code !== user.student_group);
  const availableCourses = [...new Set(otherGroups.map(({ course }) => course))].sort();
  const scheduleName = otherSchedule || officialPersonal ? requestedGroup : user.student_group;
  const canShowSchedule = (!otherSchedule && !officialPersonal) || !!activeGroup;
  const coverage = activeGroup?.coverage;
  const missingWeek = coverage && (scheduleWeek < coverage.from || scheduleWeek > coverage.to);
  const nextClassDay = Array.from(
    { length: 7 },
    (_, i) => activeDay + i + 1,
  ).find((day) => displayedLessons.some((lesson) => lesson.day === day % 7));
  const [serviceId, serviceQuery] = entity.split("?");
  const selectedService = services.find((s) => s.id === serviceId);
  const officialService = officialServices.find((s) => s.id === serviceId);
  const orderParams = new URLSearchParams(serviceQuery);
  const relatedId = orderParams.get("request");
  const feedbackSource =
    selectedService?.id === "feedback" && relatedId
      ? requests.find(
          (request) =>
            request.id === relatedId && request.service !== "feedback",
        )
      : undefined;
  const visitAbout =
    serviceId === "visit-request"
      ? applicationServices.find(
          (s) => s.id !== "visit-request" && s.id === orderParams.get("about"),
        )
      : undefined;
  const weekStart = new Date(scheduleWeek + "T12:00:00Z");
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  const calendarParams = new URLSearchParams({ week: scheduleWeek });
  if (requestedGroup) calendarParams.set("group", requestedGroup);
  else calendarParams.set("scope", "demo");
  if (selectedStream) calendarParams.set("stream", selectedStream);
  async function saveSchedule(group: string, stream: string) {
    setSavingSchedule(true);
    try {
      await api("my-schedule", { group, stream });
      await refresh();
      clearLessonLink();
      setOtherSchedule(false);
      setStreamChoice(null);
      setToast(group ? "Моё расписание сохранено" : "Восстановлено расписание профиля");
    } catch (e) { setToast((e as Error).message); }
    finally { setSavingSchedule(false); }
  }
  function requestCard(r: Case) {
    const s = services.find((s) => s.id === r.service)!;
    const document = isDocumentService(r.service);
    const waiting = !closedStatuses.includes(r.status);
    const overdue = waiting && Date.parse(r.due_at) < Date.now();
    return (
      <button
        className="request-row"
        key={r.id}
        onClick={() => go("case", r.id)}
      >
        <ServiceIcon service={s} />
        <span className="request-copy">
          <strong>{s.title}</strong>
          <span>
            {staff ? `${r.student_name} · ${r.student_group}` : s.language}
            {(document || staff) && (
              <>
                <span className="dot-divider">·</span>
                {document
                  ? r.format === "electronic"
                    ? "Электронная"
                    : "Бумажная"
                  : s.language}
              </>
            )}
          </span>
          <small>
            От {dateLabel(r.created_at)} · № {r.id.slice(-8).toUpperCase()}
          </small>
          {staff && waiting && (
            <small className={overdue ? "request-overdue" : undefined}>
              {overdue ? "Просрочено" : "Срок"} · {dateLabel(r.due_at, true)}{" "}
              (МСК)
            </small>
          )}
        </span>
        <Status
          value={r.status}
          label={
            !document && r.status === "ready"
              ? r.service === "question"
                ? "Решено"
                : "Ответ получен"
              : document && r.status === "ready" && r.format === "paper"
                ? "К выдаче"
                : undefined
          }
        />
        <ChevronRight size={18} className="muted" />
      </button>
    );
  }
  function lessonCard(l: Lesson, i: number, dayLessons: Lesson[]) {
    const next = dayLessons[i + 1];
    const asMinutes = (time: string) => {
      const [hour, minute] = time.split(":").map(Number);
      return hour * 60 + minute;
    };
    const gap = next ? asMinutes(next.start) - asMinutes(l.end) : 0;
    const lessonDate = weekDays[l.day].toISOString().slice(0, 10);
    const canSearchRooms = lessonDate >= addCalendarDays(today, -90) && lessonDate <= addCalendarDays(today, 90);
    return (
      <Fragment key={l.id}>
      <div
        id={`lesson-${l.id}`}
        tabIndex={-1}
        className={`lesson lesson-${l.kind === "Лекция" ? "lecture" : "seminar"} ${l.change ? "lesson-changed" : ""}`}
      >
        <div className="lesson-time">
          <strong>{l.start}</strong>
          <span>{l.end}</span>
        </div>
        <div className="lesson-line" />
        <div className="lesson-main">
          <div className="lesson-kind">
            <span className="lesson-type">{l.kind}</span>
            <span className="lesson-slot">{l.slot ?? i + 1} пара</span>
            {nextToday && nextToday.id === l.id && (
              <strong className="lesson-now">{l.start <= nowClock ? "Идёт сейчас" : "Ближайшая"}</strong>
            )}
          </div>
          <h3>
            <button className="lesson-subject-link" aria-haspopup="dialog" onClick={() => setSelectedLesson({lesson: l, date: lessonDate, group: scheduleName})}>
              {l.subject} <ChevronRight size={15} aria-hidden="true" />
            </button>
          </h3>
          {l.teacher && <p>
            <UserRound size={14} />
            {l.teacher}
          </p>}
          {l.stream && l.stream !== scheduleName && <p>{l.stream}</p>}
          {l.location && <p>{l.location}</p>}
          {l.change && (
            <div className="change-note">
              <RefreshCw size={13} />
              {l.change} · ранее {l.oldRoom}
            </div>
          )}
        </div>
        {(!l.location || l.roomId) && <button
          className="room"
          onClick={() =>
            setMapRoom({
              label: l.room,
              id: l.roomId,
              date: lessonDate,
            })
          }
          aria-label={`Открыть карту МГИМО, аудитория ${l.room}`}
          title="Показать карту кампуса"
        >
          <MapPin size={14} />
          {l.room}
        </button>}
      </div>
      {next && gap >= 30 && canSearchRooms && (
        <button className="schedule-gap" onClick={() => {
          setRoomSearchDate(lessonDate);
          setRoomSearchInterval({ start: l.end, end: next.start });
          go("rooms");
        }}>
          <Clock3 size={16} aria-hidden="true" />
          <span>Окно {l.end}–{next.start}</span>
          <strong>Найти аудиторию</strong>
        </button>
      )}
      </Fragment>
    );
  }
  const serviceSection = serviceSections.find((item) => item.id === view);
  const inServiceCenter = serviceSection || ["case", "order", "contact"].includes(view);
  const showServiceNavigation =
    !staff && serviceSection && !(view === "employees" && entity);
  const currentNav =
    staff && ["services", "case", "announcements"].includes(view)
      ? "staff"
      : !staff && inServiceCenter
        ? "today"
        : view;
  const detailOrigin =
    detailReturn.current?.target === `#${view}/${entity}`
      ? detailReturn.current
      : null;
  const returnView =
    detailOrigin?.view ||
    (view === "case" ? (staff ? "staff" : "services") : "today");
  const returnLabel = returnView === "today" ? "К услугам" : titles[returnView];
  const backFromDetail = () => go(returnView, detailOrigin?.entity);
  return (
    <div className="app-shell">
      {(mapRoom || view === "map") && (
        <CampusMap
          room={mapRoom?.label}
          roomId={mapRoom?.id}
          date={mapRoom?.date}
          availableRooms={mapRoom?.availableRooms}
          close={() => {
            if (mapRoom) setMapRoom(null);
            else {
              const origin = mapReturn.current;
              mapReturn.current = null;
              go(
                origin?.view || (staff ? "staff" : "schedule"),
                origin?.entity,
              );
            }
          }}
        />
      )}
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <PortalSidebar
        items={nav}
        current={currentNav}
        logo={<Logo />}
        name={firstName + " " + user.name.split(" ")[2]}
        group={
          user.student_group + (!staff ? " · " + user.course + " курс" : "")
        }
        initials={initials}
        home={staff ? "staff" : "schedule"}
        navigate={(v) => go(v as View)}
      />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo />
          </div>
          <span className="topbar-context">Личный кабинет</span>
          <NotificationPopover
            key={user.id}
            notices={notices}
            onOpenNotice={openNotice}
            onReadAll={() => readNotices()}
            onRead={readNotices}
            onRefresh={() => void refresh()}
          />
        </header>
        <main
          id="main-content"
          className="main-content"
          tabIndex={-1}
          ref={mainRef}
        >
          {loadError && (
            <div className="error" role="alert">
              {loadError}
              <button onClick={() => void refresh()}>Повторить</button>
            </div>
          )}
          {showServiceNavigation && (
            <header className="service-section-header">
              <div className="service-section-heading">
                <h1>Центр сервиса «Студент»</h1>
                {(view === "today" || view === "services") && (
                  <div className="service-heading-actions">
                    <button
                      className="button primary"
                      onClick={() => go("contact", view === "services" ? "services" : "")}
                    >
                      <MessageCircle size={18} />
                      Написать в центр сервиса
                    </button>
                  </div>
                )}
              </div>
              <nav
                className="service-section-nav"
                aria-label="Разделы центра сервиса"
              >
                {serviceSections.map((item) => (
                  <button
                    key={item.id}
                    aria-current={view === item.id ? "page" : undefined}
                    onClick={() => go(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </header>
          )}
          {view === "today" && !staff && (
            <ServiceCenter
              favorites={data.favorites || []}
              go={(v, id) => go(v as View, id)}
              onFavorite={async (id, active) => {
                try {
                  await api("favorites", { service: id, active });
                  await refresh();
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            />
          )}
          {view === "employees" && (
            <EmployeeDirectory
              key={user.id}
              selected={entity}
              go={(v, id) => go(v as View, id)}
              canAsk={!staff}
              embedded={Boolean(showServiceNavigation)}
            />
          )}
          {view === "wallet" && !staff && (
            <DocumentWallet
              requests={requests}
              go={(v, id) => go(v as View, id)}
            />
          )}
          {view === "contact" && !staff && (
            <ContactChoice
              back={() => go(entity === "services" ? "services" : "today")}
              choose={(service) => go("order", service)}
            />
          )}
          {view === "schedule" && !staff && (
            <>
              {selectedLesson && <LessonDetails selected={selectedLesson} close={() => setSelectedLesson(null)}
                openMap={() => { setMapRoom({label: selectedLesson.lesson.room, id: selectedLesson.lesson.roomId, date: selectedLesson.date}); setSelectedLesson(null); }}/>}
              <PageHeading
                title="Расписание"
                text={`${scheduleName ? `Группа ${scheduleName} · ` : ""}${coverage ? "РУЗ МГИМО · выгрузка " + dateLabel(coverage.capturedOn) : "Демонстрационные занятия"} · МСК`}
                action={canShowSchedule && !missingWeek && (
                  <CalendarExport
                    href={`/api/portal/schedule-calendar?${calendarParams}`}
                    group={[scheduleName, selectedStream?.split(" (")[0]].filter(Boolean).join(" · ")}
                    range={`${dateLabel(weekDays[0].toISOString())} – ${dateLabel(weekDays[6].toISOString())}`}
                  />
                )}
              />
              <div className="panel schedule-scope">
                <div className="segmented" role="group" aria-label="Чьё расписание">
                  <button className={!otherSchedule ? "active" : ""} aria-pressed={!otherSchedule} onClick={() => { clearLessonLink(); setOtherSchedule(false); }}>Моё</button>
                  <button className={otherSchedule ? "active" : ""} aria-pressed={otherSchedule} onClick={() => {
                    clearLessonLink();
                    setScheduleError("");
                    setOtherSchedule(true);
                    if (!groupCode) { setGroupCode(user.timetable_group || "2МО-07"); setScheduleMode("week"); }
                  }}>Другая группа</button>
                </div>
                <a className="schedule-official" href="https://ruz.mgimo.ru/ruz/" target="_blank" rel="noopener noreferrer">
                  Официальное расписание МГИМО <ArrowUpRight size={15} aria-hidden="true" />
                </a>
                {otherSchedule && scheduleGroups && (
                  <>
                    <label>Курс
                      <select value={scheduleCourse} onChange={(event) => {
                        setScheduleCourse(event.target.value);
                        setGroupCode("");
                        setStreamChoice(null);
                        setGroupLessons(null);
                        setScheduleError("");
                      }}>
                        <option value="">Все курсы</option>
                        {availableCourses.map((course) => <option key={course} value={course}>{course} курс</option>)}
                      </select>
                    </label>
                    <label>Группа
                      <select value={groupCode} onChange={(event) => {
                        setGroupCode(event.target.value);
                        setStreamChoice(null);
                        setGroupLessons(null);
                        setScheduleError("");
                        setScheduleMode("week");
                      }}>
                        <option value="">Выберите группу</option>
                        {otherGroups.filter(({ course }) => !scheduleCourse || String(course) === scheduleCourse).map(({ code, source }) => (
                          <option key={code} value={code}>{code} · {source === "ruz" ? "РУЗ МГИМО" : "демо"}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {streams.length > 0 && <label>Языковая подгруппа
                  <select value={selectedStream || ""} disabled={savingSchedule} onChange={e => {
                    if (officialPersonal) void saveSchedule(requestedGroup, e.target.value);
                    else setStreamChoice(e.target.value);
                  }}>
                    {!officialPersonal && <option value="">Все подгруппы</option>}
                    {streams.map(s => <option key={s} value={s}>{s.split(" (")[0]}</option>)}
                  </select>
                </label>}
                {otherSchedule && streams.length > 0 && selectedStream && <button className="button secondary" disabled={savingSchedule}
                  onClick={() => void saveSchedule(requestedGroup, selectedStream)}>Сделать моим расписанием</button>}
                {officialPersonal && <button className="text-btn" disabled={savingSchedule} onClick={() => void saveSchedule("", "")}>Вернуть расписание профиля</button>}
              </div>
              {(otherSchedule || officialPersonal) && scheduleError ? (
                <Empty title="Расписание пока недоступно" text={scheduleError}>
                  <button className="button secondary" onClick={() => {
                    setScheduleError("");
                    setScheduleRetry((value) => value + 1);
                  }}>Повторить</button>
                </Empty>
              ) : !canShowSchedule ? (
                  <Empty icon={CalendarDays} title={scheduleGroups && !groupCode ? "Выберите группу" : "Загружаем расписание…"} />
              ) : <>
              <div className="schedule-toolbar">
                <div className="week-control">
                  <button
                    className="icon-btn"
                    aria-label="Предыдущая неделя"
                    onClick={() => { clearLessonLink(); setWeek(week - 1); }}
                  >
                    <ChevronLeft size={19} />
                  </button>
                  <strong>
                    {dateLabel(weekDays[0].toISOString())} –{" "}
                    {dateLabel(weekDays[6].toISOString())}
                  </strong>
                  <button
                    className="icon-btn"
                    aria-label="Следующая неделя"
                    onClick={() => { clearLessonLink(); setWeek(week + 1); }}
                  >
                    <ChevronRight size={19} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      clearLessonLink();
                      setWeek(0);
                      setSelectedDay(-1);
                      setScheduleMode("day");
                    }}
                  >
                    Сегодня
                  </button>
                </div>
                <div
                  className="segmented"
                  role="group"
                  aria-label="Вид расписания"
                >
                  <button
                    className={scheduleMode === "day" ? "active" : ""}
                    aria-pressed={scheduleMode === "day"}
                    onClick={() => setScheduleMode("day")}
                  >
                    День
                  </button>
                  <button
                    className={scheduleMode === "week" ? "active" : ""}
                    aria-pressed={scheduleMode === "week"}
                    onClick={() => { clearLessonLink(); setScheduleMode("week"); }}
                  >
                    Неделя
                  </button>
                </div>
              </div>
              <div className="day-tabs" role="group" aria-label="День недели">
                {weekDays.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      clearLessonLink();
                      setSelectedDay(i);
                      setScheduleMode("day");
                    }}
                    className={`${scheduleMode === "day" && activeDay === i ? "active" : ""} ${week === 0 && i === dayIndex ? "is-today" : ""}`}
                    aria-pressed={scheduleMode === "day" && activeDay === i}
                    aria-current={
                      week === 0 && i === dayIndex ? "date" : undefined
                    }
                  >
                    <span>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</span>
                    <strong>{d.getUTCDate()}</strong>
                    <i />
                  </button>
                ))}
              </div>
              {missingWeek ? <Empty icon={CalendarDays} title="За эту неделю нет выгрузки РУЗ">
                <button className="button secondary" onClick={() => { setWeek(Math.round((Date.parse(mondayOf(coverage.to)) - Date.parse(mondayOf(today))) / 604800000)); setScheduleMode("week"); }}>Открыть неделю с {dateLabel(mondayOf(coverage.to))}</button>
              </Empty> : scheduleMode === "day" ? (
                <section className="panel">
                  <div className="section-heading">
                    <h2>
                      {
                        [
                          "Понедельник",
                          "Вторник",
                          "Среда",
                          "Четверг",
                          "Пятница",
                          "Суббота",
                          "Воскресенье",
                        ][activeDay]
                      }
                    </h2>
                    <span className="muted">
                      {dateLabel(weekDays[activeDay].toISOString())}
                    </span>
                  </div>
                  {selectedLessons.length ? (
                    selectedLessons.map(lessonCard)
                  ) : (
                    <Empty icon={CalendarDays} title="В этот день занятий нет">
                      {nextClassDay !== undefined && (
                        <button
                          className="button secondary"
                          onClick={() => {
                            setWeek(week + Math.floor(nextClassDay / 7));
                            setSelectedDay(nextClassDay % 7);
                          }}
                        >
                          Ближайшие занятия
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </Empty>
                  )}
                </section>
              ) : (
                <div className="week-list">
                  {weekDays.map((d, i) => (
                    <section className="panel" key={i}>
                      <div className="section-heading week-day-heading">
                        <h2>
                          {
                            [
                              "Понедельник",
                              "Вторник",
                              "Среда",
                              "Четверг",
                              "Пятница",
                              "Суббота",
                              "Воскресенье",
                            ][i]
                          }
                          <span className="muted">
                            {" "}
                            · {dateLabel(d.toISOString())}
                          </span>
                        </h2>
                      </div>
                      {displayedLessons.filter((l) => l.day === i).length ? (
                        displayedLessons.filter((l) => l.day === i).map(lessonCard)
                      ) : (
                        <p className="muted">Занятий нет</p>
                      )}
                    </section>
                  ))}
                </div>
              )}
              </>}
            </>
          )}
          {view === "study" && !staff && (
              officialPersonal && !activeGroup ? <Empty title={scheduleError || "Загружаем дисциплины…"}>
                {scheduleError && <button onClick={() => { setScheduleError(""); setScheduleRetry(n => n + 1); }}>Повторить</button>}
              </Empty> : <StudyHub subjectKey={entity} grades={grades} lessons={officialPersonal ? displayedLessons : lessons} today={today}
                datedWeek={officialPersonal ? scheduleWeek : undefined}
                openGrades={() => go("grades")} openLesson={(date, id) => {
                  if (!officialPersonal) { openLesson(date, id); return; }
                  setSelectedDay((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7);
                  setScheduleMode("day"); setOtherSchedule(false); go("schedule");
                }} />
          )}
          {view === "rooms" && !staff && (
            <div className="room-availability-page">
              <PageHeading
                title="Свободные аудитории"
                text="Выберите дату и интервал, затем откройте найденную аудиторию на карте"
                action={<button className="button secondary" onClick={() => go("map")}><MapIcon size={17} /> Карта кампуса</button>}
              />
              <RoomAvailability
                date={roomSearchDate}
                setDate={setRoomSearchDate}
                select={(key, date) => setMapRoom({ label: key.split(":")[1], id: key, date })}
                showOnMap={(rooms, date) => setMapRoom({ label: "", date, availableRooms: rooms })}
                interval={roomSearchInterval}
              />
            </div>
          )}
          {view === "grades" && !staff && (
            <>
              <PageHeading
                title="Успеваемость"
                text="Летняя сессия · 2025/26"
              />
              <section className="transcript-callout">
                <BookOpen size={27} />
                <div><h3>Выписка из зачётной книжки</h3></div>
                <div className="transcript-actions">
                  <button className="button secondary" onClick={() => go("order", "grades-ru")}>
                    На русском
                  </button>
                  <button className="button secondary" onClick={() => go("order", "transcript-en")}>
                    На английском
                  </button>
                </div>
              </section>
              <GradeOverview
                grades={grades}
                onExamRequest={staff ? undefined : (assessment) =>
                  go("order", `exam-request?assessment=${assessment}`)}
              />
            </>
          )}
          {view === "staff-report" && staff && (
            <>
              <PageHeading
                title="Отчёт по обращениям"
                text="Сроки обработки и выдача документов по услугам."
              />
              <OfficeReport rows={requests} today={today} />
            </>
          )}
          {view === "announcements" && staff && <>
            <button className="back-button" onClick={() => go("staff")}><ArrowLeft size={17} />К обращениям</button>
            <PageHeading title="Объявления деканата" />
            <OfficeAnnouncements client={api} />
          </>}
          {(view === "services" || (view === "staff" && staff)) && (
            <>
              {staff && (
                <PageHeading
                  title="Обращения студентов"
                  text="Ответьте студенту в карточке обращения."
                  action={
                    <button
                      className="button secondary"
                      onClick={() => go("announcements")}
                    >
                      <Bell size={16} />
                      Объявления деканата
                    </button>
                  }
                />
              )}
              <div className="queue-tools">
              <label className="queue-search">
                <span className="sr-only">Поиск обращений</span>
                <input type="search" placeholder={staff ? "Номер, услуга, студент или группа" : "Номер обращения или название услуги"} value={requestQuery}
                  onChange={event => { setRequestQuery(event.target.value); setRequestLimit(20); }} />
              </label>
              <div className="filter-row">
                <SlidersHorizontal size={16} />
                {[
                  ["all", "Все"],
                  ...(staff ? [["new", "Новые"]] : []),
                  ["active", "В работе"],
                  ["reply", staff ? "Ждём ответ" : "Нужен мой ответ"],
                  ["ready", "Готовые"],
                  ...(staff
                    ? [
                        ["pickup", "К выдаче"],
                        ["feedback", "Проблемы"],
                      ]
                    : []),
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={
                      requestFilter === id ? "filter active" : "filter"
                    }
                    aria-pressed={requestFilter === id}
                    onClick={() => { setRequestFilter(id); setRequestLimit(20); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              </div>
              <section className="panel request-list">
                {visibleRequests.length ? (
                  visibleRequests.slice(0, requestLimit).map(requestCard)
                ) : (
                  <Empty
                    title={
                      terms.length || requestFilter !== "all" ? "По вашему запросу обращений нет" : "Обращений пока нет"
                    }
                    text={terms.length || requestFilter !== "all" ? "Попробуйте изменить запрос или фильтр." : staff ? "Здесь появятся новые заявки студентов." : "Выберите услугу в каталоге или задайте вопрос сервисному центру."}
                  >
                    {terms.length || requestFilter !== "all" ? <button className="text-button" onClick={() => { setRequestQuery(""); setRequestFilter("all"); setRequestLimit(20); }}>Сбросить поиск и фильтры</button> : !staff && (
                      <button
                        className="button primary"
                        onClick={() => go("today")}
                      >
                        Выбрать услугу
                      </button>
                    )}
                  </Empty>
                )}
              </section>
              {visibleRequests.length > requestLimit && <button className="button secondary queue-more" onClick={() => setRequestLimit(limit => limit + 20)}>Показать ещё · {requestLimit} из {visibleRequests.length}</button>}
            </>
          )}
          {view === "order" &&
            !staff &&
            (officialService ? (
              <OfficialServiceInfo
                service={officialService}
                back={backFromDetail}
                backLabel={returnLabel}
              />
            ) : selectedService?.id === "feedback" ? (
              relatedId && !feedbackSource ? (
                <Empty title="Заявка недоступна">
                  <button
                    className="button secondary"
                    onClick={() => go("services")}
                  >
                    К обращениям
                  </button>
                </Empty>
              ) : (
                <FeedbackForm
                  key={entity}
                  user={user}
                  relatedRequest={feedbackSource || undefined}
                  back={backFromDetail}
                  backLabel={feedbackSource ? "К заявке" : returnLabel}
                  create={async (payload) => {
                    const request = await api<Case>("requests", payload);
                    await refresh();
                    setToast(
                      "Сообщение сохранено. Ответ появится в «Обращениях».",
                    );
                    go("case", request.id);
                  }}
                />
              )
            ) : selectedService ? (
              selectedService.id === "question" ||
              "topic" in selectedService ? (
                <AppealForm
                  key={entity}
                  initialTopic={orderParams.get("topic") || "documents"}
                  application={
                    "topic" in selectedService ? selectedService : undefined
                  }
                  assessments={selectedService.id === "exam-request" ? getExamOptions(grades) : undefined}
                  initialAssessment={orderParams.get("assessment") ?? undefined}
                  visitAbout={visitAbout}
                  requestVisit={
                    "topic" in selectedService &&
                    selectedService.id !== "visit-request"
                      ? () =>
                          go(
                            "order",
                            `visit-request?about=${selectedService.id}`,
                          )
                      : undefined
                  }
                  back={
                    visitAbout
                      ? () => go("order", visitAbout.id)
                      : backFromDetail
                  }
                  backLabel={visitAbout ? visitAbout.title : returnLabel}
                  create={async (payload) => {
                    const r = await api<Case>("requests", payload);
                    await refresh();
                    setToast(
                      selectedService.id === "question"
                        ? "Обращение принято и направлено в подразделение"
                        : "Демо-заявка сохранена в «Обращениях»",
                    );
                    go("case", r.id);
                  }}
                />
              ) : (
                <OrderForm
                  key={selectedService.id}
                  service={selectedService}
                  user={user}
                  back={backFromDetail}
                  backLabel={returnLabel}
                  onCreated={async (r) => {
                    await refresh();
                    setToast(
                      r.status === "ready"
                        ? "Справка готова! Учебный PDF можно скачать."
                        : "Заявка принята. Следить за ней можно здесь.",
                    );
                    go("case", r.id);
                  }}
                />
              )
            ) : (
              <Empty title="Услуга не найдена">
                <button className="button primary" onClick={() => go("today")}>
                  К услугам
                </button>
              </Empty>
            ))}
          {view === "case" && (
            <>
              <button className="back-button" onClick={backFromDetail}>
                <ArrowLeft size={17} />
                {returnLabel}
              </button>
              {caseLoading ? (
                <div className="loading-card" aria-live="polite">
                  <Spinner />
                  Загружаем заявку…
                </div>
              ) : caseError ? (
                <Empty title="Заявка недоступна" text={caseError}>
                  <button
                    className="button secondary"
                    onClick={() => setCaseTick(caseTick + 1)}
                  >
                    Повторить
                  </button>
                </Empty>
              ) : (
                activeCase && (
                  <CaseDetail
                    key={activeCase.id + activeCase.status}
                    item={activeCase}
                    staff={staff}
                    openRelated={(id) => go("case", id)}
                    reportProblem={
                      !staff && activeCase.service !== "feedback"
                        ? () => go("order", `feedback?request=${activeCase.id}`)
                        : undefined
                    }
                    onChange={async () => {
                      await refresh();
                      setCaseTick(caseTick + 1);
                    }}
                  />
                )
              )}
            </>
          )}
          {view === "notifications" && (
            <>
              <PageHeading
                title="Уведомления"
                text="Ответы по обращениям, готовые документы и изменения в учёбе."
                action={
                  <button
                    className="button secondary"
                    disabled={!unread}
                    onClick={() => void readNotices()}
                  >
                    <Check size={16} />
                    Прочитать все
                  </button>
                }
              />
              <div className="notification-list">
                {notices.map((n) => (
                  <article
                    key={n.id}
                    className={`panel notice-card ${n.read ? "read" : "unread"}`}
                  >
                    <span className={`notice-icon ${n.type}`}>
                      {n.type === "request" ? (
                        <FileText size={23} />
                      ) : n.type === "schedule" ? (
                        <CalendarDays size={23} />
                      ) : n.type === "deadline" ? (
                        <Clock3 size={23} />
                      ) : (
                        <Bell size={23} />
                      )}
                    </span>
                    <div>
                      <div className="notice-meta">
                        <span>
                          {n.type === "request"
                            ? "Мои обращения"
                            : n.type === "schedule"
                              ? "Расписание"
                              : n.type === "deadline"
                                ? "Дедлайн"
                                : "Сервисный центр"}
                        </span>
                        <time>{dateLabel(n.date, n.type === "request")}</time>
                        {!n.read && <span className="unread-label">Новое</span>}
                      </div>
                      <h2>{n.title}</h2>
                      <p>{n.text}</p>
                      <div className="notice-actions">
                        {n.type !== "announcement" && <button
                          className="text-button"
                          onClick={() => openNotice(n)}
                        >
                          {n.actionLabel ||
                            (n.type === "schedule"
                              ? "Открыть расписание"
                              : n.type === "deadline"
                                ? "Заказать транскрипт"
                                : "К услугам")}
                          <ArrowRight size={15} />
                        </button>}
                        {!n.read && (
                          <button
                            className="text-button muted"
                            onClick={() => void readNotices(n.id)}
                          >
                            Прочитано
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {view === "profile" && (
            <>
              <PageHeading
                title="Мой профиль"
                text="Данные, которые используются в ваших документах."
              />
              <section className="panel profile-card">
                <div className="profile-identity">
                  <span className="avatar large-avatar">{initials}</span>
                  <div>
                    <span className="prototype-label">
                      {staff ? "Сотрудник" : "Студент"}
                    </span>
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                  </div>
                </div>
                <dl className="profile-grid">
                  <div>
                    <dt>{staff ? "Подразделение" : "Факультет"}</dt>
                    <dd>{user.faculty}</dd>
                  </div>
                  <div>
                    <dt>{staff ? "Роль" : "Направление"}</dt>
                    <dd>{user.program}</dd>
                  </div>
                  {!staff && (
                    <>
                      <div>
                        <dt>Курс</dt>
                        <dd>{user.course} курс · Бакалавриат</dd>
                      </div>
                      <div>
                        <dt>Группа</dt>
                        <dd>{user.student_group}</dd>
                      </div>
                      <div>
                        <dt>ФИО латиницей</dt>
                        <dd>{user.latin_name}</dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt>Логин</dt>
                    <dd>{user.login}</dd>
                  </div>
                </dl>
                <div className="inline-info">
                  <Info size={17} />
                  <span>
                    Это вымышленная учебная запись. В реальном сервисе данные
                    поступают из информационной системы вуза.
                  </span>
                </div>
                {!staff && (
                  <div className="profile-correction">
                    <button className="button secondary" onClick={() => go("order", "profile-correction")}>
                      Исправить данные <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </section>
              <section className="panel privacy-card">
                <ShieldCheck size={26} />
                <div>
                  <h2>Ваш кабинет — только ваш</h2>
                  <p>
                    Данные и документы доступны после входа. Закончив работу на
                    общем компьютере, выйдите из аккаунта.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => void signOut()}
                >
                  <LogOut size={17} />
                  Выйти
                </button>
              </section>
            </>
          )}
          {staff &&
            ![
              "staff",
              "staff-report",
              "announcements",
              "services",
              "profile",
              "notifications",
              "case",
              "employees",
              "map",
            ].includes(view) && (
              <Empty
                title="Кабинет сотрудника"
                text="Перейдите к обращениям, чтобы обработать заявки студентов."
              >
                <button className="button primary" onClick={() => go("staff")}>
                  Открыть обращения
                </button>
              </Empty>
            )}
          <footer className="page-footer">
            <span>Деканат будущего</span>
            <span>Учебный прототип · Данные студентов вымышлены</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {(staff ? [...nav, profileNav] : [...nav.filter((n) => ["schedule", "study", "rooms", "today"].includes(n.id)), profileNav]).map((n) => (
          <button
            key={n.id}
            aria-label={n.label}
            className={currentNav === n.id ? "active" : ""}
            onClick={() => go(n.id as View)}
            aria-current={currentNav === n.id ? "page" : undefined}
          >
            <span className="mobile-nav-icon">
              <n.icon size={21} aria-hidden="true" />
            </span>
            <span>{"short" in n ? n.short : n.label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button
            className="icon-btn"
            aria-label="Закрыть сообщение"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function PageHeading({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
function OrderForm({
  service,
  user,
  back,
  backLabel,
  onCreated,
}: {
  service: DocumentService;
  user: Student;
  back: () => void;
  backLabel: string;
  onCreated: (r: Case) => Promise<void>;
}) {
  const [format, setFormat] = useState("electronic"),
    [recipient, setRecipient] = useState("self"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const fields: readonly string[] = service.fields;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await api<Case>("requests", {
        service: service.id,
        format,
        recipient,
        organization: f.get("organization"),
        latinName: f.get("latinName"),
        phone: f.get("phone"),
        representative: f.get("representative"),
        idempotencyKey: key.current,
      });
      await onCreated(r);
    } catch (e) {
      setError((e as Error).message);
      requestAnimationFrame(() =>
        document.getElementById("form-error")?.focus(),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="back-button" onClick={back}>
        <ArrowLeft size={17} />
        {backLabel}
      </button>
      <PageHeading title={service.title} text={service.language} />
      <form className="order-layout" onSubmit={submit}>
        <div className="order-main">
          <section className="panel">
            <div className="numbered-heading">
              <span>1</span>
              <h2>Проверьте данные</h2>
              <span className="autofill-label">
                <CheckCircle2 size={14} />
                Из профиля
              </span>
            </div>
            <dl className="autofill-data">
              <div>
                <dt>ФИО</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Факультет</dt>
                <dd>{user.faculty}</dd>
              </div>
              <div>
                <dt>Направление</dt>
                <dd>{user.program}</dd>
              </div>
              <div>
                <dt>Курс и группа</dt>
                <dd>
                  {user.course} курс · {user.student_group}
                </dd>
              </div>
            </dl>
            {fields.includes("latinName") && (
              <div className="form-field">
                <label htmlFor="latinName">
                  Имя и фамилия латиницей <span>*</span>
                </label>
                <input
                  id="latinName"
                  name="latinName"
                  defaultValue={user.latin_name}
                  required
                  pattern="[A-Za-z][A-Za-z '\-]{2,99}"
                  maxLength={100}
                  autoComplete="off"
                />
                <small>Проверьте написание по загранпаспорту.</small>
              </div>
            )}
            {fields.includes("phone") && (
              <div className="form-field">
                <label htmlFor="phone">
                  Телефон для связи <span>*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+7 900 000-00-00"
                  required
                  pattern="[+0-9 ()\-]{10,25}"
                  maxLength={25}
                />
                <small>Для демо используйте вымышленный номер.</small>
              </div>
            )}
            {fields.includes("organization") && (
              <div className="form-field">
                <label htmlFor="organization">
                  Куда нужна справка <span>*</span>
                </label>
                <input
                  id="organization"
                  name="organization"
                  placeholder="Например, по месту требования"
                  required
                  minLength={2}
                  maxLength={200}
                />
                <small>Название организации или «По месту требования».</small>
              </div>
            )}
          </section>
          <section className="panel">
            <div className="numbered-heading">
              <span>2</span>
              <h2>Как хотите получить?</h2>
            </div>
            <fieldset className="format-options">
              <legend className="sr-only">Способ получения</legend>
              {[
                [
                  "electronic",
                  "Электронный документ",
                  "Скачайте PDF в личном кабинете",
                  Download,
                ],
                [
                  "paper",
                  "Бумажный оригинал",
                  "Заберите в сервисном центре",
                  Building2,
                ],
              ].map(([id, title, caption, Icon]) => {
                const I = Icon as typeof Download;
                return (
                  <label
                    key={id as string}
                    className={
                      format === id ? "radio-card selected" : "radio-card"
                    }
                  >
                    <input
                      type="radio"
                      name="format"
                      value={id as string}
                      checked={format === id}
                      onChange={() => setFormat(id as string)}
                    />
                    <I size={22} />
                    <span>
                      <strong>{title as string}</strong>
                      <small>{caption as string}</small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {format === "paper" && (
              <div className="paper-options">
                <fieldset>
                  <legend>Кто заберёт документ?</legend>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="recipient"
                      checked={recipient === "self"}
                      onChange={() => setRecipient("self")}
                    />
                    Заберу сам
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="recipient"
                      checked={recipient === "other"}
                      onChange={() => setRecipient("other")}
                    />
                    За меня получит другой человек
                  </label>
                </fieldset>
                {recipient === "other" && (
                  <div className="form-field">
                    <label htmlFor="representative">
                      ФИО получателя <span>*</span>
                    </label>
                    <input
                      name="representative"
                      id="representative"
                      required
                      minLength={5}
                      maxLength={200}
                    />
                    <small>
                      В реальном сервисе при получении понадобятся документ и
                      доверенность по правилам вуза.
                    </small>
                  </div>
                )}
                <div className="inline-info">
                  <MapPin size={17} />
                  <span>
                    Учебная точка выдачи: сервисный центр, кабинет А-101. Пн–пт,
                    10:00–17:00. Дождитесь статуса «Готово».
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside className="order-summary panel">
          <h2>Срок и получение</h2>
          <div className="order-term">
            <Clock3 size={18} />
            <span>
              <strong>
                {service.automatic && format === "electronic"
                  ? "Мгновенно"
                  : "До 3 рабочих дней"}
              </strong>
              <small>
                {service.automatic && format === "electronic"
                  ? "В демо PDF появится сразу после отправки"
                  : "Статус обновит сотрудник сервисного центра"}
              </small>
            </span>
          </div>
          <div className="order-term">
            <Bell size={18} />
            <span>
              <strong>Всё останется в кабинете</strong>
              <small>История, ответы и готовый документ</small>
            </span>
          </div>
          <p className="demo-document-note">
            <Info size={15} />
            Вы получите учебный образец, без подписи вуза.
          </p>
          {"department" in service && (
            <p className="muted">Заявку рассмотрит {service.department.toLowerCase()}.</p>
          )}
          {error && (
            <div id="form-error" tabIndex={-1} className="error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <>
                <Spinner />
                Отправляем…
              </>
            ) : (
              <>
                Отправить заявку
                <ArrowRight size={17} />
              </>
            )}
          </button>
          <small className="muted">
            Только вымышленные данные. Обязательные поля отмечены *.
          </small>
        </aside>
      </form>
    </>
  );
}
function CaseDetail({
  item,
  staff,
  openRelated,
  reportProblem,
  onChange,
}: {
  item: Case;
  staff: boolean;
  openRelated: (id: string) => void;
  reportProblem?: () => void;
  onChange: () => Promise<void>;
}) {
  const document = isDocumentService(item.service);
  const application =
    !document && item.service !== "question" && item.service !== "feedback";
  const contextual = item.service === "exam-request" || item.service === "profile-correction";
  const readyDocument = document && ["ready", "issued"].includes(item.status);
  const readyEvent = item.events?.find((event) => event.status === "ready");
  const issuedEvent = item.events?.find((event) => event.status === "issued");
  const canIssue =
    staff && document && item.format === "paper" && item.status === "ready";
  const reason =
    item.service === "feedback"
      ? feedbackReasons.find((entry) => entry.id === item.topic)
      : undefined;
  const service = services.find((s) => s.id === item.service)!,
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [comment, setComment] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false),
    [nextStatus, setNextStatus] = useState(
      item.status === "created"
        ? "working"
        : canIssue
          ? "issued"
          : item.status === "working"
            ? "ready"
            : "working",
    );
  async function update(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `requests/${item.id}/${staff ? "status" : "reply"}`,
        staff
          ? { status: nextStatus, expectedStatus: item.status, comment }
          : { comment },
      );
      setComment("");
      await onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await api(`requests/${item.id}/cancel`, { expectedStatus: "created" });
      await onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={service.title}
        text={`${service.language} · № ${item.id.slice(-8).toUpperCase()}`}
        action={
          <Status
            value={item.status}
            label={
              !document && item.status === "ready"
                ? item.service === "question"
                  ? "Решено"
                  : "Ответ получен"
                : document && item.format === "paper" && item.status === "ready"
                  ? "К выдаче"
                  : undefined
            }
          />
        }
      />
      {!staff && item.status === "created" && (
        <section className="panel cancel-request">
          <div>
            <h2>{confirmCancel ? "Отменить эту заявку?" : "Отмена заявки"}</h2>
            <p>
              {confirmCancel
                ? "Заявка ещё не взята в работу. Она останется в истории со статусом «Отменена». При необходимости можно подать новую."
                : "Пока сотрудник не начал обработку, заявку можно отменить."}
            </p>
          </div>
          {confirmCancel ? (
            <div className="cancel-request-actions">
              <button
                className="button secondary"
                onClick={() => setConfirmCancel(false)}
                disabled={busy}
              >
                Вернуться
              </button>
              <button
                className="button cancel-confirm"
                onClick={() => void cancel()}
                disabled={busy}
              >
                {busy ? <Spinner /> : "Да, отменить заявку"}
              </button>
            </div>
          ) : (
            <button
              className="button secondary"
              onClick={() => setConfirmCancel(true)}
            >
              Отменить заявку
            </button>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button className="text-button" onClick={() => void onChange()}>
                Обновить карточку
              </button>
            </div>
          )}
        </section>
      )}
      {item.status === "cancelled" && (
        <div className="inline-info cancelled-info">
          <Info size={18} />
          <span>
            Заявка отменена. Причина и время сохранены в истории; обработка
            остановлена.
          </span>
        </div>
      )}
      {!document && item.status === "ready" && (
        <div className="ready-banner">
          <CheckCircle2 size={25} />
          <div>
            <h2>
              {application
                ? "Получен ответ по заявке"
                : "На ваше обращение ответили"}
            </h2>
            <p>Ответ сотрудника сохранён в истории ниже.</p>
          </div>
        </div>
      )}
      {!staff && contextual && ["created", "working"].includes(item.status) && (
        <div className="inline-info">
          <Info size={18} />
          <span>
            {item.service === "exam-request"
              ? "Дождитесь ответа учебного офиса. Если понадобится оригинал, сотрудник сообщит, куда и когда его принести."
              : "Сервисный центр проверит сведения. Ответ или запрос подтверждения появится в истории заявки."}
          </span>
        </div>
      )}
      {readyDocument && (
        <>
          <section className="ready-banner document-ready">
            <span className="success-icon">
              <CheckCircle2 size={26} />
            </span>
            <div>
              <h2>
                {item.status === "issued"
                  ? "Документ выдан"
                  : item.format === "paper"
                    ? "Документ готов к выдаче"
                    : "Документ готов"}
              </h2>
              {issuedEvent && (
                <p>Выдан {dateLabel(issuedEvent.created_at, true)} (МСК).</p>
              )}
              {item.status === "ready" && item.format === "paper" && (
                <p>
                  Учебная точка выдачи — кабинет А-101, пн–пт, 10:00–17:00
                  (МСК). Получателю нужно удостоверение личности.
                </p>
              )}
            </div>
            <div className="document-downloads">
              <a
                className="button primary"
                href={`/api/portal/requests/${item.id}/document`}
              >
                <Download size={17} />
                Скачать PDF
              </a>
            </div>
          </section>
          <DocumentVerification id={item.id} />
        </>
      )}
      {!document && (
        <section className="panel appeal-original">
          <span className="eyebrow">
            {application ? "ВАША ЗАЯВКА" : "ВАШЕ ОБРАЩЕНИЕ"}
          </span>
          <h2>{item.department}</h2>
          {reason && <p>Причина — {reason.label}</p>}
          {item.related_request_id && (
            <button
              className="text-button"
              onClick={() => openRelated(item.related_request_id!)}
            >
              Исходная заявка №{" "}
              {item.related_request_id.slice(-8).toUpperCase()}{" "}
              <ArrowUpRight size={14} />
            </button>
          )}
          <p>{item.message}</p>
          {item.evidence && (
            <a className="case-evidence" href={`/api/portal/requests/${item.id}/evidence`}>
              <Download size={18} aria-hidden="true" />
              <span><strong>Скачать подтверждение</strong>
                <small>{item.evidence.name} · {Math.max(1, Math.ceil(item.evidence.byteSize / 1024))} КБ</small>
              </span>
            </a>
          )}
        </section>
      )}
      <div className="case-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>История заявки</h2>
            <button className="text-button" onClick={() => void onChange()}>
              <RefreshCw size={15} />
              Обновить
            </button>
          </div>
          <ol className="timeline">
            {item.events?.map((event, i) => (
              <li
                key={event.id}
                className={i === item.events!.length - 1 ? "current" : ""}
              >
                <span className="timeline-marker">
                  {["ready", "issued"].includes(event.status) ? (
                    <Check size={15} />
                  ) : (
                    <span />
                  )}
                </span>
                <div>
                  <div className="timeline-title">
                    <strong>
                      {!document && event.status === "ready"
                        ? "Ответ получен"
                        : event.status === "ready" && item.format === "paper"
                          ? "Готово к выдаче"
                          : statuses[event.status]}
                    </strong>
                    <time>{dateLabel(event.created_at, true)}</time>
                  </div>
                  {event.comment && <p>{event.comment}</p>}
                </div>
              </li>
            ))}
          </ol>
          {(staff || !application || contextual) &&
            !["ready", "issued", "cancelled"].includes(item.status) && (
              <div className="eta">
                <Clock3 size={17} />
                <span>
                  Плановый срок <strong>{dateLabel(item.due_at, true)}</strong>
                </span>
              </div>
            )}
          {((staff &&
            (canIssue ||
              !["ready", "issued", "cancelled"].includes(item.status))) ||
            (!staff && item.status === "needs_info")) && (
            <form className="staff-form" onSubmit={update}>
              <h3>
                {canIssue
                  ? "Отметить выдачу"
                  : staff
                    ? "Обработка обращения"
                    : "Ответить сервисному центру"}
              </h3>
              {canIssue && (
                <p className="muted">
                  Подтвердите после передачи бумажного документа получателю.
                </p>
              )}
              {staff && !canIssue && (
                <div className="form-field">
                  <label htmlFor="next-status">Новый статус</label>
                  <select
                    id="next-status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                  >
                    {(item.status === "created"
                      ? ["working", "needs_info", "cancelled"]
                      : item.status === "working"
                        ? ["ready", "needs_info", "cancelled"]
                        : ["working", "cancelled"]
                    ).map((s) => (
                      <option value={s} key={s}>
                        {s === "ready" && !document
                          ? "Ответить и закрыть"
                          : statuses[s]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-field">
                <label htmlFor="case-comment">
                  {staff
                    ? !document
                      ? "Ответ студенту"
                      : "Комментарий студенту"
                    : "Ваш ответ"}
                </label>
                <textarea
                  id="case-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  required={
                    !staff ||
                    ["needs_info", "cancelled"].includes(nextStatus) ||
                    (!document && nextStatus === "ready")
                  }
                  minLength={
                    staff && !document && nextStatus === "ready" ? 10 : 5
                  }
                  placeholder={
                    staff
                      ? "Что важно знать студенту?"
                      : "Введите уточнение по заявке"
                  }
                />
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <button className="button primary" disabled={busy}>
                {busy ? (
                  <Spinner />
                ) : canIssue ? (
                  "Подтвердить выдачу"
                ) : staff ? (
                  "Сохранить статус"
                ) : (
                  "Отправить ответ"
                )}
              </button>
            </form>
          )}
        </section>
        <aside className="panel case-details">
          <h2>Детали</h2>
          <dl>
            {readyEvent && document && (
              <div>
                <dt>Документ подготовлен</dt>
                <dd>{dateLabel(readyEvent.created_at, true)} (МСК)</dd>
              </div>
            )}
            {staff && (
              <div>
                <dt>Студент</dt>
                <dd>
                  {item.student_name}
                  <small>{item.student_group}</small>
                </dd>
              </div>
            )}
            <div>
              <dt>Дата подачи</dt>
              <dd>{dateLabel(item.created_at, true)}</dd>
            </div>
            <div>
              <dt>{!document ? "Способ ответа" : "Способ получения"}</dt>
              <dd>
                {!document
                  ? "В личном кабинете"
                  : item.format === "electronic"
                    ? "Электронный документ"
                    : "Бумажный оригинал"}
              </dd>
            </div>
            {item.organization && (
              <div>
                <dt>Куда предоставляется</dt>
                <dd>{item.organization}</dd>
              </div>
            )}
            {item.latin_name && (
              <div>
                <dt>Имя латиницей</dt>
                <dd>{item.latin_name}</dd>
              </div>
            )}
            {item.phone && (
              <div>
                <dt>Телефон</dt>
                <dd>{item.phone}</dd>
              </div>
            )}
            {item.format === "paper" && (
              <div>
                <dt>Получатель</dt>
                <dd>
                  {item.recipient === "other"
                    ? item.representative
                    : "Лично студент"}
                </dd>
              </div>
            )}
          </dl>
          <div className="demo-document-note">
            <ShieldCheck size={17} />
            <span>
              {!document
                ? "Учебное обращение. Реальным подразделениям не отправляется."
                : "Учебный документ с вымышленными данными."}
            </span>
          </div>
          {reportProblem && (
            <button
              className="text-button problem-action"
              onClick={reportProblem}
            >
              <Info size={16} /> Сообщить о проблеме
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
