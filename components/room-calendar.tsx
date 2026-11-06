"use client";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  addCalendarDays,
  moscowDate,
  type RoomCalendarDay,
} from "@/lib/room-calendar-types";

export function RoomCalendar({
  roomKey,
  roomName,
  close,
}: {
  roomKey: string;
  roomName: string;
  close: () => void;
}) {
  const today = moscowDate();
  const [date, setDate] = useState(today);
  const [data, setData] = useState<RoomCalendarDay | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setTick((value) => value + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetch(
      `/api/portal/room-calendar?room=${encodeURIComponent(roomKey)}&date=${date}`,
      { credentials: "same-origin", signal: controller.signal },
    )
      .then(async (response) => {
        const result = (await response.json()) as RoomCalendarDay & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || "Не удалось загрузить занятость");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [roomKey, date, tick]);
  const badge = data?.current?.state;
  return (
    <section
      id="room-calendar-pane"
      className="room-calendar"
      aria-label={`Занятость аудитории ${roomName}`}
    >
      <header>
        <div>
          <h3>Аудитория {roomName}</h3>
          <p>Занятость на день</p>
        </div>
        <button
          className="icon-btn"
          aria-label="Закрыть занятость аудитории"
          onClick={close}
        >
          <X size={19} />
        </button>
      </header>
      <div className="room-calendar-date">
        <button
          className="icon-btn"
          aria-label="Предыдущий день занятости"
          disabled={date <= addCalendarDays(today, -90)}
          onClick={() => setDate(addCalendarDays(date, -1))}
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          aria-label="Дата занятости аудитории"
          value={date}
          min={addCalendarDays(today, -90)}
          max={addCalendarDays(today, 90)}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
          }}
        />
        <button
          className="icon-btn"
          aria-label="Следующий день занятости"
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
            onClick={() => setTick(tick + 1)}
          >
            Повторить
          </button>
        </div>
      ) : !data ? (
        <div className="room-calendar-state" role="status">
          <LoaderCircle className="spin" size={23} />
          Загружаем расписание…
        </div>
      ) : (
        <>
          {badge && (
            <div className={`room-current room-current-${badge}`} role="status">
              <Clock3 size={17} />
              <span>
                {badge === "closed"
                  ? "Вне учебного дня"
                  : badge === "busy"
                    ? "Сейчас занята по расписанию"
                    : "Сейчас свободна по расписанию"}
                {data.current?.until && (
                  <small>
                    {badge === "busy" ? "Освободится в" : "Свободна до"}{" "}
                    {data.current.until}
                  </small>
                )}
              </span>
            </div>
          )}
          <div className="room-calendar-periods">
            {data.intervals.map((period) => (
              <div
                className={`room-period room-period-${period.state}`}
                key={period.start}
              >
                <time>
                  {period.start}
                  <span>— {period.end}</span>
                </time>
                <div>
                  <strong>
                    {period.state === "busy" ? "Занято" : "Свободно"}
                  </strong>
                  <small>
                    {period.state === "busy"
                      ? "Учебное занятие"
                      : "Свободное окно"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
