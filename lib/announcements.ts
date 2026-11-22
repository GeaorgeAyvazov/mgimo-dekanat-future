import { ApiError, body, database, json, now, type UserRow } from "./server";
import type { Announcement } from "./catalog";

export async function announcementBoard(req: Request, user: UserRow, path: string[]) {
  if (user.role !== "staff") throw new ApiError(403, "Раздел доступен сотрудникам");
  const db = database();
  if (req.method === "GET" && path.length === 1) {
    const [groups, messages] = await Promise.all([
      db.prepare("SELECT DISTINCT student_group FROM users WHERE role='student' AND student_group<>'' ORDER BY student_group").all<{ student_group: string }>(),
      db.prepare("SELECT id,audience,title,message,published_at,withdrawn_at FROM announcements WHERE author_id=? ORDER BY published_at DESC,id DESC LIMIT 100").bind(user.id).all<Announcement>(),
    ]);
    return json({ groups: groups.results.map((r) => r.student_group), messages: messages.results });
  }
  if (req.method === "POST" && path.length === 3 && path[2] === "withdraw") {
    const result = await db.prepare(
      "UPDATE announcements SET withdrawn_at=COALESCE(withdrawn_at,?) WHERE id=? AND author_id=?",
    ).bind(now(), path[1], user.id).run();
    if (!result.meta.changes) throw new ApiError(404, "Публикация не найдена");
    return json({ ok: true });
  }
  if (req.method !== "POST" || path.length !== 1) throw new ApiError(404, "Страница не найдена");
  const data = await body(req);
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const { audience, submissionKey } = data;
  if (!title || title.length > 120 || !message || message.length > 1600) {
    throw new ApiError(400, "Укажите заголовок до 120 и текст до 1600 символов");
  }
  if (typeof submissionKey !== "string" || !/^[\da-f-]{36}$/i.test(submissionKey)) {
    throw new ApiError(400, "Откройте форму повторно");
  }
  if (typeof audience !== "string" || !audience ||
      (audience !== "*" && !await db.prepare("SELECT 1 FROM users WHERE role='student' AND student_group=? LIMIT 1").bind(audience).first())) {
    throw new ApiError(400, "Выберите получателей");
  }
  await db.prepare(
    `INSERT INTO announcements (id,author_id,submission_key,audience,title,message,published_at)
     VALUES (?,?,?,?,?,?,?) ON CONFLICT(author_id,submission_key) DO NOTHING`,
  ).bind(crypto.randomUUID(), user.id, submissionKey, audience, title, message, now()).run();
  const saved = await db.prepare("SELECT id,title,message,audience,published_at,withdrawn_at FROM announcements WHERE author_id=? AND submission_key=?")
    .bind(user.id, submissionKey).first<Announcement>();
  if (!saved || saved.title !== title || saved.message !== message || saved.audience !== audience) {
    throw new ApiError(409, "С этим номером уже опубликовано другое объявление. Обновите список");
  }
  return json(saved);
}
