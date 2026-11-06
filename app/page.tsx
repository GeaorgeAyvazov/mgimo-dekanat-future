"use client";
import {
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  FileText,
  Bell,
  LayoutDashboard,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  CheckCircle2,
  Plus,
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
  type Service,
  type Student,
  type Grade,
  type Case,
  type Lesson,
  type Notice,
} from "@/lib/catalog";
type Data = {
  user: Student;
  requests: Case[];
  grades: Grade[];
  lessons: Lesson[];
  notices: Notice[];
  today: string;
};
type View =
  | "today"
  | "schedule"
  | "grades"
  | "services"
  | "profile"
  | "notifications"
  | "case"
  | "order"
  | "staff";
const navigation = [
  { id: "today", label: "Сегодня", icon: LayoutDashboard },
  { id: "schedule", label: "Расписание", icon: CalendarDays },
  { id: "grades", label: "Успеваемость", short: "Учёба", icon: GraduationCap },
  {
    id: "services",
    label: "Справки и заявки",
    short: "Справки",
    icon: FileText,
  },
  { id: "profile", label: "Мой профиль", short: "Профиль", icon: UserRound },
];
const titles: Record<string, string> = {
  today: "Сегодня",
  schedule: "Расписание",
  grades: "Успеваемость",
  services: "Справки и заявки",
  profile: "Мой профиль",
  notifications: "Уведомления",
  case: "Моя заявка",
  order: "Заказать документ",
  staff: "Обращения студентов",
};
const iconMap = {
  file: FileText,
  globe: Globe2,
  list: ListChecks,
  book: BookOpen,
  award: Award,
};
const DEMO_PASSWORD = "Student2026!";
async function api<T = Data>(path: string, data?: unknown): Promise<T> {
  const response = await fetch("/api/portal/" + path, {
    credentials: "same-origin",
    headers: data
      ? { "Content-Type": "application/json", "X-Dekanat-Request": "1" }
      : {},
    ...(data ? { method: "POST", body: JSON.stringify(data) } : {}),
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
        деканат<span className="brand-caption">Всё для учёбы</span>
      </span>
    </div>
  );
}
function Spinner() {
  return <LoaderCircle className="spin" size={19} aria-hidden="true" />;
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <span />
      {statuses[value] || value}
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
      <section className="login-story">
        <Logo />
        <div className="story-body">
          <span className="eyebrow">СТУДЕНЧЕСКИЙ СЕРВИС</span>
          <h1>
            Меньше очередей.
            <br />
            Больше студенческой
            <br />
            <span>жизни.</span>
          </h1>
          <p>
            Расписание, оценки и нужные документы.
            <br />
            Всё рядом. Всё по делу.
          </p>
          <div className="story-cards">
            <div>
              <CalendarDays />
              <span>
                Следующая пара<small>Международные отношения · А-201</small>
              </span>
              <CheckCircle2 />
            </div>
            <div>
              <FileText />
              <span>
                Справка готова<small>Можно скачать прямо сейчас</small>
              </span>
              <CheckCircle2 />
            </div>
          </div>
        </div>
        <span className="story-footer">Цифровой деканат будущего · МГИМО</span>
      </section>
      <section className="login-panel">
        <div className="mobile-brand">
          <Logo />
        </div>
        <div className="login-form">
          <span className="prototype-label">
            <span />
            Учебный прототип
          </span>
          <h2>Привет, студент!</h2>
          <p className="muted">Войдите, чтобы всё было под рукой.</p>
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
            <ShieldCheck size={16} />В прототипе используются только вымышленные
            данные. Это самостоятельный учебный проект.
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
    [view, setView] = useState<View>("today"),
    [entity, setEntity] = useState(""),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("catalog"),
    [selectedDay, setSelectedDay] = useState(-1),
    [week, setWeek] = useState(0),
    [scheduleMode, setScheduleMode] = useState("day"),
    [activeCase, setActiveCase] = useState<Case | null>(null),
    [caseError, setCaseError] = useState(""),
    [caseLoading, setCaseLoading] = useState(false),
    [caseTick, setCaseTick] = useState(0),
    [requestFilter, setRequestFilter] = useState("all");
  const mainRef = useRef<HTMLElement>(null);
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
    function read() {
      const [v, id] = location.hash.slice(1).split("/");
      setView((Object.keys(titles).includes(v) ? v : "today") as View);
      setEntity(id || "");
      setSearch("");
    }
    queueMicrotask(read);
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
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
  }, [view, entity, data?.user.id, caseTick]);
  function go(v: View, id = "") {
    const hash = `#${v}${id ? "/" + id : ""}`;
    if (location.hash === hash) {
      setView(v);
      setEntity(id);
    } else window.history.pushState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    setSearch("");
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  }
  async function signOut() {
    try {
      await api("logout", {});
      setData(null);
      setActiveCase(null);
      window.history.replaceState(null, "", "#today");
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
  if (loading)
    return (
      <div className="initial-load">
        <Logo />
        <Spinner />
        <p>Собираем ваш учебный день…</p>
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
          if (d) go(d.user.role === "staff" ? "staff" : "today");
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
  const dayIndex = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7,
    dayLessons = lessons.filter((l) => l.day === dayIndex),
    activeRequests = requests.filter(
      (r) => !["ready", "cancelled"].includes(r.status),
    );
  const scoreGrades = grades.filter((g) => g.score !== null),
    average = scoreGrades.length
      ? Math.round(
          scoreGrades.reduce((a, g) => a + (g.score || 0), 0) /
            scoreGrades.length,
        )
      : 0;
  const nav = staff
    ? [
        { id: "staff", label: "Обращения", icon: Inbox },
        { id: "profile", label: "Мой профиль", icon: UserRound },
      ]
    : navigation;
  const activeDay = selectedDay < 0 ? dayIndex : selectedDay;
  const selectedService = services.find((s) => s.id === entity);
  const weekStart = new Date(today + "T12:00:00Z");
  weekStart.setUTCDate(weekStart.getUTCDate() - dayIndex + week * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
  function requestCard(r: Case) {
    const s = services.find((s) => s.id === r.service)!;
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
            <span className="dot-divider">·</span>
            {r.format === "electronic" ? "Электронная" : "Бумажная"}
          </span>
          <small>
            От {dateLabel(r.created_at)} · № {r.id.slice(-8).toUpperCase()}
          </small>
        </span>
        <Status value={r.status} />
        <ChevronRight size={18} className="muted" />
      </button>
    );
  }
  function lessonCard(l: Lesson, i: number) {
    return (
      <div key={l.id} className={`lesson ${l.change ? "lesson-changed" : ""}`}>
        <div className="lesson-time">
          <strong>{l.start}</strong>
          <span>{l.end}</span>
        </div>
        <div className="lesson-line" />
        <div className="lesson-main">
          <span className="lesson-kind">
            {l.kind}
            <span> {i + 1} пара</span>
          </span>
          <h3>{l.subject}</h3>
          <p>
            <UserRound size={14} />
            {l.teacher}
          </p>
          {l.change && (
            <div className="change-note">
              <RefreshCw size={13} />
              {l.change}: <s>{l.oldRoom}</s>
              <ArrowRight size={12} />
              <b>{l.room}</b>
            </div>
          )}
        </div>
        <span className="room">
          <MapPin size={14} />
          {l.room}
        </span>
      </div>
    );
  }
  const currentNav = view === "case" || view === "order" ? "services" : view;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <aside className="sidebar">
        <button
          className="logo-button"
          onClick={() => go(staff ? "staff" : "today")}
          aria-label="На главную"
        >
          <Logo />
        </button>
        <div className="campus">
          <Building2 size={16} />
          <span>
            МГИМО<small>Деканат будущего</small>
          </span>
          <span className="campus-tag">DEMO</span>
        </div>
        <nav aria-label="Основная навигация">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${currentNav === n.id ? "active" : ""}`}
              onClick={() => go(n.id as View)}
              aria-current={currentNav === n.id ? "page" : undefined}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
              {n.id === "services" && activeRequests.length > 0 && (
                <b className="nav-count">{activeRequests.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <MessageCircle size={22} />
            <strong>Есть вопрос по заявке?</strong>
            <p>Ответ сотрудника и уточнения — прямо в её карточке.</p>
            <button
              onClick={() => {
                setTab("requests");
                go(staff ? "staff" : "services");
              }}
            >
              Мои обращения <ArrowUpRight size={15} />
            </button>
          </div>
          <span className="sidebar-demo">
            <ShieldCheck size={15} />
            Учебный прототип
          </span>
          <button className="sidebar-profile" onClick={() => go("profile")}>
            <span className="avatar">{initials}</span>
            <span>
              <strong>
                {firstName} {user.name.split(" ")[2]}
              </strong>
              <small>
                {user.student_group}
                {!staff && ` · ${user.course} курс`}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo />
          </div>
          <div className="breadcrumb">
            <span>Личный кабинет</span>
            <ChevronRight size={13} />
            <strong>{titles[view]}</strong>
          </div>
          <div className="global-search">
            <Search size={17} />
            <input
              aria-label="Поиск по кабинету"
              placeholder="Что вы ищете?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <>
                <button
                  className="icon-btn"
                  aria-label="Очистить поиск"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
                <div className="search-results">
                  {[
                    ...navigation.map((n) => ({
                      title: n.label,
                      view: n.id,
                      id: "",
                    })),
                    ...(!staff
                      ? services.map((s) => ({
                          title: s.title + " · " + s.language,
                          view: "order",
                          id: s.id,
                        }))
                      : []),
                  ]
                    .filter((n) =>
                      n.title.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((n) => (
                      <button
                        key={n.view + n.id}
                        onClick={() => go(n.view as View, n.id)}
                      >
                        {n.title}
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  {![
                    ...navigation.map((n) => n.label),
                    ...services.map((s) => s.title + " " + s.language),
                  ].some((n) =>
                    n.toLowerCase().includes(search.toLowerCase()),
                  ) && <p>Ничего не найдено. Попробуйте «справка».</p>}
                </div>
              </>
            )}
          </div>
          <button
            className={`icon-btn notification-button ${view === "notifications" ? "selected" : ""}`}
            aria-label={`Уведомления${unread ? `, непрочитанных: ${unread}` : ""}`}
            onClick={() => go("notifications")}
          >
            <Bell size={22} />
            {unread > 0 && <span className="notification-dot" />}
          </button>
          <button
            className="top-avatar avatar"
            aria-label="Мой профиль"
            onClick={() => go("profile")}
          >
            {initials}
          </button>
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
          {view === "today" && !staff && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {new Intl.DateTimeFormat("ru-RU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "Europe/Moscow",
                    }).format(new Date(today + "T12:00:00Z"))}
                  </div>
                  <h1>
                    Привет, {firstName}
                    <span className="greeting-dot">.</span>
                  </h1>
                  <p>Учебный день — под контролем.</p>
                </div>
                <span className="semester-pill">Осенний семестр 2026</span>
              </div>
              <section className="welcome-banner">
                <div>
                  <span className="banner-kicker">
                    <span />
                    СЕРВИСНЫЙ ЦЕНТР ОНЛАЙН
                  </span>
                  <h2>
                    За справкой — сюда.
                    <br />В деканат идти не нужно.
                  </h2>
                  <p>
                    Закажите документ за пару минут.
                    <br />
                    Мы сообщим, когда всё будет готово.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => go("services")}
                  >
                    Заказать справку
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="document-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-spark">✦</div>
                  <div className="art-sheet">
                    <span className="art-logo">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="art-title" />
                    <span className="art-line long" />
                    <span className="art-line" />
                    <span className="art-line medium" />
                    <span className="art-line long" />
                    <div className="art-seal">
                      <Check size={28} />
                    </div>
                  </div>
                  <div className="art-notice">
                    <CheckCircle2 size={19} />
                    <span>
                      Готово к скачиванию<small>Электронная справка</small>
                    </span>
                  </div>
                </div>
              </section>
              <div className="summary-grid">
                <button onClick={() => go("schedule")}>
                  <span className="summary-icon blue">
                    <CalendarDays size={20} />
                  </span>
                  <span>
                    <strong>
                      {dayLessons.length}{" "}
                      {dayLessons.length === 3 ? "пары" : "занятий"}
                    </strong>
                    <small>
                      {dayLessons.length
                        ? `${dayLessons[0].start} – ${dayLessons.at(-1)!.end}`
                        : "Сегодня можно выдохнуть"}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
                <button
                  onClick={() => {
                    setTab("requests");
                    go("services");
                  }}
                >
                  <span className="summary-icon violet">
                    <FileText size={20} />
                  </span>
                  <span>
                    <strong>{activeRequests.length} в работе</strong>
                    <small>
                      {requests.filter((r) => r.status === "ready").length}{" "}
                      готовых документов
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
                <button onClick={() => go("grades")}>
                  <span className="summary-icon green">
                    <GraduationCap size={20} />
                  </span>
                  <span>
                    <strong>
                      {average} <span className="score-outof">/ 100</span>
                    </strong>
                    <small>Средний балл за сессию</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="dashboard-grid">
                <section className="panel schedule-panel">
                  <div className="section-heading">
                    <h2>Занятия сегодня</h2>
                    <button
                      className="text-button"
                      onClick={() => go("schedule")}
                    >
                      Вся неделя
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  {dayLessons.length ? (
                    dayLessons.map(lessonCard)
                  ) : (
                    <Empty
                      icon={CalendarDays}
                      title="Сегодня занятий нет"
                      text="Расписание на другие дни — во вкладке «Расписание»."
                    />
                  )}
                  <div className="panel-footnote">
                    <Info size={14} />
                    Показана ваша учебная группа и языковая подгруппа.
                  </div>
                </section>
                <div className="dashboard-side">
                  <section className="panel compact-panel">
                    <div className="section-heading">
                      <h2>На заметку</h2>
                      <span className="small-badge">{unread}</span>
                    </div>
                    <span className="notice-category">
                      <Clock3 size={14} />
                      ДЕДЛАЙН · 20 НОЯБРЯ
                    </span>
                    <h3>Думаете об обмене?</h3>
                    <p>
                      Подготовьте транскрипт заранее — он понадобится для
                      заявки.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => go("order", "transcript-en")}
                    >
                      Заказать транскрипт
                      <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="panel compact-panel request-teaser">
                    <div className="section-heading">
                      <h2>Мои заявки</h2>
                      <button
                        className="icon-btn"
                        aria-label="Все заявки"
                        onClick={() => {
                          setTab("requests");
                          go("services");
                        }}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                    {requests.length ? (
                      <>
                        {requests.slice(0, 2).map((r) => (
                          <button key={r.id} onClick={() => go("case", r.id)}>
                            <FileText size={19} />
                            <span>
                              <strong>
                                {
                                  services.find((s) => s.id === r.service)!
                                    .title
                                }
                              </strong>
                              <Status value={r.status} />
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        ))}
                      </>
                    ) : (
                      <p>Ваши обращения появятся здесь.</p>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
          {view === "schedule" && !staff && (
            <>
              <PageHeading
                title="Расписание"
                text="Занятия вашей группы. Изменения уже учтены."
              />
              <div className="schedule-toolbar">
                <div className="week-control">
                  <button
                    className="icon-btn"
                    aria-label="Предыдущая неделя"
                    onClick={() => setWeek(week - 1)}
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
                    onClick={() => setWeek(week + 1)}
                  >
                    <ChevronRight size={19} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setWeek(0);
                      setSelectedDay(dayIndex);
                    }}
                  >
                    Сегодня
                  </button>
                </div>
                <div className="segmented">
                  <button
                    className={scheduleMode === "day" ? "active" : ""}
                    onClick={() => setScheduleMode("day")}
                  >
                    День
                  </button>
                  <button
                    className={scheduleMode === "week" ? "active" : ""}
                    onClick={() => setScheduleMode("week")}
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
                      setSelectedDay(i);
                      setScheduleMode("day");
                    }}
                    className={`${activeDay === i ? "active" : ""} ${week === 0 && i === dayIndex ? "is-today" : ""}`}
                  >
                    <span>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</span>
                    <strong>{d.getUTCDate()}</strong>
                    <i />
                  </button>
                ))}
              </div>
              <div className="inline-info">
                <RefreshCw size={17} />
                <span>
                  В пятницу изменена аудитория второй пары: <s>А-214</s> →{" "}
                  <b>А-305</b>.
                </span>
              </div>
              {scheduleMode === "day" ? (
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
                    <span className="muted">{user.student_group}</span>
                  </div>
                  {lessons.filter((l) => l.day === activeDay).length ? (
                    lessons.filter((l) => l.day === activeDay).map(lessonCard)
                  ) : (
                    <Empty
                      icon={CalendarDays}
                      title="В этот день занятий нет"
                      text="Можно заняться проектом или просто отдохнуть."
                    />
                  )}
                </section>
              ) : (
                <div className="week-list">
                  {weekDays.map((d, i) => (
                    <section className="panel" key={i}>
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
                            ][i]
                          }
                          <span className="muted">
                            {" "}
                            · {dateLabel(d.toISOString())}
                          </span>
                        </h2>
                      </div>
                      {lessons.filter((l) => l.day === i).length ? (
                        lessons.filter((l) => l.day === i).map(lessonCard)
                      ) : (
                        <p className="muted">Занятий нет</p>
                      )}
                    </section>
                  ))}
                </div>
              )}
              <p className="page-note">
                Московское время · Учебное демонстрационное расписание
                повторяется каждую неделю.
              </p>
            </>
          )}
          {view === "grades" && !staff && (
            <>
              <PageHeading
                title="Успеваемость"
                text="Понятная картина того, как идут дела с учёбой."
              />
              <div className="grade-overview">
                <section className="panel average-card">
                  <span className="eyebrow">СРЕДНИЙ БАЛЛ</span>
                  <strong>
                    {average}
                    <small>/ 100</small>
                  </strong>
                  <p>По {scoreGrades.length} экзаменам за летнюю сессию</p>
                  <div className="progress-track">
                    <span style={{ width: `${average}%` }} />
                  </div>
                </section>
                <section className="panel session-card">
                  <span className="success-icon">
                    <CheckCircle2 size={27} />
                  </span>
                  <div>
                    <h2>Сессия закрыта</h2>
                    <p>
                      {grades.length} из {grades.length} дисциплин сданы.
                      Академических задолженностей нет.
                    </p>
                    <span className="status status-ready">
                      <Check size={13} />
                      Всё в порядке
                    </span>
                  </div>
                </section>
              </div>
              <div className="section-heading grades-heading">
                <h2>Результаты по дисциплинам</h2>
                <span className="semester-pill">Летняя сессия · 2025/26</span>
              </div>
              <div className="grade-list">
                {grades.map((g) => (
                  <article className="panel grade-card" key={g.subject}>
                    <div>
                      <span className="lesson-kind">
                        {g.type} · {dateLabel(g.date + "T12:00:00Z")}
                      </span>
                      <h3>{g.subject}</h3>
                      <p>
                        <UserRound size={14} />
                        {g.teacher}
                      </p>
                    </div>
                    <div className="grade-result">
                      {g.score !== null ? (
                        <>
                          <strong
                            className={
                              g.score >= 90
                                ? "excellent"
                                : g.score >= 75
                                  ? "good"
                                  : "satisfactory"
                            }
                          >
                            {g.score}
                            <small>/100</small>
                          </strong>
                          <span>{g.result}</span>
                        </>
                      ) : (
                        <>
                          <span className="grade-pass">
                            <CheckCircle2 size={20} />
                            Зачтено
                          </span>
                          <span>Без балльной оценки</span>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <div className="inline-info">
                <Info size={17} />
                <span>
                  Средний балл учитывает только экзамены. Зачёты не считаются за
                  ноль. Шкала демо: 90–100 — отлично, 75–89 — хорошо, 60–74 —
                  удовлетворительно.
                </span>
              </div>
              <section className="transcript-callout">
                <BookOpen size={27} />
                <div>
                  <h3>Нужна официальная выписка?</h3>
                  <p>Закажите документ на русском или английском языке.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => go("order", "grades-ru")}
                >
                  Заказать выписку
                  <ArrowUpRight size={16} />
                </button>
              </section>
            </>
          )}
          {(view === "services" || view === "staff") && (
            <>
              <PageHeading
                title={staff ? "Обращения студентов" : "Справки и заявки"}
                text={
                  staff
                    ? "Очередь сервисного центра. Изменения сразу увидит студент."
                    : "Закажите онлайн. Получите так, как удобно вам."
                }
                action={
                  <button
                    className="button secondary"
                    onClick={async () => {
                      await refresh();
                      setToast("Данные обновлены");
                    }}
                  >
                    <RefreshCw size={16} />
                    Обновить
                  </button>
                }
              />
              {!staff && (
                <div className="page-tabs">
                  <button
                    className={tab === "catalog" ? "active" : ""}
                    onClick={() => setTab("catalog")}
                  >
                    Заказать документ
                  </button>
                  <button
                    className={tab === "requests" ? "active" : ""}
                    onClick={() => setTab("requests")}
                  >
                    Мои заявки <span>{requests.length}</span>
                  </button>
                </div>
              )}
              {!staff && tab === "catalog" ? (
                <>
                  <div className="service-intro">
                    <span className="success-icon">
                      <ShieldCheck size={24} />
                    </span>
                    <div>
                      <strong>Ваши данные уже заполнены</strong>
                      <p>
                        Выберите справку и способ получения. В деканат идти
                        нужно только за бумажным оригиналом.
                      </p>
                    </div>
                  </div>
                  <div className="service-grid">
                    {services.map((s) => (
                      <button
                        className="service-card"
                        key={s.id}
                        onClick={() => go("order", s.id)}
                      >
                        <div className="service-card-top">
                          <ServiceIcon service={s} />
                          <ArrowUpRight size={19} />
                        </div>
                        <span className="service-language">{s.language}</span>
                        <h2>{s.title}</h2>
                        <p>{s.description}</p>
                        <span className="service-term">
                          <Clock3 size={14} />
                          {s.term}
                        </span>
                      </button>
                    ))}
                    <div className="service-help">
                      <MessageCircle size={29} />
                      <h2>Не уверены, что выбрать?</h2>
                      <p>
                        Для подтверждения статуса студента подойдёт справка об
                        обучении. Для оценок — выписка или транскрипт.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => go("order", "enrollment-ru")}
                      >
                        Начать со справки
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="page-note">
                    <Info size={14} />
                    Все документы прототипа содержат отметку «Учебный образец».
                  </p>
                </>
              ) : (
                <>
                  <div className="filter-row">
                    <SlidersHorizontal size={16} />
                    {[
                      ["all", "Все"],
                      ["active", "В работе"],
                      ["ready", "Готовые"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        className={
                          requestFilter === id ? "filter active" : "filter"
                        }
                        onClick={() => setRequestFilter(id)}
                      >
                        {label}
                      </button>
                    ))}
                    <span className="muted">{requests.length} заявок</span>
                  </div>
                  <section className="panel request-list">
                    {requests.filter(
                      (r) =>
                        requestFilter === "all" ||
                        (requestFilter === "ready"
                          ? r.status === "ready"
                          : !["ready", "cancelled"].includes(r.status)),
                    ).length ? (
                      requests
                        .filter(
                          (r) =>
                            requestFilter === "all" ||
                            (requestFilter === "ready"
                              ? r.status === "ready"
                              : !["ready", "cancelled"].includes(r.status)),
                        )
                        .map(requestCard)
                    ) : (
                      <Empty
                        title="Здесь пока нет заявок"
                        text="Здесь появятся ваши обращения и готовые документы."
                      >
                        {!staff && (
                          <button
                            className="button primary"
                            onClick={() => setTab("catalog")}
                          >
                            <Plus size={16} />
                            Заказать справку
                          </button>
                        )}
                      </Empty>
                    )}
                  </section>
                </>
              )}
            </>
          )}
          {view === "order" &&
            !staff &&
            (selectedService ? (
              <OrderForm
                key={selectedService.id}
                service={selectedService}
                user={user}
                back={() => go("services")}
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
            ) : (
              <Empty title="Документ не найден">
                <button
                  className="button primary"
                  onClick={() => go("services")}
                >
                  К каталогу
                </button>
              </Empty>
            ))}
          {view === "case" && (
            <>
              <button
                className="back-button"
                onClick={() => {
                  setTab("requests");
                  go(staff ? "staff" : "services");
                }}
              >
                <ArrowLeft size={17} />
                Все заявки
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
                    item={activeCase}
                    staff={staff}
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
                text="Важное от деканата и изменения в учёбе."
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
                      {n.type === "schedule" ? (
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
                          {n.type === "schedule"
                            ? "Расписание"
                            : n.type === "deadline"
                              ? "Дедлайн"
                              : "Сервисный центр"}
                        </span>
                        <time>{dateLabel(n.date)}</time>
                        {!n.read && <span className="unread-label">Новое</span>}
                      </div>
                      <h2>{n.title}</h2>
                      <p>{n.text}</p>
                      <div className="notice-actions">
                        <button
                          className="text-button"
                          onClick={() => {
                            void readNotices(n.id);
                            go(
                              n.type === "deadline"
                                ? "order"
                                : (n.link as View),
                              n.type === "deadline" ? "transcript-en" : "",
                            );
                          }}
                        >
                          {n.type === "schedule"
                            ? "Открыть расписание"
                            : n.type === "deadline"
                              ? "Заказать транскрипт"
                              : "К справкам"}
                          <ArrowRight size={15} />
                        </button>
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
            !["staff", "services", "profile", "notifications", "case"].includes(
              view,
            ) && (
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
            <span>Учебный прототип · Все данные вымышлены</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {nav.map((n) => (
          <button
            key={n.id}
            className={currentNav === n.id ? "active" : ""}
            onClick={() => go(n.id as View)}
            aria-current={currentNav === n.id ? "page" : undefined}
          >
            <n.icon size={21} />
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
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function OrderForm({
  service,
  user,
  back,
  onCreated,
}: {
  service: Service;
  user: Student;
  back: () => void;
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
        Все документы
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
          <span className="eyebrow">ВАША ЗАЯВКА</span>
          <ServiceIcon service={service} />
          <h2>{service.title}</h2>
          <p>{service.language}</p>
          <div className="order-term">
            <Clock3 size={18} />
            <span>
              <strong>
                {service.automatic && format === "electronic"
                  ? "До 15 минут"
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
  onChange,
}: {
  item: Case;
  staff: boolean;
  onChange: () => Promise<void>;
}) {
  const service = services.find((s) => s.id === item.service)!,
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [comment, setComment] = useState(""),
    [nextStatus, setNextStatus] = useState(
      item.status === "created"
        ? "working"
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
  return (
    <>
      <PageHeading
        title={service.title}
        text={`${service.language} · № ${item.id.slice(-8).toUpperCase()}`}
        action={<Status value={item.status} />}
      />
      {item.status === "ready" && (
        <div className="ready-banner">
          <span className="success-icon">
            <CheckCircle2 size={27} />
          </span>
          <div>
            <h2>
              {item.format === "electronic"
                ? "Ваш документ готов"
                : "Можно забирать документ"}
            </h2>
            <p>
              {item.format === "electronic"
                ? "Скачайте учебный PDF. Он останется доступен в этой заявке."
                : "Учебная точка выдачи: кабинет А-101, пн–пт, 10:00–17:00. PDF-образец также доступен ниже."}
            </p>
          </div>
          <a
            className="button primary"
            href={`/api/portal/requests/${item.id}/document`}
          >
            <Download size={17} />
            Скачать PDF
          </a>
        </div>
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
                  {event.status === "ready" ? <Check size={15} /> : <span />}
                </span>
                <div>
                  <div className="timeline-title">
                    <strong>{statuses[event.status]}</strong>
                    <time>{dateLabel(event.created_at, true)}</time>
                  </div>
                  {event.comment && <p>{event.comment}</p>}
                </div>
              </li>
            ))}
          </ol>
          {!["ready", "cancelled"].includes(item.status) && (
            <div className="eta">
              <Clock3 size={17} />
              <span>
                Плановая готовность:{" "}
                <strong>{dateLabel(item.due_at, true)}</strong>
              </span>
            </div>
          )}
          {((staff && !["ready", "cancelled"].includes(item.status)) ||
            (!staff && item.status === "needs_info")) && (
            <form className="staff-form" onSubmit={update}>
              <h3>
                {staff ? "Обработка обращения" : "Ответить сервисному центру"}
              </h3>
              {staff && (
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
                        {statuses[s]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-field">
                <label htmlFor="case-comment">
                  {staff ? "Комментарий студенту" : "Ваш ответ"}
                </label>
                <textarea
                  id="case-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  required={
                    !staff || ["needs_info", "cancelled"].includes(nextStatus)
                  }
                  minLength={5}
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
              <dt>Способ получения</dt>
              <dd>
                {item.format === "electronic"
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
              Учебный документ с вымышленными данными, без официальной
              электронной подписи.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
