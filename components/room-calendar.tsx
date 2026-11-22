"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import {
  addCalendarDays,
  moscowDate,
  type RoomCalendarDay,
} from "@/lib/room-calendar-types";

export function RoomCalendar({
  roomKey,
  roomName,
  date,
  setDate,
  close,
}: {
  roomKey: string;
  roomName: string;
  date: string;
  setDate: (value: string) => void;
  close: () => void;
}) {
  const today = moscowDate();
  const [data, setData] = useState<RoomCalendarDay | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    const params = new URLSearchParams({ room: roomKey, date });
    fetch(`/api/portal/room-calendar?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as RoomCalendarDay & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || "Не удалось загрузить расписание");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [roomKey, date, retry]);

  return (
    <section
      id="room-calendar-pane"
      className="room-calendar"
      aria-label={`Расписание аудитории ${roomName}`}
    >
      <header>
        <div>
          <h3>Аудитория {roomName}</h3>
          <p>Расписание на день</p>
        </div>
        <button
          className="icon-btn"
          aria-label="Закрыть расписание аудитории"
          onClick={close}
        >
          <X size={19} />
        </button>
      </header>
      <div className="room-calendar-date">
        <button
          className="icon-btn"
          aria-label="Предыдущий день"
          disabled={date <= addCalendarDays(today, -90)}
          onClick={() => setDate(addCalendarDays(date, -1))}
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          aria-label="Дата расписания аудитории"
          value={date}
          min={addCalendarDays(today, -90)}
          max={addCalendarDays(today, 90)}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
        />
        <button
          className="icon-btn"
          aria-label="Следующий день"
          disabled={date >= addCalendarDays(today, 90)}
          onClick={() => setDate(addCalendarDays(date, 1))}
        >
          <ChevronRight size={18} />
        </button>
        <button className="text-button" onClick={() => setDate(today)}>
          Сегодня
        </button>
      </div>
      <div className="room-calendar-demo">Демоданные · московское время</div>
      {error ? (
        <div className="room-calendar-state">
          <p role="alert">{error}</p>
          <button
            className="button secondary"
            onClick={() => setRetry(retry + 1)}
          >
            Повторить
          </button>
        </div>
      ) : !data ? (
        <div className="room-calendar-state" role="status">
          <LoaderCircle className="spin" size={23} />
          Загружаем расписание…
        </div>
      ) : !data.lessons.length ? (
        <p className="room-calendar-state" role="status">
          На этот день занятий нет
        </p>
      ) : (
        <div className="room-calendar-periods">
          {data.lessons.map((lesson) => (
            <div className="room-period" key={lesson.start}>
              <time>
                {lesson.start}
                <span>— {lesson.end}</span>
              </time>
              <div>
                <strong>{lesson.subject}</strong>
                <small>Группа {lesson.group}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
