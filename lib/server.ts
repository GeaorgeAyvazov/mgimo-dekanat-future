import { env } from "cloudflare:workers";
import { compare } from "bcryptjs";
import { demoUsers, lessons, notices } from "./demo-data";
import { moscowDate } from "./room-calendar-types";
import {
  services,
  topics,
  isDocumentService,
  feedbackReasons,
  feedbackDepartment,
  type Student,
  type Case,
  type CaseEvent,
  type Grade,
  type Notice,
  type Announcement,
} from "./catalog";
import { applicationServices } from "./service-directory";
import { DEMO_HASH } from "./demo-hash";
import { insertDocument, prepareDocument } from "./document-storage";
import { examReasons, getExamOptions, profileFields, profileReasons } from "./request-context";
import { maxEvidenceBytes, readEvidence, requiresEvidence } from "./request-evidence";
export type UserRow = Student & { password_hash: string; grades: string };
export const database = () => {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
};
export const now = () => new Date().toISOString();
export const sha = async (v: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export function json(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function publicUser(row: UserRow): Student {
  return {
    id: row.id,
    login: row.login,
    role: row.role,
    name: row.name,
    faculty: row.faculty,
    program: row.program,
    course: row.course,
    student_group: row.student_group,
    timetable_group: row.timetable_group,
    language_stream: row.language_stream,
    latin_name: row.latin_name,
    email: row.email,
  };
}
let seeded: Promise<void> | undefined;
export async function seed() {
  if (!seeded)
    seeded = (async () => {
      const db = database();
      await db.batch(
        demoUsers.map((u) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO users (id,login,password_hash,role,name,faculty,program,course,student_group,latin_name,email,grades) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              u.id,
              u.login,
              DEMO_HASH,
              u.role,
              u.name,
              u.faculty,
              u.program,
              u.course,
              u.group,
              u.latin,
              u.email,
              JSON.stringify(u.grades),
            ),
        ),
      );
      const time = new Date(Date.now() - 3 * 3600000).toISOString(),
        due = new Date(Date.now() + 3 * 86400000).toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO requests (id,owner_id,service,format,organization,latin_name,phone,recipient,representative,status,created_at,due_at,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            "sample-alina-transcript",
            "student-alina",
            "transcript-en",
            "electronic",
            "",
            "Alina Lebedeva",
            "",
            "self",
            "",
            "ready",
            time,
            due,
            "seed-alina",
          ),
        db
          .prepare(
            "INSERT OR IGNORE INTO requests (id,owner_id,service,format,organization,latin_name,phone,recipient,representative,status,created_at,due_at,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            "sample-maxim-grades",
            "student-maxim",
            "grades-ru",
            "paper",
            "",
            "",
            "",
            "self",
            "",
            "working",
            time,
            due,
            "seed-maxim",
          ),
        db
          .prepare(
            "INSERT OR IGNORE INTO requests (id,owner_id,service,format,organization,latin_name,phone,recipient,representative,status,created_at,due_at,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            "sample-alina-grades", "student-alina", "grades-ru", "electronic",
            "", "", "", "self", "", "ready", time, due, "seed-alina-grades",
          ),
        ...["created", "ready"].map((status, i) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO request_events (id,request_id,status,comment,created_at) VALUES (?,?,?,?,?)",
            )
            .bind(`seed-alina-grades-${i}`, "sample-alina-grades", status, "",
              new Date(Date.now() - (3 - i) * 3600000).toISOString()),
        ),
        ...["created", "working", "ready"].map((s, i) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO request_events (id,request_id,status,comment,created_at) VALUES (?,?,?,?,?)",
            )
            .bind(
              `seed-alina-${i}`,
              "sample-alina-transcript",
              s,
              i === 2
                ? "Учебный документ подготовлен. Его можно скачать в карточке заявки."
                : "",
              new Date(Date.now() - (3 - i) * 3600000).toISOString(),
            ),
        ),
        ...["created", "working"].map((s, i) =>
          db
            .prepare(
              "INSERT OR IGNORE INTO request_events (id,request_id,status,comment,created_at) VALUES (?,?,?,?,?)",
            )
            .bind(
              `seed-maxim-${i}`,
              "sample-maxim-grades",
              s,
              "",
              new Date(Date.now() - (2 - i) * 3600000).toISOString(),
            ),
        ),
        db.prepare("DELETE FROM sessions WHERE expires_at<?").bind(Date.now()),
        db.prepare("DELETE FROM login_attempts WHERE until<?").bind(Date.now()),
      ]);
    })().catch((e) => {
      seeded = undefined;
      throw e;
    });
  await seeded;
}
export async function currentUser(req: Request): Promise<UserRow> {
  const token = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)dekanat_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) throw new ApiError(401, "Войдите в личный кабинет");
  const user = await database()
    .prepare(
      "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
    )
    .bind(await sha(token), Date.now())
    .first<UserRow>();
  if (!user) throw new ApiError(401, "Сессия завершена. Войдите ещё раз");
  return user;
}
export function csrf(req: Request) {
  if (
    req.headers.get("x-dekanat-request") !== "1" ||
    req.headers.get("origin") !== new URL(req.url).origin
  )
    throw new ApiError(403, "Обновите страницу и повторите действие");
  const contentType = req.headers.get("content-type") || "";
  if (new URL(req.url).pathname === "/api/portal/requests" && contentType.startsWith("multipart/form-data;"))
    return;
  if (!contentType.startsWith("application/json"))
    throw new ApiError(415, "Нужен JSON-запрос");
}
async function limitedBytes(req: Request, limit: number) {
  if (Number(req.headers.get("content-length")) > limit)
    throw new ApiError(413, "Слишком много данных");
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "Не удалось прочитать данные");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new ApiError(413, "Слишком много данных");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
function parseFields(raw: string): Record<string, unknown> {
  if (raw.length > 6000) throw new ApiError(413, "Слишком много данных");
  try {
    const v = JSON.parse(raw);
    if (!v || Array.isArray(v) || typeof v !== "object") throw new Error();
    return v;
  } catch {
    throw new ApiError(400, "Не удалось прочитать данные");
  }
}
export async function body(req: Request) {
  return parseFields(new TextDecoder().decode(await limitedBytes(req, 24_000)));
}
async function requestBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data;"))
    return { data: await body(req), file: null };
  const bytes = await limitedBytes(req, maxEvidenceBytes + 32_768);
  let form: FormData;
  try {
    form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new ApiError(400, "Не удалось прочитать вложение. Выберите файл ещё раз");
  }
  const fields = form.get("data"), file = form.get("evidence");
  if (Array.from(form.keys()).length !== 2 || typeof fields !== "string" || !file || typeof file === "string")
    throw new ApiError(400, "Отправьте сведения заявки и одно вложение");
  return { data: parseFields(fields), file };
}
export const field = (obj: Record<string, unknown>, key: string, max = 200) =>
  typeof obj[key] === "string" ? (obj[key] as string).trim().slice(0, max) : "";
function cookie(token: string, req: Request, age = 28800) {
  return `dekanat_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function login(req: Request) {
  const data = await body(req),
    login = field(data, "login", 64).toLowerCase(),
    password = field(data, "password", 100);
  if (!login || !password || new TextEncoder().encode(password).length > 72)
    throw new ApiError(400, "Введите логин и пароль до 72 байт");
  const key = await sha(
    (req.headers.get("cf-connecting-ip") || "local") + ":" + login,
  );
  const attempt = await database()
    .prepare("SELECT count,until FROM login_attempts WHERE key=?")
    .bind(key)
    .first<{ count: number; until: number }>();
  if (attempt && attempt.until > Date.now() && attempt.count >= 10)
    throw new ApiError(429, "Слишком много попыток. Попробуйте через 15 минут");
  const user = await database()
    .prepare("SELECT * FROM users WHERE login=?")
    .bind(login)
    .first<UserRow>();
  const valid = await compare(password, user?.password_hash || DEMO_HASH);
  if (!user || !valid) {
    await database()
      .prepare(
        "INSERT INTO login_attempts (key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END",
      )
      .bind(key, Date.now() + 900000, Date.now(), Date.now())
      .run();
    throw new ApiError(401, "Неверный логин или пароль");
  }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  await database().batch([
    database().prepare("DELETE FROM login_attempts WHERE key=?").bind(key),
    database()
      .prepare(
        "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
      )
      .bind(await sha(token), user.id, Date.now() + 28800000),
  ]);
  return json({ user: publicUser(user) }, 200, {
    "Set-Cookie": cookie(token, req),
  });
}
export async function logout(req: Request) {
  const token = req.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)dekanat_session=([a-f0-9]{64})/)?.[1];
  if (token)
    await database()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await sha(token))
      .run();
  return json({ ok: true }, 200, { "Set-Cookie": cookie("", req, 0) });
}
export async function notificationList(
  user: UserRow,
): Promise<Omit<Notice, "read">[]> {
  if (user.role !== "student") return [];
  const broadcasts = await database().prepare(
    `SELECT id,audience,title,message,published_at FROM announcements
     WHERE withdrawn_at IS NULL AND audience IN ('*',?)
     ORDER BY published_at DESC,id DESC LIMIT 100`,
  ).bind(user.student_group).all<Announcement>();
  const announcements = [...notices(user.id), ...broadcasts.results.map((item) => ({
    id: `announcement:${item.id}`, audience: item.audience, title: item.title,
    text: item.message, type: "announcement", date: item.published_at,
  }))];
  const rows = await database()
    .prepare(
      "SELECT e.id,e.status,e.comment,e.created_at,r.id AS request_id,r.service,r.format,r.status AS request_status FROM request_events e JOIN requests r ON r.id=e.request_id WHERE r.owner_id=? AND e.status IN ('ready','issued','needs_info','cancelled') ORDER BY e.created_at DESC,e.id DESC LIMIT 100",
    )
    .bind(user.id)
    .all<{
      id: string;
      status: string;
      comment: string;
      created_at: string;
      request_id: string;
      service: string;
      format: string;
      request_status: string;
    }>();
  const personal = rows.results.map((e) => {
    const service = services.find((s) => s.id === e.service)!;
    const document = isDocumentService(e.service);
    const collected = e.status === "ready" && e.request_status === "issued";
    let title = "Документ готов к скачиванию";
    let actionLabel = "Открыть заявку";
    if (e.status === "needs_info") {
      const needsReply = e.request_status === "needs_info";
      title = needsReply
        ? "По обращению нужно уточнение"
        : "Запрос уточнения сохранён в истории";
      actionLabel = needsReply ? "Ответить на уточнение" : "Открыть историю";
    } else if (e.status === "issued") {
      title = "Бумажный документ выдан";
    } else if (collected) {
      title = "Подготовка документа завершена";
      actionLabel = "Открыть историю";
    } else if (e.status === "cancelled") {
      title = "Заявка отменена";
    } else if (!document) {
      title =
        e.service === "question"
          ? "Получен ответ на ваш вопрос"
          : e.service === "feedback"
            ? "Координатор ответил на сообщение"
            : "Получен ответ по заявке";
      actionLabel = "Прочитать ответ";
    } else if (e.format === "paper") {
      title = "Бумажный документ готов к выдаче";
    }
    return {
      id: `request-event:${e.id}`,
      title,
      text: `${service.title}. ${collected ? "Документ уже выдан." : e.comment}`,
      date: e.created_at,
      type: "request",
      link: "case",
      requestId: e.request_id,
      actionLabel,
    };
  });
  return [...personal, ...announcements].sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
  );
}
export async function overview(user: UserRow) {
  const db = database(),
    cases =
      user.role === "staff"
        ? await db
            .prepare(
              `SELECT r.*,u.name AS student_name,u.student_group,
                 milestones.ready_at,milestones.issued_at,milestones.cancelled_at
               FROM requests r JOIN users u ON u.id=r.owner_id
               LEFT JOIN (
                 SELECT request_id,
                   MIN(CASE WHEN status='ready' THEN created_at END) AS ready_at,
                   MIN(CASE WHEN status='issued' THEN created_at END) AS issued_at,
                   MIN(CASE WHEN status='cancelled' THEN created_at END) AS cancelled_at
                 FROM request_events WHERE status IN ('ready','issued','cancelled') GROUP BY request_id
               ) milestones ON milestones.request_id=r.id
               ORDER BY r.created_at DESC`,
            )
            .all()
        : await db
            .prepare(
              "SELECT * FROM requests WHERE owner_id=? ORDER BY created_at DESC",
            )
            .bind(user.id)
            .all();
  const read = await db
    .prepare("SELECT notice_id FROM notification_reads WHERE user_id=?")
    .bind(user.id)
    .all<{ notice_id: string }>();
  const favorites = await db
    .prepare("SELECT service FROM favorites WHERE user_id=?")
    .bind(user.id)
    .all<{ service: string }>();
  return {
    favorites: favorites.results.map((f) => f.service),
    user: publicUser(user),
    requests: cases.results,
    grades: JSON.parse(user.grades),
    lessons: user.role === "student" ? lessons(user.id) : [],
    notices: (await notificationList(user)).map((n) => ({
      ...n,
      read: read.results.some((r) => r.notice_id === n.id),
    })),
    today: moscowDate(),
  };
}
export async function ownedRequest(id: string, user: UserRow) {
  const row = await database()
    .prepare(
      user.role === "staff"
        ? "SELECT r.*,u.name AS student_name,u.student_group FROM requests r JOIN users u ON u.id=r.owner_id WHERE r.id=?"
        : "SELECT * FROM requests WHERE id=? AND owner_id=?",
    )
    .bind(...(user.role === "staff" ? [id] : [id, user.id]))
    .first<Case>();
  if (!row) throw new ApiError(404, "Заявка не найдена");
  const events = await database()
    .prepare(
      "SELECT * FROM request_events WHERE request_id=? ORDER BY created_at,id",
    )
    .bind(id)
    .all<CaseEvent>();
  const evidence = row.service === "exam-request" || row.service === "profile-correction"
    ? await database().prepare(
      "SELECT name,media_type AS mediaType,length(content) AS byteSize FROM request_evidence WHERE request_id=?",
    ).bind(id).first<NonNullable<Case["evidence"]>>()
    : null;
  return { ...row, events: events.results, evidence };
}
export function dueDate(automatic: boolean) {
  const d = new Date();
  if (automatic) return new Date(d.getTime() + 900000).toISOString();
  let days = 0;
  while (days < 3) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days++;
  }
  return d.toISOString();
}

function requestContext(service: string, data: Record<string, unknown>, user: UserRow) {
  if (service === "exam-request") {
    const reason = field(data, "examReason", 30);
    if (reason !== "absence" && reason !== "reschedule") {
      throw new ApiError(400, "Выберите причину обращения по экзамену");
    }
    const selection = field(data, "assessment", 20);
    const exam = selection === "unlisted"
      ? { subject: field(data, "examSubject", 120), date: field(data, "examDate", 10) }
      : getExamOptions(JSON.parse(user.grades) as Grade[]).find(({ value }) => value === selection);
    if (!exam?.subject ||
      (selection === "unlisted" && !/^\d{4}-\d{2}-\d{2}$/.test(exam.date)) ||
      (exam.date && !isCalendarDate(exam.date))) {
      throw new ApiError(400, "Выберите экзамен или укажите его название и дату");
    }
    return [examReasons[reason], `Экзамен — ${exam.subject}`, exam.date && `Дата экзамена — ${exam.date}`];
  }
  if (service === "profile-correction") {
    const reason = field(data, "profileReason", 30);
    const profileField = field(data, "profileField", 30);
    if (!Object.hasOwn(profileReasons, reason) || !Object.hasOwn(profileFields, profileField)) {
      throw new ApiError(400, "Выберите тип исправления и сведения, которые нужно проверить");
    }
    return [profileReasons[reason as keyof typeof profileReasons], `Проверить — ${profileFields[profileField as keyof typeof profileFields]}`];
  }
  return [];
}

function isCalendarDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function existingSubmission(id: string, user: UserRow, evidence?: Awaited<ReturnType<typeof readEvidence>>) {
  const row = await ownedRequest(id, user);
  if (row.evidence || evidence) {
    const match = evidence && row.evidence && await database().prepare(
      "SELECT 1 FROM request_evidence WHERE request_id=? AND name=? AND media_type=? AND content=?",
    ).bind(id, evidence.name, evidence.mediaType, evidence.content).first();
    if (!match) throw new ApiError(409, "Заявка уже принята с другим вложением. Проверьте её в разделе «Обращения»");
  }
  return json(row);
}

export async function createRequest(req: Request, user: UserRow) {
  if (user.role !== "student")
    throw new ApiError(403, "Заказ доступен студентам");
  const { data, file } = await requestBody(req),
    service = services.find((s) => s.id === data.service);
  if (!service || !["electronic", "paper"].includes(String(data.format)))
    throw new ApiError(400, "Выберите услугу и способ подачи");
  const fields: readonly string[] = service.fields,
    organization = field(data, "organization"),
    latin = field(data, "latinName"),
    phone = field(data, "phone", 30),
    recipient = field(data, "recipient", 30) || "self",
    representative = field(data, "representative");
  const application = "topic" in service;
  const visit = service.id === "visit-request";
  const about =
    visit &&
    applicationServices.find(
      (item) => item.id !== "visit-request" && item.id === data.about,
    );
  const preferredTime = visit ? field(data, "preferredTime", 120) : "";
  const topicId = application
    ? about
      ? about.topic
      : service.topic
    : service.id === "question"
      ? data.topic
      : undefined;
  const topic = topics.find((t) => t.id === topicId);
  const feedback = service.id === "feedback";
  const feedbackReason =
    feedback && feedbackReasons.find((item) => item.id === data.feedbackReason);
  const context = requestContext(service.id, data, user);
  const needsEvidence = requiresEvidence(service.id, service.id === "exam-request" ? data.examReason : data.profileReason);
  if (needsEvidence && !file) throw new ApiError(400, "Прикрепите файл подтверждения");
  if (!needsEvidence && file) throw new ApiError(400, "Для этого вида заявки вложения не принимаются");
  let evidence: Awaited<ReturnType<typeof readEvidence>> | undefined;
  if (file) {
    if (file.size > maxEvidenceBytes) throw new ApiError(413, "Размер вложения превышает 512 КБ");
    try {
      evidence = await readEvidence(file);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : "Не удалось прочитать вложение");
    }
  }
  const message = field(data, "message", visit || context.length ? 1700 : 2000);
  if (
    feedback &&
    (!feedbackReason || message.length < 10 || data.format !== "electronic")
  )
    throw new ApiError(
      400,
      "Выберите причину и опишите проблему (от 10 символов)",
    );
  let relatedRequestId: string | null = null;
  if (feedback && data.relatedRequestId != null) {
    const source = await ownedRequest(
      field(data, "relatedRequestId", 80),
      user,
    );
    if (source.service === "feedback")
      throw new ApiError(400, "Выберите исходную заявку");
    relatedRequestId = source.id;
  }
  if (
    service.id === "question" &&
    (!topic || message.length < 10 || data.format !== "electronic")
  )
    throw new ApiError(
      400,
      "Выберите тему и опишите вопрос подробнее (от 10 символов)",
    );
  if (application && (message.length < 10 || data.format !== "electronic"))
    throw new ApiError(400, "Опишите запрос подробнее (от 10 символов)");
  if (visit && !preferredTime)
    throw new ApiError(400, "Укажите удобные дни и время");
  const requestMessage = visit
    ? [
        about && `Тема приёма — ${about.title}`,
        `Удобное время — ${preferredTime}`,
        message,
      ]
        .filter(Boolean)
        .join("\n\n")
    : [...context.filter(Boolean), message].join("\n\n");
  if (fields.includes("organization") && organization.length < 2)
    throw new ApiError(400, "Укажите организацию или «По месту требования»");
  if (
    fields.includes("latinName") &&
    !/^[A-Za-z][A-Za-z '\-]{2,99}$/.test(latin)
  )
    throw new ApiError(
      400,
      "Укажите имя и фамилию латиницей, как в загранпаспорте",
    );
  if (fields.includes("phone") && !/^\+?[\d ()-]{10,25}$/.test(phone))
    throw new ApiError(400, "Проверьте номер телефона");
  if (
    !["self", "other"].includes(recipient) ||
    (data.format === "paper" &&
      recipient === "other" &&
      representative.length < 5)
  )
    throw new ApiError(400, "Укажите ФИО получателя");
  const key = field(data, "idempotencyKey", 80);
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(key))
    throw new ApiError(400, "Обновите форму заявки");
  const db = database(),
    prior = await db
      .prepare("SELECT id FROM requests WHERE owner_id=? AND idempotency_key=?")
      .bind(user.id, key)
      .first<{ id: string }>();
  if (prior) return existingSubmission(prior.id, user, evidence);
  const count = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM requests WHERE owner_id=? AND created_at>?",
    )
    .bind(user.id, new Date(Date.now() - 86400000).toISOString())
    .first<{ n: number }>();
  if ((count?.n || 0) >= 30)
    throw new ApiError(
      429,
      "На сегодня достаточно заявок. Продолжить можно завтра",
    );
  const id = crypto.randomUUID(),
    created = now(),
    automatic = service.automatic && data.format === "electronic",
    status = automatic ? "ready" : "created";
  const statements = [
    db
      .prepare(
        "INSERT OR IGNORE INTO requests (id,owner_id,service,format,organization,latin_name,phone,recipient,representative,status,created_at,due_at,idempotency_key,topic,message,department,related_request_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        user.id,
        service.id,
        data.format,
        organization,
        latin,
        phone,
        recipient,
        data.format === "paper" ? representative : "",
        status,
        created,
        dueDate(automatic),
        key,
        feedbackReason ? feedbackReason.id : topic?.id || "",
        feedback ? message : topic ? requestMessage : "",
        feedback ? feedbackDepartment : topic?.department || ("department" in service ? service.department : "Сервисный центр"),
        relatedRequestId,
      ),
    db
      .prepare(
        "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,'created','Заявка зарегистрирована в сервисном центре',? FROM requests WHERE id=?",
      )
      .bind(crypto.randomUUID(), created, id),
  ];
  if (evidence) {
    statements.push(db.prepare(
      "INSERT INTO request_evidence (request_id,name,media_type,content) SELECT id,?,?,? FROM requests WHERE id=?",
    ).bind(evidence.name, evidence.mediaType, evidence.content, id));
  }
  if (automatic) {
    const preparedAt = new Date(Date.parse(created) + 1).toISOString();
    const prepared = await prepareDocument(
      db,
      {
        id,
        owner_id: user.id,
        service: service.id,
        organization,
        latin_name: latin,
        format: "electronic",
      },
      preparedAt,
    );
    statements.push(
      db
        .prepare(
          "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,'ready','Учебный PDF сформирован автоматически. Это демонстрационный документ, не справка вуза.',? FROM requests WHERE id=?",
        )
        .bind(crypto.randomUUID(), preparedAt, id),
      insertDocument(db, id, prepared),
    );
  }
  await db.batch(statements);
  const actual = await db
    .prepare("SELECT id FROM requests WHERE owner_id=? AND idempotency_key=?")
    .bind(user.id, key)
    .first<{ id: string }>();
  if (actual!.id !== id) return existingSubmission(actual!.id, user, evidence);
  return json(await ownedRequest(id, user), 201);
}
export async function updateRequest(req: Request, user: UserRow, id: string) {
  if (user.role !== "staff")
    throw new ApiError(403, "Действие доступно сотруднику");
  const data = await body(req),
    status = field(data, "status", 30),
    comment = field(data, "comment", 1000),
    expected = field(data, "expectedStatus", 30),
    row = await ownedRequest(id, user);
  const allowed: Record<string, string[]> = {
    created: ["working", "needs_info", "cancelled"],
    working: ["ready", "needs_info", "cancelled"],
    needs_info: ["working", "cancelled"],
    ready:
      row.format === "paper" && isDocumentService(row.service)
        ? ["issued"]
        : [],
  };
  if (row.status !== expected)
    throw new ApiError(409, "Статус уже изменился. Обновите карточку");
  if (!allowed[row.status]?.includes(status))
    throw new ApiError(400, "Такой переход статуса недоступен");
  if (
    !isDocumentService(row.service) &&
    status === "ready" &&
    comment.length < 10
  )
    throw new ApiError(400, "Добавьте ответ студенту (от 10 символов)");
  if ((status === "needs_info" || status === "cancelled") && comment.length < 5)
    throw new ApiError(400, "Добавьте пояснение для студента");
  const db = database();
  const transitionTime = now();
  const statements = [
    db
      .prepare(
        "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,?,?,? FROM requests WHERE id=? AND status=?",
      )
      .bind(
        crypto.randomUUID(),
        status,
        comment ||
          (status === "issued"
            ? "Бумажный документ выдан получателю"
            : status === "ready"
              ? "Учебный документ подготовлен"
              : "Заявка обрабатывается сотрудником"),
        transitionTime,
        id,
        expected,
      ),
    db
      .prepare("UPDATE requests SET status=? WHERE id=? AND status=?")
      .bind(status, id, expected),
  ];
  if (status === "ready" && isDocumentService(row.service)) {
    statements.unshift(
      insertDocument(
        db,
        id,
        await prepareDocument(db, row, transitionTime),
        expected,
      ),
    );
  }
  const result = await db.batch(statements);
  if (!result.at(-1)?.meta.changes)
    throw new ApiError(409, "Статус уже изменился. Обновите карточку");
  return json(await ownedRequest(id, user));
}
export async function reply(req: Request, user: UserRow, id: string) {
  const row = await ownedRequest(id, user);
  if (user.role !== "student")
    throw new ApiError(403, "Ответ доступен студенту");
  if (row.status !== "needs_info")
    throw new ApiError(
      409,
      "Статус уже изменился. Обновите карточку; ваш текст остаётся в поле",
    );
  const comment = field(await body(req), "comment", 1000);
  if (comment.length < 5) throw new ApiError(400, "Напишите ответ подробнее");
  const db = database();
  const result = await db.batch([
    db
      .prepare(
        "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,'working',?,? FROM requests WHERE id=? AND owner_id=? AND status='needs_info'",
      )
      .bind(
        crypto.randomUUID(),
        "Ответ студента: " + comment,
        now(),
        id,
        user.id,
      ),
    db
      .prepare(
        "UPDATE requests SET status='working' WHERE id=? AND owner_id=? AND status='needs_info'",
      )
      .bind(id, user.id),
  ]);
  if (!result[1].meta.changes)
    throw new ApiError(
      409,
      "Статус уже изменился. Обновите карточку; ваш текст остаётся в поле",
    );
  return json(await ownedRequest(id, user));
}
export async function cancelRequest(req: Request, user: UserRow, id: string) {
  if (user.role !== "student")
    throw new ApiError(403, "Самостоятельная отмена доступна студенту");
  const row = await ownedRequest(id, user),
    data = await body(req);
  if (data.expectedStatus !== "created" || row.status !== "created")
    throw new ApiError(
      409,
      "Отмена доступна, пока заявка не взята в работу. Обновите карточку",
    );
  const db = database(),
    result = await db.batch([
      db
        .prepare(
          "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,'cancelled','Заявка отменена студентом до начала обработки',? FROM requests WHERE id=? AND owner_id=? AND status='created'",
        )
        .bind(crypto.randomUUID(), now(), id, user.id),
      db
        .prepare(
          "UPDATE requests SET status='cancelled' WHERE id=? AND owner_id=? AND status='created'",
        )
        .bind(id, user.id),
    ]);
  if (!result[1].meta.changes)
    throw new ApiError(409, "Заявка уже взята в работу. Обновите карточку");
  return json(await ownedRequest(id, user));
}
