"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  Search,
  Star,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Globe2,
  ListChecks,
  BookOpen,
  Award,
  MessageCircle,
  FolderOpen,
  Inbox,
  Clock3,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Send,
  ShieldCheck,
  LoaderCircle,
  Compass,
  X,
} from "lucide-react";
import {
  services,
  topics,
  dateLabel,
  type Student,
  type Case,
  type Lesson,
} from "@/lib/catalog";
type Navigate = (view: string, id?: string) => void;
const icons = {
  file: FileText,
  globe: Globe2,
  list: ListChecks,
  book: BookOpen,
  award: Award,
  message: MessageCircle,
};
const situations = [
  {
    label: "Подтвердить, что я студент",
    id: "enrollment-ru",
    text: "Справка об обучении подтверждает ваш статус. Укажите организацию или «По месту требования».",
  },
  {
    label: "Подать документы на обмен",
    id: "transcript-en",
    text: "Транскрипт содержит результаты обучения на английском. Проверьте написание имени по загранпаспорту.",
  },
  {
    label: "Получить все свои оценки",
    id: "grades-ru",
    text: "Выписка из зачётной книжки собирает оценки и зачёты в один документ.",
  },
  {
    label: "Задать вопрос по учёбе",
    id: "question",
    text: "Опишите ситуацию один раз. Обращение получит нужное подразделение, а ответ останется в кабинете.",
  },
];
export function ServiceCenter({
  requests,
  lessons,
  favorites,
  onFavorite,
  go,
}: {
  requests: Case[];
  lessons: Lesson[];
  favorites: string[];
  onFavorite: (id: string, active: boolean) => Promise<void>;
  go: Navigate;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [situation, setSituation] = useState<number | null>(null),
    [saving, setSaving] = useState("");
  const ready = requests.filter(
      (r) => r.status === "ready" && r.service !== "question",
    ),
    active = requests.filter((r) => !["ready", "cancelled"].includes(r.status));
  const catalog = services.filter(
    (s) =>
      s.id !== "question" &&
      (!onlyFavorites || favorites.includes(s.id)) &&
      (category !== "international" ||
        s.id.endsWith("-en") ||
        s.id === "english-level") &&
      (category !== "grades" ||
        s.id === "grades-ru" ||
        s.id === "transcript-en") &&
      `${s.title} ${s.language} ${s.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function favorite(id: string) {
    setSaving(id);
    try {
      await onFavorite(id, !favorites.includes(id));
    } finally {
      setSaving("");
    }
  }
  return (
    <>
      <div className="center-heading">
        <div>
          <span className="eyebrow">МГИМО · ДЛЯ СТУДЕНТОВ ФИЛИАЛА</span>
          <h1>Центр сервиса «Студент»</h1>
          <p>Заказ документов, заявки и обращения студентов.</p>
        </div>
        <span className="center-demo">
          <ShieldCheck size={15} />
          Учебный прототип
        </span>
      </div>
      <div className="center-actions">
        <button onClick={() => go("services")}>
          <span className="center-action-icon">
            <Inbox size={23} />
          </span>
          <span>
            <strong>Мои обращения</strong>
            <small>
              {active.length
                ? `${active.length} в работе · история и ответы`
                : "История заявок и ответы сотрудников"}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>
        <button onClick={() => go("wallet")}>
          <span className="center-action-icon">
            <FolderOpen size={23} />
          </span>
          <span>
            <strong>Мои документы</strong>
            <small>
              {ready.length
                ? `${ready.length} готовых · скачать PDF`
                : "Все готовые справки в одном месте"}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>
        <button onClick={() => go("order", "question")}>
          <span className="center-action-icon">
            <MessageCircle size={23} />
          </span>
          <span>
            <strong>Задать вопрос</strong>
            <small>Направим в нужное подразделение</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
      </div>
      <section className="center-catalog">
        <div className="center-section-heading">
          <h2>Услуги и документы</h2>
          <div className="center-favorite-tabs">
            <button
              className={!onlyFavorites ? "active" : ""}
              onClick={() => setOnlyFavorites(false)}
            >
              Все услуги
            </button>
            <button
              className={onlyFavorites ? "active" : ""}
              onClick={() => setOnlyFavorites(true)}
            >
              <Star size={14} />
              Избранное {favorites.length > 0 && <b>{favorites.length}</b>}
            </button>
          </div>
        </div>
        <div className="center-search">
          <Search size={20} />
          <input
            aria-label="Найти услугу"
            placeholder="Найдите справку или нужную услугу"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-btn"
              aria-label="Очистить поиск услуг"
              onClick={() => setQuery("")}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <div className="center-categories" aria-label="Категории услуг">
          {[
            ["all", "Все документы"],
            ["international", "На английском"],
            ["grades", "Успеваемость"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={category === id}
              className={category === id ? "active" : ""}
              onClick={() => setCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="center-service-grid">
          {catalog.map((s) => {
            const Icon = icons[s.icon];
            return (
              <article
                key={s.id}
                className={`center-service-card ${favorites.includes(s.id) ? "is-favorite" : ""}`}
              >
                <button
                  className="center-service-open"
                  onClick={() => go("order", s.id)}
                >
                  <span className="center-service-icon">
                    <Icon size={31} strokeWidth={1.6} />
                  </span>
                  <span>
                    <h3>
                      {s.title}
                      <small>{s.language}</small>
                    </h3>
                    <p>{s.description}</p>
                    <span className="center-service-deadline">
                      <Clock3 size={13} />
                      {s.term}
                    </span>
                  </span>
                </button>
                <button
                  className="center-star"
                  aria-label={`${favorites.includes(s.id) ? "Убрать из избранного" : "В избранное"}: ${s.title}, ${s.language}`}
                  aria-pressed={favorites.includes(s.id)}
                  disabled={saving === s.id}
                  onClick={() => void favorite(s.id)}
                >
                  {saving === s.id ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <Star
                      size={18}
                      fill={favorites.includes(s.id) ? "currentColor" : "none"}
                    />
                  )}
                </button>
              </article>
            );
          })}
        </div>
        {!catalog.length && (
          <div className="empty">
            <Search size={28} />
            <h3>
              {onlyFavorites && !favorites.length
                ? "Добавьте сюда нужные услуги"
                : "Такой услуги пока нет"}
            </h3>
            <p>
              {onlyFavorites && !favorites.length
                ? "Нажмите на звёздочку у справки — она появится в избранном."
                : "Попробуйте другой запрос или задайте вопрос сервисному центру."}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setOnlyFavorites(false);
              }}
            >
              Все услуги
            </button>
          </div>
        )}
      </section>
      <section className="center-situation">
        <div className="center-situation-intro">
          <span className="center-action-icon">
            <Compass size={24} />
          </span>
          <div>
            <h2>Что хотите сделать?</h2>
            <p>Подскажем, с чего начать и какой документ выбрать.</p>
          </div>
        </div>
        <div className="situation-buttons">
          {situations.map((s, i) => (
            <button
              key={s.id}
              aria-pressed={situation === i}
              className={situation === i ? "active" : ""}
              onClick={() => setSituation(i)}
            >
              {s.label}
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
        {situation !== null && (
          <div className="situation-result" role="status">
            <div>
              <strong>
                {services.find((s) => s.id === situations[situation].id)!.title}
              </strong>
              <p>{situations[situation].text}</p>
            </div>
            <button
              className="button primary"
              onClick={() => go("order", situations[situation].id)}
            >
              {situations[situation].id === "question"
                ? "Написать"
                : "Оформить"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <div className="center-bottom-grid">
        <section className="panel center-faq">
          <h2>Частые вопросы</h2>
          {[
            [
              "Нужно ли приходить за справкой?",
              "Электронный PDF можно скачать в кабинете. За бумажным оригиналом приходят после статуса «Готово». В прототипе выдаются только учебные образцы.",
            ],
            [
              "Как узнать, что с моей заявкой?",
              "Откройте «Мои обращения». В карточке есть статус, срок, комментарии сотрудника и готовый документ. Если нужно уточнение, ответьте там же.",
            ],
            [
              "Не знаю, в какой отдел писать",
              "Выберите «Задать вопрос» и тему. Система определит подразделение; вам не нужно искать адрес сотрудника.",
            ],
            [
              "Сколько готовится документ?",
              "Электронная справка об обучении RU в демо готова сразу. Остальные документы — до 3 рабочих дней, без учёта праздников в этой версии.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <section className="panel center-learning">
          <div className="section-heading">
            <h2>Учёба рядом</h2>
            <CalendarDays size={19} />
          </div>
          <p className="muted">
            Расписание, изменения и результаты обучения остаются под рукой.
          </p>
          {lessons.slice(0, 2).map((l) => (
            <div className="center-mini-lesson" key={l.id}>
              <strong>{l.start}</strong>
              <span>
                {l.subject}
                <small>
                  {l.room} · {l.teacher}
                </small>
              </span>
            </div>
          ))}
          <div className="center-learning-links">
            <button onClick={() => go("schedule")}>
              Расписание
              <ArrowRight size={15} />
            </button>
            <button onClick={() => go("grades")}>
              Успеваемость
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </div>
      <p className="page-note">
        <MapPin size={15} />
        Единое окно для филиала. Подразделения, точки выдачи и сведения в демо
        вымышлены.
      </p>
    </>
  );
}
export function DocumentWallet({
  requests,
  go,
}: {
  requests: Case[];
  go: Navigate;
}) {
  const docs = requests.filter(
    (r) => r.status === "ready" && r.service !== "question",
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Мои документы</h1>
          <p>Готовые справки и выписки. Можно скачать в любой момент.</p>
        </div>
        <button className="button primary" onClick={() => go("today")}>
          Заказать документ
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="wallet-info">
        <ShieldCheck size={23} />
        <p>
          В прототипе все PDF — учебные образцы с вымышленными данными, без
          подписи вуза.
        </p>
      </div>
      {docs.length ? (
        <div className="wallet-grid">
          {docs.map((r) => {
            const s = services.find((s) => s.id === r.service)!;
            return (
              <article className="panel wallet-card" key={r.id}>
                <span className="service-icon">
                  <FileText size={27} />
                </span>
                <span className="status status-ready">
                  <CheckCircle2 size={12} />
                  Готово
                </span>
                <h2>{s.title}</h2>
                <p>{s.language}</p>
                <small>
                  Заявка от {dateLabel(r.created_at)} ·{" "}
                  {r.format === "paper"
                    ? "Бумажный оригинал и PDF-образец"
                    : "Электронный PDF"}
                </small>
                <div>
                  <a
                    className="button primary"
                    href={`/api/portal/requests/${r.id}/document`}
                  >
                    Скачать PDF
                    <ArrowRight size={15} />
                  </a>
                  <button
                    className="text-button"
                    onClick={() => go("case", r.id)}
                  >
                    История
                    <ChevronRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel empty">
          <FolderOpen size={33} />
          <h3>Готовых документов пока нет</h3>
          <p>После завершения заявки справка появится здесь.</p>
          <button className="button primary" onClick={() => go("today")}>
            Выбрать документ
          </button>
        </div>
      )}
    </>
  );
}
export function AppealForm({
  user,
  back,
  create,
}: {
  user: Student;
  back: () => void;
  create: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [topic, setTopic] = useState("documents"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await create({
        service: "question",
        format: "electronic",
        topic,
        message: f.get("message"),
        idempotencyKey: key.current,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="back-button" onClick={back}>
        ← В центр сервиса
      </button>
      <div className="page-heading">
        <div>
          <h1>Задать вопрос</h1>
          <p>Опишите ситуацию один раз. Ответ придёт в вашу заявку.</p>
        </div>
      </div>
      <form className="order-layout" onSubmit={submit}>
        <section className="panel">
          <h2>Чем можем помочь?</h2>
          <p className="appeal-student">
            {user.name} · {user.student_group}
          </p>
          <div className="form-field">
            <label htmlFor="appeal-topic">Тема обращения</label>
            <select
              id="appeal-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="appeal-routing">
            <CheckCircle2 size={17} />
            <span>
              Получит:{" "}
              <strong>{topics.find((t) => t.id === topic)!.department}</strong>
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="appeal-message">Ваш вопрос *</label>
            <textarea
              name="message"
              id="appeal-message"
              rows={7}
              minLength={10}
              maxLength={2000}
              required
              placeholder="Что случилось и какой результат вы хотите получить?"
            />
            <small>
              Для демо описывайте вымышленную ситуацию. Не отправляйте
              паспортные и платёжные данные.
            </small>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary appeal-submit" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Send size={17} />
            )}
            Отправить обращение
          </button>
        </section>
        <aside className="panel order-summary">
          <span className="service-icon">
            <MessageCircle size={26} />
          </span>
          <h2>Информация об обращении</h2>
          <p>
            Тема определяет подразделение. История и ответ сохраняются в
            карточке обращения.
          </p>
          <div className="order-term">
            <Clock3 size={18} />
            <span>
              <strong>До 3 рабочих дней</strong>
              <small>
                Сотрудник ответит или запросит уточнение в карточке обращения.
              </small>
            </span>
          </div>
          <div className="order-term">
            <Inbox size={18} />
            <span>
              <strong>В «Моих обращениях»</strong>
              <small>Можно вернуться к ответу после выхода из аккаунта.</small>
            </span>
          </div>
        </aside>
      </form>
    </>
  );
}
