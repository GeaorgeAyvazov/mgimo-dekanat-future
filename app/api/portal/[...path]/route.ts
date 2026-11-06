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
} from "@/lib/server";
import { notices } from "@/lib/demo-data";
import { certificate } from "@/lib/pdf";
import { services } from "@/lib/catalog";
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
    if (
      req.method === "GET" &&
      (path[0] === "overview" || path[0] === "session")
    )
      return json(await overview(user));
    if (path[0] === "requests") {
      if (!path[1] && req.method === "POST")
        return await createRequest(req, user);
      if (path[1] && path.length === 2 && req.method === "GET")
        return json(await ownedRequest(path[1], user));
      if (path[1] && path[2] === "document" && req.method === "GET") {
        const row = await ownedRequest(path[1], user);
        if (row.service === "question")
          throw new ApiError(404, "У обращения нет документа для скачивания");
        if (row.status !== "ready")
          throw new ApiError(409, "Документ ещё не готов");
        return new Response(await certificate(row), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="study-sample-${row.id.slice(0, 8)}.pdf"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (path[1] && path[2] === "status" && req.method === "POST")
        return await updateRequest(req, user, path[1]);
      if (path[1] && path[2] === "reply" && req.method === "POST")
        return await reply(req, user, path[1]);
    }
    if (path[0] === "favorites" && req.method === "POST") {
      if (user.role !== "student")
        throw new ApiError(403, "Избранное доступно студентам");
      const data = await body(req),
        service = field(data, "service", 60);
      if (
        !services.some((s) => s.id === service && s.id !== "question") ||
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
        valid = notices(user.id).map((n) => n.id);
      if (id !== "all" && !valid.includes(id))
        throw new ApiError(400, "Уведомление не найдено");
      await database().batch(
        (id === "all" ? valid : [id]).map((n) =>
          database()
            .prepare(
              "INSERT OR IGNORE INTO notification_reads (id,user_id,notice_id) VALUES (?,?,?)",
            )
            .bind(`${user.id}:${n}`, user.id, n),
        ),
      );
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
