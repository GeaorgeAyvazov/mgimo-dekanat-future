"use client";
import { useEffect, useRef } from "react";
import { MapPin, X } from "lucide-react";
import { dateLabel, type Lesson } from "@/lib/catalog";

export type SelectedLesson = { lesson: Lesson; date: string; group: string };
export function LessonDetails({ selected, close, openMap }: {
  selected: SelectedLesson; close: () => void; openMap: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);
  const { lesson, date, group } = selected;
  return <dialog ref={dialog} className="course-dialog" aria-labelledby="lesson-detail-title"
    onCancel={close} onClick={e => { if (e.target === dialog.current) close(); }}>
    <div>
      <header><span>{lesson.kind} · {dateLabel(date)}</span>
        <button className="icon-btn" onClick={close} aria-label="Закрыть сведения о паре"><X size={20}/></button></header>
      <h2 id="lesson-detail-title">{lesson.subject}</h2>
      <dl><dt>Время</dt><dd>{lesson.start}–{lesson.end} МСК</dd>
        {lesson.teacher && <><dt>Преподаватель</dt><dd>{lesson.teacher}</dd></>}
        <dt>Группа</dt><dd>{group}</dd>
        {lesson.stream && lesson.stream !== group && <><dt>Поток или подгруппа</dt><dd>{lesson.stream}</dd></>}
        <dt>Аудитория</dt><dd>{lesson.location || lesson.room}{lesson.oldRoom && lesson.change && " · ранее " + lesson.oldRoom}</dd>
      </dl>
      {(!lesson.location || lesson.roomId) && <button className="button secondary" onClick={openMap}><MapPin size={16}/>Показать на карте</button>}
    </div>
  </dialog>;
}
