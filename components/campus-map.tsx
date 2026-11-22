"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Building2,
  CalendarDays,
  Expand,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { RoomCalendar } from "@/components/room-calendar";
import { RoomAvailability } from "@/components/room-availability";
import {
  constrainCamera,
  roomIsVisible,
  searchMapRooms,
  type Camera,
  type IndoorMap,
  type MapFloor,
  type MapRoom,
} from "@/lib/indoor-map";
import {
  atlasBounds,
  atlasCamera,
  atlasLevel,
  atlasMaxZoom,
  atlasPassages,
  atlasPlacement,
  atlasRoomBox,
  firstFloorStairDirection,
  isClosedPassage,
  locateRoom,
  passageDestination,
} from "@/lib/campus-atlas";
import { addCalendarDays, moscowDate } from "@/lib/room-calendar-types";

const [, , atlasWidth, atlasHeight] = atlasBounds;
const levelLabel = (level: string) => `Уровень ${level}`;

function scaleFor(width: number, height: number, zoom: number) {
  return Math.min(width / atlasWidth, height / atlasHeight) * zoom;
}

export function CampusMap({
  room,
  roomId,
  date,
  availableRooms,
  close,
}: {
  room?: string;
  roomId?: string;
  date?: string;
  availableRooms?: string[];
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<IndoorMap | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [level, setLevel] = useState("1");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState(atlasCamera);
  const [size, setSize] = useState({ width: atlasWidth, height: atlasHeight });
  const [imageError, setImageError] = useState(false);
  const [panel, setPanel] = useState<"calendar" | "availability" | null>(null);
  const today = moscowDate();
  const [roomDate, setRoomDate] = useState(
    date &&
      date >= addCalendarDays(today, -90) &&
      date <= addCalendarDays(today, 90)
      ? date
      : today,
  );
  const cameraRef = useRef(camera);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    distance: number;
    x: number;
    y: number;
    camera: Camera;
  } | null>(null);
  const movement = useRef(0);
  const hitTarget = useRef<{ room?: string; floor?: string }>({});

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch("/maps/indoor.json", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить карту");
        const map = (await response.json()) as IndoorMap;
        if (controller.signal.aborted) return;
        setData(map);
        const target =
          (roomId && locateRoom(map, roomId)) ||
          (room &&
            searchMapRooms(map, room).find(
              (entry) => entry.room.name === room,
            ));
        if (target) {
          setLevel(atlasLevel(target.floor));
          setSelected(`${target.floor.key}:${target.room.id}`);
          const next = atlasCamera(target.floor, target.room);
          cameraRef.current = next;
          setCamera(next);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [retry, room, roomId]);

  const active = data && locateRoom(data, selected);
  const availableRoomIds = new Set(availableRooms);
  const floors =
    data?.floors.filter((floor) => atlasLevel(floor) === level) || [];
  const results = data ? searchMapRooms(data, query) : [];
  const scale = scaleFor(size.width, size.height, camera.zoom);
  const visibleWidth = size.width / scale;
  const visibleHeight = size.height / scale;
  const viewBox = `${camera.x - visibleWidth / 2} ${camera.y - visibleHeight / 2} ${visibleWidth} ${visibleHeight}`;

  function move(next: Camera) {
    const bounded = constrainCamera(next, atlasBounds, atlasMaxZoom);
    cameraRef.current = bounded;
    setCamera(bounded);
  }

  function changeLevel(next: string) {
    setLevel(next);
    setSelected("");
    setQuery("");
    setImageError(false);
    setPanel(null);
  }

  function openRoom(floor: MapFloor, point: MapRoom, focus = true) {
    changeLevel(atlasLevel(floor));
    setSelected(`${floor.key}:${point.id}`);
    if (focus) move(atlasCamera(floor, point));
  }

  function zoom(factor: number) {
    move({ ...cameraRef.current, zoom: cameraRef.current.zoom * factor });
  }

  function zoomAround(
    element: HTMLElement,
    previous: Camera,
    factor: number,
    fromX: number,
    fromY: number,
    toX = fromX,
    toY = fromY,
  ) {
    const bounds = element.getBoundingClientRect();
    const oldScale = scaleFor(bounds.width, bounds.height, previous.zoom);
    const nextZoom = Math.min(
      atlasMaxZoom,
      Math.max(1, previous.zoom * factor),
    );
    const nextScale = scaleFor(bounds.width, bounds.height, nextZoom);
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    move({
      zoom: nextZoom,
      x:
        previous.x + (fromX - centerX) / oldScale - (toX - centerX) / nextScale,
      y:
        previous.y + (fromY - centerY) / oldScale - (toY - centerY) / nextScale,
    });
  }

  useEffect(() => {
    const element = canvas.current;
    if (!element || !data) return;
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    resize.observe(element);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomAround(
        element,
        cameraRef.current,
        event.deltaY < 0 ? 1.15 : 1 / 1.15,
        event.clientX,
        event.clientY,
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      resize.disconnect();
      element.removeEventListener("wheel", wheel);
    };
  }, [data]);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!pointers.current.size) {
      const target = (event.target as Element).closest(
        "[data-map-room], [data-map-floor]",
      );
      hitTarget.current = {
        room: target?.getAttribute("data-map-room") || undefined,
        floor: target?.getAttribute("data-map-floor") || undefined,
      };
      movement.current = 0;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      movement.current = 6;
      pinch.current = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        camera: cameraRef.current,
      };
    }
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    movement.current += Math.abs(dx) + Math.abs(dy);
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const initial = pinch.current;
      zoomAround(
        event.currentTarget,
        initial.camera,
        Math.hypot(a.x - b.x, a.y - b.y) / initial.distance,
        initial.x,
        initial.y,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
      );
    } else {
      const current = cameraRef.current;
      move({
        ...current,
        x: current.x - dx / scale,
        y: current.y - dy / scale,
      });
    }
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    if (pointers.current.size < 2) pinch.current = null;
    if (
      !data ||
      event.type !== "pointerup" ||
      movement.current > 5 ||
      pointers.current.size
    )
      return;
    const key = hitTarget.current.room;
    const hit = key ? locateRoom(data, key) : undefined;
    if (hit && key) {
      const destination = passageDestination(key);
      const linked = destination && locateRoom(data, destination);
      const nextFloor =
        firstFloorStairDirection(hit.floor, hit.room) === "up"
          ? data.floors.find(
              (floor) =>
                floor.building === hit.floor.building && floor.floor === "2",
            )
          : undefined;
      if (linked)
        openRoom(linked.floor, linked.room, atlasLevel(linked.floor) !== level);
      else if (nextFloor) changeLevel(atlasLevel(nextFloor));
      else if (hit.room.type !== "5") openRoom(hit.floor, hit.room, false);
    } else if (hitTarget.current.floor) {
      const floor = floors.find((item) => item.key === hitTarget.current.floor);
      if (floor) move(atlasCamera(floor));
    }
  }

  const hasCalendar = active && ["2", "3"].includes(active.room.type);
  const showDetails = camera.zoom >= 2.5;

  return (
    <dialog
      ref={dialog}
      className="campus-map-dialog indoor-dialog"
      aria-labelledby="campus-map-title"
      onCancel={close}
    >
      <header className="indoor-heading">
        <div>
          <span className="eyebrow">МГИМО · МОСКВА</span>
          <h2 id="campus-map-title">Карта кампуса</h2>
        </div>
        <button
          className="icon-btn"
          aria-label="Закрыть карту"
          autoFocus
          onClick={close}
        >
          <X size={22} />
        </button>
      </header>
      {!data ? (
        <div className="indoor-state">
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button
                className="button secondary"
                onClick={() => setRetry(retry + 1)}
              >
                Попробовать снова
              </button>
            </>
          ) : (
            <>
              <LoaderCircle className="spin" size={28} />
              <p role="status">Загружаем планы этажей…</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="indoor-search-wrap">
            <div className="indoor-search">
              <Search size={19} />
              <input
                type="search"
                aria-label="Найти аудиторию на карте"
                placeholder="Аудитория, кафе, библиотека…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  className="icon-btn"
                  aria-label="Очистить поиск на карте"
                  onClick={() => setQuery("")}
                >
                  <X size={17} />
                </button>
              )}
            </div>
            {query && (
              <div className="indoor-search-results">
                <p role="status">
                  {results.length
                    ? `Найдено: ${results.length}`
                    : "Ничего не найдено. Попробуйте номер без префикса корпуса."}
                </p>
                {results.slice(0, 12).map(({ floor, room }) => (
                  <button
                    key={`${floor.key}:${room.id}`}
                    onClick={() => openRoom(floor, room)}
                  >
                    <MapPin size={18} />
                    <span>
                      <strong>
                        {isClosedPassage(`${floor.key}:${room.id}`)
                          ? "Служебный переход закрыт"
                          : room.name}
                      </strong>
                      <small>{floor.name}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="indoor-location-controls">
            <select
              aria-label="Уровень карты"
              value={level}
              onChange={(event) => changeLevel(event.target.value)}
            >
              {[...new Set(data.floors.map(atlasLevel))]
                .sort((a, b) => Number(a) - Number(b))
                .map((value) => (
                  <option key={value} value={value}>
                    {levelLabel(value)}
                  </option>
                ))}
            </select>
            <button
              className="indoor-calendar-button"
              aria-controls="room-availability-pane"
              aria-expanded={panel === "availability"}
              onClick={() => {
                setQuery("");
                setPanel(panel === "availability" ? null : "availability");
              }}
            >
              <Search size={17} /> Свободные аудитории
            </button>
          </div>
          <div className="indoor-map-area">
            <div
              ref={canvas}
              className="indoor-canvas"
              tabIndex={0}
              role="group"
              aria-label={`Общий план кампуса · ${levelLabel(level)}. Стрелки перемещают карту, плюс и минус меняют масштаб.`}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              onLostPointerCapture={pointerUp}
              onKeyDown={(event) => {
                const offsets: Record<string, [number, number]> = {
                  ArrowLeft: [-visibleWidth * 0.12, 0],
                  ArrowRight: [visibleWidth * 0.12, 0],
                  ArrowUp: [0, -visibleHeight * 0.12],
                  ArrowDown: [0, visibleHeight * 0.12],
                };
                const offset = offsets[event.key];
                if (offset) {
                  event.preventDefault();
                  move({
                    ...cameraRef.current,
                    x: camera.x + offset[0],
                    y: camera.y + offset[1],
                  });
                } else if (["+", "=", "-"].includes(event.key)) {
                  event.preventDefault();
                  zoom(event.key === "-" ? 1 / 1.3 : 1.3);
                }
              }}
            >
              <svg viewBox={viewBox} className="indoor-svg" aria-hidden="true">
                {floors.map((floor) => {
                  const p = atlasPlacement(floor);
                  return (
                    <rect
                      key={floor.key}
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      height={p.height}
                      rx={24}
                      fill={p.color}
                    />
                  );
                })}
                {atlasPassages(data, level).map(({ from, to, path, width }) => (
                  <g
                    key={from}
                    data-atlas-passage={`${from}|${to}`}
                    fill="none"
                    strokeLinecap="round"
                    pointerEvents="none"
                  >
                    <path d={path} stroke="#444a53" strokeWidth={width + 8} />
                    <path d={path} stroke="#fff" strokeWidth={width} />
                  </g>
                ))}
                {floors.map((floor) => {
                  const p = atlasPlacement(floor);
                  return (
                    <g key={floor.key} data-atlas-plan={floor.key}>
                      <image
                        href={floor.svg}
                        x={p.x}
                        y={p.y}
                        width={p.width}
                        height={p.height}
                        data-map-floor={showDetails ? undefined : floor.key}
                        pointerEvents={showDetails ? "none" : undefined}
                        onError={() => setImageError(true)}
                      />
                      {showDetails &&
                        floor.rooms
                          .filter((point) => roomIsVisible(point, floor))
                          .map((point) => {
                            const key = `${floor.key}:${point.id}`;
                            const box = atlasRoomBox(floor, point);
                            const direction = firstFloorStairDirection(
                              floor,
                              point,
                            );
                            const closed = isClosedPassage(key);
                            if (direction || closed) {
                              const radius = closed
                                ? Math.max(box.width, box.height) * 0.55
                                : Math.min(box.width, box.height) * 0.54;
                              return (
                                <g
                                  key={key}
                                  transform={`translate(${box.x + box.width / 2}, ${box.y + box.height / 2})`}
                                  data-map-room={key}
                                  className="indoor-plan-label"
                                >
                                  <title>
                                    {closed
                                      ? "Служебный переход закрыт"
                                      : direction === "up"
                                        ? "Лестница вверх"
                                        : "Лестница или переход"}
                                  </title>
                                  <circle
                                    r={radius}
                                    fill="#fff"
                                    stroke="#6e88ae"
                                    strokeWidth={radius * 0.12}
                                  />
                                  <text
                                    y={radius * 0.52}
                                    fontSize={radius * 1.65}
                                    textAnchor="middle"
                                    fill="#385d90"
                                    pointerEvents="none"
                                  >
                                    {closed
                                      ? "×"
                                      : direction === "up"
                                        ? "↑"
                                        : "•"}
                                  </text>
                                </g>
                              );
                            }
                            if (
                              ![
                                "1",
                                "2",
                                "3",
                                "4",
                                "44",
                                "6",
                                "7",
                                "8",
                                "9",
                                "10",
                              ].includes(point.type)
                            )
                              return null;
                            return (
                              <rect
                                key={key}
                                data-map-room={key}
                                {...box}
                                fill={availableRoomIds.has(key) ? "#13a87580" : "transparent"}
                                className="indoor-hotspot"
                              >
                                <title>{point.name}</title>
                              </rect>
                            );
                          })}
                    </g>
                  );
                })}
                {!showDetails &&
                  floors.map((floor) => {
                    const p = atlasPlacement(floor);
                    const name =
                      floor.building === "d"
                        ? "Столовая «Трёшка»"
                        : data.buildings.find(
                            (item) => item.id === floor.building,
                          )?.name || "";
                    const shortName =
                      size.width < 520
                        ? name
                            .replace("Корпус ", "")
                            .replace("Новый корпус", "Новый")
                            .replace("Столовая «Трёшка»", "Трёшка")
                        : name;
                    const levelName =
                      floor.floor === level
                        ? shortName
                        : `${shortName} · ${floor.floor} эт.`;
                    const count = floor.rooms.filter((point) => availableRoomIds.has(`${floor.key}:${point.id}`)).length;
                    const label = count ? `${levelName} · ${count}` : levelName;
                    const fontSize = size.width < 520 ? 140 : 90;
                    const width = label.length * fontSize * 0.62 + 75;
                    const x =
                      p.x +
                      p.width * (floor.building === "g" ? 0.73 : 0.5) -
                      width / 2;
                    const y = Math.max(12, p.y - fontSize - 22);
                    return (
                      <g
                        key={floor.key}
                        data-map-floor={floor.key}
                        className="indoor-plan-label"
                        transform={`translate(${x}, ${y})`}
                      >
                        <rect
                          width={width}
                          height={fontSize + 36}
                          rx={22}
                          fill={p.color}
                        />
                        <text
                          x={width / 2}
                          y={fontSize * 0.8 + 14}
                          textAnchor="middle"
                          fontSize={fontSize}
                          fontWeight="650"
                          fill="#32455e"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                {active &&
                  (() => {
                    const box = atlasRoomBox(active.floor, active.room);
                    return (
                      <rect
                        data-selected-room={active.room.id}
                        {...box}
                        fill="#0050cf20"
                        stroke="#0050cf"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    );
                  })()}
              </svg>
              {imageError && (
                <div className="indoor-image-error" role="alert">
                  Один из планов не загрузился. Переключите этаж или откройте
                  карту заново.
                </div>
              )}
            </div>
            <div
              className="indoor-zoom"
              role="group"
              aria-label="Масштаб карты"
            >
              <button
                className="icon-btn"
                aria-label="Увеличить карту"
                disabled={camera.zoom >= atlasMaxZoom}
                onClick={() => zoom(1.35)}
              >
                <Plus size={20} />
              </button>
              <span aria-live="polite">{Math.round(camera.zoom * 100)}%</span>
              <button
                className="icon-btn"
                aria-label="Уменьшить карту"
                disabled={camera.zoom <= 1}
                onClick={() => zoom(1 / 1.35)}
              >
                <Minus size={20} />
              </button>
              <button
                className="icon-btn"
                aria-label="Показать весь этаж"
                onClick={() => move(atlasCamera())}
              >
                <Expand size={19} />
              </button>
            </div>
            {panel === "calendar" && active && hasCalendar && (
              <RoomCalendar
                key={selected}
                roomKey={selected}
                roomName={active.room.name}
                date={roomDate}
                setDate={setRoomDate}
                close={() => setPanel(null)}
              />
            )}
            {panel === "availability" && (
              <RoomAvailability
                date={roomDate}
                setDate={setRoomDate}
                close={() => setPanel(null)}
                select={(key, date) => {
                  const hit = locateRoom(data, key);
                  if (hit) {
                    setRoomDate(date);
                    openRoom(hit.floor, hit.room);
                  }
                }}
              />
            )}
          </div>
          <footer className="indoor-footer">
            {!!availableRooms?.length && <p className="availability-map-legend">Свободные по результатам поиска: {availableRooms.length} · демоданные</p>}
            <div className="indoor-selected">
              <span className="indoor-selected-icon">
                {active ? <MapPin size={21} /> : <Building2 size={21} />}
              </span>
              <div>
                <strong>
                  {active
                    ? isClosedPassage(selected)
                      ? "Служебный переход закрыт"
                      : active.room.name
                    : `Общий план · ${levelLabel(level)}`}
                </strong>
                <p>
                  {active
                    ? active.floor.name
                    : "Нажмите на корпус, чтобы приблизить план"}
                </p>
              </div>
              {hasCalendar && (
                <button
                  className="indoor-calendar-button"
                  aria-controls="room-calendar-pane"
                  aria-expanded={panel === "calendar"}
                  onClick={() =>
                    setPanel(panel === "calendar" ? null : "calendar")
                  }
                >
                  <CalendarDays size={17} /> Расписание аудитории
                </button>
              )}
            </div>
            <div className="indoor-source">
              <small>
                Уровни совмещены по переходам ·{" "}
                <a
                  href="https://mgimo.ru/territory/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Планы МГИМО
                </a>
              </small>
            </div>
          </footer>
        </>
      )}
    </dialog>
  );
}
