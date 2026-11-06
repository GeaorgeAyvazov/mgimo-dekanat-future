import { env } from "cloudflare:workers";
import { compare } from "bcryptjs";
import { demoUsers, lessons, notices } from "./demo-data";
import {
  services,
  topics,
  type Student,
  type Case,
  type CaseEvent,
  type Notice,
} from "./catalog";
import { DEMO_HASH } from "./demo-hash";
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
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "Нужен JSON-запрос");
}
export async function body(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > 6000) throw new ApiError(413, "Слишком много данных");
  try {
    const v = JSON.parse(raw);
    if (!v || Array.isArray(v) || typeof v !== "object") throw new Error();
    return v;
  } catch {
    throw new ApiError(400, "Не удалось прочитать данные");
  }
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
  const announcements = notices(user.id);
  if (user.role !== "student") return announcements;
  const rows = await database()
    .prepare(
      "SELECT e.id,e.status,e.comment,e.created_at,r.id AS request_id,r.service,r.format,r.status AS request_status FROM request_events e JOIN requests r ON r.id=e.request_id WHERE r.owner_id=? AND e.status IN ('ready','needs_info','cancelled') ORDER BY e.created_at DESC,e.id DESC LIMIT 100",
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
    const title =
      e.status === "needs_info"
        ? e.request_status === "needs_info"
          ? "По обращению нужно уточнение"
          : "Запрос уточнения сохранён в истории"
        : e.status === "cancelled"
          ? "Заявка отменена"
          : e.service === "question"
            ? "Получен ответ на ваш вопрос"
            : e.format === "paper"
              ? "Бумажный документ готов к выдаче"
              : "Документ готов к скачиванию";
    return {
      id: `request-event:${e.id}`,
      title,
      text: `${service.title}. ${e.comment}`,
      date: e.created_at,
      type: "request",
      link: "case",
      requestId: e.request_id,
      actionLabel:
        e.status === "needs_info"
          ? e.request_status === "needs_info"
            ? "Ответить на уточнение"
            : "Открыть историю"
          : e.status === "ready" && e.service === "question"
            ? "Прочитать ответ"
            : "Открыть заявку",
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
              "SELECT r.*,u.name AS student_name,u.student_group FROM requests r JOIN users u ON u.id=r.owner_id ORDER BY r.created_at DESC",
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
    today: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
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
  return { ...row, events: events.results };
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
export async function createRequest(req: Request, user: UserRow) {
  if (user.role !== "student")
    throw new ApiError(403, "Заказ доступен студентам");
  const data = await body(req),
    service = services.find((s) => s.id === data.service);
  if (!service || !["electronic", "paper"].includes(String(data.format)))
    throw new ApiError(400, "Выберите документ и способ получения");
  const fields: readonly string[] = service.fields,
    organization = field(data, "organization"),
    latin = field(data, "latinName"),
    phone = field(data, "phone", 30),
    recipient = field(data, "recipient", 30) || "self",
    representative = field(data, "representative");
  const topic = topics.find((t) => t.id === data.topic),
    message = field(data, "message", 2000);
  if (
    service.id === "question" &&
    (!topic || message.length < 10 || data.format !== "electronic")
  )
    throw new ApiError(
      400,
      "Выберите тему и опишите вопрос подробнее (от 10 символов)",
    );
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
  if (prior) return json(await ownedRequest(prior.id, user));
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
        "INSERT OR IGNORE INTO requests (id,owner_id,service,format,organization,latin_name,phone,recipient,representative,status,created_at,due_at,idempotency_key,topic,message,department) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
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
        service.id === "question" ? topic!.id : "",
        service.id === "question" ? message : "",
        service.id === "question" ? topic!.department : "Сервисный центр",
      ),
    db
      .prepare(
        "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,'created','Заявка зарегистрирована в сервисном центре',? FROM requests WHERE id=?",
      )
      .bind(crypto.randomUUID(), created, id),
  ];
  if (automatic)
    statements.push(
      db
        .prepare(
          "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,'ready','Учебный PDF сформирован автоматически. Это демонстрационный документ, не справка вуза.',? FROM requests WHERE id=?",
        )
        .bind(crypto.randomUUID(), new Date(Date.now() + 1).toISOString(), id),
    );
  await db.batch(statements);
  const actual = await db
    .prepare("SELECT id FROM requests WHERE owner_id=? AND idempotency_key=?")
    .bind(user.id, key)
    .first<{ id: string }>();
  return json(await ownedRequest(actual!.id, user), 201);
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
  };
  if (row.status !== expected)
    throw new ApiError(409, "Статус уже изменился. Обновите карточку");
  if (!allowed[row.status]?.includes(status))
    throw new ApiError(400, "Такой переход статуса недоступен");
  if (row.service === "question" && status === "ready" && comment.length < 10)
    throw new ApiError(400, "Добавьте ответ студенту (от 10 символов)");
  if ((status === "needs_info" || status === "cancelled") && comment.length < 5)
    throw new ApiError(400, "Добавьте пояснение для студента");
  const db = database();
  const result = await db.batch([
    db
      .prepare(
        "INSERT INTO request_events (id,request_id,status,comment,created_at) SELECT ?,id,?,?,? FROM requests WHERE id=? AND status=?",
      )
      .bind(
        crypto.randomUUID(),
        status,
        comment ||
          (status === "ready"
            ? "Учебный документ подготовлен"
            : "Заявка обрабатывается сотрудником"),
        now(),
        id,
        expected,
      ),
    db
      .prepare("UPDATE requests SET status=? WHERE id=? AND status=?")
      .bind(status, id, expected),
  ]);
  if (!result[1].meta.changes)
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
