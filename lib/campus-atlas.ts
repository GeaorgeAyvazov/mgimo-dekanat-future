import { closed, pairs } from "./campus-passages.json";
import {
  constrainCamera,
  roomIsVisible,
  type Camera,
  type IndoorMap,
  type MapFloor,
  type MapRoom,
} from "./indoor-map";

export const atlasBounds: MapFloor["viewBox"] = [0, 0, 6700, 2240];
export const atlasMaxZoom = 32;

type Placement = [x: number, y: number, scale: number];

const placements: Record<string, Placement> = {
  a: [210, 1591, 0.75],
  b: [790, 650, 0.357],
  v: [2000, 1040, 0.34],
  g: [3495, 680, 0.345],
  n: [5140, 1320, 1.08],
  l: [3720, 110, 0.29],
  d: [5078, 539, 0.26],
};

const colors: Record<string, string> = {
  a: "#e9edf9",
  b: "#e4edf8",
  v: "#e2efe9",
  g: "#eee9f7",
  n: "#f2eadc",
  l: "#e7edf1",
  d: "#f3e9e3",
};

// The public SVGs have different scales. Fit each wing by its passage
// markers, using only translation and uniform scaling.
const alignedFloors: Record<string, Placement> = {
  b2: [1095, 485, 0.3664],
  b3: [1081, 472, 0.3702],
  b4: [1076, 469, 0.3725],
  v2: [2000, 1040, 0.38],
  v3: [2000, 1040, 0.38],
  v4: [2000, 1040, 0.38],
  g2: [3455, 678, 0.3609],
  g3: [3455, 676, 0.3629],
  g4: [3473, 674, 0.3656],
  n3: [4806, 1433, 1],
  n4: [4815, 1416, 0.29],
  n5: [4841, 1385, 0.29],
};

export function atlasLevel(floor: MapFloor) {
  // Б1 connects to А2, Г1 to the cafeteria's 2nd floor, Г2 to Н3.
  return ["a", "d", "n"].includes(floor.building)
    ? String(Number(floor.floor) - 1)
    : floor.floor;
}

export function atlasPlacement(floor: MapFloor) {
  const [x, y, scale] = alignedFloors[floor.key] || placements[floor.building];
  const [vx, vy, vw, vh] = floor.viewBox;
  return {
    x,
    y,
    width: vw * scale,
    height: vh * scale,
    color: colors[floor.building],
    scale,
    vx,
    vy,
  };
}

export function atlasRoomBox(floor: MapFloor, room: MapRoom) {
  const p = atlasPlacement(floor);
  return {
    x: p.x + (room.box.x - p.vx) * p.scale,
    y: p.y + (room.box.y - p.vy) * p.scale,
    width: room.box.width * p.scale,
    height: room.box.height * p.scale,
  };
}

export function atlasCamera(floor?: MapFloor, room?: MapRoom): Camera {
  if (floor && room) {
    const box = atlasRoomBox(floor, room);
    return constrainCamera(
      {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        zoom: Math.min(20, atlasBounds[2] / Math.max(350, box.width * 4.5)),
      },
      atlasBounds,
      atlasMaxZoom,
    );
  }
  if (floor) {
    const p = atlasPlacement(floor);
    return constrainCamera(
      { x: p.x + p.width / 2, y: p.y + p.height / 2, zoom: 3.5 },
      atlasBounds,
      atlasMaxZoom,
    );
  }
  return { x: atlasBounds[2] / 2, y: atlasBounds[3] / 2, zoom: 1 };
}

// Paired endpoints from the source plans. Widths fit the corridor mouths
// on this schematic. The original plan layers cover the strokes at the ends.

export function isClosedPassage(key: string) {
  return closed.includes(key);
}

export function locateRoom(map: IndoorMap, key: string) {
  const [floorKey, id] = key.split(":");
  const floor = map.floors.find((item) => item.key === floorKey);
  const room = floor?.rooms.find((item) => item.id === id);
  return floor && room && roomIsVisible(room, floor)
    ? { floor, room }
    : undefined;
}

export function atlasPassages(map: IndoorMap, level: string) {
  return pairs.flatMap(({ from, to, width }) => {
    const a = locateRoom(map, from),
      b = locateRoom(map, to);
    if (
      !a ||
      !b ||
      atlasLevel(a.floor) !== level ||
      atlasLevel(b.floor) !== level
    )
      return [];
    const start = atlasRoomBox(a.floor, a.room);
    const end = atlasRoomBox(b.floor, b.room);
    const path = `M ${start.x + start.width / 2} ${start.y + start.height / 2} L ${end.x + end.width / 2} ${end.y + end.height / 2}`;
    return [{ from, to, path, width }];
  });
}

export function passageDestination(key: string) {
  if (key === "a1:go_a1_b1") return "b1:go_b1_a1";
  if (key === "a2:go_a2_a1dininghall") return "a1:a1_dining_hall";
  const pair = pairs.find(({ from, to }) => from === key || to === key);
  return pair && (pair.from === key ? pair.to : pair.from);
}

export function firstFloorStairDirection(floor: MapFloor, room: MapRoom) {
  if (floor.floor !== "1" || !room.id.startsWith("staircase_")) return null;
  // These source markers are descents, a fire stair or a side passage.
  const special = /^(staircase_g_1_[456]|staircase_v_1_3|staircase_eda_1_3)$/;
  return special.test(room.id) ? "neutral" : "up";
}
