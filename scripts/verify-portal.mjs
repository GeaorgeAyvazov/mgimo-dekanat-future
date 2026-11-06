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
  let cookie = "";
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
          ...(cookie ? { Cookie: cookie } : {}),
          ...options.headers,
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      const set = r.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
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
  out.value.notices.some((n) => !n.read),
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
