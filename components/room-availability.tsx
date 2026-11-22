"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, LoaderCircle, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { dateLabel } from "@/lib/catalog";
import {
  addCalendarDays,
  moscowDate,
  roomEquipment,
  teachingBuildings,
  type AvailableRoom,
  type RoomEquipment,
} from "@/lib/room-calendar-types";

const minTime = 8 * 60;
const maxTime = 21 * 60;
const seatsOptions = [10, 20, 30, 60, 100];
const equipmentOptions = Object.entries(roomEquipment) as [RoomEquipment, string][];
const buildingName = (room: AvailableRoom) => room.floor.split(" · ")[0];
const toMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
const toClock = (minutes: number) =>
  String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");

type SearchResult = { date: string; start: string; end: string; rooms: AvailableRoom[] };
type Filters = { building: string; seats: number; equipment: RoomEquipment[] };
const emptyFilters: Filters = { building: "", seats: 0, equipment: [] };

export function RoomAvailability({
  date,
  setDate,
  close,
  select,
  showOnMap,
  interval,
}: {
  date: string;
  setDate: (value: string) => void;
  close?: () => void;
  select: (key: string, date: string) => void;
  showOnMap?: (rooms: string[], date: string) => void;
  interval?: { start: string; end: string };
}) {
  const today = moscowDate();
  const id = useId();
  const [start, setStart] = useState(interval?.start || "10:40");
  const [end, setEnd] = useState(interval?.end || "12:00");
  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(Boolean(interval));
  const [search, setSearch] = useState(() => interval ? { date, ...interval } : null);
  const [filters, setFilters] = useState(emptyFilters);
  const [draft, setDraft] = useState(emptyFilters);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const results = data?.rooms || [];
  const count = Number(!!filters.building) + Number(!!filters.seats) + filters.equipment.length;
  const visible = results.filter((room) =>
    (!filters.building || filters.building === buildingName(room)) &&
    room.seats >= filters.seats &&
    filters.equipment.every((item) => room.equipment.includes(item))
  );
  const grouped = new Map<string, AvailableRoom[]>();
  for (const room of visible) {
    const name = buildingName(room);
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(room);
  }
  const matches = data && data.date === date && data.start === start && data.end === end;
  const valid = !!start && !!end && toMinutes(start) >= minTime && toMinutes(end) <= maxTime && start < end;
  useEffect(() => {
    if (!search) return;
    const controller = new AbortController();
    const params = new URLSearchParams(search);
    fetch(`/api/portal/room-availability?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as SearchResult & { error?: string };
        if (!response.ok) throw new Error(result.error || "Не удалось найти аудитории");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Не удалось найти аудитории");
      })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [search]);

  return (
    <section id="room-availability-pane" className={`room-availability ${close ? "room-calendar room-availability-map" : ""}`} aria-label="Поиск свободных аудиторий">
      {close && (
        <header>
          <h3>Свободные аудитории</h3>
          <button className="icon-btn" aria-label="Закрыть поиск" onClick={close}><X size={19} /></button>
        </header>
      )}
      <div className="availability-content">
        <div className="availability-layout">
          <form className="availability-controls" onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            setPending(true);
            setError("");
            setData(null);
            setSearch({ date, start, end });
          }}>
            <div className="availability-campus"><MapPin size={18} /><span>Основной кампус<small>Проспект Вернадского, 76</small></span></div>
            <label className="availability-date">Дата
              <input required type="date" min={addCalendarDays(today, -90)} max={addCalendarDays(today, 90)}
                value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} />
            </label>
            <fieldset className="availability-time">
              <legend>Интервал</legend>
              <div className="availability-clock">
                <label>С<input required type="time" min="08:00" max="21:00" value={start} onInput={(event) => setStart(event.currentTarget.value)} /></label>
                <label>До<input required type="time" min="08:00" max="21:00" value={end} onInput={(event) => setEnd(event.currentTarget.value)} /></label>
              </div>
              {valid && (
                <div className="availability-scale">
                  <Slider min={minTime} max={maxTime} step={5} value={[toMinutes(start), toMinutes(end)]}
                  thumbLabels={["Начало интервала", "Конец интервала"]} formatValue={toClock}
                  onValueChange={([from, to]) => { setStart(toClock(from)); setEnd(toClock(to)); }}
                  minStepsBetweenThumbs={1} />
                  <div className="availability-limits" aria-hidden="true"><span>{toClock(minTime)}</span><span>{toClock(maxTime)}</span></div>
                </div>
              )}
            </fieldset>
            {!valid && <small role="status">Выберите интервал с 08:00 до 21:00 МСК. Конец должен быть позже начала.</small>}
            <div className="availability-actions">
              <button type="button" className="button secondary" onClick={() => {
                setDraft(filters);
                filterDialog.current?.showModal();
              }}><SlidersHorizontal size={16} /> Фильтры{count ? ` · ${count}` : ""}</button>
              <button className="button primary" disabled={pending || !valid}>Найти аудитории</button>
            </div>
            <small className="muted">Занятость, места и оборудование — демоданные · МСК</small>
          </form>
          <div className="availability-list">
            {pending ? <p role="status"><LoaderCircle className="spin" size={18} /> Проверяем расписание…</p>
              : error ? <p role="alert">{error}</p>
              : !matches ? <p className="muted">{data ? "Интервал изменился. Запустите поиск ещё раз." : "Выберите интервал и найдите свободные аудитории."}</p>
              : (
                <>
                  <div className="availability-total">
                    <div role="status"><strong>Найдено аудиторий: {visible.length}</strong><br /><span>{dateLabel(data.date)} · {data.start}–{data.end} МСК</span></div>
                    {!!visible.length && showOnMap && (
                      <button className="button secondary" onClick={() => showOnMap(visible.map(({ key }) => key), data.date)}>
                        <MapPin size={16} /> На карте
                      </button>
                    )}
                  </div>
                  {!visible.length && <p className="muted">Попробуйте изменить интервал или сбросить фильтры.</p>}
                  {[...grouped].map(([name, rooms]) => (
                    <section className="availability-group" key={name} aria-label={name}>
                      <h3>{name}</h3>
                      {rooms.map((room) => (
                        <button className="availability-room" key={room.key} onClick={() => select(room.key, data.date)}>
                          <MapPin size={17} aria-hidden="true" />
                          <span><strong>{room.name}</strong><small>{room.floor.split(" · ").slice(1).join(" · ")} · {room.seats} мест · {room.equipment.map((item) => roomEquipment[item]).join(", ")}</small></span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      ))}
                    </section>
                  ))}
                </>
              )}
          </div>
        </div>
      </div>
      <dialog className="calendar-export availability-filter-dialog" ref={filterDialog} aria-labelledby={id}>
        <div className="calendar-export-heading"><h2 id={id}>Фильтры аудиторий</h2><button className="icon-btn" aria-label="Закрыть фильтры" onClick={() => filterDialog.current?.close()}><X size={19} /></button></div>
        <label className="availability-date">Корпус<select value={draft.building} onChange={(event) => setDraft({ ...draft, building: event.target.value })}>
          <option value="">Все корпуса</option>{teachingBuildings.map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <fieldset className="availability-time"><legend>Количество мест</legend><div className="availability-presets">
          {seatsOptions.map((seats) => <button key={seats} className="filter" aria-pressed={draft.seats === seats} onClick={() => setDraft({ ...draft, seats: draft.seats === seats ? 0 : seats })}>{seats}+</button>)}
        </div></fieldset>
        <fieldset className="availability-time"><legend>Оборудование</legend>
          {equipmentOptions.map(([key, label]) => <label className="availability-check" key={key}><input type="checkbox" checked={draft.equipment.includes(key)}
            onChange={(event) => setDraft({ ...draft, equipment: event.target.checked ? [...draft.equipment, key] : draft.equipment.filter((item) => item !== key) })} />{label}</label>)}
        </fieldset>
        <div className="availability-actions"><button className="button secondary" onClick={() => setDraft(emptyFilters)}>Сбросить</button><button className="button primary" onClick={() => {
          setFilters(draft);
          filterDialog.current?.close();
        }}>Применить</button></div>
      </dialog>
    </section>
  );
}
