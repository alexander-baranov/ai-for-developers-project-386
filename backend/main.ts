import { openDb, parseDuration, isValidStart, fitsInWindow } from "./db.ts";

const PORT = Number(Deno.env.get("PORT") ?? "7999");
const db = openDb();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const { pathname } = url;

  // --- meeting types ---
  if (pathname === "/api/meeting-types" && req.method === "GET") {
    const rows = db.prepare("SELECT id, name, description, duration FROM meeting_types ORDER BY id").values<unknown[]>();
    return json(rows.map(([id, name, description, duration]) => ({ id, name, description, duration })));
  }
  if (pathname === "/api/meeting-types" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body?.name || !body?.duration) return json({ error: "name and duration required" }, 400);
    if (parseDuration(body.duration) === null) return json({ error: "duration must be HH:MM multiple of 15min" }, 400);
    const stmt = db.prepare("INSERT INTO meeting_types (name, description, duration) VALUES (?, ?, ?)");
    stmt.run(String(body.name), String(body.description ?? ""), String(body.duration));
    const id = db.lastInsertRowId;
    return json({ id, name: body.name, description: body.description ?? "", duration: body.duration }, 201);
  }
  const mtDel = pathname.match(/^\/api\/meeting-types\/(\d+)$/);
  if (mtDel && req.method === "DELETE") {
    db.prepare("DELETE FROM meeting_types WHERE id = ?").run(mtDel[1]);
    return new Response(null, { status: 204 });
  }

  // --- slots ---
  if (pathname === "/api/slots" && req.method === "GET") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let rows: unknown[][];
    if (from && to) {
      rows = db.prepare("SELECT id, start_at, duration, description FROM slots WHERE start_at >= ? AND start_at < ? ORDER BY start_at").values<unknown[]>([from, to]);
    } else {
      const now = new Date().toISOString();
      rows = db.prepare("SELECT id, start_at, duration, description FROM slots WHERE start_at >= ? ORDER BY start_at").values<unknown[]>([now]);
    }
    return json(rows.map(([id, start_at, duration, description]) => ({ id, start_at, duration, description })));
  }
  if (pathname === "/api/slots" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body?.start_at || !body?.duration) return json({ error: "start_at and duration required" }, 400);
    const durMins = parseDuration(String(body.duration));
    if (durMins === null) return json({ error: "bad duration" }, 400);
    const start = new Date(String(body.start_at));
    if (Number.isNaN(+start)) return json({ error: "bad start_at, use UTC ISO" }, 400);
    if (!isValidStart(start) || !fitsInWindow(start, durMins)) {
      return json({ error: "outside 09:00-18:00 or not 15min step" }, 400);
    }
    const startMs = +start;
    const endMs = startMs + durMins * 60_000;
    // overlap check
    const existing = db.prepare("SELECT start_at, duration FROM slots").values<[string, string]>();
    for (const [s, d] of existing) {
      const em = parseDuration(d) ?? 0;
      const sm = +new Date(s);
      if (overlaps(startMs, endMs, sm, sm + em * 60_000)) {
        return json({ error: "slot overlaps" }, 409);
      }
    }
    try {
      db.prepare("INSERT INTO slots (start_at, duration, description) VALUES (?, ?, ?)")
        .run(start.toISOString(), String(body.duration), String(body.description ?? ""));
      const id = db.lastInsertRowId;
      return json({ id, start_at: start.toISOString(), duration: body.duration, description: body.description ?? "" }, 201);
    } catch {
      return json({ error: "slot taken" }, 409);
    }
  }
  const slotDel = pathname.match(/^\/api\/slots\/(\d+)$/);
  if (slotDel && req.method === "DELETE") {
    db.prepare("DELETE FROM slots WHERE id = ?").run(slotDel[1]);
    return new Response(null, { status: 204 });
  }

  return json({ error: "not found" }, 404);
});
