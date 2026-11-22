import type { Grade } from "./catalog";

export const MGIMO_GRADING_SOURCE =
  "https://mgimo.ru/upload/2025/09/pamyatka-studentu.pdf#page=23";

export const MGIMO_GRADE_BANDS = [
  {
    minimum: 90,
    range: "90–100",
    ects: "A",
    label: "Отлично",
    tone: "excellent",
  },
  {
    minimum: 82,
    range: "82–89",
    ects: "B",
    label: "Хорошо",
    tone: "good",
  },
  {
    minimum: 75,
    range: "75–81",
    ects: "C",
    label: "Хорошо",
    tone: "good",
  },
  {
    minimum: 67,
    range: "67–74",
    ects: "D",
    label: "Удовлетворительно",
    tone: "satisfactory",
  },
  {
    minimum: 60,
    range: "60–66",
    ects: "E",
    label: "Удовлетворительно",
    tone: "satisfactory",
  },
  {
    minimum: 0,
    range: "Менее 60",
    ects: "F",
    label: "Неудовлетворительно",
    tone: "unsatisfactory",
  },
] as const;

export type GradeDisplayScale = 100 | 10;
type AssessmentStatus = "passed" | "failed" | "pending";

function isValidScore(score: number | null): score is number {
  return score !== null && Number.isFinite(score) && score >= 0 && score <= 100;
}

export function getMgimoGradeBand(score: number | null) {
  if (!isValidScore(score)) return null;

  return MGIMO_GRADE_BANDS.find((band) => score >= band.minimum) ?? null;
}

export function toDisplayScore(score: number | null, scale: GradeDisplayScale) {
  if (!isValidScore(score)) return null;

  // The ten-point view is a proportional display of the original score.
  return scale === 10 ? score / 10 : score;
}

export function getAssessmentStatus(
  grade: Pick<Grade, "result">,
): AssessmentStatus {
  switch (grade.result.trim().toLowerCase().replaceAll("ё", "е")) {
    case "зачтено":
    case "отлично":
    case "хорошо":
    case "удовлетворительно":
      return "passed";
    case "не зачтено":
    case "незачтено":
    case "неудовлетворительно":
      return "failed";
    default:
      return "pending";
  }
}

export function summarizeGrades(grades: readonly Grade[]) {
  const totals = { passed: 0, failed: 0, pending: 0 };
  let exams = 0;
  let sum = 0;

  for (const grade of grades) {
    totals[getAssessmentStatus(grade)]++;

    if (grade.type === "Экзамен" && isValidScore(grade.score)) {
      exams++;
      sum += grade.score;
    }
  }

  return { ...totals, exams, average: exams ? sum / exams : null };
}
