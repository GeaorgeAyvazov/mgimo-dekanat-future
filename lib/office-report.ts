export type OfficeReportRow = {
  service: string;
  format: string;
  status: string;
  created_at: string;
  due_at: string;
  ready_at?: string | null;
};

export type ReportPeriod = {
  from: string;
  to: string;
  service: string;
};

const moscowDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + "T00:00:00Z");
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}

export function recentReportPeriod(today: string): ReportPeriod {
  const from = new Date(today + "T00:00:00Z");
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: today, service: "" };
}

function parseEventTime(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function newTotals() {
  return {
    received: 0,
    prepared: 0,
    issued: 0,
    awaitingPickup: 0,
    processing: 0,
    cancelled: 0,
    onTime: 0,
    withDeadline: 0,
    durations: [] as number[],
  };
}

type Totals = ReturnType<typeof newTotals>;

type ReportOutcome = {
  prepared: boolean;
  issued: boolean;
  awaitingPickup: boolean;
  processing: boolean;
  cancelled: boolean;
  duration: number | null;
  onTime: boolean | null;
};

function outcome(row: OfficeReportRow, created: number): ReportOutcome {
  const paper = row.format === "paper";
  const prepared = row.status === "ready" || row.status === "issued";
  const readyAt = prepared ? parseEventTime(row.ready_at) : null;
  const dueAt = parseEventTime(row.due_at);
  const actualReady = readyAt !== null && readyAt >= created ? readyAt : null;
  const issued = paper && row.status === "issued";
  return {
    prepared,
    issued,
    awaitingPickup: paper && row.status === "ready",
    processing: ["created", "working", "needs_info"].includes(row.status),
    cancelled: row.status === "cancelled",
    duration: actualReady === null ? null : (actualReady - created) / 60000,
    onTime:
      actualReady !== null && dueAt !== null && dueAt >= created
        ? actualReady <= dueAt
        : null,
  };
}

function add(totals: Totals, result: ReportOutcome) {
  totals.received += 1;
  if (result.prepared) totals.prepared += 1;
  if (result.issued) totals.issued += 1;
  if (result.awaitingPickup) totals.awaitingPickup += 1;
  if (result.processing) totals.processing += 1;
  if (result.cancelled) totals.cancelled += 1;
  if (result.duration !== null) totals.durations.push(result.duration);
  if (result.onTime !== null) {
    totals.withDeadline += 1;
    if (result.onTime) totals.onTime += 1;
  }
}

function summarize(totals: Totals) {
  const { durations, ...counts } = totals;
  durations.sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  let medianMinutes: number | null = null;
  if (durations.length) {
    medianMinutes = durations.length % 2
      ? durations[middle]
      : (durations[middle - 1] + durations[middle]) / 2;
  }
  return { ...counts, durationSample: durations.length, medianMinutes };
}

export function buildOfficeReport(
  rows: readonly OfficeReportRow[],
  period: ReportPeriod,
) {
  const total = newTotals();
  const groups = new Map<string, Totals>();

  if (
    isReportDate(period.from) &&
    isReportDate(period.to) &&
    period.from <= period.to
  ) {
    for (const row of rows) {
      if (period.service && row.service !== period.service) continue;
      const created = parseEventTime(row.created_at);
      if (created === null) continue;
      const day = moscowDay.format(created);
      if (day < period.from || day > period.to) continue;
      const result = outcome(row, created);
      const group = groups.get(row.service) ?? newTotals();
      add(total, result);
      add(group, result);
      groups.set(row.service, group);
    }
  }

  const byService = [...groups].map(([service, group]) => ({
    service,
    ...summarize(group),
  }));
  byService.sort(
    (a, b) => b.received - a.received || a.service.localeCompare(b.service),
  );
  return { total: summarize(total), byService };
}

type Report = ReturnType<typeof buildOfficeReport>;
type ReportNumbers = Report["total"];

export function percentInTime(counts: ReportNumbers) {
  return counts.withDeadline ? counts.onTime / counts.withDeadline : null;
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  if (typeof value === "number") return String(value).replace(".", ",");
  const safe = /^\s*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function officeReportCsv(
  report: Report,
  period: ReportPeriod,
  serviceLabel: (id: string) => string,
) {
  function dataRow(label: string, counts: ReportNumbers) {
    const ratio = percentInTime(counts);
    return [
      period.from,
      period.to,
      label,
      counts.received,
      counts.prepared,
      counts.issued,
      counts.awaitingPickup,
      counts.processing,
      counts.cancelled,
      counts.medianMinutes === null
        ? null
        : Math.round(counts.medianMinutes * 10) / 10,
      counts.durationSample,
      counts.onTime,
      counts.withDeadline,
      ratio === null ? null : Math.round(ratio * 1000) / 10,
    ];
  }
  const rows = [
    [
      "Подача с (МСК)",
      "Подача по (МСК)",
      "Услуга",
      "Поступило",
      "Результат готов",
      "Бумажных выдано",
      "Бумажных к выдаче",
      "На обработке",
      "Отменено",
      "Медиана до готовности, мин",
      "Заявок с измеренным временем",
      "Готово в срок",
      "Готовых с измеренным сроком",
      "Доля готовых в срок, %",
    ],
    dataRow("Итого", report.total),
    ...report.byService.map((row) => dataRow(serviceLabel(row.service), row)),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(";")).join("\r\n") +
    "\r\n"
  );
}
