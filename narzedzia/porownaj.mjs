// Porównuje dwie kopie bazy OSK: stary format z artefaktu (baza-online-*.json) i nowy (osk-kopia-*.json), w dowolnej kombinacji.
// Użycie:  node narzedzia/porownaj.mjs kopia-A.json kopia-B.json     (kod wyjścia 0 = OK, 1 = różnice, 2 = błąd pliku)
// Liczy: liczby kursantów, jazd, kosztów i jazd z innym instruktorem; saldo godzin każdego kursanta (ta sama logika co aplikacja:
// src/jadro.js i src/kopia.js ładowane w vm); płatności i gotówkę (suma, wg miesięcy, liczby wg rodzaju płatności); stawkę;
// a do tego treść dokumentów (po ID). Wynik: „OK” albo lista różnic – wyłącznie ID i nazwy pól, bez imion i wartości.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const ctx = vm.createContext({ console });
vm.runInContext(readFileSync(join(SRC, "jadro.js"), "utf8") + "\n" + readFileSync(join(SRC, "kopia.js"), "utf8") +
  "\n;this.__api={S,kopiaNorm,kopiaLiczby,saldo,przedH,innych,dodat,gotSuma,jOf};", ctx, { filename: "src" });
const api = ctx.__api;

function wczytaj(sciezka) {
  let d;
  try { d = JSON.parse(readFileSync(sciezka, "utf8")); } catch (e) { console.error(`Nie można odczytać pliku ${sciezka}: ${e.message}`); process.exit(2); }
  try { return api.kopiaNorm(d); } catch (e) { console.error(`${sciezka}: ${typeof e === "string" ? e : e.message}`); process.exit(2); }
}
const stab = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x);
const zl = (n) => Math.round(n * 100) / 100;

function policz(kol) {
  api.S.K = kol.kursanci; api.S.J = kol.jazdy;
  const salda = {};
  for (const k of Object.values(kol.kursanci)) salda[k.id] = { saldo: api.saldo(k), przed: api.przedH(k), inni: api.innych(k), dodatkowe: api.dodat(k) };
  const J = Object.values(kol.jazdy), dod = J.filter((j) => j.rodzaj === "dodatkowa");
  const gotM = {};
  J.forEach((j) => { const m = j.data.slice(0, 7); gotM[m] = (gotM[m] || 0) + api.gotSuma([j]); });
  Object.keys(gotM).forEach((m) => { gotM[m] = zl(gotM[m]); if (!gotM[m]) delete gotM[m]; });
  const pl = {};
  dod.forEach((j) => { const s = `${j.status}/${j.platnosc || "brak"}`; (pl[s] = pl[s] || { n: 0, h: 0 }); pl[s].n++; pl[s].h += j.h; });
  const inst = kol.ustawienia.instruktor || {};
  return { liczby: api.kopiaLiczby(kol), salda, gotSuma: zl(api.gotSuma(J)), gotM, pl, stawka: inst.stawka == null ? "brak" : inst.stawka };
}

function roznice(A, B) {
  const R = [], a = policz(A.kol), b = policz(B.kol);
  const por = (nazwa, x, y) => { if (stab(x) !== stab(y)) R.push(`${nazwa}: A=${stab(x)} B=${stab(y)}`); };
  for (const k of ["kursanci", "jazdy", "koszty", "inni"])
    por({ kursanci: "liczba kursantów", jazdy: "liczba jazd", koszty: "liczba kosztów", inni: "liczba jazd z innym instruktorem" }[k], a.liczby[k], b.liczby[k]);
  for (const id of new Set([...Object.keys(a.salda), ...Object.keys(b.salda)]).values()) {
    if (!a.salda[id] || !b.salda[id]) continue;   // brak kursanta zgłaszają porównania dokumentów niżej
    for (const p of ["saldo", "przed", "inni", "dodatkowe"]) if (a.salda[id][p] !== b.salda[id][p]) R.push(`${id}: ${p === "saldo" ? "saldo godzin" : p === "przed" ? "godziny przed (z innym instruktorem)" : p === "inni" ? "godziny z innym instruktorem" : "godziny dodatkowe"} A=${a.salda[id][p]} B=${b.salda[id][p]}`);
  }
  por("gotówka – suma", a.gotSuma, b.gotSuma);
  por("gotówka wg miesięcy", a.gotM, b.gotM);
  por("jazdy dodatkowe wg statusu/płatności", a.pl, b.pl);
  por("stawka", a.stawka, b.stawka);
  for (const c of ["kursanci", "jazdy", "koszty"]) {
    const x = A.kol[c], y = B.kol[c];
    const tylkoA = Object.keys(x).filter((id) => !y[id]), tylkoB = Object.keys(y).filter((id) => !x[id]);
    if (tylkoA.length) R.push(`${c}: tylko w A: ${tylkoA.join(", ")}`);
    if (tylkoB.length) R.push(`${c}: tylko w B: ${tylkoB.join(", ")}`);
    for (const id of Object.keys(x)) if (y[id] && stab(x[id]) !== stab(y[id])) {
      const pola = [...new Set([...Object.keys(x[id]), ...Object.keys(y[id])])].filter((p) => stab(x[id][p]) !== stab(y[id][p]));
      R.push(`${c}/${id}: różna treść, pola: ${pola.join(", ")}`);
    }
  }
  const ig = (o) => { const c = { ...(o || {}) }; delete c.ostatnia_kopia; return c; };   // data ostatniej kopii zmienia się przy każdej kopii
  if (stab(A.kol.ustawienia.instruktor) !== stab(B.kol.ustawienia.instruktor)) R.push("ustawienia/instruktor: różna treść");
  if (stab(ig(A.kol.ustawienia.meta)) !== stab(ig(B.kol.ustawienia.meta))) R.push("ustawienia/meta: różna treść (poza datą ostatniej kopii)");
  return R;
}

const [pa, pb] = process.argv.slice(2);
if (!pa || !pb) { console.error("Użycie: node narzedzia/porownaj.mjs kopia-A.json kopia-B.json"); process.exit(2); }
const A = wczytaj(pa), B = wczytaj(pb);
const R = roznice(A, B);
if (!R.length) { const l = A.liczby; console.log(`OK – kursanci ${l.kursanci}, jazdy ${l.jazdy}, koszty ${l.koszty}, jazdy z innym instruktorem ${l.inni}; salda, płatności, gotówka i stawka zgodne (A: ${A.rodzaj}, B: ${B.rodzaj}).`); }
else { console.log(`RÓŻNICE (${R.length}):`); R.forEach((r) => console.log(" - " + r)); process.exit(1); }
