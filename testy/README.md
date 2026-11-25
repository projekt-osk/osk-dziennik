# testy/ – środowisko testowe (Playwright + zaślepka Firestore)
Testuje zbudowany `test/` (najpierw `node narzedzia/buduj.mjs`). Bez prawdziwej bazy: ruch poza `https://osk.test/` jest blokowany.
Uruchom: `node testy/uruchom.mjs [fragment-nazwy] [--zrzut]` – wypisuje tylko FAIL i jedną linię podsumowania.

## Nowy test: `testy/nazwa.test.mjs`
```js
import assert from "node:assert/strict";
import { przypadek, start, zakladka, klik, wpisz, wybierz, stanSerwera, saldo, offline } from "./srodowisko.mjs";

await przypadek("opis przypadku", async () => {
  await start({ data: "2026-11-25T10:00", ekran: "telefon" });
  await zakladka("kursanci");
  await klik('[data-act="openK"][data-id="ID_002"]');
  await klik('.iconbtn.pri[data-act="newJ"]');
  await wybierz("#d-k", "ID_002");   // select; pola tekstowe: wpisz(sel, tekst)
  await klik("#d-save");
  const j = Object.values(stanSerwera().jazdy).find((x) => x.kursant === "ID_002");
  assert.ok(j, "brak jazdy na serwerze");
  assert.equal(saldo("ID_002"), 12);
});
```
Każdy przypadek uruchamia świeżą przeglądarkę. Błąd JS na stronie = FAIL.

## Funkcje (`srodowisko.mjs`)
- `start({dane, data, ekran})` – dane: obiekt/ścieżka JSON (domyślnie `dane/podstawowe.json`), data `RRRR-MM-DD[THH:MM]` (Warszawa, zegar płynie), ekran `"telefon"` 360×800 | `"tablet"` 800×1280
- `zakladka(n)` dzis|grafik|kursanci|ustawienia; `klik(sel)` (+500 ms); `wpisz(sel, t)` (fill+Tab); `wybierz(sel, v)`; `tekst(sel)`; `pauza(ms)`
- `stanSerwera()` – dokumenty „serwera”; `saldo(id)` – niezależne saldo; `offline(bool)` – online czeka na zapisy
- `strona()` – Playwright `page`; `bledyStrony()`; `zrzut(nazwa)`; `zamknij()`; `przypadek(nazwa, fn)`
Pułapki: drugie kliknięcie w 450 ms jest ignorowane; pola `data-defer` zapisują po Tab.
