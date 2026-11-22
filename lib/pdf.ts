import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fontBase64 } from "./pdf-font";
import { services, type Grade, type Case } from "./catalog";
import { getMgimoGradeBand } from "./grading";

export type DocumentStudent = {
  name: string;
  faculty: string;
  program: string;
  course: number;
  student_group: string;
  grades: string;
};

const titles: Record<string, string> = {
  "enrollment-ru": "СПРАВКА О ПОДТВЕРЖДЕНИИ ФАКТА ОБУЧЕНИЯ",
  "enrollment-en": "CERTIFICATE OF ENROLMENT",
  "transcript-en": "ACADEMIC TRANSCRIPT",
  "english-level": "ENGLISH PROFICIENCY CERTIFICATE",
};

// Fictional register records for the two demo students.
const demoEnrollment = {
  "МО-21": { order: "Д-2025/021", admitted: "2025-08-20", expected: "2029-06-30", englishLevel: "B2" },
  "БИ-31": { order: "Д-2024/031", admitted: "2024-08-21", expected: "2028-06-30", englishLevel: "B2" },
};

// Example receipts and awards for the fictional accounts only.
const demoTuition: Record<string, { contract: string; amount: string }> = {
  "student-maxim": { contract: "Д-ОБР-2024/031", amount: "499 000 руб. 00 коп." },
};
const demoScholarships: Record<string, { monthly: string; total: string }> = {
  "student-alina": { monthly: "5 100 руб. 00 коп.", total: "15 300 руб. 00 коп." },
};

const demoEnglish: Record<string, string> = {
  "Международные отношения": "International Relations",
  "Английский язык": "English",
  "Экономическая теория": "Economic Theory",
  "История дипломатии": "History of Diplomacy",
  "Право международных организаций": "Law of International Organizations",
  "Физическая культура": "Physical Education",
  "Бизнес-информатика": "Business Informatics",
  "Базы данных": "Databases",
  Менеджмент: "Management",
  Статистика: "Statistics",
  "Проектный практикум": "Project Workshop",
  Экзамен: "Exam",
  Зачёт: "Pass/fail",
  Отлично: "Excellent",
  Хорошо: "Good",
  Удовлетворительно: "Satisfactory",
  Неудовлетворительно: "Fail",
  Зачтено: "Pass",
  "Не зачтено": "Fail",
  "Факультет международных отношений": "School of International Relations",
  "Факультет управления и бизнеса": "School of Business and Management",
};

export async function certificate(
  row: Pick<Case, "id" | "owner_id" | "service" | "organization" | "latin_name" | "format">,
  student: DocumentStudent,
  preparedAt: string,
) {
  const service = services.find((s) => s.id === row.service)!;
  const en = ["enrollment-en", "transcript-en", "english-level"].includes(row.service);
  const transcript =
    row.service === "grades-ru" || row.service === "transcript-en" || row.service === "study-period";
  const enrollment = demoEnrollment[student.student_group as keyof typeof demoEnrollment];
  const localized = (value: string) =>
    en ? demoEnglish[value] || value : value;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    Uint8Array.from(atob(fontBase64), (c) => c.charCodeAt(0)),
    { subset: true },
  );
  const ink = rgb(0.09, 0.10, 0.12);
  const gray = rgb(0.31, 0.34, 0.38);
  const navy = rgb(0.08, 0.18, 0.34);
  const rule = rgb(0.75, 0.77, 0.80);
  const tint = rgb(0.95, 0.96, 0.97);
  const left = 49;
  const right = 546;
  const serial = row.id.toUpperCase();
  const dateFormat = new Intl.DateTimeFormat(en ? "en-GB" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
  const formattedDate = dateFormat.format(new Date(preparedAt));
  let page = doc.addPage([595.28, 841.89]);
  let y = 0;
  const draw = (
    value: string,
    x: number,
    top: number,
    size = 10,
    color = ink,
  ) => page.drawText(value, { x, y: top, size, font, color });
  const line = (top: number) =>
    page.drawLine({
      start: { x: left, y: top },
      end: { x: right, y: top },
      thickness: 0.65,
      color: rule,
    });
  function wrap(value: string, size: number, width: number) {
    const lines: string[] = [];
    let current = "";
    for (const word of value.trim().split(/\s+/)) {
      const next = current ? current + " " + word : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      current = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(current + char, size) > width) {
          lines.push(current);
          current = "";
        }
        current += char;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
  function paragraph(value: string, size = 11, color = ink) {
    for (const part of wrap(value, size, right - left)) {
      draw(part, left, y, size, color);
      y -= size + 6;
    }
  }
  function center(value: string, top: number, size: number, color = ink) {
    draw(value, (left + right - font.widthOfTextAtSize(value, size)) / 2, top, size, color);
  }
  function header(continued: boolean) {
    center(en ? "MGIMO UNIVERSITY" : "МГИМО МИД РОССИИ", 791, 18, navy);
    center(en ? "Moscow State Institute of International Relations (University)" : "Московский государственный институт международных отношений (университет)", 772, 9);
    center(en ? "of the Ministry of Foreign Affairs of the Russian Federation" : "Министерства иностранных дел Российской Федерации", 758, 9);
    center(en ? "Student Service Centre" : "Центр сервиса «Студент»", 736, 9, gray);
    line(721);
    draw(`${en ? "No." : "№"} ${serial}`, left, 702, 9);
    const date = `${en ? "Date" : "Дата"} ${formattedDate}`;
    draw(date, right - font.widthOfTextAtSize(date, 9), 702, 9);
    y = 661;
    const title = row.service === "grades-ru"
      ? "ВЫПИСКА ИЗ ЗАЧЁТНОЙ КНИЖКИ"
      : titles[row.service] || service.title.toUpperCase();
    for (const part of wrap(title, 17, right - left)) {
      center(part, y, 17, navy);
      y -= 23;
    }
    if (continued) {
      draw(en ? "Continued" : "Продолжение", left, y, 10, gray);
      y -= 20;
    }
    y -= 15;
  }
  function field(label: string, value: string) {
    const lines = wrap(value, 10.5, 333);
    draw(label, left, y, 10, gray);
    for (const part of lines) {
      draw(part, 212, y, 10.5);
      y -= 16;
    }
    y -= 5;
  }
  function tableHeader() {
    page.drawRectangle({
      x: left,
      y: y - 6,
      width: right - left,
      height: 22,
      color: tint,
    });
    draw(en ? "Course title" : "Дисциплина", left + 8, y + 2, 9);
    draw(en ? "Assessment" : "Контроль", 255, y + 2, 8.5);
    draw(en ? "Score / 100" : "Балл / 100", 318, y + 2, 8.5);
    draw("ECTS", 372, y + 2, 8.5);
    draw(en ? "Result" : "Результат", 405, y + 2, 8.5);
    draw(en ? "Date" : "Дата", 482, y + 2, 8.5);
    y -= 22;
  }
  header(false);
  if (row.service.startsWith("enrollment")) {
    paragraph(en
      ? "This is to certify that the student named below is enrolled at MGIMO University as of the date of issue."
      : "Настоящая справка подтверждает, что указанный ниже студент обучается в МГИМО МИД России на дату её выдачи.", 11);
    y -= 11;
  }
  field(
    en ? "Student" : "Фамилия, имя, отчество",
    en ? row.latin_name : student.name,
  );
  field(en ? "School" : "Факультет", localized(student.faculty));
  field(en ? "Programme" : "Направление", localized(student.program));
  field(
    en ? "Year / group" : "Курс / группа",
    `${student.course} / ${student.student_group}`,
  );
  if (row.service.startsWith("enrollment") && enrollment) {
    field(en ? "Mode of study" : "Форма обучения", en ? "Full-time" : "Очная");
    const order = enrollment.order.replace(/^Д-/, en ? "D-" : "Д-");
    const orderDate = dateFormat.format(new Date(enrollment.admitted));
    field(en ? "Enrolment order" : "Приказ о зачислении", en ? `No. ${order}, dated ${orderDate}` : `№ ${order} от ${orderDate}`);
    field(en ? "Expected completion" : "Ожидаемое окончание", dateFormat.format(new Date(enrollment.expected)));
  }
  if (row.service === "english-level") {
    y -= 10;
    paragraph("The English proficiency result recorded for the student in the sample academic record is shown below.");
    y -= 8;
    field("Language assessed", "English");
    field("CEFR level", enrollment?.englishLevel || "Not recorded");
  }
  if (row.service === "study-period") {
    field("Начало обучения", enrollment ? dateFormat.format(new Date(enrollment.admitted)) : "Нет сведений");
    field("Сведения по состоянию на", formattedDate);
  }
  if (row.service === "tuition-payment") {
    const payment = demoTuition[row.owner_id];
    field("Учебный год", "2025/2026");
    if (payment) {
      field("Учебный договор", `№ ${payment.contract}`);
      field("Поступило за обучение", payment.amount);
    } else {
      paragraph("В демонстрационном реестре нет оплат за указанный учебный год.");
    }
  }
  if (row.service === "scholarship-amount") {
    const award = demoScholarships[row.owner_id];
    field("Период начислений", "Сентябрь — ноябрь 2025 г.");
    if (award) {
      field("Вид стипендии", "Академическая");
      field("Ежемесячное начисление", award.monthly);
      field("Начислено за период", award.total);
    } else {
      paragraph("В демонстрационном реестре нет начислений за указанный период.");
    }
  }
  if (row.organization) {
    field(en ? "For submission to" : "Место предоставления", row.organization);
  } else if (row.service.startsWith("enrollment")) {
    field(en ? "Purpose" : "Назначение", en ? "Issued upon request" : "Для предъявления по месту требования");
  }
  if (transcript) {
    y -= 8;
    paragraph(en ? "ACADEMIC RESULTS" : "РЕЗУЛЬТАТЫ ОБУЧЕНИЯ", 11);
    tableHeader();
    for (const grade of JSON.parse(student.grades) as Grade[]) {
      const subject = wrap(localized(grade.subject), 9, 188);
      const result = wrap(
        localized(grade.result) || (en ? "Pending" : "Ожидается"),
        8.5,
        69,
      );
      const height = Math.max(subject.length, result.length, 1) * 13 + 10;
      if (y - height < 222) {
        page = doc.addPage([595.28, 841.89]);
        header(true);
        tableHeader();
      }
      subject.forEach((part, i) => draw(part, left + 8, y - 13 * i, 9));
      result.forEach((part, i) => draw(part, 405, y - 13 * i, 8.5));
      draw(localized(grade.type), 255, y, 8.5);
      draw(grade.score === null ? "—" : String(grade.score), 318, y, 8.5);
      draw(getMgimoGradeBand(grade.score)?.ects || "—", 372, y, 8.5);
      const assessmentDate = new Date(grade.date);
      draw(Number.isNaN(+assessmentDate) ? "—" : dateFormat.format(assessmentDate), 482, y, 8.5);
      line(y - height + 13);
      y -= height;
    }
    y -= 5;
    paragraph(
      en
        ? "Score scale: 0–100. ECTS is shown where a numerical score is available."
        : "Шкала баллов: от 0 до 100. ECTS указана для результатов с числовым баллом.",
      9,
      gray,
    );
  }
  const pages = doc.getPages();
  for (const [index, output] of pages.entries()) {
    page = output;
    page.drawText(en ? "DEMO SAMPLE" : "УЧЕБНЫЙ ОБРАЗЕЦ", {
      x: 95,
      y: 313,
      size: 36,
      font,
      color: gray,
      opacity: 0.07,
      rotate: degrees(30),
    });
    if (index === pages.length - 1) {
      const signatureLabel = en ? "ELECTRONIC SIGNATURE · DEMO" : "ЭЛЕКТРОННАЯ ПОДПИСЬ · ОБРАЗЕЦ";
      const signDate = `${en ? "Date of issue" : "Дата выпуска"} ${formattedDate}`;
      page.drawRectangle({
        x: left, y: 125, width: 282, height: 71,
        borderWidth: 1, borderColor: navy, color: rgb(0.97, 0.98, 1),
      });
      draw(signatureLabel, left + 12, 176, 10, navy);
      draw(en ? "Signer: Student Portal Demo Signer" : "Подписант: Student Portal Demo Signer", left + 12, 160, 8.5);
      draw(signDate, left + 12, 145, 8.5);
      draw(en ? "Detached signature (.sig)" : "Отсоединённая подпись (.sig)", left + 12, 132, 8, gray);
    }
    line(105);
    draw(en ? "DEMONSTRATION SAMPLE · FICTIONAL DATA" : "УЧЕБНЫЙ ОБРАЗЕЦ · ВЫМЫШЛЕННЫЕ ДАННЫЕ", left, 86, 8.5, navy);
    draw(
      en
        ? "Demonstration only. No official university certification."
        : "Образец для демонстрации. Университетом не заверен.",
      left,
      70,
      8.5,
      gray,
    );
    draw(`${index + 1} / ${pages.length}`, 506, 47, 8.5, gray);
  }
  doc.setTitle("Учебный образец — " + service.title);
  doc.setAuthor("Деканат будущего");
  doc.setCreationDate(new Date(preparedAt));
  doc.setModificationDate(new Date(preparedAt));
  return doc.save();
}
