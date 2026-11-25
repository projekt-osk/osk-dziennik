// Uruchamia testy testy/*.test.mjs (wszystkie albo wskazane fragmentem nazwy). Wynik: tylko FAIL + jedna linia podsumowania.
// Użycie: node testy/uruchom.mjs [dym] [--zrzut]     (--zrzut: przy błędzie zapis zrzutu do testy/wyniki/)
import { readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const TU = dirname(fileURLToPath(import.meta.url));
const arg = process.argv.slice(2), zrzut = arg.includes("--zrzut");
const filtry = arg.filter((a) => !a.startsWith("--")).map((a) => basename(a));
const pliki = readdirSync(TU).filter((f) => f.endsWith(".test.mjs") && (!filtry.length || filtry.some((x) => f.includes(x)))).sort();
if (!pliki.length) { console.log("Brak testów do uruchomienia."); process.exit(2); }

let ok = 0, fail = 0;
const t0 = Date.now();
for (const f of pliki) {
  const r = spawnSync(process.execPath, [join(TU, f)], { encoding: "utf8", timeout: 180000, env: { ...process.env, ...(zrzut ? { OSK_ZRZUT: "1" } : {}) } });
  let widziane = 0;
  for (const l of (r.stdout || "").split("\n")) {
    if (l.startsWith("OK ")) { ok++; widziane++; }
    else if (l.startsWith("FAIL ")) { fail++; widziane++; console.log(`FAIL [${f}] ${l.slice(5)}`); }
  }
  if (r.status !== 0 && !(r.stdout || "").includes("FAIL ")) {
    fail++; console.log(`FAIL [${f}] ${r.error ? r.error.message : ((r.stderr || "").split("\n").find((x) => x.trim()) || "kod wyjścia " + r.status)}`);
  } else if (!widziane) { fail++; console.log(`FAIL [${f}] plik nie zgłosił żadnego przypadku (użyj przypadek())`); }
}
console.log(`${fail ? "BŁĘDY" : "OK"}: ${ok} ok, ${fail} błędów, ${pliki.length} plików, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);
