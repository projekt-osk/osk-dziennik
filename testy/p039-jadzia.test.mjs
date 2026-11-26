// P-039 (Jadzia): testy celowane – „woli 3 h” (generator) i ostrzeżenie „brak jazd w tygodniu” (ostrzTydz: Grafik weekMin + generator).
// Jeden kursant (ID_002, zmieniane saldo/dostępność) + ID_004 jako właściciel stałych jazd; Math.random z ziarnem.
import assert from "node:assert/strict";
import { przypadek, start, strona } from "./srodowisko.mjs";

const WSZYSTKIE = { 0: [[480, 1200]], 1: [[480, 1200]], 2: [[480, 1200]], 3: [[480, 1200]], 4: [[480, 1200]] };

/** Układ: S.K = {ID_002 (parametry p), ID_004}, S.J = stałe jazdy p.fixed; generuj(from,to). Zwraca {jazdy, warns, week}. */
const gen = (p) => strona().evaluate((p) => {
  let x = 12345; Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const b = S.K.ID_002, o4 = S.K.ID_004;
  const k = { ...b, saldo_przed: p.saldo ?? 12, dostepnosc: p.dost ?? { 0: [[480, 1200]], 1: [[480, 1200]], 2: [[480, 1200]], 3: [[480, 1200]], 4: [[480, 1200]] }, wyjatki: p.wyjatki ?? [] };
  delete k.woli_3h;
  if (p.woli === true) k.woli_3h = true; else if (p.woli === false) k.woli_3h = false;
  S.K = { ID_002: k, ID_004: o4 };
  S.J = {};
  (p.fixed || []).forEach((f, i) => { S.J["F" + i] = { id: "F" + i, data: f.data, od: f.od, do: f.od + f.h * 60, h: f.h, kursant: "ID_004", rodzaj: "dodatkowa", status: "zaplanowana", uwagi: "" }; });
  if (p.instWyj) S.INST = { ...S.INST, wyjatki: p.instWyj };
  const r = generuj(p.from, p.to);
  return { jazdy: r.created.map((j) => ({ data: j.data, od: j.od, h: j.h })).sort((a, c) => a.data.localeCompare(c.data) || a.od - c.od), warns: r.warns.filter((w) => w.includes(lab("ID_002"))),
    week: p.week ? weekMin(p.week).map((e) => e.k.id) : null };
}, p);
const DWA_TYG = { from: "2026-11-30", to: "2026-12-13" };
const godz = (r) => r.jazdy.map((j) => j.h);

await przypadek("A1 – kursant < 8 h z checkboxem nigdy nie dostaje 3 h (też przy przekroczeniu 8 h w tygodniu)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  for (const saldo of [0, 5, 7]) {
    const r = await gen({ ...DWA_TYG, saldo, woli: true });
    assert.ok(r.jazdy.length >= 5, `saldo ${saldo}: za mało propozycji ${godz(r)}`);
    let przed = saldo;
    for (const j of r.jazdy) {
      if (przed < 8) assert.ok(j.h <= 2, `saldo ${saldo}: jazda zaczynająca się po ${przed} h ma ${j.h} h (${godz(r)})`);
      przed += j.h;
    }
    if (saldo === 7) assert.ok(godz(r).slice(1).includes(3), "po przekroczeniu 8 h checkbox powinien dawać 3 h: " + godz(r));
  }
});

await przypadek("A2 – po 8 h, gdy 3 h mieści się w dniu: 3 h (bez checkboxa: 2 h)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  for (const saldo of [8, 12]) {
    const t = await gen({ from: "2026-12-01", to: "2026-12-01", saldo, woli: true });
    assert.deepEqual(godz(t), [3], `saldo ${saldo}, woli: ${godz(t)}`);
    const n = await gen({ from: "2026-12-01", to: "2026-12-01", saldo, woli: false });
    assert.deepEqual(godz(n), [2], `saldo ${saldo}, bez woli: ${godz(n)}`);
  }
});

await przypadek("A3 – po 8 h, gdy 3 h się nie mieści (limit dnia / okno): 2 h; okno 3 h = 3 h", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const dzien = { from: "2026-12-01", to: "2026-12-01", saldo: 12, woli: true };
  const pn = { from: "2026-11-30", to: "2026-11-30", saldo: 12, woli: true };   // pn 30.11: jeszcze bez reguły przerwy (od 1.12)
  const limit = await gen({ ...pn, dost: { 0: [[480, 1200]] }, fixed: [{ data: "2026-11-30", od: 480, h: 3 }, { data: "2026-11-30", od: 660, h: 3 }, { data: "2026-11-30", od: 840, h: 2 }] }); // 8 h stałych: 8+3 > 10
  assert.deepEqual(godz(limit), [2], "limit dnia (8 h + 3 h > 10 h): " + JSON.stringify(limit.jazdy));
  const okno2 = await gen({ ...dzien, dost: { 1: [[600, 720]] } });
  assert.deepEqual(godz(okno2), [2], "okno kursanta 2 h: " + JSON.stringify(okno2.jazdy));
  const okno3 = await gen({ ...dzien, dost: { 1: [[600, 780]] } });
  assert.deepEqual(godz(okno3), [3], "okno kursanta 3 h (kontrola): " + JSON.stringify(okno3.jazdy));
});

await przypadek("A4 – końcówka do 30 h: bez zostawiania 1 h, suma = reszta (z checkboxem i bez)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  for (const woli of [true, false]) for (let saldo = 20; saldo <= 29; saldo++) {
    const r = await gen({ ...DWA_TYG, saldo, woli }), h = godz(r), suma = h.reduce((a, b) => a + b, 0);
    assert.equal(suma, 30 - saldo, `saldo ${saldo}, woli ${woli}: suma ${suma} ≠ ${30 - saldo} (${h})`);
    if (saldo < 29) assert.ok(!h.includes(1), `saldo ${saldo}, woli ${woli}: nie powinno być 1 h (${h})`);
  }
  assert.deepEqual(godz(await gen({ ...DWA_TYG, saldo: 27, woli: true })), [3], "27 h → jedna jazda 3 h");
  assert.deepEqual(godz(await gen({ ...DWA_TYG, saldo: 26, woli: true })), [2, 2], "26 h → 2+2");
  assert.deepEqual(godz(await gen({ ...DWA_TYG, saldo: 29, woli: true })), [1], "29 h → dokładnie 1 h");
});

await przypadek("A5 – checkbox wyłączony = brak pola (to samo ziarno)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  // jeden kursant po 8 h, dwa tygodnie
  const a = await gen({ ...DWA_TYG, saldo: 12 }), b = await gen({ ...DWA_TYG, saldo: 12, woli: false }), c = await gen({ ...DWA_TYG, saldo: 12, woli: true });
  assert.deepEqual(b, a, "false ≠ brak pola");
  assert.notDeepEqual(c, a, "kontrola: włączony checkbox powinien zmienić wynik");
  // dane podstawowe, wszyscy kursanci: brak pola vs false
  const calosc = (ustaw) => strona().evaluate((ustaw) => {
    let x = 12345; Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;
    for (const id in S.K) { const k = { ...S.K[id] }; delete k.woli_3h; if (ustaw === "false") k.woli_3h = false; S.K[id] = k; }
    return generuj("2026-11-30", "2026-12-13").created.map((j) => `${j.kursant}|${j.data}|${j.od}|${j.h}`).sort();
  }, ustaw);
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });   // świeże dane (gen() podmienia S.K)
  const brak = await calosc("brak");
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const nie = await calosc("false");
  assert.ok(brak.length > 0);
  assert.deepEqual(nie, brak, "dane podstawowe: false ≠ brak pola");
});

const PON = "2026-12-07";
await przypadek("B6 – urlop kursanta pn–pt: brak ostrzeżenia „brak jazd w tygodniu” (Grafik i generator)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const bazowy = { from: "2026-12-07", to: "2026-12-13", fixed: [{ data: PON, od: 480, h: 3 }, { data: PON, od: 660, h: 3 }, { data: PON, od: 840, h: 2 }], dost: { 0: [[480, 1200]] }, week: PON };
  const baza = await gen(bazowy);                                     // dostępny tylko w pn, dzień zapełniony → ostrzeżenie
  assert.ok(baza.week.includes("ID_002") && baza.warns.length === 1, "kontrola: bez urlopu ostrzeżenie powinno być: " + JSON.stringify(baza));
  const urlop = await gen({ ...bazowy, wyjatki: [{ od: PON, do: "2026-12-11", okna: [] }] });
  assert.ok(!urlop.week.includes("ID_002"), "Grafik: urlop pn–pt – bez ostrzeżenia");
  assert.deepEqual(urlop.warns, [], "generator: urlop pn–pt – bez ostrzeżenia");
});

await przypadek("B7 – kursant dostępny tylko w dzień z całodniowym wyjątkiem instruktora: brak ostrzeżenia", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const sw = (d) => ({ data: d, okna: [], powod: "święto" });
  const bazowy = { from: "2026-12-07", to: "2026-12-13", dost: { 0: [[480, 1200]] }, week: PON };
  const wolne = await gen({ ...bazowy, instWyj: [sw(PON)] });
  assert.ok(!wolne.week.includes("ID_002"), "Grafik: jedyny dzień kursanta to wolne instruktora – bez ostrzeżenia");
  assert.deepEqual(wolne.warns, [], "generator: bez ostrzeżenia");
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const inny = await gen({ ...bazowy, instWyj: [sw("2026-12-09")], fixed: [{ data: PON, od: 480, h: 3 }, { data: PON, od: 660, h: 3 }, { data: PON, od: 840, h: 2 }] });
  assert.ok(inny.week.includes("ID_002"), "kontrola: wolne w inny dzień niż dostępność kursanta – ostrzeżenie zostaje (Grafik)");
  assert.equal(inny.warns.length, 1, "kontrola: generator – ostrzeżenie zostaje");
});

await przypadek("B8 – kursant dostępny w zwykły dzień, a jazdy nie ma: ostrzeżenie jest (Grafik i generator)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const r = await gen({ from: "2026-12-07", to: "2026-12-13", dost: { 2: [[480, 1200]] }, week: PON,   // dostępny w środę; środa zapełniona 10 h → generator nie ma gdzie
    fixed: [{ data: "2026-12-09", od: 480, h: 3 }, { data: "2026-12-09", od: 660, h: 3 }, { data: "2026-12-09", od: 840, h: 2 }, { data: "2026-12-09", od: 960, h: 2 }] });
  assert.ok(r.week.includes("ID_002"), "Grafik: kursant dostępny w środę, brak jazdy – ostrzeżenie powinno być");
  assert.equal(r.warns.length, 1, "generator: ostrzeżenie powinno być: " + JSON.stringify(r));
  assert.deepEqual(r.jazdy, [], "kontrola: generator nie powinien nic ułożyć");
});
