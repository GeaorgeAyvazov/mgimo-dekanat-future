"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  Search,
  Star,
  ArrowRight,
  ArrowLeft,
  FileText,
  Globe2,
  ListChecks,
  BookOpen,
  Award,
  MessageCircle,
  FolderOpen,
  Clock3,
  ChevronRight,
  CheckCircle2,
  Send,
  LoaderCircle,
  X,
  CalendarDays,
  ArrowUpRight,
  Flag,
} from "lucide-react";
import {
  services,
  topics,
  dateLabel,
  isDocumentService,
  type Case,
} from "@/lib/catalog";
import {
  officialServices,
  serviceCategories,
  type ApplicationService,
  type OfficialService,
} from "@/lib/service-directory";
import { examReasons, getExamOptions, profileFields, profileReasons } from "@/lib/request-context";
import { evidenceAccept, evidenceFileType, requiresEvidence } from "@/lib/request-evidence";
type Navigate = (view: string, id?: string) => void;

export function ContactChoice({ back, choose }: {
  back: () => void;
  choose: (service: "question" | "feedback") => void;
}) {
  return (
    <>
      <button className="back-button" onClick={back}>
        <ArrowLeft size={16} /> Назад
      </button>
      <div className="page-heading"><h1>Написать в центр сервиса</h1></div>
      <div className="study-quick">
        <button onClick={() => choose("question")}>
          <MessageCircle size={21} />
          <span><strong>Задать вопрос</strong><small>Уточнить порядок действий, сроки или требования</small></span>
          <ChevronRight size={17} />
        </button>
        <button onClick={() => choose("feedback")}>
          <Flag size={21} />
          <span><strong>Сообщить о проблеме</strong><small>Передать жалобу или предложение координатору</small></span>
          <ChevronRight size={17} />
        </button>
      </div>
    </>
  );
}
const icons = {
  file: FileText,
  globe: Globe2,
  list: ListChecks,
  book: BookOpen,
  award: Award,
  message: MessageCircle,
  calendar: CalendarDays,
};
const directory = [
  ...services.filter((s) => s.id !== "question" && s.id !== "feedback"),
  ...officialServices,
];

function ServiceSources({
  sources,
}: {
  sources: ApplicationService["sources"] | OfficialService["sources"];
}) {
  return (
    <ul className="service-sources">
      {sources.map(({ label, href }) => (
        <li key={href}>
          <a href={href} target="_blank" rel="noopener noreferrer">
            {label} <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function OfficialServiceInfo({
  service,
  back,
  backLabel,
}: {
  service: OfficialService;
  back: () => void;
  backLabel: string;
}) {
  return (
    <>
      <button className="back-button" onClick={back}>
        <ArrowLeft size={17} /> {backLabel}
      </button>
      <div className="page-heading">
        <div>
          <h1>{service.title}</h1>
          <p>{service.channel}</p>
        </div>
      </div>
      <section className="panel service-conditions">
        <h2>Как воспользоваться</h2>
        <p>{service.preparation}</p>
        <a
          className="button primary"
          href={service.action.href}
          target={
            service.action.href.startsWith("mailto:") ? undefined : "_blank"
          }
          rel="noopener noreferrer"
        >
          {service.action.label} <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <ServiceSources sources={service.sources} />
      </section>
    </>
  );
}

export function ServiceCenter({
  favorites,
  onFavorite,
  go,
}: {
  favorites: string[];
  onFavorite: (id: string, active: boolean) => Promise<void>;
  go: Navigate;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] =
      useState<(typeof serviceCategories)[number]["id"]>("all"),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [saving, setSaving] = useState("");
  const catalog = directory.filter(
    (s) =>
      (category === "all" ||
        category === ("category" in s ? s.category : "documents") ||
        (category === "documents" && isDocumentService(s.id))) &&
      (!onlyFavorites || favorites.includes(s.id)) &&
      `${s.title} ${"language" in s ? s.language : s.channel} ${s.description}`
        .toLowerCase()
        .replaceAll("ё", "е")
        .includes(query.trim().toLowerCase().replaceAll("ё", "е")),
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
      <section className="center-catalog">
        <h2>Каталог услуг</h2>
        <div className="center-catalog-tools">
          <div className="center-search">
            <Search size={18} />
            <input
              aria-label="Найти услугу"
              placeholder="Найти услугу"
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
          <button
            className="center-favorite-filter"
            aria-pressed={onlyFavorites}
            onClick={() => {
              if (!onlyFavorites) setCategory("all");
              setOnlyFavorites(!onlyFavorites);
            }}
          >
            <Star size={16} fill={onlyFavorites ? "currentColor" : "none"} />
            Избранное
          </button>
        </div>
        <div
          className="center-categories"
          role="group"
          aria-label="Категории услуг"
        >
          {serviceCategories.map((item) => (
            <button
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="center-service-grid">
          {catalog.map((s) => {
            const Icon = icons[s.icon];
            const local = "language" in s;
            return (
              <article
                key={s.id}
                className={`center-service-card ${favorites.includes(s.id) ? "is-favorite" : ""}`}
              >
                <button
                  className={`center-service-open${local ? "" : " is-official"}`}
                  onClick={() => go("order", s.id)}
                >
                  <span className="center-service-icon">
                    <Icon size={31} strokeWidth={1.6} />
                  </span>
                  <span>
                    <h3>
                      {s.title}
                      <small>{local ? s.language : s.channel}</small>
                    </h3>
                    <p>{s.description}</p>
                    {"term" in s && (
                      <span className="center-service-deadline">
                        <Clock3 size={13} />
                        {s.term}
                      </span>
                    )}
                  </span>
                </button>
                {local && (
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
                        fill={
                          favorites.includes(s.id) ? "currentColor" : "none"
                        }
                      />
                    )}
                  </button>
                )}
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
                ? "Нажмите на звёздочку у услуги, чтобы добавить её сюда."
                : "Попробуйте другой запрос или задайте вопрос сервисному центру."}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setOnlyFavorites(false);
                setCategory("all");
              }}
            >
              Показать все услуги
            </button>
          </div>
        )}
      </section>
      <details className="center-faq">
        <summary>Частые вопросы</summary>
        <div>
          {[
            [
              "Нужно ли приходить за справкой?",
              "Электронный PDF можно скачать в кабинете. За бумажным оригиналом приходят после статуса «Готово». В прототипе выдаются только учебные образцы.",
            ],
            [
              "Как узнать, что с моей заявкой?",
              "Откройте вкладку «Обращения». В карточке есть статус, история и ответ сотрудника. Если нужно уточнение, ответьте там же.",
            ],
            [
              "Не знаю, в какой отдел писать",
              "Откройте «Написать в центр сервиса» и выберите тему вопроса. По теме определится подразделение.",
            ],
            [
              "Сколько готовится документ?",
              "Электронная справка об обучении на русском и английском готова сразу. Срок остальных документов в демо — до 3 рабочих дней.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </details>
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
    (r) =>
      ["ready", "issued"].includes(r.status) && isDocumentService(r.service),
  );
  return (
    <>
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
                  {r.status === "issued"
                    ? "Выдано"
                    : r.format === "paper"
                      ? "К выдаче"
                      : "Готово"}
                </span>
                <h2>{s.title}</h2>
                <p>{s.language}</p>
                <small>
                  Заявка от {dateLabel(r.created_at)} ·{" "}
                  {r.format === "paper"
                    ? "Бумажная выдача и электронный образец"
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
  initialTopic = "documents",
  application,
  assessments = [],
  initialAssessment,
  visitAbout,
  requestVisit,
  back,
  backLabel,
  create,
}: {
  initialTopic?: string;
  application?: ApplicationService;
  assessments?: ReturnType<typeof getExamOptions>;
  initialAssessment?: string;
  visitAbout?: ApplicationService;
  requestVisit?: () => void;
  back: () => void;
  backLabel: string;
  create: (payload: Record<string, unknown> | FormData) => Promise<void>;
}) {
  const [topic, setTopic] = useState(
      topics.some((item) => item.id === initialTopic)
        ? initialTopic
        : "documents",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const visit = application?.id === "visit-request";
  const exam = application?.id === "exam-request";
  const correction = application?.id === "profile-correction";
  const contextual = exam || correction;
  const [assessment, setAssessment] = useState(
    initialAssessment === "unlisted" || assessments.some(({ value }) => value === initialAssessment)
      ? initialAssessment ?? ""
      : "",
  );
  const [reason, setReason] = useState("");
  const needEvidence = requiresEvidence(application?.id ?? "", reason);
  const [evidence, setEvidence] = useState<File | null>(null);
  const evidenceInput = useRef<HTMLInputElement>(null);
  function selectEvidence(file: File | null) {
    setError("");
    if (file) {
      try {
        evidenceFileType(file);
      } catch (error) {
        setError((error as Error).message);
        if (evidenceInput.current) evidenceInput.current.value = "";
        setEvidence(null);
        return;
      }
    }
    setEvidence(file);
  }
  function attachSample() {
    if (evidenceInput.current) evidenceInput.current.value = "";
    const text = exam
      ? "Учебный образец. Выдуманная ситуация: участие в учебном мероприятии совпало с экзаменом. Студент просит согласовать другую дату."
      : "Учебный образец. Выдуманная ситуация: сведения в студенческом профиле требуют исправления. Студент просит проверить запись.";
    selectEvidence(new File([text + "\n"], "Учебный образец.txt", { type: "text/plain" }));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = {
        service: application?.id || "question",
        format: "electronic",
        topic: application?.topic || topic,
        message: f.get("message"),
        ...(visit && {
          preferredTime: f.get("preferredTime"),
          about: visitAbout?.id,
        }),
        ...(exam && { assessment, examReason: reason, examSubject: f.get("examSubject"), examDate: f.get("examDate") }),
        ...(correction && { profileReason: reason, profileField: f.get("profileField") }),
        idempotencyKey: key.current,
      };
      if (needEvidence) {
        if (!evidence) throw new Error("Прикрепите файл или выберите учебный образец");
        const upload = new FormData();
        upload.append("data", JSON.stringify(payload));
        upload.append("evidence", evidence);
        await create(upload);
      } else await create(payload);
    } catch (e) {
      setError((e as Error).message);
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
      <div className="page-heading">
        <div>
          <h1>{application?.title || "Задать вопрос"}</h1>
          <p>
            {application
              ? application.description
              : "Ответ появится во вкладке «Обращения»."}
          </p>
        </div>
      </div>
      {application && (
        <section className="panel service-conditions">
          <h2>Перед подачей</h2>
          <p>{application.preparation}</p>
          <p className="muted">{application.campusStatus}</p>
          {application.sources.length > 0 && <ServiceSources sources={application.sources} />}
          {requestVisit && (
            <button
              className="text-button"
              type="button"
              onClick={requestVisit}
            >
              <CalendarDays size={16} /> Запросить приём по этой услуге
            </button>
          )}
        </section>
      )}
      <form className="panel appeal-form" onSubmit={submit}>
        {!application && (
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
        )}
        <div className="appeal-routing">
          <CheckCircle2 size={17} />
          <span>
            {application ? "Куда попадёт демо-заявка" : "Получит"}{" "}
            <strong>
              {
                topics.find(
                  (t) =>
                    t.id === (visitAbout?.topic || application?.topic || topic),
                )!.department
              }
            </strong>
          </span>
        </div>
        {visitAbout && (
          <p>
            Тема приёма — <strong>{visitAbout.title}</strong>
          </p>
        )}
        {visit && (
          <div className="form-field">
            <label htmlFor="preferred-time">Удобные дни и время *</label>
            <input
              id="preferred-time"
              name="preferredTime"
              required
              maxLength={120}
              placeholder="Например, 12 ноября после 14:00"
            />
          </div>
        )}
        {contextual && (
          <div className="form-field">
            <label htmlFor="context-reason">{exam ? "Что нужно сделать?" : "Тип исправления"} *</label>
            <select id="context-reason" value={reason} onChange={(event) => {
              setReason(event.target.value);
              selectEvidence(null);
            }} required>
              <option value="">Выберите вариант</option>
              {Object.entries(exam ? examReasons : profileReasons).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}
        {exam && (
          <>
            <div className="form-field">
              <label htmlFor="assessment">Экзамен *</label>
              <select id="assessment" value={assessment} onChange={(event) => setAssessment(event.target.value)} required>
                <option value="">Выберите экзамен</option>
                {assessments.map(({ value, subject, date }) => (
                  <option key={value} value={value}>{subject}{date && ` · ${dateLabel(`${date}T12:00:00Z`)}`}</option>
                ))}
                <option value="unlisted">Экзамена или пересдачи нет в списке</option>
              </select>
            </div>
            {assessment === "unlisted" && (
              <>
                <div className="form-field">
                  <label htmlFor="exam-subject">Дисциплина *</label>
                  <input id="exam-subject" name="examSubject" maxLength={120} required />
                </div>
                <div className="form-field">
                  <label htmlFor="exam-date">Дата экзамена или пересдачи *</label>
                  <input id="exam-date" name="examDate" type="date" required />
                </div>
              </>
            )}
          </>
        )}
        {correction && (
          <div className="form-field">
            <label htmlFor="profile-field">Какие сведения нужно проверить? *</label>
            <select id="profile-field" name="profileField" defaultValue="" required>
              <option value="">Выберите сведения</option>
              {Object.entries(profileFields).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}
        {needEvidence && (
          <div className="form-field evidence-field">
            <label htmlFor="request-evidence">Файл подтверждения *</label>
            <small id="evidence-hint">Приложите вымышленный пример в TXT (UTF-8) или PNG до 512 КБ. Можно выбрать готовый образец.</small>
            <input id="request-evidence" ref={evidenceInput} type="file" accept={evidenceAccept}
              aria-describedby="evidence-hint" required={!evidence} disabled={busy}
              onChange={(event) => selectEvidence(event.target.files?.[0] ?? null)} />
            <button className="text-button" type="button" onClick={attachSample} disabled={busy}>Прикрепить учебный образец</button>
            {evidence && (
              <div className="selected-evidence">
                <span role="status">Выбран файл «{evidence.name}»</span>
                <button className="text-button" type="button" disabled={busy} onClick={() => {
                  if (evidenceInput.current) evidenceInput.current.value = "";
                  selectEvidence(null);
                }}>Убрать</button>
              </div>
            )}
          </div>
        )}
        <div className="form-field">
          <label htmlFor="appeal-message">
            {application ? "Детали заявки" : "Ваш вопрос"} *
          </label>
          <textarea
            name="message"
            id="appeal-message"
            rows={contextual ? 4 : 7}
            minLength={10}
            maxLength={visit || contextual ? 1700 : 2000}
            required
            placeholder={
              exam
                ? "Кратко опишите ситуацию. Для переноса укажите, когда сможете прийти."
                : correction
                  ? "Опишите, где заметили ошибку или что изменилось."
                  : application
                ? "Что нужно оформить или уточнить?"
                : "Что случилось и какой результат вы хотите получить?"
            }
          />
          <small>
            Используйте вымышленные сведения, без паспортных, медицинских и
            платёжных данных.
          </small>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="appeal-footer">
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Send size={17} />
            )}
            {application ? "Отправить демо-заявку" : "Отправить обращение"}
          </button>
          <span className="muted">
            {application
              ? "Статус и ответ появятся в «Обращениях»."
              : "Срок ответа до 3 рабочих дней"}
          </span>
        </div>
      </form>
    </>
  );
}
