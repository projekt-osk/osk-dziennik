// BUG-036: generator dokłada jazdę po 3 stykających się jazdach stałych (od 1.12) – start po przerwie 30 min.
import assert from "node:assert/strict";
import { przypadek, start, strona } from "./srodowisko.mjs";

const gen = (p) => strona().evaluate((p) => {
  let x = 12345; Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const b = S.K.ID_002, o4 = S.K.ID_004;
  const k = { ...b, saldo_przed: 12, dostepnosc: { 0: [[480, 1200]], 1: [[480, 1200]], 2: [[480, 1200]], 3: [[480, 1200]], 4: [[480, 1200]] }, wyjatki: [] };
  delete k.woli_3h; if (p.woli !== undefined) k.woli_3h = p.woli;
  S.K = { ID_002: k, ID_004: o4 }; S.J = {};
  p.fixed.forEach((f, i) => { S.J["F" + i] = { id: "F" + i, data: p.data, od: f[0], do: f[1], h: (f[1] - f[0]) / 60, kursant: "ID_004", rodzaj: "dodatkowa", status: "zaplanowana", uwagi: "" }; });
  const r = generuj(p.data, p.data);
  return r.created.map((j) => ({ od: j.od, h: j.h })).sort((a, c) => a.od - c.od);
}, p);

await przypadek("BUG-036 – 3 stykające się jazdy stałe: 4. jazda po przerwie 30 min (od 1.12), bez przerwy przed 1.12", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const U = { "8-14": [[480, 600], [600, 720], [720, 840]], "8-16": [[480, 660], [660, 840], [840, 960]] };
  for (const woli of [undefined, true, false]) for (const [nazwa, fixed] of Object.entries(U)) {
    const kon = fixed[2][1];
    const po = await gen({ data: "2026-12-01", fixed, woli });
    assert.ok(po.length >= 1, `1.12 ${nazwa} woli ${woli}: brak propozycji`);
    assert.equal(po[0].od, kon + 30, `1.12 ${nazwa} woli ${woli}: start ${po[0].od}, oczekiwano ${kon + 30} (${JSON.stringify(po)})`);
    const przed = await gen({ data: "2026-11-30", fixed, woli });
    assert.ok(przed.length >= 1 && przed[0].od === kon, `30.11 ${nazwa} woli ${woli}: bez przerwy, ${JSON.stringify(przed)}`);
  }
});
