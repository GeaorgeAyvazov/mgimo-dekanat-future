"use client";

import { useRef } from "react";
import { CalendarPlus, Download, X } from "lucide-react";

export function CalendarExport({ href, range, group }: {
  href: string;
  range: string;
  group: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="button secondary calendar-export-trigger" onClick={() => dialog.current?.showModal()}>
        <CalendarPlus size={17} aria-hidden="true" /> Добавить в календарь
      </button>
      <dialog className="calendar-export" ref={dialog} aria-labelledby="calendar-export-title">
        <div className="calendar-export-heading">
          <h2 id="calendar-export-title">Добавить в календарь</h2>
          <button className="icon-btn" aria-label="Закрыть" onClick={() => dialog.current?.close()}>
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <p className="muted">{group} · {range}</p>
        <p>Скачайте файл недели и импортируйте его в свой календарь. Переносы после скачивания в файле не обновляются.</p>
        <a className="button primary" href={href} download>
          <Download size={16} aria-hidden="true" /> Скачать файл календаря (.ics)
        </a>
        <div className="calendar-export-help">
          <a href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener noreferrer">Импорт в Google Календарь</a>
          <a href="https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-on-the-web" target="_blank" rel="noopener noreferrer">Как импортировать в Outlook</a>
        </div>
      </dialog>
    </>
  );
}
