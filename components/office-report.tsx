"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { services } from "@/lib/catalog";
import {
  buildOfficeReport,
  isReportDate,
  officeReportCsv,
  percentInTime,
  recentReportPeriod,
  type OfficeReportRow,
} from "@/lib/office-report";
import styles from "./office-report.module.css";

const serviceLabels = new Map<string, string>(
  services.map((service) => [
    service.id,
    service.id === "enrollment-ru" || service.id === "enrollment-en"
      ? `${service.title} (${service.language.toLowerCase()})`
      : service.title,
  ]),
);

const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("ru-RU", {
  style: "percent",
  maximumFractionDigits: 1,
});

function serviceLabel(id: string) {
  return serviceLabels.get(id) ?? id;
}

function timeLabel(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes >= 1440) return `${number.format(minutes / 1440)} дн.`;
  if (minutes >= 60) return `${number.format(minutes / 60)} ч`;
  if (minutes >= 1) return `${number.format(minutes)} мин`;
  return "< 1 мин";
}

export function OfficeReport({
  rows,
  today,
}: {
  rows: readonly OfficeReportRow[];
  today: string;
}) {
  const [period, setPeriod] = useState(() => recentReportPeriod(today));
  const valid =
    isReportDate(period.from) &&
    isReportDate(period.to) &&
    period.from <= period.to &&
    period.to <= today;
  const report = useMemo(() => buildOfficeReport(rows, period), [rows, period]);
  const options = useMemo(
    () =>
      [...new Set(rows.map((row) => row.service))]
        .map((id) => ({ id, label: serviceLabel(id) }))
        .sort((a, b) => a.label.localeCompare(b.label, "ru")),
    [rows],
  );

  function downloadCsv() {
    if (!valid || !report.total.received) return;
    const blob = new Blob([officeReportCsv(report, period, serviceLabel)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `office-report-${period.from}-${period.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const { total } = report;
  const inTime = percentInTime(total);
  const cards = [
    { label: "Поступило", value: total.received },
    { label: "Результат готов", value: total.prepared },
    { label: "На обработке", value: total.processing },
    { label: "Отменено", value: total.cancelled },
    { label: "Бумажных к выдаче", value: total.awaitingPickup },
    { label: "Бумажных выдано", value: total.issued },
    {
      label: "Медиана до готовности",
      value: timeLabel(total.medianMinutes),
      detail: `Заявок с измеренным временем: ${total.durationSample}`,
    },
    {
      label: "Готово в срок",
      value: inTime === null ? "—" : percent.format(inTime),
      detail: `В срок: ${total.onTime} из ${total.withDeadline} со сроком и временем готовности`,
    },
  ];

  return (
    <div className={styles.report}>
      <section className={`panel ${styles.filters}`} aria-label="Фильтры отчёта">
        <div className={styles.fields}>
          <label>
            Дата подачи с
            <input
              type="date"
              value={period.from}
              max={today}
              onChange={(event) =>
                setPeriod({ ...period, from: event.target.value })
              }
            />
          </label>
          <label>
            Дата подачи по
            <input
              type="date"
              value={period.to}
              max={today}
              onChange={(event) =>
                setPeriod({ ...period, to: event.target.value })
              }
            />
          </label>
          <label>
            Услуга
            <select
              value={period.service}
              onChange={(event) =>
                setPeriod({ ...period, service: event.target.value })
              }
            >
              <option value="">Все услуги</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={!valid || !total.received}
          onClick={downloadCsv}
        >
          <Download size={16} aria-hidden="true" />
          Скачать CSV
        </button>
      </section>
      {!valid ? (
        <p className="error" role="alert">
          Укажите обе даты. Дата начала должна быть не позже даты окончания, а
          дата окончания — не позже сегодняшней даты.
        </p>
      ) : !total.received ? (
        <p className={`panel ${styles.empty}`} role="status">
          За этот период по выбранной услуге обращений нет.
        </p>
      ) : (
        <>
          <dl className={styles.metrics}>
            {cards.map((card) => (
              <div className={styles.metric} key={card.label}>
                <dt>{card.label}</dt>
                <dd>
                  {typeof card.value === "number"
                    ? number.format(card.value)
                    : card.value}
                </dd>
                {card.detail && <dd className={styles.sample}>{card.detail}</dd>}
              </div>
            ))}
          </dl>
          <section className={`panel ${styles.breakdown}`}>
            <h2>По услугам</h2>
            <ul className={styles.services}>
              {report.byService.map((row) => {
                const ratio = percentInTime(row);
                return (
                  <li key={row.service}>
                    <h3>{serviceLabel(row.service)}</h3>
                    <dl className={styles.serviceStats}>
                      <div>
                        <dt>Поступило</dt>
                        <dd>{row.received}</dd>
                      </div>
                      <div>
                        <dt>Готово</dt>
                        <dd>{row.prepared}</dd>
                      </div>
                      <div>
                        <dt>Бумажных выдано</dt>
                        <dd>{row.issued}</dd>
                      </div>
                      <div>
                        <dt>В срок</dt>
                        <dd>{ratio === null ? "—" : percent.format(ratio)}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </section>
          <details className={`panel ${styles.method}`}>
            <summary>Как считаются показатели</summary>
            <p>
              Отчёт включает заявки, поданные в выбранные даты по московскому
              времени. Показатели отражают их состояние на момент загрузки.
            </p>
            <p>
              Медиана показывает время от подачи до зафиксированной готовности
              документа или ответа. Доля в срок учитывает заявки, у которых
              известны и срок, и фактическая готовность. Тире означает, что для
              расчёта нет данных.
            </p>
            <p>
              Бумажные документы к выдаче и уже выданные учитываются отдельно.
              CSV содержит сводные числа по услугам.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
