import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
const base = process.env.PORTAL_TEST_URL || "http://127.0.0.1:5173";
let passed = 0;
const checks = [];
function check(name, test) {
  assert.ok(test, name);
  checks.push(name);
  passed++;
}
function client() {
  const cookies = new Map();
  return {
    async call(path, data, options = {}) {
      const r = await fetch(base + "/api/portal/" + path, {
        method: data ? "POST" : "GET",
        headers: {
          ...(data
            ? {
                "Content-Type": "application/json",
                "X-Dekanat-Request": "1",
                Origin: base,
              }
            : {}),
          ...(cookies.size ? { Cookie: [...cookies.values()].join("; ") } : {}),
          ...options.headers,
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      // Hosting may add its own cookies. Keep them by name, like a browser,
      // instead of replacing the session with the latest Set-Cookie header.
      for (const set of r.headers.getSetCookie()) {
        const pair = set.split(";")[0];
        const name = pair.slice(0, pair.indexOf("="));
        if (/Max-Age=0(?:;|$)/i.test(set)) cookies.delete(name);
        else cookies.set(name, pair);
      }
      const value = r.headers.get("content-type")?.includes("application/json")
        ? await r.json()
        : new Uint8Array(await r.arrayBuffer());
      return { r, value };
    },
  };
}
const a = client(),
  b = client(),
  office = client(),
  anon = client();
let out = await anon.call("overview");
check("Anonymous overview denied", out.r.status === 401);
out = await a.call("login", { login: "alina.demo", password: "wrong" });
check("Incorrect password denied", out.r.status === 401);
out = await a.call("login", { login: "alina.demo", password: "Student2026!" });
check("Student A login", out.r.status === 200);
check(
  "HttpOnly and SameSite cookie",
  /HttpOnly/.test(out.r.headers.get("set-cookie")) &&
    /SameSite=Lax/.test(out.r.headers.get("set-cookie")),
);
if (base.startsWith("https"))
  check(
    "Secure cookie on HTTPS",
    /Secure/.test(out.r.headers.get("set-cookie")),
  );
check(
  "No hash returned at login",
  !JSON.stringify(out.value).includes("password_hash"),
);
await b.call("login", { login: "maxim.demo", password: "Student2026!" });
await office.call("login", { login: "office.demo", password: "Student2026!" });
out = await a.call("overview");
check("Student A profile", out.value.user.name.startsWith("Алина"));
check(
  "Only owned requests for A",
  out.value.requests.every((r) => r.owner_id === "student-alina"),
);
check(
  "Grades and schedule present",
  out.value.grades.length === 6 && out.value.lessons.length === 15,
);
check(
  "No private B data in A overview",
  !JSON.stringify(out.value).includes("Максим Ильич"),
);
check("No hash in overview", !JSON.stringify(out.value).includes("$2"));
out = await b.call("overview");
check(
  "Distinct student B data",
  out.value.user.name.startsWith("Максим") && out.value.grades.length === 5,
);
out = await b.call("requests/sample-alina-transcript");
check("Foreign request denied by URL", out.r.status === 404);
out = await b.call("requests/sample-alina-transcript/document");
check("Foreign document denied", out.r.status === 404);
out = await anon.call("requests/sample-alina-transcript/document");
check("Anonymous PDF denied", out.r.status === 401);
out = await a.call("requests/sample-maxim-grades");
check("Reciprocal isolation", out.r.status === 404);
out = await a.call(
  "requests",
  {
    service: "enrollment-ru",
    format: "electronic",
    organization: "По месту требования",
    idempotencyKey: crypto.randomUUID(),
  },
  { headers: { Origin: "https://attacker.test" } },
);
check("Cross-origin write denied", out.r.status === 403);
out = await a.call(
  "requests",
  {
    service: "enrollment-ru",
    format: "electronic",
    organization: "По месту требования",
    idempotencyKey: crypto.randomUUID(),
  },
  { headers: { "X-Dekanat-Request": "" } },
);
check("Missing CSRF header denied", out.r.status === 403);
out = await a.call("requests", {
  service: "invalid",
  format: "electronic",
  idempotencyKey: crypto.randomUUID(),
});
check("Invalid service denied", out.r.status === 400);
out = await a.call("requests", {
  service: "transcript-en",
  format: "electronic",
  latinName: "Алина",
  idempotencyKey: crypto.randomUUID(),
});
check("Latin name validated server-side", out.r.status === 400);
out = await a.call("requests", {
  service: "grades-ru",
  format: "paper",
  recipient: "other",
  idempotencyKey: crypto.randomUUID(),
});
check("Paper representative validated", out.r.status === 400);
const payload = {
  service: "enrollment-ru",
  format: "electronic",
  organization: "По месту требования",
  idempotencyKey: crypto.randomUUID(),
  owner_id: "student-maxim",
};
out = await a.call("requests", payload);
const instant = out.value.id;
check(
  "Automatic certificate ready",
  out.r.status === 201 && out.value.status === "ready",
);
check(
  "Owner taken from server session",
  out.value.owner_id === "student-alina",
);
check("Created and ready events persisted", out.value.events.length === 2);
out = await a.call("requests", payload);
check("Retry does not create a duplicate", out.value.id === instant);
out = await a.call(`requests/${instant}/document`);
check(
  "PDF is a real nonempty PDF",
  out.r.status === 200 &&
    new TextDecoder().decode(out.value.slice(0, 5)) === "%PDF-" &&
    out.value.length > 5000,
);
mkdirSync("outputs", { recursive: true });
writeFileSync("outputs/certificate-sample.pdf", out.value);
const serviceIds = [
  "enrollment-en",
  "grades-ru",
  "transcript-en",
  "english-level",
];
let manual = "";
for (const service of serviceIds) {
  out = await a.call("requests", {
    service,
    format: service === "grades-ru" ? "paper" : "electronic",
    latinName: "Alina Lebedeva",
    phone: "+7 000 000-00-00",
    organization: "Fictional University",
    recipient: "self",
    idempotencyKey: crypto.randomUUID(),
  });
  check(
    `Service ${service} accepted`,
    out.r.status === 201 && out.value.status === "created",
  );
  if (service === "enrollment-en") manual = out.value.id;
}
out = await a.call(`requests/${manual}/status`, {
  status: "working",
  expectedStatus: "created",
  comment: "",
});
check("Student cannot act as staff", out.r.status === 403);
out = await office.call(`requests/${manual}/status`, {
  status: "working",
  expectedStatus: "created",
  comment: "Проверяем учебную запись",
});
check(
  "Staff takes request",
  out.r.status === 200 && out.value.status === "working",
);
out = await office.call(`requests/${manual}/status`, {
  status: "ready",
  expectedStatus: "created",
  comment: "",
});
check("Stale status update rejected", out.r.status === 409);
out = await office.call(`requests/${manual}/status`, {
  status: "needs_info",
  expectedStatus: "working",
  comment: "Уточните название организации",
});
check("Staff requests clarification", out.value.status === "needs_info");
let noticeOverview = (await a.call("overview")).value;
const clarification = noticeOverview.notices.find(
  (n) => n.requestId === manual && n.actionLabel === "Ответить на уточнение",
);
check(
  "Clarification creates actionable personal notice",
  !!clarification && !clarification.read,
);
check(
  "Notice date equals persisted event date",
  clarification.date === out.value.events.at(-1).created_at,
);
let otherOverview = (await b.call("overview")).value;
check(
  "Another student cannot see request notice",
  !otherOverview.notices.some((n) => n.requestId === manual),
);
out = await b.call("notifications", { id: clarification.id });
check("Another student cannot mark personal notice", out.r.status === 400);
await a.call("notifications", { id: clarification.id });
noticeOverview = (await a.call("overview")).value;
check(
  "Read state persists for personal notice",
  noticeOverview.notices.find((n) => n.id === clarification.id).read,
);
check(
  "Reload does not duplicate event notice",
  noticeOverview.notices.filter((n) => n.id === clarification.id).length === 1,
);
out = await a.call(`requests/${manual}/reply`, {
  comment: "Документ для Fictional University",
});
check(
  "Student reply returns case to work",
  out.r.status === 200 && out.value.status === "working",
);
out = await office.call(`requests/${manual}/status`, {
  status: "ready",
  expectedStatus: "working",
  comment: "Учебный документ подготовлен",
});
check("Staff finishes request", out.value.status === "ready");
noticeOverview = (await a.call("overview")).value;
const readyNotice = noticeOverview.notices.find(
  (n) => n.requestId === manual && n.title.includes("готов"),
);
check(
  "Resolved clarification stops asking for reply",
  noticeOverview.notices.find((n) => n.id === clarification.id).actionLabel ===
    "Открыть историю",
);
check(
  "Ready document creates linked notice",
  !!readyNotice && readyNotice.link === "case" && !readyNotice.read,
);
const beforeBRead = (await b.call("overview")).value.notices.map((n) => ({
  id: n.id,
  read: n.read,
}));
out = await a.call(`requests/${manual}`);
check(
  "Student sees staff status and full history",
  out.value.status === "ready" && out.value.events.length === 5,
);
out = await b.call(`requests/${manual}`);
check("New request remains isolated", out.r.status === 404);
await a.call("notifications", { id: "all" });
out = await a.call("overview");
check(
  "Read notices persist",
  out.value.notices.every((n) => n.read),
);
out = await b.call("overview");
check(
  "Read notices do not affect another account",
  JSON.stringify(out.value.notices.map((n) => ({ id: n.id, read: n.read }))) ===
    JSON.stringify(beforeBRead),
);

const beforeA = (await a.call("overview")).value.favorites;
const beforeB = (await b.call("overview")).value.favorites;
await a.call("favorites", { service: "english-level", active: true });
out = await a.call("overview");
check(
  "Favorites persist per account",
  out.value.favorites.includes("english-level"),
);
out = await b.call("overview");
check(
  "Favorites are isolated",
  JSON.stringify(out.value.favorites) === JSON.stringify(beforeB),
);
await a.call("favorites", { service: "english-level", active: false });
out = await a.call("overview");
check(
  "Favorite can be removed",
  !out.value.favorites.includes("english-level"),
);
if (beforeA.includes("english-level"))
  await a.call("favorites", { service: "english-level", active: true });
out = await a.call("requests", {
  service: "question",
  format: "electronic",
  topic: "academic",
  message: "Коротко",
  idempotencyKey: crypto.randomUUID(),
});
check("Question validated", out.r.status === 400);
out = await a.call("requests", {
  service: "question",
  format: "electronic",
  topic: "academic",
  department: "Attacker-selected",
  message: "Учебный вопрос: где уточнить порядок изменения языковой подгруппы?",
  idempotencyKey: crypto.randomUUID(),
});
const appeal = out.value.id;
check(
  "Question stored and routed by server",
  out.r.status === 201 &&
    out.value.department === "Учебный офис филиала" &&
    out.value.message.includes("подгруппы"),
);
out = await b.call("requests/" + appeal);
check("Foreign question denied", out.r.status === 404);
await office.call("requests/" + appeal + "/status", {
  status: "working",
  expectedStatus: "created",
  comment: "Проверяем вопрос",
});
out = await office.call("requests/" + appeal + "/status", {
  status: "ready",
  expectedStatus: "working",
  comment: "",
});
check("Question needs actual answer", out.r.status === 400);
out = await office.call("requests/" + appeal + "/status", {
  status: "ready",
  expectedStatus: "working",
  comment:
    "Учебный ответ: порядок изменения подгруппы уточняется в учебном офисе; это демонстрационный пример.",
});
check(
  "Staff answers question",
  out.r.status === 200 && out.value.status === "ready",
);
out = await a.call("requests/" + appeal);
check(
  "Student sees stored answer",
  out.value.events.at(-1).comment.includes("Учебный ответ"),
);
out = await a.call("requests/" + appeal + "/document");
check("Question does not pretend to be a certificate", out.r.status === 404);
// Cancellation is permitted only while a manual request is still new.
const newRequest = () => ({
  service: "grades-ru",
  format: "electronic",
  idempotencyKey: crypto.randomUUID(),
});
out = await a.call("requests", newRequest());
const cancelledId = out.value.id;
out = await b.call(`requests/${cancelledId}/cancel`, {
  expectedStatus: "created",
});
check("Foreign cancellation denied", out.r.status === 404);
out = await office.call(`requests/${cancelledId}/cancel`, {
  expectedStatus: "created",
});
check("Student cancellation endpoint rejects staff role", out.r.status === 403);
out = await a.call(`requests/${instant}/cancel`, { expectedStatus: "created" });
check("Ready document cannot be cancelled by student", out.r.status === 409);
out = await a.call(`requests/${cancelledId}/cancel`, {
  expectedStatus: "created",
});
check(
  "Owner cancels a new request",
  out.r.status === 200 && out.value.status === "cancelled",
);
check(
  "Cancellation history is saved once",
  out.value.events.length === 2 &&
    out.value.events.at(-1).comment.includes("студентом"),
);
out = await a.call(`requests/${cancelledId}/cancel`, {
  expectedStatus: "created",
});
check("Repeated cancellation is a conflict", out.r.status === 409);
out = await office.call(`requests/${cancelledId}/status`, {
  expectedStatus: "created",
  status: "working",
  comment: "Берём в работу",
});
check("Cancelled request cannot be taken into work", out.r.status === 409);
out = await a.call(`requests/${cancelledId}/document`);
check("Cancelled document is not downloadable", out.r.status === 409);
out = await a.call("requests", newRequest());
const cancelRaceId = out.value.id;
const cancelRace = await Promise.all([
  a.call(`requests/${cancelRaceId}/cancel`, { expectedStatus: "created" }),
  office.call(`requests/${cancelRaceId}/status`, {
    expectedStatus: "created",
    status: "working",
    comment: "Взято в обработку",
  }),
]);
check(
  "Cancel versus staff race has one winner",
  cancelRace.filter((x) => x.r.status === 200).length === 1 &&
    cancelRace.filter((x) => x.r.status === 409).length === 1,
);
out = await a.call(`requests/${cancelRaceId}`);
check(
  "Cancel race records only committed action",
  out.value.events.length === 2 &&
    ["working", "cancelled"].includes(out.value.status),
);
// A reply must never return success if its text did not reach the history.
out = await a.call("requests", newRequest());
const replyRaceId = out.value.id;
await office.call(`requests/${replyRaceId}/status`, {
  expectedStatus: "created",
  status: "needs_info",
  comment: "Уточните назначение документа",
});
const replyText = "Нужна выписка для учебного конкурса";
const replyRace = await Promise.all([
  a.call(`requests/${replyRaceId}/reply`, { comment: replyText }),
  office.call(`requests/${replyRaceId}/status`, {
    expectedStatus: "needs_info",
    status: "working",
    comment: "Сотрудник продолжил обработку",
  }),
]);
check(
  "Reply versus staff race has one winner",
  replyRace.filter((x) => x.r.status === 200).length === 1 &&
    replyRace.filter((x) => x.r.status === 409).length === 1,
);
out = await a.call(`requests/${replyRaceId}`);
const replyStored = out.value.events.filter((e) =>
  e.comment.includes(replyText),
).length;
check(
  "Reply success always means stored text",
  replyRace[0].r.status === 200 ? replyStored === 1 : replyStored === 0,
);
check(
  "Reply race history and state agree",
  out.value.status === "working" && out.value.events.length === 3,
);
out = await a.call(`requests/${replyRaceId}/reply`, { comment: replyText });
check(
  "Stale reply clearly rejects without fake success",
  out.r.status === 409 && out.value.error.includes("Статус"),
);
noticeOverview = (await a.call("overview")).value;
const answerNotice = noticeOverview.notices.find(
  (n) => n.requestId === appeal && n.title.includes("ответ"),
);
check(
  "Staff answer creates its own notice",
  !!answerNotice && answerNotice.actionLabel === "Прочитать ответ",
);
out = await a.call("logout", {});
check(
  "Logout clears cookie",
  /Max-Age=0/.test(out.r.headers.get("set-cookie")),
);
out = await a.call("overview");
check("Logged-out session denied", out.r.status === 401);
const result = { base, runAt: new Date().toISOString(), passed, checks };
writeFileSync("outputs/api-checks.json", JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({ base, passed, report: "outputs/api-checks.json" }),
);
