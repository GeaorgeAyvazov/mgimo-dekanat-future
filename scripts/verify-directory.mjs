import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { findEmployees } from "../lib/employees.ts";

const base = process.env.PORTAL_TEST_URL || "http://127.0.0.1:5173";
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}
function client() {
  const cookies = new Map();
  return async (path, data) => {
    const response = await fetch(`${base}/api/portal/${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        ...(data
          ? {
              Origin: base,
              "Content-Type": "application/json",
              "X-Dekanat-Request": "1",
            }
          : {}),
        ...(cookies.size ? { Cookie: [...cookies.values()].join("; ") } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    for (const entry of response.headers.getSetCookie()) {
      const pair = entry.split(";")[0];
      cookies.set(pair.split("=")[0], pair);
    }
    return {
      status: response.status,
      value: await response.json(),
      headers: response.headers,
    };
  };
}
const anonymous = client(),
  student = client(),
  otherStudent = client(),
  office = client();
check(
  "Anonymous directory denied",
  (await anonymous("employees")).status === 401,
);
check(
  "Anonymous employee profile denied",
  (await anonymous("employees/morozov")).status === 401,
);
for (const [call, login] of [
  [student, "alina.demo"],
  [otherStudent, "maxim.demo"],
  [office, "office.demo"],
]) {
  check(
    `${login} login`,
    (await call("login", { login, password: "Student2026!" })).status === 200,
  );
}
const directory = await student("employees");
check(
  "Authenticated directory loads",
  directory.status === 200 && directory.value.employees.length === 8,
);
check(
  "No caching of authenticated responses",
  directory.headers.get("cache-control") === "no-store",
);
const people = directory.value.employees;
check(
  "Professional fields without account secrets",
  people.every(
    (person) =>
      !Object.keys(person).some((key) =>
        /password|session|owner_id|login|token/i.test(key),
      ),
  ),
);
check(
  "Fictional contacts use reserved domain",
  people.every(
    (person) =>
      person.email.endsWith("@example.test") &&
      person.phone.startsWith("+7 (000)"),
  ),
);
check(
  "Every profile explains responsibilities",
  people.every(
    (person) =>
      person.responsibilities.length > 0 &&
      person.department &&
      person.room &&
      person.hours,
  ),
);
check(
  "Find responsible person without knowing a name",
  findEmployees(people, "пересдача")[0]?.id === "morozov",
);
check(
  "Case-insensitive name and surname search",
  findEmployees(people, "САВИН олег")[0]?.id === "savin",
);
check(
  "Student vocabulary: academic leave",
  findEmployees(people, "академ")[0]?.id === "sokolova",
);
check(
  "Student vocabulary: access",
  findEmployees(people, "доступ").some((person) => person.id === "savin"),
);
check(
  "Whitespace and ё/е normalized",
  JSON.stringify(
    findEmployees(people, "  ЗАЧЁТ ").map((person) => person.id),
  ) ===
    JSON.stringify(findEmployees(people, "зачет").map((person) => person.id)),
);
check(
  "Search and department work together",
  findEmployees(people, "оплата", "Договорной отдел").length === 1 &&
    findEmployees(people, "оплата", "Сервисный центр").length === 0,
);
check(
  "All search words must match",
  findEmployees(people, "Савин пересдача").length === 0,
);
check(
  "Unknown query produces empty results",
  findEmployees(people, "несуществующийсотрудник").length === 0,
);
check(
  "Other student sees same professional directory",
  JSON.stringify((await otherStudent("employees")).value) ===
    JSON.stringify(directory.value),
);
check(
  "Employee role can use directory",
  (await office("employees")).status === 200,
);
check(
  "Employee profile deep link",
  (await student("employees/morozov")).value.name === "Морозов Павел Андреевич",
);
check(
  "Unknown employee returns 404",
  (await student("employees/not-a-person")).status === 404,
);
check(
  "Invalid nested employee route returns 404",
  (await student("employees/morozov/secret")).status === 404,
);
if (process.env.PORTAL_DIRECTORY_WRITE_CHECK === "1") {
  const created = await otherStudent("requests", {
    service: "question",
    format: "electronic",
    topic: "academic",
    message: "Учебная проверка: подскажите порядок пересдачи дисциплины.",
    idempotencyKey: crypto.randomUUID(),
  });
  check(
    "Directory appeal preserves server routing",
    created.status === 201 &&
      created.value.department === "Учебный офис филиала",
  );
  check(
    "Directory appeal persists for owner",
    (await otherStudent(`requests/${created.value.id}`)).value.topic ===
      "academic",
  );
  check(
    "Directory appeal remains private",
    (await student(`requests/${created.value.id}`)).status === 404,
  );
}
mkdirSync("outputs", { recursive: true });
const report =
  process.env.PORTAL_DIRECTORY_REPORT || "outputs/directory-checks.json";
writeFileSync(
  report,
  JSON.stringify({ base, passed: checks.length, checks }, null, 2),
);
console.log(JSON.stringify({ base, passed: checks.length, report }));
