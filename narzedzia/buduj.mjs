// Buduje dwie wersje aplikacji z jednego źródła src/:
//   produkcja → katalog główny repo  (https://projekt-osk.github.io/osk-dziennik/,      projekt Firebase osk-dziennik)
//   test      → katalog test/        (https://projekt-osk.github.io/osk-dziennik/test/, projekt Firebase osk-test-3c32a)
// Uruchom z katalogu repo: node narzedzia/buduj.mjs   (potem commit + push; Pages serwuje gałąź main)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const BUILD = /const BUILD="([^"]+)"/.exec(readFileSync(join(SRC, "jadro.js"), "utf8"))[1];

const ENV = {
  prod: {
    out: ROOT, nazwa: "OSK", tytul: "OSK – dziennik instruktora", kolor: "#1a5fb4", pomin: "test/",
    firebase: {
      apiKey: "AIzaSyClIe3iqc-oyCbe9FNlzfVRb-m5Scgv0VE",
      authDomain: "osk-dziennik.firebaseapp.com",
      projectId: "osk-dziennik",
      storageBucket: "osk-dziennik.firebasestorage.app",
      messagingSenderId: "49460530355",
      appId: "1:49460530355:web:a8b6a70a104a8f2096b4c6"
    }
  },
  test: {
    out: join(ROOT, "test"), nazwa: "OSK test", tytul: "OSK test – WERSJA TESTOWA", kolor: "#b42318", pomin: "",
    firebase: {
      apiKey: "AIzaSyAbvV2cyX-dSQzj4def4l0bNYQE8UA83ck",
      authDomain: "osk-test-3c32a.firebaseapp.com",
      projectId: "osk-test-3c32a",
      storageBucket: "osk-test-3c32a.firebasestorage.app",
      messagingSenderId: "222503608448",
      appId: "1:222503608448:web:ef9f3942bf8559880cc665"
    }
  }
};

const TEST_BAR = '<div class="testbar" style="background:#b42318;color:#fff;text-align:center;font:700 14px/1.2 sans-serif;letter-spacing:.06em;padding:5px 8px">WERSJA TESTOWA – dane zmyślone</div>' +
  '<style>.ktabs{top:calc(env(safe-area-inset-top,0px) + 84px)!important}</style>';
const STATYCZNE = ["style.css", "jadro.js", "baza.js", "widoki-karta.js", "widoki-ekrany.js", "tydzien-pdf.js",
  "tryb-generator.js", "wiadomosci-arkusz.js", "zdarzenia.js", "firebase.js", "icon.svg", "icon-192.png", "icon-512.png"];

for (const [nazwa, e] of Object.entries(ENV)) {
  const test = nazwa === "test";
  mkdirSync(e.out, { recursive: true });
  const pliki = [...STATYCZNE, ...(test ? ["przyklad.js"] : [])];
  for (const f of pliki) copyFileSync(join(SRC, f), join(e.out, f));
  writeFileSync(join(e.out, "konfig.js"),
    `/* generowany przez narzedzia/buduj.mjs – nie edytuj */\nwindow.OSK_KONFIG=${JSON.stringify({ srodowisko: nazwa, firebase: e.firebase })};\n`);
  const sub = (s) => s.replaceAll("{{BUILD}}", BUILD).replaceAll("{{SRODOWISKO}}", nazwa).replaceAll("{{NAZWA}}", e.nazwa)
    .replaceAll("{{TYTUL}}", e.tytul).replaceAll("{{KOLOR}}", e.kolor);
  const html = sub(readFileSync(join(SRC, "index.html"), "utf8"))
    .replace("{{TEST_BAR}}", test ? TEST_BAR : "")
    .replace("{{PRZYKLAD}}", test ? `<script src="przyklad.js?v=${BUILD}" onerror="oskBlad('przyklad.js')"></script>\n` : "");
  writeFileSync(join(e.out, "index.html"), html);
  writeFileSync(join(e.out, "manifest.webmanifest"), sub(readFileSync(join(SRC, "manifest.webmanifest"), "utf8")));
  const cache = ["./", "./index.html", "./konfig.js", "./manifest.webmanifest", ...pliki.map((f) => "./" + f)];
  writeFileSync(join(e.out, "sw.js"), sub(readFileSync(join(SRC, "sw.js"), "utf8"))
    .replace("[/*PLIKI*/]", JSON.stringify(cache)).replace("{{POMIN}}", e.pomin));
  const left = readFileSync(join(e.out, "index.html"), "utf8").match(/\{\{[A-Z_]+\}\}/);
  if (left) throw new Error(nazwa + ": nie podmieniono " + left[0]);
  console.log(`${nazwa}: ${e.out.replace(ROOT, ".") || "."} – BUILD ${BUILD}, plików: ${pliki.length + 4}`);
}
if (readdirSync(ROOT).includes("przyklad.js")) throw new Error("przyklad.js nie może być w produkcji");
