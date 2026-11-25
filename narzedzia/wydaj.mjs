// Wydanie: podbicie BUILD, build, kontrola składni, git add + commit (push osobno albo --push).
// Użycie: node narzedzia/wydaj.mjs test|prod -m "komunikat" [--build F-RRRR.MM.DD-N] [--push]
//   test: commit tylko src/ + test/ (pliki prod w katalogu głównym zbudowane przez buduj.mjs są cofane)
//   prod: git add -A (bez testy/) – tylko za zgodą instruktora
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const a = process.argv.slice(2);
const cel = a[0];
const opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
const msg = opt("-m"), bld = opt("--build"), push = a.includes("--push");
if (!["test", "prod"].includes(cel) || !msg) { console.error('Użycie: node narzedzia/wydaj.mjs test|prod -m "komunikat" [--build X] [--push]'); process.exit(2); }

const run = (cmd, args, o = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", ...o });
  if (r.status !== 0 && !o.luzem) { console.error(`BŁĄD: ${cmd} ${args.join(" ")}\n${r.stdout || ""}${r.stderr || ""}`); process.exit(1); }
  return o.raw ? (r.stdout || "") : (r.stdout || "").trim();
};

const jadroP = join(ROOT, "src", "jadro.js");
const jadro = readFileSync(jadroP, "utf8");
const stary = /const BUILD="([^"]+)"/.exec(jadro)[1];
const dzis = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date()).replaceAll("-", ".");
let nowy = bld;
if (!nowy) {
  const m = /^F-(\d{4}\.\d{2}\.\d{2})-(\d+)$/.exec(stary);
  nowy = `F-${dzis}-${m && m[1] === dzis ? +m[2] + 1 : 1}`;
}
if (!/^F-\d{4}\.\d{2}\.\d{2}-\d+$/.test(nowy)) { console.error("Zły format BUILD (F-RRRR.MM.DD-N): " + nowy); process.exit(2); }
if (nowy !== stary) writeFileSync(jadroP, jadro.replace(`const BUILD="${stary}"`, `const BUILD="${nowy}"`));

console.log(run("node", ["narzedzia/buduj.mjs"]));
for (const f of readdirSync(join(ROOT, "src")).filter((x) => x.endsWith(".js"))) run("node", ["--check", join("src", f)]);

if (cel === "test") {
  const zm = run("git", ["status", "--porcelain", "--", ".", ":!src", ":!test", ":!testy", ":!narzedzia"], { raw: true }).split("\n").filter(Boolean)
    .filter((l) => !l.startsWith("??")).map((l) => l.slice(3));
  if (zm.length) run("git", ["checkout", "--", ...zm]);
  run("git", ["add", "src", "test"]);
} else {
  run("git", ["add", "-A", "--", ".", ":!testy"]);
}
const pliki = run("git", ["diff", "--cached", "--name-only"]);
if (!pliki) { console.log(`BUILD ${nowy}: brak zmian do zatwierdzenia.`); process.exit(0); }
run("git", ["commit", "-m", msg]);
console.log(`BUILD ${nowy} (${cel}) – commit ${run("git", ["rev-parse", "--short", "HEAD"])}\nPliki w commicie:\n${pliki.split("\n").map((x) => "  " + x).join("\n")}`);
const PUSH = ["-c", "push.negotiate=true", "push", "origin", "main"];
if (push) { console.log(run("git", PUSH)); console.log("Wypchnięto."); }
else console.log("Push: git -c push.negotiate=true push origin main");
