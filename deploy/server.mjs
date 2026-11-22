import http from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8787);
const origin = new URL(process.env.PUBLIC_ORIGIN || "http://127.0.0.1:" + port).origin;
const state = path.resolve(process.env.DATA_DIR || path.join(root, "data"));
await mkdir(state, { recursive: true, mode: 0o700 });
const serverDir = path.join(root, "dist/server");
const config = JSON.parse(await readFile(path.join(serverDir, "wrangler.json"), "utf8"));
const entry = path.join(serverDir, config.main);
const chunks = (await readdir(serverDir, { recursive: true })).filter(name => name.endsWith(".js"))
  .map(name => path.join(serverDir, name)).filter(file => file !== entry);
const runtime = new Miniflare({
  host: "127.0.0.1", port: 0, cf: false, modulesRoot: serverDir,
  modules: [entry, ...chunks].map(file => ({ type: "ESModule", path: file })),
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  assets: { directory: path.join(root, "dist/client"), binding: "ASSETS", routerConfig: { has_user_worker: true } },
  d1Databases: ["DB"], d1Persist: state,
});
const db = await runtime.getD1Database("DB");
await db.prepare("CREATE TABLE IF NOT EXISTS portal_migrations (file TEXT PRIMARY KEY, digest TEXT NOT NULL)").run();
for (const name of (await readdir(path.join(root, "drizzle"))).filter(n => /^\d+_.+\.sql$/.test(n)).sort()) {
  const sql = (await readFile(path.join(root, "drizzle", name), "utf8")).replace(/\r\n/g, "\n");
  const digest = createHash("sha256").update(sql).digest("hex");
  const previous = await db.prepare("SELECT digest FROM portal_migrations WHERE file=?").bind(name).first();
  if (previous) {
    if (previous.digest !== digest) throw new Error("Changed migration: " + name);
    continue;
  }
  const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  await db.batch([...statements.map(s => db.prepare(s)), db.prepare("INSERT INTO portal_migrations VALUES (?,?)").bind(name, digest)]);
}

const server = http.createServer(async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value && !["host", "connection", "transfer-encoding", "cf-connecting-ip", "x-forwarded-for"].includes(key))
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    // Caddy supplies the client address on this loopback-only upstream.
    headers.set("cf-connecting-ip", String(req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(",").at(-1).trim());
    const url = new URL(origin);
    const target = new URL(req.url, origin);
    if (target.origin !== origin) { res.writeHead(400).end(); return; }
    url.pathname = target.pathname; url.search = target.search;
    const init = { method: req.method, headers, redirect: "manual" };
    if (!["GET", "HEAD"].includes(req.method)) Object.assign(init, { body: Readable.toWeb(req), duplex: "half" });
    const response = await runtime.dispatchFetch(url.href, init);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => { if (key !== "set-cookie") res.setHeader(key, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    if (response.body && req.method !== "HEAD") await pipeline(Readable.fromWeb(response.body), res);
    else res.end();
  } catch (error) {
    console.error("HTTP request failed:", error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
server.listen(port, "127.0.0.1", () => console.log("Portal listening at 127.0.0.1:" + port));
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  server.close(async () => { await runtime.dispose(); process.exit(0); });
});
