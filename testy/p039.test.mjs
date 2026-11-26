// P-039: test dymny „woli 3 h” (wyłączony = jak dotąd) + ostrzeżenie „brak jazdy w tygodniu” bez dostępności kursanta.
import assert from "node:assert/strict";
import { przypadek, start, strona } from "./srodowisko.mjs";

const gen = (flaga) => strona().evaluate((flaga) => {
  let x = 12345; Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;   // powtarzalne losowanie
  if (flaga === "tak") S.K.ID_002 = { ...S.K.ID_002, woli_3h: true };
  else if (flaga === "nie") S.K.ID_002 = { ...S.K.ID_002, woli_3h: false };
  const r = generuj("2026-11-30", "2026-12-13");
  return r.created.map((j) => `${j.kursant}|${j.data}|${j.od}|${j.h}`).sort();
}, flaga);

await przypadek("woli 3 h: wyłączony (brak pola = false) daje ten sam wynik i 2 h", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const brak = await gen("brak");
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const nie = await gen("nie");
  assert.deepEqual(brak, nie, "pole false/brak powinno dawać identyczny wynik");
  const id2 = brak.filter((s) => s.startsWith("ID_002|")).map((s) => +s.split("|")[3]);
  assert.ok(id2.length > 0, "brak propozycji dla ID_002");
  assert.ok(id2.every((h) => h === 2), "wyłączony checkbox: jazdy ID_002 powinny mieć 2 h: " + id2);
});

await przypadek("woli 3 h: włączony – 3 h dla kursanta po 8 h", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const tak = await gen("tak");
  const id2 = tak.filter((s) => s.startsWith("ID_002|")).map((s) => +s.split("|")[3]);
  assert.ok(id2.length > 0 && id2.every((h) => h === 3), "włączony checkbox: jazdy ID_002 powinny mieć 3 h: " + id2);
});

await przypadek("ostrzeżenie tygodnia: brak dostępności kursanta lub święto instruktora wyłącza ostrzeżenie", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const w = await strona().evaluate(() => {
    const mon = "2027-01-11", ids = () => weekMin(mon).map((x) => x.k.id), o = {};
    o.baza = ids();
    S.K.ID_001 = { ...S.K.ID_001, wyjatki: [{ od: mon, do: addD(mon, 6), okna: [] }] };       // urlop cały tydzień
    o.urlop = ids();
    S.K.ID_001 = { ...S.K.ID_001, wyjatki: [{ od: mon, do: addD(mon, 6), okna: [[600, 660]] }] }; // krótkie okno = dostępny
    o.okno = ids();
    S.K.ID_001 = { ...S.K.ID_001, wyjatki: [] };                                             // dostępność pn, śr, pt
    const swieto = (d) => ({ data: d, okna: [], powod: "święto" });
    S.INST = { ...S.INST, wyjatki: [swieto(mon), swieto(addD(mon, 2))] };
    o.swiete2 = ids();                                                                       // pt nadal dostępny
    S.INST = { ...S.INST, wyjatki: [swieto(mon), swieto(addD(mon, 2)), swieto(addD(mon, 4))] };
    o.swiete3 = ids();
    return o;
  });
  assert.ok(w.baza.includes("ID_001"), "baza: ID_001 powinien mieć ostrzeżenie " + w.baza);
  assert.ok(!w.urlop.includes("ID_001"), "urlop: bez ostrzeżenia");
  assert.ok(w.okno.includes("ID_001"), "okno 1 h w wyjątku = dostępny, ostrzeżenie zostaje");
  assert.ok(w.swiete2.includes("ID_001"), "część dni dostępna – ostrzeżenie zostaje");
  assert.ok(!w.swiete3.includes("ID_001"), "wszystkie dostępne dni to święta – bez ostrzeżenia");
});

await przypadek("generator: urlop cały tydzień = brak ostrzeżenia „brak jazd w tygodniu” (ta sama zasada co Grafik)", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const w = await strona().evaluate(() => {
    const mon = "2026-12-07", o = {};
    S.K.ID_001 = { ...S.K.ID_001, wyjatki: [{ od: mon, do: addD(mon, 6), okna: [] }] };          // urlop 7.12–13.12
    o.grafik = weekMin(mon).map((x) => x.k.id);
    o.warns = generuj("2026-11-30", "2026-12-13").warns.filter((x) => x.includes(lab("ID_001")));
    return o;
  });
  assert.ok(!w.grafik.includes("ID_001"), "Grafik: bez ostrzeżenia " + w.grafik);
  assert.deepEqual(w.warns, [], "generator: urlop cały tydzień nie powinien dawać ostrzeżenia: " + w.warns);
});

await przypadek("masowe usuwanie: wybór statusu propozycja / czeka", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const r = await strona().evaluate(() => {
    const o = {};
    zapiszGen(generuj("2026-11-30", "2026-12-13"));
    S.genOpen = true; S.czOpen = true;
    o.wyb0 = czekaZakres().st;                            // dane mają jazdę „czeka” – domyślnie ten status
    S.czSt = "propozycja"; S.czFrom = "2026-11-01";
    const z = czekaZakres();
    o.st = z.st; o.n = z.l.length; o.sel = czekaHtml().includes('id="c-st"');
    const p0 = Object.values(S.J).filter((j) => j.status === "propozycja").length;
    A.czekaDel({}); A.czekaDel({});                       // podwójne dotknięcie
    o.zostalo = Object.values(S.J).filter((j) => j.status === "propozycja").length;
    o.p0 = p0;
    return o;
  });
  assert.equal(r.wyb0, "czeka na kursanta"); assert.equal(r.st, "propozycja", JSON.stringify(r)); assert.ok(r.n > 0 && r.sel, "panel statusu niewidoczny");
  assert.equal(r.zostalo, 0, "propozycje powinny zostać usunięte");
});
