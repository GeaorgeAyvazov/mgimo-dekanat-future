"use client";
import { RoomCalendar } from "@/components/room-calendar";
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
import {
  campusViewBox,
  constrainCamera,
  floorCamera,
  roomIsVisible,
  searchMapRooms,
  type Camera,
  type IndoorMap,
  type MapFloor,
  type MapRoom,
} from "@/lib/indoor-map";

export function CampusMap({
  room,
  roomId,
  close,
}: {
  room: string;
  roomId?: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<IndoorMap | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [floorKey, setFloorKey] = useState("");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"floor" | "campus">("floor");
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [imageError, setImageError] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const cameraRef = useRef(camera);
  const viewRef = useRef<MapFloor["viewBox"]>(campusViewBox);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; camera: Camera } | null>(null);
  const dragged = useRef(false);
  const movement = useRef(0);
  const pointerTarget = useRef<string | null>(null);
  useEffect(() => {
    const element = dialog.current,
      trigger = document.activeElement as HTMLElement | null;
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
        const [requestedFloor, requestedRoom] = (roomId || "").split(":");
        const foundFloor =
          map.floors.find(
            (item) =>
              item.key === requestedFloor &&
              item.rooms.some((point) => point.id === requestedRoom),
          ) ||
          map.floors.find((item) =>
            item.rooms.some((point) => point.name === room),
          );
        const initial =
          foundFloor ||
          map.floors.find((item) => item.key === "b2") ||
          map.floors[0];
        const point = foundFloor?.rooms.find(
          (item) => item.id === requestedRoom || item.name === room,
        );
        setData(map);
        setFloorKey(initial.key);
        setSelected(point?.id || "");
        const next = floorCamera(initial.viewBox, point);
        cameraRef.current = next;
        setCamera(next);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [retry, room, roomId]);
  const floor = data?.floors.find((item) => item.key === floorKey);
  const point = floor?.rooms.find((item) => item.id === selected);
  const viewBox =
    mode === "campus" ? campusViewBox : floor?.viewBox || campusViewBox;
  viewRef.current = viewBox;
  const results = data ? searchMapRooms(data, query) : [];
  function move(next: Camera) {
    const bounded = constrainCamera(next, viewRef.current);
    cameraRef.current = bounded;
    setCamera(bounded);
  }
  function openFloor(next: MapFloor, target?: MapRoom, focus = true) {
    setFloorKey(next.key);
    setSelected(target?.id || "");
    setQuery("");
    setMode("floor");
    setImageError(false);
    viewRef.current = next.viewBox;
    if (focus) move(floorCamera(next.viewBox, target));
  }
  function zoom(factor: number) {
    move({ ...cameraRef.current, zoom: cameraRef.current.zoom * factor });
  }
  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerTarget.current = (event.target as Element).getAttribute(
      "data-map-room",
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    dragged.current = false;
    movement.current = 0;
    if (pointers.current.size === 2) {
      dragged.current = true;
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        camera: cameraRef.current,
      };
    }
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x,
      dy = event.clientY - previous.y;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    movement.current += Math.abs(dx) + Math.abs(dy);
    if (movement.current > 5) dragged.current = true;
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      move({
        ...pinch.current.camera,
        zoom:
          (pinch.current.camera.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
          pinch.current.distance,
      });
    } else {
      const bounds = event.currentTarget.getBoundingClientRect(),
        current = cameraRef.current;
      const scale = Math.min(
        bounds.width / (viewRef.current[2] / current.zoom),
        bounds.height / (viewRef.current[3] / current.zoom),
      );
      move({
        ...current,
        x: current.x - dx / scale,
        y: current.y - dy / scale,
      });
    }
  }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.type !== "pointercancel" &&
      !dragged.current &&
      pointers.current.size === 1 &&
      pointerTarget.current &&
      floor
    ) {
      const hit = floor.rooms.find((item) => item.id === pointerTarget.current);
      if (hit) openFloor(floor, hit, false);
    }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }
  useEffect(() => {
    const element = canvas.current;
    if (!element || !data) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = cameraRef.current;
      const next = constrainCamera(
        {
          ...current,
          zoom: current.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12),
        },
        viewRef.current,
      );
      cameraRef.current = next;
      setCamera(next);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [data]);
  const visibleWidth = viewBox[2] / camera.zoom,
    visibleHeight = viewBox[3] / camera.zoom;
  const svgViewBox = `${camera.x - visibleWidth / 2} ${camera.y - visibleHeight / 2} ${visibleWidth} ${visibleHeight}`;
  const changeBuilding = (building: string) => {
    const next =
      data?.floors.find(
        (item) => item.building === building && item.floor === floor?.floor,
      ) ||
      data?.floors.find(
        (item) => item.building === building && item.floor === "1",
      ) ||
      data?.floors.find((item) => item.building === building);
    if (next) openFloor(next);
  };
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
                {results
                  .slice(0, 12)
                  .map(({ floor: resultFloor, room: resultRoom }) => (
                    <button
                      key={resultFloor.key + resultRoom.id}
                      onClick={() => openFloor(resultFloor, resultRoom)}
                    >
                      <MapPin size={18} />
                      <span>
                        <strong>{resultRoom.name}</strong>
                        <small>{resultFloor.name}</small>
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="indoor-location-controls">
            <div className="segmented" aria-label="Вид карты">
              <button
                className={mode === "floor" ? "active" : ""}
                aria-pressed={mode === "floor"}
                onClick={() => {
                  setMode("floor");
                  if (floor) {
                    viewRef.current = floor.viewBox;
                    move(floorCamera(floor.viewBox, point));
                  }
                }}
              >
                План этажа
              </button>
              <button
                className={mode === "campus" ? "active" : ""}
                aria-pressed={mode === "campus"}
                onClick={() => {
                  setMode("campus");
                  viewRef.current = campusViewBox;
                  move(floorCamera(campusViewBox));
                }}
              >
                Кампус
              </button>
            </div>
            <label>
              <span>Корпус</span>
              <select
                aria-label="Корпус на карте"
                value={floor?.building || ""}
                onChange={(event) => changeBuilding(event.target.value)}
              >
                {data.buildings
                  .filter((building) =>
                    data.floors.some((item) => item.building === building.id),
                  )
                  .map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Этаж</span>
              <select
                aria-label="Этаж на карте"
                value={floor?.floor || ""}
                onChange={(event) => {
                  const next = data.floors.find(
                    (item) =>
                      item.building === floor?.building &&
                      item.floor === event.target.value,
                  );
                  if (next) openFloor(next);
                }}
              >
                {data.floors
                  .filter((item) => item.building === floor?.building)
                  .map((item) => (
                    <option key={item.key} value={item.floor}>
                      {data.buildings
                        .find((building) => building.id === item.building)
                        ?.floors.find((level) => level.id === item.floor)
                        ?.name || item.floor}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="indoor-map-area">
            <div
              ref={canvas}
              className="indoor-canvas"
              tabIndex={0}
              role="group"
              aria-label={
                mode === "campus"
                  ? "Схема кампуса"
                  : `План: ${floor?.name}. Перемещайте карту стрелками, масштаб — кнопками плюс и минус.`
              }
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              onKeyDown={(event) => {
                const stepX = visibleWidth * 0.12,
                  stepY = visibleHeight * 0.12;
                if (
                  [
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "+",
                    "=",
                    "-",
                  ].includes(event.key)
                )
                  event.preventDefault();
                if (event.key === "ArrowLeft")
                  move({ ...cameraRef.current, x: camera.x - stepX });
                if (event.key === "ArrowRight")
                  move({ ...cameraRef.current, x: camera.x + stepX });
                if (event.key === "ArrowUp")
                  move({ ...cameraRef.current, y: camera.y - stepY });
                if (event.key === "ArrowDown")
                  move({ ...cameraRef.current, y: camera.y + stepY });
                if (event.key === "+" || event.key === "=") zoom(1.3);
                if (event.key === "-") zoom(1 / 1.3);
              }}
            >
              <svg
                viewBox={svgViewBox}
                className="indoor-svg"
                aria-hidden="true"
              >
                <image
                  href={
                    mode === "campus" ? "/maps/mgimo-moscow.svg" : floor?.svg
                  }
                  x={viewBox[0]}
                  y={viewBox[1]}
                  width={viewBox[2]}
                  height={viewBox[3]}
                  onError={() => setImageError(true)}
                />
                {mode === "floor" &&
                  floor?.rooms
                    .filter(
                      (item) =>
                        roomIsVisible(item, floor) &&
                        ["1", "2", "3", "4", "44", "6", "7", "8"].includes(
                          item.type,
                        ),
                    )
                    .map((item) => (
                      <rect
                        key={item.id}
                        data-map-room={item.id}
                        x={item.box.x}
                        y={item.box.y}
                        width={item.box.width}
                        height={item.box.height}
                        fill="transparent"
                        className="indoor-hotspot"
                        onClick={() => {
                          if (!dragged.current) openFloor(floor, item, false);
                        }}
                      />
                    ))}
                {mode === "floor" &&
                  point &&
                  floor &&
                  roomIsVisible(point, floor) && (
                    <rect
                      data-selected-room={point.id}
                      x={point.box.x - 4}
                      y={point.box.y - 4}
                      width={point.box.width + 8}
                      height={point.box.height + 8}
                      fill="#0050cf24"
                      stroke="#0050cf"
                      strokeWidth={visibleWidth / 190}
                      rx={visibleWidth / 150}
                      pointerEvents="none"
                    />
                  )}
              </svg>
              {imageError && (
                <div className="indoor-image-error" role="alert">
                  План не загрузился. Выберите другой этаж или откройте карту
                  заново.
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
                disabled={camera.zoom >= 8}
                onClick={() => zoom(1.3)}
              >
                <Plus size={20} />
              </button>
              <span aria-live="polite">{Math.round(camera.zoom * 100)}%</span>
              <button
                className="icon-btn"
                aria-label="Уменьшить карту"
                disabled={camera.zoom <= 1}
                onClick={() => zoom(1 / 1.3)}
              >
                <Minus size={20} />
              </button>
              <button
                className="icon-btn"
                aria-label="Показать весь этаж"
                onClick={() => move(floorCamera(viewBox))}
              >
                <Expand size={19} />
              </button>
            </div>
            {showCalendar &&
              point &&
              floor &&
              ["2", "3"].includes(point.type) && (
                <RoomCalendar
                  roomKey={floor.key + ":" + point.id}
                  roomName={point.name}
                  close={() => setShowCalendar(false)}
                />
              )}
          </div>
          <footer className="indoor-footer">
            <div className="indoor-selected">
              <span className="indoor-selected-icon">
                {point && mode === "floor" ? (
                  <MapPin size={21} />
                ) : (
                  <Building2 size={21} />
                )}
              </span>
              <div>
                <strong>
                  {mode === "campus"
                    ? "Московский кампус"
                    : point
                      ? point.name
                      : floor?.name}
                </strong>
                <p>
                  {mode === "campus"
                    ? "Выберите корпус и этаж, чтобы открыть план."
                    : point
                      ? `${floor?.name} · выделено синим`
                      : "Найдите аудиторию по номеру или нажмите на помещение."}
                </p>
              </div>
              {point && mode === "floor" && ["2", "3"].includes(point.type) && (
                <button
                  className="indoor-calendar-button"
                  aria-label="Занятость аудитории"
                  aria-controls="room-calendar-pane"
                  aria-expanded={showCalendar}
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarDays size={17} />
                  <span>Занятость</span>
                </button>
              )}
              {point && mode === "floor" && (
                <button
                  className="indoor-focus"
                  onClick={() => move(floorCamera(viewBox, point))}
                >
                  <MapPin size={16} />
                  Показать
                </button>
              )}
            </div>
            <div className="indoor-source">
              <small>
                Схемы:{" "}
                <a
                  href="https://mgimo.ru/territory/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Портал МГИМО
                </a>{" "}
                · {data.source_capture_date.split("-").reverse().join(".")}
              </small>
            </div>
          </footer>
        </>
      )}
    </dialog>
  );
}
