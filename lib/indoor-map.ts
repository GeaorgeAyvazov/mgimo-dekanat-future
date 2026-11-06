export type MapRoom = {
  id: string;
  name: string;
  type: string;
  box: { x: number; y: number; width: number; height: number };
};
export type MapFloor = {
  key: string;
  building: string;
  floor: string;
  name: string;
  svg: string;
  viewBox: [number, number, number, number];
  rooms: MapRoom[];
};
export type IndoorMap = {
  source: string;
  source_capture_date: string;
  buildings: {
    id: string;
    name: string;
    floors: { id: string; name: string }[];
  }[];
  floors: MapFloor[];
};
export type Camera = { x: number; y: number; zoom: number };
export const campusViewBox: MapFloor["viewBox"] = [0, 0, 378.74864, 160.99349];
export function constrainCamera(
  camera: Camera,
  viewBox: MapFloor["viewBox"],
): Camera {
  const [x, y, width, height] = viewBox;
  const zoom = Math.min(
    8,
    Math.max(1, Number.isFinite(camera.zoom) ? camera.zoom : 1),
  );
  const halfWidth = width / zoom / 2,
    halfHeight = height / zoom / 2;
  return {
    zoom,
    x: Math.max(x + halfWidth, Math.min(x + width - halfWidth, camera.x)),
    y: Math.max(y + halfHeight, Math.min(y + height - halfHeight, camera.y)),
  };
}
export function floorCamera(
  viewBox: MapFloor["viewBox"],
  room?: MapRoom,
): Camera {
  const [x, y, width, height] = viewBox;
  return constrainCamera(
    room
      ? {
          x: room.box.x + room.box.width / 2,
          y: room.box.y + room.box.height / 2,
          zoom: 3,
        }
      : { x: x + width / 2, y: y + height / 2, zoom: 1 },
    viewBox,
  );
}
export function roomIsVisible(room: MapRoom, floor: MapFloor) {
  const [x, y, width, height] = floor.viewBox,
    box = room.box;
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.x + box.width > x &&
    box.y + box.height > y &&
    box.x < x + width &&
    box.y < y + height
  );
}
function normalize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function searchMapRooms(map: IndoorMap, query: string) {
  const q = normalize(query).replace(/туалет\S*/g, "wc");
  if (!q) return [];
  const words = q.split(" ");
  return map.floors
    .flatMap((floor) =>
      floor.rooms
        .filter(
          (room) =>
            roomIsVisible(room, floor) &&
            words.every((word) =>
              normalize(
                `${room.name} ${floor.name} ${room.type === "2" || room.type === "3" ? "аудитория" : ""}`,
              ).includes(word),
            ),
        )
        .map((room) => ({ floor, room })),
    )
    .sort(
      (a, b) =>
        Number(normalize(b.room.name) === q) -
          Number(normalize(a.room.name) === q) ||
        Number(normalize(b.room.name).startsWith(q)) -
          Number(normalize(a.room.name).startsWith(q)) ||
        a.room.name.localeCompare(b.room.name, "ru", { numeric: true }),
    );
}
