import { useEffect, useMemo, useState } from "preact/hooks";
import "./app.css";

type MeetingType = { id: number; name: string; description: string; duration: string };
type Slot = { id: number; start_at: string; duration: string; description: string };

const durToMin = (d: string) => { const [h, m] = d.split(":").map(Number); return h * 60 + m; };
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonday = () => {
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const dow = (n.getDay() + 6) % 7;
  n.setDate(n.getDate() - dow);
  return n;
};

export function App() {
  const [tab, setTab] = useState<"guest" | "owner">("guest");
  const [types, setTypes] = useState<MeetingType[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [day, setDay] = useState(dayKey(new Date()));
  const [desc, setDesc] = useState("");
  const [msg, setMsg] = useState("");
  // owner form
  const [name, setName] = useState(""); const [tdesc, setTdesc] = useState(""); const [tdur, setTdur] = useState("00:30");

  const load = async () => {
    const t = await (await fetch("/api/meeting-types")).json();
    setTypes(t); if (t.length && typeId === null) setTypeId(t[0].id);
    const now = new Date(); const to = new Date(+now + 14 * 864e5);
    const s = await (await fetch(`/api/slots?from=${now.toISOString()}&to=${to.toISOString()}`)).json();
    setSlots(s);
  };
  useEffect(() => { load(); }, []);

  const type = types.find((t) => t.id === typeId) ?? null;
  const days = useMemo(() => {
    const m = startOfMonday(); const today = dayKey(new Date());
    return Array.from({ length: 21 }, (_, i) => {
      const d = new Date(m); d.setDate(m.getDate() + i);
      const k = dayKey(d);
      const diff = Math.round((+new Date(k) - +new Date(today)) / 864e5);
      return { key: k, label: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "numeric" }), active: diff >= 0 && diff < 14 };
    });
  }, []);

  const daySlots = useMemo(() => {
    if (!type) return [];
    const dur = durToMin(type.duration);
    const busy = slots.map((s) => ({ s: +new Date(s.start_at), e: +new Date(s.start_at) + durToMin(s.duration) * 6e4 }));
    const out: { iso: string; time: string; taken: boolean }[] = [];
    for (let m = 9 * 60; m + dur <= 18 * 60; m += 15) {
      const dt = new Date(day + "T00:00:00Z"); dt.setUTCHours(0, m, 0, 0);
      // interpret day as UTC date + time; display local
      const s = +dt, e = s + dur * 6e4;
      const taken = busy.some((b) => s < b.e && b.s < e);
      const local = dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      out.push({ iso: dt.toISOString(), time: local, taken });
    }
    return out;
  }, [day, type, slots]);

  const book = async (iso: string) => {
    if (!type) return;
    const r = await fetch("/api/slots", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ start_at: iso, duration: type.duration, description: desc }) });
    setMsg(r.ok ? "Забронировано!" : `Ошибка ${r.status}: ${(await r.json()).error}`);
    load();
  };

  const createType = async () => {
    const r = await fetch("/api/meeting-types", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description: tdesc, duration: tdur }) });
    if (r.ok) { setName(""); setTdesc(""); load(); } else setMsg(`Ошибка: ${(await r.json()).error}`);
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1>Календарь звонков</h1>
      <div>
        <button onClick={() => setTab("guest")} disabled={tab === "guest"}>Гость</button>{" "}
        <button onClick={() => setTab("owner")} disabled={tab === "owner"}>Владелец</button>
      </div>
      {msg && <p>{msg}</p>}
      {tab === "guest" ? (
        <>
          <h2>1. Тип встречи</h2>
          <select value={typeId ?? ""} onChange={(e) => setTypeId(Number((e.target as HTMLSelectElement).value))}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.duration})</option>)}
          </select>
          {type?.description && <p style={{ color: "#555" }}>{type.description}</p>}
          <h2>2. День (ближайшие 14 дней)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {days.map((d) => (
              <button key={d.key} disabled={!d.active} onClick={() => setDay(d.key)}
                style={{ background: d.key === day ? "#bdf" : undefined, opacity: d.active ? 1 : 0.3, fontSize: 12, padding: 6 }}>
                {d.label}
              </button>
            ))}
          </div>
          <h2>3. Слот ({day})</h2>
          <input placeholder="Описание встречи" value={desc} onInput={(e) => setDesc((e.target as HTMLInputElement).value)} style={{ width: "100%", marginBottom: 8 }} />
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {daySlots.map((s) => (
              <button key={s.iso} disabled={s.taken} onClick={() => book(s.iso)}>
                {s.time}{s.taken ? " — занято" : ""}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>Предстоящие встречи</h2>
          <ul>{slots.map((s) => <li key={s.id}>{new Date(s.start_at).toLocaleString("ru-RU")} ({s.duration}) — {s.description} <button onClick={async () => { await fetch(`/api/slots/${s.id}`, { method: "DELETE" }); load(); }}>✕</button></li>)}</ul>
          <h2>Типы встреч</h2>
          <ul>{types.map((t) => <li key={t.id}>{t.name} ({t.duration}) — {t.description} <button onClick={async () => { await fetch(`/api/meeting-types/${t.id}`, { method: "DELETE" }); load(); }}>✕</button></li>)}</ul>
          <h3>Новый тип</h3>
          <input placeholder="Название" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /><br />
          <input placeholder="Описание" value={tdesc} onInput={(e) => setTdesc((e.target as HTMLInputElement).value)} /><br />
          <input placeholder="HH:MM" value={tdur} onInput={(e) => setTdur((e.target as HTMLInputElement).value)} /><br />
          <button onClick={createType}>Создать</button>
        </>
      )}
    </main>
  );
}
