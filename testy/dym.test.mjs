// Test dymny: start, 4 zakładki, saldo zgodne z niezależnym, jazda dodana offline trafia na serwer po powrocie online.
import assert from "node:assert/strict";
import { przypadek, start, zakladka, klik, wybierz, stanSerwera, saldo, offline, strona, tekst, wpisz } from "./srodowisko.mjs";

await przypadek("dym: start i 4 zakładki", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "telefon" });
  for (const z of ["dzis", "grafik", "kursanci", "ustawienia"]) {
    await zakladka(z);
    assert.ok((await tekst("#view")).trim().length > 20, `zakładka ${z} jest pusta`);
    assert.equal(await strona().locator(`.bnav [data-v="${z}"]`).count(), 1);
  }
});

await przypadek("dym: saldo zgodne z niezależnym", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "tablet" });
  const k = await strona().evaluate(() => ({ b: saldo(S.K.ID_003), a: saldo(S.K.ID_001) }));
  assert.equal(k.b, saldo("ID_003"), "ID_003");
  assert.equal(k.a, saldo("ID_001"), "ID_001");
  assert.equal(saldo("ID_003"), 26 + 1.5 + 2, "oczekiwane 29,5 h");
});

await przypadek("dym: jazda dodana offline trafia na serwer", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "telefon" });
  const przed = Object.keys(stanSerwera().jazdy).length;
  await zakladka("grafik");
  await offline(true);
  await klik('.top [data-act="newJ"]');
  await wybierz("#d-k", "ID_002");
  await wpisz("#d-d", "2026-11-30");
  await klik("#d-save");
  assert.equal(Object.keys(stanSerwera().jazdy).length, przed, "offline: serwer nie powinien jeszcze mieć jazdy");
  await offline(false);
  const po = Object.values(stanSerwera().jazdy);
  assert.equal(po.length, przed + 1, "po online jazdy nie ma na serwerze");
  const nowa = po.find((j) => j.data === "2026-11-30");
  assert.ok(nowa && nowa.kursant === "ID_002", "brak nowej jazdy ID_002 z 30.11");
});
