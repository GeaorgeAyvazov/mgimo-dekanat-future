import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { ContentInfo, SignedData } from "pkijs";
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
      const upload = data instanceof FormData;
      const r = await fetch(base + "/api/portal/" + path, {
        method: data ? "POST" : "GET",
        headers: {
          ...(data
            ? {
                ...(!upload && { "Content-Type": "application/json" }),
                "X-Dekanat-Request": "1",
                Origin: base,
              }
            : {}),
          ...(cookies.size ? { Cookie: [...cookies.values()].join("; ") } : {}),
          ...options.headers,
        },
        ...(data ? { body: upload ? data : JSON.stringify(data) } : {}),
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
const board = await office.call("announcements");
check("Staff can select existing student groups", board.r.status === 200 &&
  board.value.groups.includes("МО-21") && board.value.groups.includes("БИ-31"));
check("Anonymous visitor cannot open the publication board", (await anon.call("announcements")).r.status === 401);
check("Students cannot open publication history", (await a.call("announcements")).r.status === 403);
const bulletin = {
  audience: "МО-21", title: "Учебная консультация группы", message: "В демонстрационном расписании добавлена учебная консультация.",
  submissionKey: crypto.randomUUID(),
};
check("Students cannot publish announcements", (await a.call("announcements", bulletin)).r.status === 403);
check("Unknown target group is rejected", (await office.call("announcements", { ...bulletin, audience: "нет такой группы" })).r.status === 400);
const publishes = await Promise.all([office.call("announcements", bulletin), office.call("announcements", bulletin)]);
const bulletinId = publishes[0].value.id;
const noticeId = `announcement:${bulletinId}`;
const noticeFor = async (actor, id) => (await actor.call("overview")).value.notices.find((notice) => notice.id === id);
check("Simultaneous publication retries create one item", publishes.every(({ r, value }) => r.status === 200 && value.id === bulletinId) &&
  (await office.call("announcements")).value.messages.filter((message) => message.id === bulletinId).length === 1);
check("A different announcement cannot reuse the same key", (await office.call("announcements", {
  ...bulletin, message: "Изменённый текст",
})).r.status === 409);
const groupNotice = await noticeFor(a, noticeId);
check("Chosen group receives the publication with its date", groupNotice?.title === bulletin.title &&
  groupNotice.text === bulletin.message && groupNotice.date === publishes[0].value.published_at && groupNotice.read === false);
check("Another group cannot see or mark the announcement", !(await noticeFor(b, noticeId)) &&
  (await b.call("notifications", { id: noticeId })).r.status === 400);
check("Student read state is saved", (await a.call("notifications", { id: noticeId })).r.status === 200 &&
  (await noticeFor(a, noticeId))?.read === true);
check("Students cannot withdraw staff announcements", (await a.call(`announcements/${bulletinId}/withdraw`, {})).r.status === 403);
check("Staff withdrawal removes the group notice", (await office.call(`announcements/${bulletinId}/withdraw`, {})).r.status === 200 &&
  !(await noticeFor(a, noticeId)));
const withdrawn = (await office.call("announcements")).value.messages.find((row) => row.id === bulletinId);
check("Withdrawal timestamp persists and repeated withdrawal is harmless", !!withdrawn.withdrawn_at &&
  (await office.call(`announcements/${bulletinId}/withdraw`, {})).r.status === 200 &&
  (await office.call("announcements")).value.messages.find((row) => row.id === bulletinId).withdrawn_at === withdrawn.withdrawn_at);
const publicBulletin = await office.call("announcements", { ...bulletin, audience: "*", submissionKey: crypto.randomUUID() });
const publicNoticeId = `announcement:${publicBulletin.value.id}`;
check("University-wide announcement reaches both groups", publicBulletin.r.status === 200 &&
  !!(await noticeFor(a, publicNoticeId)) && !!(await noticeFor(b, publicNoticeId)));
await a.call("notifications", { id: publicNoticeId });
check("Reading a shared announcement is personal", (await noticeFor(a, publicNoticeId)).read &&
  !(await noticeFor(b, publicNoticeId)).read);
await office.call(`announcements/${publicBulletin.value.id}/withdraw`, {});
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
const issuedPdf = out.value;
const signaturePath = `requests/${instant}/signature`;
const documentInfoPath = `requests/${instant}/document-info`;
const signature = await a.call(signaturePath);
check(
  "Detached signature is available to owner",
  signature.r.status === 200 &&
    signature.r.headers.get("content-type") === "application/pkcs7-signature",
);
const cms = ContentInfo.fromBER(signature.value);
const signed = new SignedData({ schema: cms.content });
check(
  "Signature is detached CMS SignedData",
  cms.contentType === ContentInfo.SIGNED_DATA &&
    signed.encapContentInfo.eContent === undefined,
);
check(
  "CMS signature verifies over the PDF",
  await signed.verify({ signer: 0, data: issuedPdf, checkChain: false }),
);
const changed = new Uint8Array(issuedPdf);
changed[10] ^= 1;
check(
  "Modified PDF fails signature verification",
  !(await signed.verify({ signer: 0, data: changed, checkChain: false })),
);
const info = await a.call(documentInfoPath);
const digest = (value) => createHash("sha256").update(value).digest("hex");
check(
  "Document info matches stored byte digests",
  info.value.pdfDigest === digest(issuedPdf) &&
    info.value.signatureDigest === digest(signature.value),
);
check(
  "Repeat PDF and SIG downloads preserve bytes",
  digest((await a.call(`requests/${instant}/document`)).value) ===
    info.value.pdfDigest &&
    digest((await a.call(signaturePath)).value) === info.value.signatureDigest,
);
check(
  "Other student cannot get signature or metadata",
  (await b.call(signaturePath)).r.status === 404 &&
    (await b.call(documentInfoPath)).r.status === 404,
);
check(
  "Anonymous signature download denied",
  (await anon.call(signaturePath)).r.status === 401,
);
const feedbackPayload = {
  service: "feedback",
  format: "electronic",
  feedbackReason: "quality",
  relatedRequestId: instant,
  message: "Демо. Просьба уточнить сведения в документе.",
  idempotencyKey: crypto.randomUUID(),
};
check(
  "Other student cannot link someone else's request",
  (await b.call("requests", feedbackPayload)).r.status === 404,
);
check(
  "Feedback reason is required",
  (await a.call("requests", { ...feedbackPayload, feedbackReason: "invalid" }))
    .r.status === 400,
);
const feedback = await a.call("requests", feedbackPayload);
check(
  "Feedback keeps owner, reason, and source",
  feedback.r.status === 201 &&
    feedback.value.related_request_id === instant &&
    feedback.value.topic === "quality" &&
    feedback.value.department === "Координатор сервисного центра",
);
check(
  "Feedback submission is idempotent",
  (await a.call("requests", feedbackPayload)).value.id === feedback.value.id,
);
const feedbackPath = `requests/${feedback.value.id}`;
await office.call(`${feedbackPath}/status`, {
  expectedStatus: "created",
  status: "working",
});
const feedbackReply = await office.call(`${feedbackPath}/status`, {
  expectedStatus: "working",
  status: "ready",
  comment: "В учебном примере сведения проверены.",
});
check(
  "Coordinator response appears in own notifications",
  feedbackReply.r.status === 200 &&
    (await a.call("overview")).value.notices.some(
      (notice) =>
        notice.requestId === feedback.value.id &&
        notice.title.includes("Координатор"),
    ),
);
check(
  "Feedback has no PDF or signature",
  (await a.call(`${feedbackPath}/document`)).r.status === 404 &&
    (await a.call(`${feedbackPath}/signature`)).r.status === 404,
);
const staffRow = (await office.call("overview")).value.requests.find(
  (row) => row.id === instant,
);
check(
  "Staff report gets the actual readiness timestamp",
  staffRow.ready_at === info.value.preparedAt,
);
const serviceIds = [
  "enrollment-en",
  "grades-ru",
  "transcript-en",
  "english-level",
];
let manual = "",
  paper = "";
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
    out.r.status === 201 && out.value.status === (service === "enrollment-en" ? "ready" : "created"),
  );
  if (service === "transcript-en") manual = out.value.id;
  if (service === "grades-ru") paper = out.value.id;
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
    out.value.department === "Учебный офис" &&
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

const issue = { status: "issued", expectedStatus: "ready" };
out = await office.call(`requests/${paper}/status`, {
  ...issue,
  expectedStatus: "created",
});
check(
  "Paper document cannot be issued before it is ready",
  out.r.status === 400,
);
out = await office.call(`requests/${instant}/status`, issue);
check("Electronic document cannot be issued at pickup", out.r.status === 400);
out = await office.call(`requests/${appeal}/status`, issue);
check("Answered question cannot be issued at pickup", out.r.status === 400);
await office.call(`requests/${paper}/status`, {
  status: "working",
  expectedStatus: "created",
});
out = await office.call(`requests/${paper}/status`, {
  status: "ready",
  expectedStatus: "working",
});
check("Staff prepares the paper document", out.r.status === 200);
const pickupNotice = (await a.call("overview")).value.notices.find(
  (n) =>
    n.requestId === paper && n.title === "Бумажный документ готов к выдаче",
);
check("Ready paper document generates a pickup notice", !!pickupNotice);
out = await a.call(`requests/${paper}/status`, issue);
check("Student cannot mark their own document as issued", out.r.status === 403);
const issueRace = await Promise.all([
  office.call(`requests/${paper}/status`, issue),
  office.call(`requests/${paper}/status`, issue),
]);
check(
  "Concurrent issuance has one winner",
  issueRace
    .map(({ r }) => r.status)
    .sort()
    .join(",") === "200,409",
);
out = await a.call(`requests/${paper}`);
const issuanceEvents = out.value.events.filter((e) => e.status === "issued");
check(
  "Student sees the issued status and one timestamped event",
  out.r.status === 200 &&
    out.value.status === "issued" &&
    issuanceEvents.length === 1 &&
    Number.isFinite(Date.parse(issuanceEvents[0].created_at)),
);
noticeOverview = (await a.call("overview")).value;
const issuedNotice = noticeOverview.notices.find(
  (n) => n.id === `request-event:${issuanceEvents[0].id}`,
);
check(
  "Issuance notifies the owner using the event timestamp",
  issuedNotice?.title === "Бумажный документ выдан" &&
    issuedNotice.requestId === paper &&
    issuedNotice.date === issuanceEvents[0].created_at &&
    !issuedNotice.read,
);
check(
  "Previous pickup notice now points to history",
  noticeOverview.notices.find((n) => n.id === pickupNotice.id)?.actionLabel ===
    "Открыть историю" &&
    !noticeOverview.notices.some(
      (n) =>
        n.requestId === paper && n.title === "Бумажный документ готов к выдаче",
    ),
);
check(
  "Issuance notice is private",
  !(await b.call("overview")).value.notices.some((n) => n.requestId === paper),
);
out = await a.call(`requests/${paper}/cancel`, { expectedStatus: "created" });
check("Issued document cannot be cancelled", out.r.status === 409);

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
const examRequest = {
  service: "exam-request",
  format: "electronic",
  assessment: "0",
  examReason: "absence",
  message: "Прошу рассмотреть учебный пример неявки на экзамен.",
  idempotencyKey: crypto.randomUUID(),
};
check("Absence requires evidence", (await a.call("requests", examRequest)).r.status === 400);
check("A legacy checkbox cannot stand in for a file",
  (await a.call("requests", { ...examRequest, demoEvidence: true })).r.status === 400);
const exampleText = "Учебный образец. Запрос о переносе вымышленного экзамена.\r\n";
const exampleFile = new File([exampleText], "Учебный пример.txt", { type: "text/plain" });
function attach(fields, file = exampleFile) {
  const upload = new FormData();
  upload.append("data", JSON.stringify(fields));
  upload.append("evidence", file);
  return upload;
}
check("Exam must belong to the student's exam list", (await a.call("requests",
  attach({ ...examRequest, assessment: "3" }))).r.status === 400);
check("Cross-origin upload denied", (await a.call("requests", attach(examRequest),
  { headers: { Origin: "https://other.test" } })).r.status === 403);
check("Staff cannot file an application for a student", (await office.call("requests", attach(examRequest))).r.status === 403);
for (const [label, file, status] of [
  ["binary masquerading as text", new File([new Uint8Array([0, 1])], "test.txt", { type: "text/plain" }), 400],
  ["fake image", new File(["broken"], "test.png", { type: "image/png" }), 400],
  ["unsupported extension", new File(["example"], "test.html", { type: "text/html" }), 400],
  ["empty text", new File([""], "test.txt", { type: "text/plain" }), 400],
  ["oversized attachment", new File(["x".repeat(512 * 1024 + 1)], "test.txt", { type: "text/plain" }), 413],
]) check(`Rejects ${label}`, (await a.call("requests", attach(examRequest, file))).r.status === status);
const doubled = attach(examRequest);
doubled.append("evidence", exampleFile);
check("At most one file can be attached", (await a.call("requests", doubled)).r.status === 400);
check("Other application reasons reject unrequested uploads", (await a.call("requests",
  attach({ ...examRequest, examReason: "reschedule" }))).r.status === 400);
const uploadExam = () => attach({ ...examRequest, examSubject: "Подменённый предмет" });
const examRace = await Promise.all([a.call("requests", uploadExam()), a.call("requests", uploadExam())]);
out = examRace.find(({ r }) => r.status === 201) || examRace[0];
check("Concurrent upload creates one application and one history event",
  examRace.every(({ value }) => value.id === out.value.id && value.events?.length === 1) &&
  examRace.filter(({ r }) => r.status === 200).length === 1);
check("Exam details come from own academic record", out.r.status === 201 &&
  out.value.message.includes("Международные отношения") &&
  out.value.message.includes("2026-06-19") &&
  !out.value.message.includes("Подменённый предмет"));
check("Exam request stays private", (await b.call(`requests/${out.value.id}`)).r.status === 404);
const evidencePath = `requests/${out.value.id}/evidence`;
check("Application metadata lists the original file name and size",
  out.value.evidence.name === exampleFile.name && out.value.evidence.byteSize === exampleFile.size &&
  !("content" in out.value.evidence));
for (const [role, actor] of [["owner", a], ["staff", office]]) {
  const download = await actor.call(evidencePath);
  check(`Exact submitted file is available to ${role}`, download.r.status === 200 &&
    Buffer.from(download.value).toString("utf8") === exampleText &&
    download.r.headers.get("content-disposition").includes(encodeURIComponent(exampleFile.name)) &&
    download.r.headers.get("x-content-type-options") === "nosniff" &&
    download.r.headers.get("cache-control").includes("no-store"));
}
check("Foreign student cannot download evidence", (await b.call(evidencePath)).r.status === 404);
check("Anonymous visitor cannot download evidence", (await anon.call(evidencePath)).r.status === 401);
check("Reusing the key cannot replace evidence", (await a.call("requests", attach(examRequest,
  new File(["другой учебный текст"], exampleFile.name, { type: "text/plain" })))).r.status === 409 &&
  Buffer.from((await office.call(evidencePath)).value).toString("utf8") === exampleText);
out = await b.call("requests", {
  ...examRequest,
  assessment: "unlisted",
  examReason: "reschedule",
  examSubject: "Учебный пример пересдачи",
  examDate: "2026-12-18",
  idempotencyKey: crypto.randomUUID(),
});
check("Reschedule supports an exam outside the list", out.r.status === 201 && out.value.message.includes("2026-12-18"));
check("Request without evidence has no download", (await b.call(`requests/${out.value.id}/evidence`)).r.status === 404);

const correction = {
  service: "profile-correction",
  format: "electronic",
  profileReason: "official",
  profileField: "latinName",
  message: "Прошу проверить учебный вариант написания имени.",
  idempotencyKey: crypto.randomUUID(),
};
check("Official correction requires evidence", (await b.call("requests", correction)).r.status === 400);
const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGM08sxgYGBgYgADAAqYAOcxo2RMAAAAAElFTkSuQmCC", "base64");
out = await b.call("requests", attach(correction, new File([pngBytes], "пример.png", { type: "image/png" })));
check("Official profile correction accepts PNG evidence", out.r.status === 201 && out.value.evidence.mediaType === "image/png");
const imageDownload = await office.call(`requests/${out.value.id}/evidence`);
check("Uploaded PNG bytes remain intact", imageDownload.r.status === 200 && pngBytes.equals(Buffer.from(imageDownload.value)));
out = await b.call("requests", {
  ...correction,
  profileReason: "studentId",
  idempotencyKey: crypto.randomUUID(),
});
check("Student card correction is registered with context", out.r.status === 201 &&
  out.value.status === "created" && out.value.message.includes("Ошибка в студенческом билете"));
check("Correction request does not edit source profile", (await b.call("overview")).value.user.latin_name === "Maxim Krylov");

for (const [service, owner, other, format] of [
  ["study-period", a, b, "electronic"],
  ["tuition-payment", b, a, "electronic"],
  ["scholarship-amount", a, b, "paper"],
]) {
  out = await owner.call("requests", {
    service,
    format,
    organization: "По месту требования",
    idempotencyKey: crypto.randomUUID(),
  });
  check(`${service}: new documents require staff review`, out.r.status === 201 && out.value.status === "created" &&
    (service === "study-period" || out.value.department === "Бухгалтерия"));
  const request = `requests/${out.value.id}`;
  await office.call(`${request}/status`, { expectedStatus: "created", status: "working" });
  out = await office.call(`${request}/status`, { expectedStatus: "working", status: "ready" });
  check(`${service}: worker can issue the sample`, out.r.status === 200 && out.value.status === "ready");
  const pdf = await owner.call(`${request}/document`);
  const sig = await owner.call(`${request}/signature`);
  check(`${service}: signed PDF is available to the owner`, pdf.r.status === 200 &&
    Buffer.from(pdf.value).subarray(0, 5).toString() === "%PDF-" &&
    sig.r.status === 200 && sig.value.length > 0);
  check(`${service}: unrelated student can't download it`, (await other.call(`${request}/document`)).r.status === 404);
}
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
