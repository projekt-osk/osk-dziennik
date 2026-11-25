// Środowisko testowe aplikacji OSK: zbudowany test/ pod https://osk.test/, zaślepka Firestore (window.oskFb), „serwer” w Node.
// Opis i wzór testu: testy/README.md. Żadnego połączenia z prawdziwą bazą – cały ruch poza osk.test jest blokowany.
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const TU = dirname(fileURLToPath(import.meta.url));
const APP = join(TU, "..", "test");
const req = createRequire(import.meta.url);
let pw;
try { pw = req("playwright"); } catch { pw = createRequire("/opt/npm-tools/node_modules/")("playwright"); }

export const EKRANY = { telefon: { width: 360, height: 800 }, tablet: { width: 800, height: 1280 } };
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };

// ---- kodowanie jak w src/firebase.js (tablica w tablicy → {_a:[…]})
const enc = (v, wT) => {
  if (Array.isArray(v)) { const a = v.map((x) => enc(x, true)); return wT ? { _a: a } : a; }
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = enc(v[k], false); return o; }
  return v;
};
const dec = (v) => {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") {
    const ks = Object.keys(v);
    if (ks.length === 1 && ks[0] === "_a" && Array.isArray(v._a)) return v._a.map(dec);
    const o = {}; for (const k of ks) o[k] = dec(v[k]); return o;
  }
  return v;
};

// ---- zaślepka wstrzykiwana zamiast firebase.js (działa w stronie; „serwer” = binding __srv w Node)
const ZASLEPKA = `
const LS="__oskStub";let st;try{st=JSON.parse(localStorage.getItem(LS))}catch(e){}
st=st||{cache:null,q:[]};const res=new Map();let synced=false,flushing=false,ready=false;
const enc=${enc.toString()},dec=${dec.toString()};
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(st))}catch(e){}};
const sl=[];let user={uid:"u1",email:"test@osk.test",nazwa:"Test"};const ul=[];
const snap=(c)=>({metadata:{fromCache:!synced,hasPendingWrites:st.q.some(o=>o.c===c)},
  docs:Object.entries((st.cache||{})[c]||{}).map(([id,d])=>({id,data:()=>dec(JSON.parse(JSON.stringify(d)))}))});
const notify=(c)=>{if(!ready)return;sl.forEach(l=>{if(!c||l.c===c)l.ok(snap(l.c))})};
async function flush(){if(flushing||!navigator.onLine||!st.q.length)return;flushing=true;
  try{const n=st.q.length,ops=st.q.slice(0,n);await window.__srv("write",ops);st.q.splice(0,n);save();
    ops.forEach(o=>{const r=res.get(o);if(r){r();res.delete(o)}})}catch(e){}
  flushing=false;notify();if(st.q.length&&navigator.onLine)flush()}
const kolejka=(ops)=>{const p=new Promise(r=>res.set(ops[ops.length-1],r));
  ops.forEach(o=>{const m=(st.cache[o.c]=st.cache[o.c]||{});if(o.t==="set")m[o.id]=o.d;else delete m[o.id];st.q.push(o)});
  save();notify();Promise.resolve().then(flush);return p};
(async()=>{try{if(navigator.onLine){await flush();st.cache=await window.__srv("snap");synced=true;save()}}catch(e){}
  st.cache=st.cache||{};ready=true;notify()})();
addEventListener("online",()=>{flush().then(async()=>{if(!st.q.length){try{st.cache=await window.__srv("snap");synced=true;save();notify()}catch(e){}}})});
const fb={srodowisko:"test",get user(){return user},
  set:(c,id,data)=>kolejka([{t:"set",c,id,d:enc(data,false)}]),
  del:(c,id)=>kolejka([{t:"del",c,id}]),
  batch:(ops)=>kolejka(ops.map(([r,c,id,d])=>r==="set"?{t:"set",c,id,d:enc(d,false)}:{t:"del",c,id})),
  listen:(c,ok,fail)=>{const l={c,ok,fail};sl.push(l);if(ready)setTimeout(()=>ok(snap(c)));return()=>{const i=sl.indexOf(l);if(i>=0)sl.splice(i,1)}},
  onUser:(fn)=>{ul.push(fn);setTimeout(()=>fn(user))},
  login:async()=>{user={uid:"u1",email:"test@osk.test",nazwa:"Test"};ul.forEach(f=>f(user))},
  logout:async()=>{user=null;ul.forEach(f=>f(null))},
  oczekujace:()=>st.q.length};
window.oskFb=fb;dispatchEvent(new Event("osk-fb"));
`;

// ---- stan sesji (jedna sesja naraz)
let B, C, P, serwer, bledy, ekranNazwa;

const naKolekcje = (dane) => {
  const s = { kursanci: {}, jazdy: {}, koszty: {}, ustawienia: {} };
  for (const k of dane.kursanci || []) s.kursanci[k.id] = enc(k, false);
  for (const j of dane.jazdy || []) s.jazdy[j.id] = enc(j, false);
  for (const o of dane.koszty || []) s.koszty[o.id] = enc(o, false);
  for (const [id, d] of Object.entries(dane.ustawienia || {})) s.ustawienia[id] = enc(d, false);
  return s;
};
// „YYYY-MM-DD[THH:MM]” w strefie Europe/Warsaw → ms
function warszawa(txt) {
  const m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d))?$/.exec(txt);
  if (!m) throw new Error("data testu: oczekiwano RRRR-MM-DD[THH:MM], jest: " + txt);
  const naiwny = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 10), +(m[5] ?? 0));
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(naiwny)).map((x) => [x.type, +x.value]));
  const wWarszawie = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return naiwny - (wWarszawie - naiwny);
}

/** Uruchamia przeglądarkę i aplikację. dane: obiekt albo ścieżka JSON (domyślnie testy/dane/podstawowe.json);
 *  data: "RRRR-MM-DD[THH:MM]" (domyślnie 2026-11-25T10:00, Warszawa); ekran: "telefon" (360×800) | "tablet" (800×1280) | {width,height}. */
export async function start({ dane, data = "2026-11-25T10:00", ekran = "telefon" } = {}) {
  if (!existsSync(join(APP, "index.html"))) throw new Error("brak test/index.html – uruchom: node narzedzia/buduj.mjs");
  if (P) await zamknij();
  if (typeof dane === "string") dane = JSON.parse(readFileSync(resolve(dane), "utf8"));
  dane = dane || JSON.parse(readFileSync(join(TU, "dane", "podstawowe.json"), "utf8"));
  serwer = naKolekcje(dane);
  bledy = [];
  const vp = typeof ekran === "string" ? EKRANY[ekran] : ekran;
  if (!vp) throw new Error("nieznany ekran: " + ekran);
  ekranNazwa = typeof ekran === "string" ? ekran : `${vp.width}x${vp.height}`;
  const opts = { headless: true, args: ["--no-sandbox"] };
  try { B = await pw.chromium.launch(opts); }
  catch (e) { if (existsSync("/usr/bin/google-chrome")) B = await pw.chromium.launch({ ...opts, executablePath: "/usr/bin/google-chrome" }); else throw e; }
  C = await B.newContext({ viewport: vp, serviceWorkers: "block", locale: "pl-PL", timezoneId: "Europe/Warsaw", acceptDownloads: true });
  await C.exposeBinding("__srv", (_src, rodzaj, arg) => {
    if (rodzaj === "snap") return JSON.parse(JSON.stringify(serwer));
    if (rodzaj === "write") {
      for (const o of arg) { const m = (serwer[o.c] = serwer[o.c] || {}); if (o.t === "set") m[o.id] = o.d; else delete m[o.id]; }
      return true;
    }
  });
  await C.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.origin !== "https://osk.test") return r.abort();
    const sciezka = u.pathname === "/" ? "/index.html" : u.pathname;
    if (sciezka === "/firebase.js") return r.fulfill({ status: 200, contentType: MIME[".js"], body: ZASLEPKA });
    const plik = join(APP, sciezka);
    if (!plik.startsWith(APP) || !existsSync(plik)) return r.fulfill({ status: 404, body: "brak" });
    return r.fulfill({ status: 200, contentType: MIME[extname(plik)] || "application/octet-stream", body: readFileSync(plik) });
  });
  P = await C.newPage();
  P.on("pageerror", (e) => bledy.push(String(e.message || e)));
  await C.clock.install({ time: warszawa(data) });
  await P.goto("https://osk.test/");
  await P.waitForSelector(".bnav button", { timeout: 15000 });
  await P.waitForFunction(() => !document.querySelector("#view .empty")?.textContent.includes("Łączę"), null, { timeout: 15000 });
  await P.waitForTimeout(300);
  return P;
}

export const strona = () => P;
export const bledyStrony = () => bledy.slice();
export const pauza = (ms) => P.waitForTimeout(ms);

/** Otwiera zakładkę dolnego paska: "dzis" | "grafik" | "kursanci" | "ustawienia" (Więcej). */
export const zakladka = (nazwa) => klik(`.bnav [data-v="${nazwa}"]`);
/** Klik z odstępem 500 ms (aplikacja ignoruje drugie kliknięcie w 450 ms). */
export async function klik(sel) { await P.click(sel, { timeout: 8000 }); await P.waitForTimeout(500); }
/** Wpisuje tekst w pole: fill + Tab (pola data-defer zapisują dopiero po opuszczeniu pola). */
export async function wpisz(sel, tekst) { await P.fill(sel, String(tekst), { timeout: 8000 }); await P.press(sel, "Tab"); await P.waitForTimeout(150); }
/** Wybiera opcję <select> po wartości. */
export async function wybierz(sel, wartosc) { await P.selectOption(sel, String(wartosc)); await P.waitForTimeout(150); }
/** Tekst elementu (innerText). */
export const tekst = (sel) => P.innerText(sel, { timeout: 8000 });

/** Dokumenty „serwera” (zdekodowane): { kursanci:{id:doc}, jazdy:{…}, koszty:{…}, ustawienia:{instruktor,meta} }. */
export const stanSerwera = () => dec(JSON.parse(JSON.stringify(serwer)));

/** Saldo kursanta liczone niezależnie od aplikacji, z dokumentów serwera:
 *  saldo_przed + jazdy_inni[].h + odbyte jazdy rodzaju „kurs” i „OL” (jak isKurs/przedH w src/jadro.js). */
export function saldo(idKursanta) {
  const s = stanSerwera(), k = s.kursanci[idKursanta];
  if (!k) throw new Error("brak kursanta na serwerze: " + idKursanta);
  const inni = (k.jazdy_inni || []).reduce((a, x) => a + x.h, 0);
  const odbyte = Object.values(s.jazdy).filter((j) => j.kursant === idKursanta && (j.rodzaj === "kurs" || j.rodzaj === "OL") && j.status === "odbyta")
    .reduce((a, j) => a + j.h, 0);
  return (k.saldo_przed || 0) + inni + odbyte;
}

/** Tryb offline (context.setOffline). Przy powrocie online czeka (do 8 s), aż zapisy z kolejki dotrą na „serwer”. */
export async function offline(wl) {
  await C.setOffline(!!wl);
  if (!wl) await P.waitForFunction(() => window.oskFb.oczekujace() === 0, null, { timeout: 8000 });
  await P.waitForTimeout(300);
}

/** Zrzut ekranu do testy/wyniki/<nazwa>.png (tylko do diagnozy błędu). */
export async function zrzut(nazwa) {
  const d = join(TU, "wyniki"); mkdirSync(d, { recursive: true });
  const f = join(d, `${nazwa.replace(/[^\w.-]+/g, "_")}-${ekranNazwa}.png`);
  await P.screenshot({ path: f }); return f;
}

export async function zamknij() {
  try { if (B) await B.close(); } catch {}
  B = C = P = undefined;
}

/** Przypadek testowy: wypisuje „OK nazwa” albo „FAIL nazwa: powód”; błąd JS na stronie też jest błędem;
 *  po przebiegu zamyka przeglądarkę; przy OSK_ZRZUT=1 zapisuje zrzut błędu. */
export async function przypadek(nazwa, fn) {
  try {
    await fn();
    if (bledy && bledy.length) throw new Error("błąd JS na stronie: " + bledy[0]);
    console.log("OK " + nazwa);
  } catch (e) {
    if (process.env.OSK_ZRZUT && P) await zrzut("FAIL-" + nazwa).catch(() => {});
    console.log(`FAIL ${nazwa}: ${String(e && e.message || e).split("\n")[0]}`);
    process.exitCode = 1;
  } finally { await zamknij(); }
}
