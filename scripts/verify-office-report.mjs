import assert from "node:assert/strict";
import {
  buildOfficeReport,
  isReportDate,
  officeReportCsv,
  percentInTime,
  recentReportPeriod,
} from "../lib/office-report.ts";

const period = { from: "2026-11-13", to: "2026-11-13", service: "" };
const base = {
  service: "enrollment-ru",
  format: "electronic",
  status: "ready",
  created_at: "2026-11-12T21:00:00.000Z",
  due_at: "2026-11-12T22:00:00.000Z",
  ready_at: "2026-11-12T22:00:00.000Z",
};

const report = buildOfficeReport(
  [
    base,
    { ...base, status: "issued", format: "paper", ready_at: "2026-11-12T23:00:00.000Z" },
    { ...base, format: "paper", ready_at: null },
    { ...base, service: "question", status: "needs_info" },
    { ...base, service: "question", status: "cancelled" },
    { ...base, created_at: "2026-11-12T20:59:59.999Z" },
    { ...base, created_at: "2026-11-13T21:00:00.000Z" },
  ],
  period,
);
assert.deepEqual(report.total, {
  received: 5,
  prepared: 3,
  issued: 1,
  awaitingPickup: 1,
  processing: 1,
  cancelled: 1,
  onTime: 1,
  withDeadline: 2,
  durationSample: 2,
  medianMinutes: 90,
});
assert.equal(percentInTime(report.total), 0.5);

const unknown = buildOfficeReport(
  [{ ...base, ready_at: "2026-11-12T20:59:59.999Z" }],
  period,
);
assert.equal(unknown.total.prepared, 1);
assert.equal(unknown.total.medianMinutes, null);
assert.equal(percentInTime(unknown.total), null);
const missingDeadline = buildOfficeReport([{ ...base, due_at: "" }], period);
assert.equal(missingDeadline.total.medianMinutes, 60);
assert.equal(percentInTime(missingDeadline.total), null);

const filtered = buildOfficeReport(
  [base, { ...base, service: "question", status: "working" }],
  { ...period, service: "question" },
);
assert.equal(filtered.total.received, 1);
assert.equal(filtered.total.prepared, 0);
assert.equal(filtered.byService[0].service, "question");
assert.equal(buildOfficeReport([base], { ...period, from: "2026-11-14" }).total.received, 0);
assert.equal(isReportDate("2026-02-30"), false);
assert.deepEqual(recentReportPeriod("2026-11-13"), {
  from: "2026-10-15",
  to: "2026-11-13",
  service: "",
});

const csv = officeReportCsv(report, period, (id) =>
  id === "question" ? '=1+2' : 'Справка; "обучение"',
);
assert.equal(csv.charCodeAt(0), 0xfeff);
assert.ok(csv.includes('"Справка; ""обучение"""'));
assert.ok(csv.includes('"\'=1+2"'));
assert.equal(csv.trimEnd().split("\r\n").length, 4);
assert.ok(!csv.includes(base.ready_at));
console.log("Отчёт сотрудника: границы периода, итоги, фактические сроки, фильтр и CSV проверены");
