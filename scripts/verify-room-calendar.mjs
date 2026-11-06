import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.PORTAL_TEST_URL || "http://127.0.0.1:5173";
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}
function client() {
  const cookies = new Map();
  return async (path, data) => {
    const response = await fetch(base + "/api/portal/" + path, {
      method: data ? "POST" : "GET",
      headers: {
        ...(cookies.size ? { Cookie: [...cookies.values()].join("; ") } : {}),
        ...(data
          ? {
              Origin: base,
              "Content-Type": "application/json",
              "X-Dekanat-Request": "1",
            }
          : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    for (const entry of response.headers.getSetCookie()) {
      const pair = entry.split(";")[0];
      cookies.set(pair.split("=")[0], pair);
    }
    return { status: response.status, value: await response.json() };
  };
}
const anon = client(),
  a = client(),
  b = client();
const path = "room-calendar?room=b3%3A3018&date=2026-11-06";
check("Anonymous room calendar denied", (await anon(path)).status === 401);
for (const [call, login] of [
  [a, "alina.demo"],
  [b, "maxim.demo"],
])
  check(
    login + " login",
    (await call("login", { login, password: "Student2026!" })).status === 200,
  );
let result = await a(path);
check("Room day loads", result.status === 200);
check(
  "Synthetic data explicitly marked",
  result.value.source === "demo" && result.value.timezone === "Europe/Moscow",
);
const minutes = (value) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
check(
  "Whole day covered once without overlap",
  result.value.intervals[0].start === "08:00" &&
    result.value.intervals.at(-1).end === "21:00" &&
    result.value.intervals.every(
      (interval, index, all) =>
        minutes(interval.start) < minutes(interval.end) &&
        (!index || all[index - 1].end === interval.start),
    ),
);
check(
  "Transferred demo lesson is busy in room calendar",
  result.value.intervals.some(
    (interval) =>
      interval.state === "busy" &&
      minutes(interval.start) <= 640 &&
      minutes(interval.end) >= 720,
  ),
);
check(
  "Calendar contains both busy periods and free windows",
  result.value.intervals.some((interval) => interval.state === "free") &&
    result.value.intervals.some((interval) => interval.state === "busy"),
);
check(
  "Other account sees same room occupancy",
  JSON.stringify((await b(path)).value.intervals) ===
    JSON.stringify(result.value.intervals),
);
check(
  "Other students' personal data not disclosed",
  !/Алина|Максим|Соколов|student_group|owner_id|password|grades|login/.test(
    JSON.stringify(result.value),
  ),
);
check(
  "Repeated lookup stays stable",
  JSON.stringify((await a(path)).value.intervals) ===
    JSON.stringify(result.value.intervals),
);
check(
  "Invalid calendar date rejected",
  (await a("room-calendar?room=b2%3A2009&date=2026-02-30")).status === 400,
);
check(
  "Out-of-range calendar date rejected",
  (await a("room-calendar?room=b2%3A2009&date=2030-01-01")).status === 400,
);
check(
  "Unknown room rejected",
  (await a("room-calendar?room=not-a-room&date=2026-11-06")).status === 404,
);
check(
  "Non-classroom has no invented calendar",
  (await a("room-calendar?room=a1%3Aa1_dining_hall&date=2026-11-06")).status ===
    404,
);
result = await a("room-calendar?room=b2%3A2009");
check(
  "Default date is Moscow today",
  result.status === 200 && result.value.date === result.value.today,
);
const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).formatToParts(new Date(result.value.asOf));
const now =
  Number(parts.find((part) => part.type === "hour").value) * 60 +
  Number(parts.find((part) => part.type === "minute").value);
const current = result.value.intervals.find(
  (interval) => minutes(interval.start) <= now && minutes(interval.end) > now,
);
check(
  "Current state follows clock and exclusive interval end",
  result.value.current.state === (current?.state || "closed") &&
    (!current || result.value.current.until === current.end),
);
const tomorrow = new Date(result.value.today + "T12:00:00Z");
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
result = await a(
  "room-calendar?room=b2%3A2009&date=" + tomorrow.toISOString().slice(0, 10),
);
check(
  "Future date does not claim a current state",
  result.status === 200 && !result.value.current,
);
mkdirSync("outputs", { recursive: true });
const report =
  process.env.PORTAL_CALENDAR_REPORT || "outputs/room-calendar-checks.json";
writeFileSync(
  report,
  JSON.stringify({ base, passed: checks.length, checks }, null, 2),
);
console.log(JSON.stringify({ base, passed: checks.length, report }));
