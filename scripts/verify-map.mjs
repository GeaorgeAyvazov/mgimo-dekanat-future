import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  constrainCamera,
  floorCamera,
  searchMapRooms,
} from "../lib/indoor-map.ts";
const base = process.env.PORTAL_TEST_URL || "http://127.0.0.1:5173";
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}
const response = await fetch(base + "/maps/indoor.json");
check(
  "Local map catalog served as JSON",
  response.ok &&
    response.headers.get("content-type")?.includes("application/json"),
);
const map = await response.json();
check(
  "31 actual Moscow floor plans available",
  map.campus === "moscow" && map.floors.length === 31,
);
check("No missing source plans", map.missing?.length === 0);
const exact = searchMapRooms(map, "2009");
check(
  "Exact classroom search ranks correct real room first",
  exact[0]?.floor.key === "b2" && exact[0]?.room.id === "2009",
);
check(
  "Unknown classroom returns empty results",
  searchMapRooms(map, "небывающаяаудитория").length === 0,
);
check(
  "Search by place name works",
  searchMapRooms(map, "библиотека").length > 0,
);
const floor = exact[0].floor,
  point = exact[0].room;
const camera = floorCamera(floor.viewBox, point);
const [x, y, w, h] = floor.viewBox;
const cx = point.box.x + point.box.width / 2,
  cy = point.box.y + point.box.height / 2;
check(
  "Opening classroom puts it inside the visible map",
  Math.abs(cx - camera.x) <= w / camera.zoom / 2 &&
    Math.abs(cy - camera.y) <= h / camera.zoom / 2,
);
const bounded = constrainCamera(
  { x: -1000000, y: 1000000, zoom: 100 },
  floor.viewBox,
);
check(
  "Dragging and zoom cannot leave map bounds",
  bounded.zoom === 8 && bounded.x >= x && bounded.y <= y + h,
);
const fit = constrainCamera({ x: -100, y: 100000, zoom: 0.1 }, floor.viewBox);
check(
  "Reset fits the whole floor",
  fit.zoom === 1 && fit.x === x + w / 2 && fit.y === y + h / 2,
);
const served = await Promise.all(
  map.floors.map(async (level) => {
    const result = await fetch(base + level.svg);
    const svg = await result.text();
    return {
      key: level.key,
      valid:
        result.ok &&
        result.headers.get("content-type")?.includes("image/svg+xml") &&
        svg.includes("</svg>"),
    };
  }),
);
check(
  "Every referenced floor SVG is served without HTML fallback",
  served.every((item) => item.valid),
);
for (const account of ["maxim.demo", "alina.demo"]) {
  const cookies = new Map();
  const login = await fetch(base + "/api/portal/login", {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      "X-Dekanat-Request": "1",
    },
    body: JSON.stringify({ login: account, password: "Student2026!" }),
  });
  for (const entry of login.headers.getSetCookie()) {
    const pair = entry.split(";")[0];
    cookies.set(pair.split("=")[0], pair);
  }
  check(account + " can load schedule", login.status === 200);
  const schedule = await (
    await fetch(base + "/api/portal/overview", {
      headers: { Cookie: [...cookies.values()].join("; ") },
    })
  ).json();
  check(
    account + " lessons all link to genuine labeled rooms",
    schedule.lessons.every((lesson) => {
      const [key, id] = lesson.roomId.split(":");
      return map.floors
        .find((level) => level.key === key)
        ?.rooms.some((item) => item.id === id && item.name === lesson.room);
    }),
  );
}
mkdirSync("outputs", { recursive: true });
const report = process.env.PORTAL_MAP_REPORT || "outputs/map-checks.json";
writeFileSync(
  report,
  JSON.stringify({ base, passed: checks.length, checks }, null, 2),
);
console.log(JSON.stringify({ base, passed: checks.length, report }));
