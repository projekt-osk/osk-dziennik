// Generuje automatyczną mapę kodu: dla każdego src/*.js funkcje top-level i klucze obiektu akcji A (z rozmiarem pliku).
// Użycie: node narzedzia/mapa.mjs            → stdout
//         node narzedzia/mapa.mjs plik.md    → zapis do pliku
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const SLOWA = new Set(["if", "for", "while", "switch", "return", "const", "let", "var", "else", "try", "catch", "case", "function", "do", "new", "typeof", "await", "async"]);
const build = /const BUILD="([^"]+)"/.exec(readFileSync(join(SRC, "jadro.js"), "utf8"))?.[1] || "?";

const out = [`# MAPA-KODU-auto (generowana: node narzedzia/mapa.mjs – nie edytuj ręcznie)`, ``, `BUILD ${build}. Tylko nazwy top-level: funkcje (\`function x\` i \`const x=(…)=>\`) oraz klucze obiektu akcji \`A\` (\`data-act\`). Bez numerów linii – szukaj grepem.`, ``];
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".js")).sort()) {
  const txt = readFileSync(join(SRC, f), "utf8"), kb = (statSync(join(SRC, f)).size / 1024).toFixed(1);
  const lines = txt.split("\n"), fn = [], akcje = [];
  let wA = false;
  for (const l of lines) {
    if (/^const A=\{/.test(l)) { wA = true; }
    else if (wA && /^\};?\s*$/.test(l)) { wA = false; continue; }
    let m;
    if (wA) { if ((m = /^  ([A-Za-z_$][\w$]*)\s*(\(|:)/.exec(l)) && !SLOWA.has(m[1])) akcje.push(m[1]); continue; }
    if ((m = /^(?:async\s+)?function\s*\*?\s*([\w$]+)/.exec(l))) fn.push(m[1]);
    else if ((m = /^(?:const|let)\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>/.exec(l))) fn.push(m[1]);
  }
  for (const m of txt.matchAll(/^A\.([\w$]+)\s*=/gm)) akcje.push(m[1]);
  out.push(`## ${f} (${kb} KB)`);
  out.push(fn.length ? `Funkcje: ${[...new Set(fn)].join(", ")}` : "Funkcje: –");
  if (akcje.length) out.push(`Akcje A: ${[...new Set(akcje)].join(", ")}`);
  out.push("");
}
const wynik = out.join("\n");
if (process.argv[2]) { writeFileSync(process.argv[2], wynik); console.log(`zapisano ${process.argv[2]} (${Buffer.byteLength(wynik)} B)`); }
else process.stdout.write(wynik);
