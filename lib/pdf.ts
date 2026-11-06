import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fontBase64 } from "./pdf-font";
import { database } from "./server";
import { services, dateLabel, type Grade, type Case } from "./catalog";
export async function certificate(row: Case) {
  const student = await database()
    .prepare(
      "SELECT name,program,course,student_group,grades FROM users WHERE id=?",
    )
    .bind(row.owner_id)
    .first<{
      name: string;
      program: string;
      course: number;
      student_group: string;
      grades: string;
    }>();
  if (!student) throw new Error("Missing document owner");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    Uint8Array.from(atob(fontBase64), (c) => c.charCodeAt(0)),
    { subset: true },
  );
  const page = doc.addPage([595.28, 841.89]);
  const blue = rgb(0, 0.31, 0.81),
    ink = rgb(0.08, 0.1, 0.15),
    gray = rgb(0.42, 0.46, 0.53);
  let y = 746;
  const text = (value: string, size = 12, color = ink) => {
    const words = value.split(" ");
    let line = "";
    for (const w of words) {
      const next = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(next, size) > 479 && line) {
        page.drawText(line, { x: 58, y, size, font, color });
        y -= size + 8;
        line = w;
      } else line = next;
    }
    if (line) {
      page.drawText(line, { x: 58, y, size, font, color });
      y -= size + 8;
    }
  };
  page.drawRectangle({ x: 0, y: 818, width: 595.28, height: 24, color: blue });
  text("ДЕКАНАТ / УЧЕБНЫЙ ПРОТОТИП", 12, blue);
  y -= 20;
  text("ДЕМОНСТРАЦИОННЫЙ ОБРАЗЕЦ", 20, blue);
  text("Не является официальным документом. Все данные вымышлены.", 10, gray);
  y -= 24;
  const service = services.find((s) => s.id === row.service)!;
  const en = row.service.endsWith("-en") || row.service === "english-level";
  const title: Record<string, string> = {
    "enrollment-en": "CONFIRMATION OF ENROLLMENT",
    "transcript-en": "ACADEMIC TRANSCRIPT",
    "english-level": "ENGLISH PROFICIENCY CERTIFICATE",
  };
  text(title[row.service] || service.title.toUpperCase(), 18);
  y -= 12;
  text(en ? `Student: ${row.latin_name}` : `Студент: ${student.name}`, 13);
  text(`Направление: ${student.program}`);
  text(`Курс: ${student.course}. Группа: ${student.student_group}.`);
  y -= 12;
  if (row.service.startsWith("enrollment"))
    text(
      en
        ? "This sample confirms enrollment in the fictional student record of this educational prototype."
        : "Подтверждается факт обучения по вымышленной записи студента в учебном прототипе.",
    );
  if (row.service === "english-level")
    text("English proficiency: B2 (fictional demonstration result).");
  if (row.service.includes("grades") || row.service === "transcript-en") {
    text(
      en
        ? "ACADEMIC RESULTS (fictional data)"
        : "РЕЗУЛЬТАТЫ ОБУЧЕНИЯ (вымышленные данные)",
      11,
      blue,
    );
    for (const grade of JSON.parse(student.grades) as Grade[])
      text(
        `${grade.subject}: ${grade.score !== null ? grade.score + " / 100, " : ""}${grade.result}`,
        11,
      );
  }
  if (row.organization) {
    y -= 12;
    text(`Предоставляется: ${row.organization}`, 11);
  }
  y = Math.min(y - 30, 240);
  text(`Дата формирования: ${dateLabel(new Date().toISOString())}`, 10, gray);
  text(`Заявка: ${row.id}`, 9, gray);
  text(
    "Электронная подпись вуза отсутствует. Документ создан для демонстрации сценария заказа и получения справок.",
    10,
    gray,
  );
  page.drawText("УЧЕБНЫЙ ОБРАЗЕЦ", {
    x: 95,
    y: 300,
    size: 37,
    font,
    color: blue,
    opacity: 0.09,
    rotate: degrees(32),
  });
  page.drawLine({
    start: { x: 58, y: 68 },
    end: { x: 537, y: 68 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.93),
  });
  page.drawText("Деканат будущего • Демонстрационный документ • 1 / 1", {
    x: 58,
    y: 46,
    size: 9,
    font,
    color: gray,
  });
  doc.setTitle("Учебный образец — " + service.title);
  doc.setAuthor("Деканат будущего, учебный прототип");
  return new Uint8Array(await doc.save());
}
