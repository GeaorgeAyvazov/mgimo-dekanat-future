"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CircleAlert,
  UserRound,
} from "lucide-react";
import { dateLabel, type Grade } from "@/lib/catalog";
import {
  getAssessmentStatus,
  getMgimoGradeBand,
  MGIMO_GRADE_BANDS,
  MGIMO_GRADING_SOURCE,
  summarizeGrades,
  toDisplayScore,
  type GradeDisplayScale,
} from "@/lib/grading";

const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

export function GradeOverview({ grades, onExamRequest }: {
  grades: Grade[];
  onExamRequest?: (assessment: number | "unlisted") => void;
}) {
  const [scale, setScale] = useState<GradeDisplayScale>(100);
  const summary = summarizeGrades(grades);
  const average = toDisplayScore(summary.average, scale);
  const complete = grades.length > 0 && summary.passed === grades.length;
  const hasExams = grades.some((grade) => grade.type === "Экзамен");
  return (
    <>
      <div className="grade-overview">
        <section className="panel average-card">
          <span className="eyebrow">СРЕДНИЙ БАЛЛ ЭКЗАМЕНОВ</span>
          <strong>
            {average === null ? "—" : number.format(average)}
            <small>/ {scale}</small>
          </strong>
          <p>Учтено экзаменов — {summary.exams}</p>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${summary.average ?? 0}%` }} />
          </div>
        </section>
        <section className="panel session-card">
          <span className={complete ? "success-icon" : "service-icon"}>
            {complete ? <CheckCircle2 size={26} /> : <Clock3 size={25} />}
          </span>
          <div>
            <h2>
              {complete
                ? "Сессия закрыта"
                : grades.length
                  ? "Результаты сессии"
                  : "Пока нет результатов"}
            </h2>
            {grades.length > 0 && (
              <p>
                Сдано {summary.passed} из {grades.length}
                {summary.failed > 0 && ` · Не сдано ${summary.failed}`}
                {summary.pending > 0 && ` · Ожидается ${summary.pending}`}
              </p>
            )}
            {onExamRequest && (
              <button className="text-button grade-request" onClick={() => onExamRequest("unlisted")}>
                {hasExams ? "Обратиться по другому экзамену" : "Подать обращение по экзамену"}
              </button>
            )}
          </div>
        </section>
      </div>
      <div className="section-heading grades-heading grades-scale-heading">
        <h2>Результаты по дисциплинам</h2>
        <div
          className="filter-row grade-scales"
          role="group"
          aria-label="Отображение баллов"
        >
          {([100, 10] as const).map((value) => (
            <button
              key={value}
              className={scale === value ? "filter active" : "filter"}
              aria-pressed={scale === value}
              onClick={() => setScale(value)}
            >
              Из {value}
            </button>
          ))}
        </div>
      </div>
      {scale === 10 && (
        <p className="grade-scale-note">
          Для отображения из 10 исходный балл делится на 10.
        </p>
      )}
      <div className="grade-list">
        {grades.map((grade, index) => {
          const score = toDisplayScore(grade.score, scale);
          const band = getMgimoGradeBand(grade.score);
          const status = getAssessmentStatus(grade);
          return (
            <article
              className="panel grade-card"
              key={`${grade.subject}-${grade.type}-${grade.date}`}
            >
              <div>
                <span className="lesson-kind">
                  {grade.type}
                  {grade.date && ` · ${dateLabel(grade.date + "T12:00:00Z")}`}
                </span>
                <h3>{grade.subject}</h3>
                <p>
                  <UserRound size={14} />
                  {grade.teacher}
                </p>
                {onExamRequest && grade.type === "Экзамен" && (
                  <button className="text-button grade-request" onClick={() => onExamRequest(index)}
                    aria-label={`Вопрос по экзамену: ${grade.subject}`}>
                    Вопрос по экзамену
                  </button>
                )}
              </div>
              <div className="grade-result">
                {score !== null && (
                  <strong className={band?.tone}>
                    {number.format(score)}
                    <small>/{scale}</small>
                  </strong>
                )}
                <span
                  className={
                    status === "passed" && score === null
                      ? "grade-pass"
                      : status === "failed"
                        ? "grade-failed"
                        : undefined
                  }
                >
                  {score === null && status === "passed" && (
                    <CheckCircle2 size={19} />
                  )}
                  {status === "failed" && <CircleAlert size={16} />}
                  {status === "pending" ? "Ожидается" : grade.result}
                  {band && ` · ${band.ects}`}
                </span>
                {scale === 10 && grade.score !== null && (
                  <span>{grade.score} из 100</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <details className="panel grade-scale-help">
        <summary>Шкала МГИМО и ECTS</summary>
        <ul>
          {MGIMO_GRADE_BANDS.map((band) => (
            <li key={band.ects}>
              <strong>{band.ects}</strong> · {band.range} · {band.label}
            </li>
          ))}
        </ul>
        <a
          className="text-button"
          href={MGIMO_GRADING_SOURCE}
          target="_blank"
          rel="noopener noreferrer"
        >
          Памятка МГИМО <ArrowUpRight size={14} />
        </a>
      </details>
    </>
  );
}
