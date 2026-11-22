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
    return {
      status: response.status,
      value: response.headers.get("content-type")?.includes("text/calendar")
        ? (await response.text()).replace(/\r\n /g, "")
        : await response.json(),
    };
  };
}
const anon = client(),
  a = client(),
  b = client();
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const friday = new Date(today + "T12:00:00Z");
friday.setUTCDate(friday.getUTCDate() - ((friday.getUTCDay() + 2) % 7));
const date = friday.toISOString().slice(0, 10);
const path = "room-calendar?room=b3%3A3018&date=" + date;
const available = (start, end) =>
  "room-availability?" + new URLSearchParams({ date, start, end });
check(
  "Anonymous availability denied",
  (await anon(available("09:00", "10:20"))).status === 401,
);
check("Anonymous room calendar denied", (await anon(path)).status === 401);
for (const [call, login] of [
  [a, "alina.demo"],
  [b, "maxim.demo"],
])
  check(
    login + " login",
    (await call("login", { login, password: "Student2026!" })).status === 200,
  );
const result = await a(path);
check("Room day loads", result.status === 200);
check(
  "Synthetic data explicitly marked",
  result.value.source === "demo" && result.value.timezone === "Europe/Moscow",
);
const entries = result.value.lessons;
check(
  "Transferred lesson shows subject and group",
  entries.some(
    (entry) =>
      entry.start === "10:40" &&
      entry.end === "12:00" &&
      entry.subject === "Международные отношения" &&
      entry.group === "МО-21",
  ),
);
check(
  "Shared room contains another faculty with different times",
  entries.some(
    (entry) =>
      entry.start === "12:10" &&
      entry.end === "13:40" &&
      entry.subject === "Международное право" &&
      entry.group === "МП-21",
  ),
);
check(
  "Room lessons are ordered with no overlaps",
  entries.every(
    (entry, i) =>
      entry.start < entry.end && (!i || entries[i - 1].end <= entry.start),
  ),
);
check(
  "Other account sees same room schedule",
  JSON.stringify((await b(path)).value.lessons) === JSON.stringify(entries),
);
check(
  "Other students' personal data not disclosed",
  !/Алина|Максим|Соколов|student_group|owner_id|password|grades|login/.test(
    JSON.stringify(result.value),
  ),
);
for (const [start, end, expected] of [
  ["10:00", "10:50", false],
  ["12:00", "12:10", true],
  ["12:00", "12:11", false],
  ["13:30", "13:55", false],
]) {
  const response = await a(available(start, end));
  check(
    "Shared room availability " + start + "–" + end,
    response.status === 200 &&
      response.value.source === "demo" &&
      response.value.rooms.some((room) => room.key === "b3:3018") === expected,
  );
}
const results = await a(available("12:00", "12:10"));
check(
  "Search includes rooms across the campus",
  new Set(results.value.rooms.map(({ key }) => key.split(":")[0][0])).size >= 4,
);
check(
  "Invalid interval rejected",
  (await a(available("12:00", "12:00"))).status === 400,
);
check(
  "Invalid date rejected",
  (await a("room-calendar?room=b2%3A2009&date=2026-02-30")).status === 400,
);
check(
  "Out-of-range date rejected",
  (await a("room-calendar?room=b2%3A2009&date=2030-01-01")).status === 400,
);
check(
  "Unknown room rejected",
  (await a("room-calendar?room=not-a-room&date=" + date)).status === 404,
);
check(
  "Non-classroom rejected",
  (await a("room-calendar?room=a1%3Aa1_dining_hall&date=" + date)).status ===
    404,
);
check(
  "Default date is Moscow today",
  (await a("room-calendar?room=b2%3A2009")).value.date === today,
);
const overview = (await a("overview")).value;
const changed = overview.notices.find((notice) => notice.type === "schedule" && notice.lessonId);
check("Room change targets a dated personal lesson", changed?.lessonDate === "2026-11-06" &&
  overview.lessons.some((lesson) => lesson.id === changed.lessonId && lesson.changeDate === changed.lessonDate));
const group = overview.user.student_group;
const datedGroup = (week, code = group) => "group-schedule?" + new URLSearchParams({ group: code, week });
for (const [week, friday, room, moved] of [
  ["2026-10-26", "2026-10-30", "2011", false],
  ["2026-11-02", "2026-11-06", "3018", true],
  ["2026-11-09", "2026-11-13", "3018", false],
]) {
  const timetable = (await a(datedGroup(week))).value;
  const lesson = timetable.lessons.find((item) => item.id === changed.lessonId);
  check("Group timetable uses the room for " + friday, timetable.week === week &&
    timetable.source === "demo" && timetable.timezone === "Europe/Moscow" &&
    lesson.room === room && Boolean(lesson.change) === moved);
  const params = new URLSearchParams({ week });
  const personalCalendar = (await a("schedule-calendar?" + params)).value;
  params.set("group", group);
  const publicGroupCalendar = (await b("schedule-calendar?" + params)).value;
  const eventId = encodeURIComponent(friday + "-" + lesson.id);
  for (const [name, content] of [["personal", personalCalendar], ["group", publicGroupCalendar]]) {
    const event = content.split("BEGIN:VEVENT").find((item) => item.includes("UID:" + eventId + "@"))?.split("END:VEVENT")[0] ?? "";
    check(name + " calendar matches lesson and Moscow time on " + friday,
      event.includes("DTSTART:" + friday.replaceAll("-", "") + "T074000Z") &&
      event.includes("LOCATION:Аудитория " + room + "\r\n") &&
      event.includes("Демонстрационное занятие") && event.includes("Ранее:") === moved);
  }
  if (Math.abs(Date.parse(friday) - Date.parse(today)) <= 90 * 86400000) {
    const location = (await a("room-calendar?" + new URLSearchParams({ date: friday, room: lesson.roomId }))).value;
    check("Room timetable matches dated group occurrence on " + friday,
      location.lessons.some((item) => item.group === group && item.start === lesson.start));
  }
}
check("Every group advertised in shared-room example is available", (await a(datedGroup("2026-11-02", "МП-21"))).value.lessons.some(
  (lesson) => lesson.roomId === "b3:3018" && lesson.day === 4 && lesson.start === "12:10",
));
check("Unknown group cannot receive a fallback timetable", (await a(datedGroup("2026-11-02", "Нет такой группы"))).status === 404);
check("Invalid group week rejected", (await a(datedGroup("2026-11-03"))).status === 400);
const language = "27-англ/фр (2МО-07)";
const selected = new URLSearchParams({group:"2МО-07", week:"2026-11-23", stream:language});
const filtered = (await a("group-schedule?" + selected)).value;
check("Tuesday 10:35 contains exactly one seminar for subgroup 27", filtered.lessons.filter(l => l.day === 1 && l.start === "10:35").length === 1 &&
  filtered.lessons.some(l => l.day === 1 && l.start === "10:35" && l.stream === language && l.room === "2116"));
check("Common lessons and the second foreign language remain", filtered.lessons.some(l => l.stream === "2МО-07") &&
  filtered.lessons.some(l => l.stream === language && l.subject === "французский второй"));
check("Wrong academic group cannot save this subgroup", (await a("my-schedule",{group:"2МЭО-01",stream:language})).status === 400);
const original = overview.user;
check("Student saves language subgroup", (await a("my-schedule",{group:"2МО-07",stream:language})).status === 200);
try {
  check("Preference belongs to the current student", (await a("overview")).value.user.language_stream === language &&
    (await b("overview")).value.user.language_stream !== language);
  const personal = (await a("schedule-calendar?week=2026-11-23")).value;
  check("Personal calendar excludes other language subgroups", personal.split("BEGIN:VEVENT").length - 1 === filtered.lessons.length &&
    personal.includes(language) && !personal.includes("25-англ/итал"));
} finally {
  await a("my-schedule",{group:original.timetable_group || "",stream:original.language_stream || ""});
}
mkdirSync("outputs", { recursive: true });
const report =
  process.env.PORTAL_CALENDAR_REPORT || "outputs/room-calendar-checks.json";
writeFileSync(
  report,
  JSON.stringify({ base, passed: checks.length, checks }, null, 2),
);
console.log(JSON.stringify({ base, passed: checks.length, report }));
