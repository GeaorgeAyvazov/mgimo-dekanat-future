import {
  ApiError,
  body,
  createRequest,
  csrf,
  currentUser,
  database,
  field,
  json,
  login,
  logout,
  overview,
  ownedRequest,
  reply,
  seed,
  updateRequest,
  notificationList,
  cancelRequest,
} from "@/lib/server";
import { employees } from "@/lib/demo-employees";
import { announcementBoard } from "@/lib/announcements";
import { getDocument } from "@/lib/document-storage";
import { isDocumentService, services } from "@/lib/catalog";
import {
  buildRoomCalendar,
  findAvailableRooms,
  groupSchedule,
  isRuzGroup,
  languageStreams,
  ruzCoverage,
  scheduleGroups,
  isTeachingRoom,
  validRoomInterval,
} from "@/lib/room-calendar";
import { mondayOf, moscowDate, validCalendarDate } from "@/lib/room-calendar-types";
import { lessons } from "@/lib/demo-data";
import { scheduleCalendar } from "@/lib/schedule-calendar";
async function handle(req: Request) {
  try {
    if (req.method !== "GET") csrf(req);
    await seed();
    const path = new URL(req.url).pathname
      .replace(/^\/api\/portal\//, "")
      .split("/");
    if (req.method === "POST" && path[0] === "login") return await login(req);
    if (req.method === "POST" && path[0] === "logout") return await logout(req);
    const user = await currentUser(req);
    if (path[0] === "announcements") return await announcementBoard(req, user, path);
    if (req.method === "POST" && path.length === 1 && path[0] === "my-schedule") {
      if (user.role !== "student") throw new ApiError(403, "Расписание доступно студентам");
      const { group, stream } = await body(req);
      if (typeof group !== "string" || typeof stream !== "string" ||
          (group ? !languageStreams(group).includes(stream) : !!stream))
        throw new ApiError(400, "Выберите языковую подгруппу своей группы");
      await database().prepare("UPDATE users SET timetable_group=?,language_stream=? WHERE id=?")
        .bind(group || null, stream || null, user.id).run();
      return json({ok: true});
    }
    if (req.method === "GET" && path.length === 1 && ["group-schedule", "schedule-calendar"].includes(path[0])) {
      if (user.role !== "student") throw new ApiError(403, "Расписание доступно студентам");
      const params = new URL(req.url).searchParams;
      const group = params.get("group");
      if (path[0] === "group-schedule" && !group) return json({ groups: scheduleGroups, coverage: ruzCoverage });
      const week = params.get("week") ?? (path[0] === "group-schedule" ? mondayOf(moscowDate()) : "");
      if (!validCalendarDate(week) || new Date(week + "T12:00:00Z").getUTCDay() !== 1)
        throw new ApiError(400, "Выберите неделю с понедельника");
      const selected = group || (params.get("scope") !== "demo" && user.timetable_group) || "";
      const streams = languageStreams(selected);
      const stream = params.get("stream") ?? (!group && selected ? user.language_stream : "");
      if (stream && !streams.includes(stream)) throw new ApiError(400, "Подгруппа не входит в выбранную группу");
      const allLessons = selected ? groupSchedule(selected, week) : lessons(user.id);
      if (!allLessons) throw new ApiError(404, "Группа не найдена");
      const timetable = stream ? allLessons.filter(l => !streams.includes(l.stream || "") || l.stream === stream) : allLessons;
      const official = !!selected && isRuzGroup(selected);
      if (path[0] === "group-schedule") return json({ group: selected, week, lessons: timetable, streams, source: official ? "ruz" : "demo", coverage: official ? ruzCoverage : undefined, timezone: "Europe/Moscow" });
      if (official && (week < ruzCoverage.from || week > ruzCoverage.to)) throw new ApiError(404, "За эту неделю нет выгрузки РУЗ");
      return new Response(scheduleCalendar(week, timetable, selected || user.student_group, new Date(), official), {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="mgimo-${official ? "ruz" : "demo"}-${week}.ics"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (
      (path[0] === "room-calendar" || path[0] === "room-availability") &&
      path.length === 1 &&
      req.method === "GET"
    ) {
      const params = new URL(req.url).searchParams;
      const date = params.get("date") || moscowDate();
      if (
        !validCalendarDate(date) ||
        Math.abs(
          new Date(date + "T12:00:00Z").getTime() -
            new Date(moscowDate() + "T12:00:00Z").getTime(),
        ) >
          90 * 86400000
      )
        throw new ApiError(400, "Выберите корректную дату в пределах 90 дней");
      if (path[0] === "room-calendar") {
        const key = params.get("room") || "";
        if (!isTeachingRoom(key))
          throw new ApiError(404, "Расписание этой аудитории не найдено");
        return json(buildRoomCalendar(key, date));
      }
      const start = params.get("start") || "";
      const end = params.get("end") || "";
      if (!validRoomInterval(start, end))
        throw new ApiError(
          400,
          "Укажите интервал с 08:00 до 21:00. Начало должно быть раньше конца.",
        );
      return json({
        date,
        start,
        end,
        timezone: "Europe/Moscow",
        source: "demo",
        rooms: findAvailableRooms(date, start, end),
      });
    }
    if (
      req.method === "GET" &&
      (path[0] === "overview" || path[0] === "session")
    )
      return json(await overview(user));
    if (path[0] === "employees" && req.method === "GET") {
      if (path.length === 1) return json({ employees });
      const employee =
        path.length === 2 && employees.find((item) => item.id === path[1]);
      if (!employee) throw new ApiError(404, "Сотрудник не найден");
      return json(employee);
    }
    if (path[0] === "requests") {
      if (!path[1] && req.method === "POST")
        return await createRequest(req, user);
      if (path[1] && path.length === 2 && req.method === "GET")
        return json(await ownedRequest(path[1], user));
      if (path.length === 3 && path[2] === "evidence" && req.method === "GET") {
        const row = await ownedRequest(path[1], user);
        if (!row.evidence) throw new ApiError(404, "Вложение не найдено");
        const content = await database().prepare(
          "SELECT content FROM request_evidence WHERE request_id=?",
        ).bind(row.id).first<ArrayBuffer>("content");
        if (!content) throw new ApiError(404, "Вложение не найдено");
        const fallback = row.evidence.mediaType === "image/png" ? "evidence.png" : "evidence.txt";
        return new Response(new Uint8Array(content), {
          headers: {
            "Content-Type": row.evidence.mediaType === "text/plain" ? "text/plain; charset=utf-8" : "image/png",
            "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(row.evidence.name)}`,
            "Cache-Control": "private, no-store",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (
        path[1] &&
        path.length === 3 &&
        ["document", "signature", "document-info"].includes(path[2]) &&
        req.method === "GET"
      ) {
        const row = await ownedRequest(path[1], user);
        if (!isDocumentService(row.service))
          throw new ApiError(404, "У обращения нет документа для скачивания");
        if (!["ready", "issued"].includes(row.status))
          throw new ApiError(409, "Документ ещё не готов");
        const stored = await getDocument(database(), row);
        if (path[2] === "document-info")
          return json({
            number: row.id.toUpperCase(),
            preparedAt: stored.prepared_at,
            pdfDigest: stored.pdf_digest,
            signatureDigest: stored.signature_digest,
          });
        const signature = path[2] === "signature";
        return new Response(
          new Uint8Array(signature ? stored.signature : stored.pdf),
          {
            headers: {
              "Content-Type": signature
                ? "application/pkcs7-signature"
                : "application/pdf",
              "Content-Disposition": `attachment; filename="mgimo-demo-${row.service}-${row.id.slice(-8)}.pdf${signature ? ".sig" : ""}"`,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
      if (path[1] && path[2] === "status" && req.method === "POST")
        return await updateRequest(req, user, path[1]);
      if (path[1] && path[2] === "reply" && req.method === "POST")
        return await reply(req, user, path[1]);
      if (path[1] && path[2] === "cancel" && req.method === "POST")
        return await cancelRequest(req, user, path[1]);
    }
    if (path[0] === "favorites" && req.method === "POST") {
      if (user.role !== "student")
        throw new ApiError(403, "Избранное доступно студентам");
      const data = await body(req),
        service = field(data, "service", 60);
      if (
        !services.some(
          (s) => s.id === service && s.id !== "question" && s.id !== "feedback",
        ) ||
        typeof data.active !== "boolean"
      )
        throw new ApiError(400, "Услуга не найдена");
      await (
        data.active
          ? database()
              .prepare(
                "INSERT OR IGNORE INTO favorites (id,user_id,service) VALUES (?,?,?)",
              )
              .bind(`${user.id}:${service}`, user.id, service)
          : database()
              .prepare("DELETE FROM favorites WHERE user_id=? AND service=?")
              .bind(user.id, service)
      ).run();
      return json({ ok: true });
    }
    if (path[0] === "notifications" && req.method === "POST") {
      const id = field(await body(req), "id", 100),
        valid = (await notificationList(user)).map((n) => n.id);
      if (id !== "all" && !valid.includes(id))
        throw new ApiError(400, "Уведомление не найдено");
      if (!valid.length) return json({ ok: true });
      await database().prepare(
        "INSERT OR IGNORE INTO notification_reads (id,user_id,notice_id) SELECT ? || ':' || value, ?, value FROM json_each(?)",
      ).bind(user.id, user.id, JSON.stringify(id === "all" ? valid : [id])).run();
      return json({ ok: true });
    }
    throw new ApiError(404, "Страница не найдена");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    console.error(
      "Portal request failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json(
      { error: "Сервис временно недоступен. Попробуйте ещё раз" },
      500,
    );
  }
}
export const GET = handle;
export const POST = handle;
