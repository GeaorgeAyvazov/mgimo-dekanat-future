"use client";

import { ArrowLeft, ChevronRight, GraduationCap } from "lucide-react";
import { addCalendarDays, moscowClock } from "@/lib/room-calendar-types";
import { lessonOnDate } from "@/lib/lesson-occurrence";
import { dateLabel, type Grade, type Lesson } from "@/lib/catalog";
import { UniversityLinks } from "./university-links";

export function StudyHub({ grades, lessons, today, subjectKey, datedWeek, openLesson, openGrades }: {
  grades: Grade[]; lessons: Lesson[]; today: string; subjectKey: string; datedWeek?: string;
  openLesson: (date: string, lessonId: string) => void; openGrades: () => void;
}) {
  const subjects = [...new Set([...lessons.map(l => l.subject), ...grades.map(g => g.subject)])]
    .sort((a, b) => a.localeCompare(b, "ru"));
  const selected = subjects.find(subject => encodeURIComponent(subject) === subjectKey);
  const day = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const clock = moscowClock();
  const upcoming = lessons.filter(l => l.subject === selected).map(l => {
    let offset = (l.day - day + 7) % 7;
    if (!offset && l.end <= clock) offset = 7;
    const date = datedWeek ? addCalendarDays(datedWeek, l.day) : addCalendarDays(today, offset);
    return { ...lessonOnDate(l, date), date };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const results = grades.filter(g => g.subject === selected);
  return <section className="course-page">
    {subjectKey ? <>
      <a className="course-back" href="#study"><ArrowLeft size={16}/> Мои дисциплины</a>
      <h1>{selected || "Дисциплина не найдена"}</h1>
      {upcoming.length > 0 && <section><h2>{datedWeek ? "Занятия на выбранной неделе" : "Ближайшие занятия"}</h2>
        {upcoming.map(l => <button className="course-row" key={l.id} onClick={() => openLesson(l.date, l.id)}>
          <span><strong>{dateLabel(l.date)} · {l.start}–{l.end}</strong><small>{[l.kind, l.teacher, l.location || "Ауд. " + l.room].filter(Boolean).join(" · ")}</small></span><ChevronRight size={18}/>
        </button>)}
      </section>}
      {results.length > 0 && <section><h2>Результаты</h2>
        {results.map((g, i) => <div className="course-row" key={i}><span><strong>{g.type}</strong><small>{dateLabel(g.date)} · {g.teacher}</small></span>
          <span className="course-result">{g.result}{g.score !== null && " · " + g.score + "/100"}</span></div>)}
      </section>}
    </> : <>
      <header className="course-title"><h1>Мои дисциплины</h1><button className="text-button mobile-grade-link" onClick={openGrades}><GraduationCap size={17}/> Успеваемость</button></header>
      <ul className="course-list">{subjects.map(subject => {
        const records = grades.filter(g => g.subject === subject);
        const teachers = [...new Set([...lessons.filter(l => l.subject === subject).map(l => l.teacher), ...records.map(g => g.teacher)].filter(Boolean))];
        const last = records.slice().sort((a,b) => b.date.localeCompare(a.date))[0];
        return <li key={subject}><a className="course-row" href={"#study/" + encodeURIComponent(subject)}>
          <span><strong>{subject}</strong>{teachers.length > 0 && <small>{teachers.join(" · ")}</small>}</span>
          {last && <span className="course-result">{last.score !== null ? last.score + "/100" : last.result}</span>}
          <ChevronRight size={18} aria-hidden="true"/>
        </a></li>;
      })}</ul>
      {!subjects.length && <p>В вашем расписании и зачётной книжке пока нет дисциплин.</p>}
      <div className="mobile-university"><h2>Сервисы МГИМО</h2><UniversityLinks/></div>
    </>}
  </section>;
}
