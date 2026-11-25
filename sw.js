// Service worker OSK (prod) – cache plików aplikacji, praca bez sieci.
// Nowa wersja (inny BUILD) instaluje się w tle przy otwarciu i obowiązuje od kolejnego otwarcia aplikacji.
const BUILD = "F-2026.11.25-7";
const PREFIX = "osk-prod-";
const CACHE = PREFIX + BUILD;
const SDK = "https://www.gstatic.com/firebasejs/10.14.1/";
const XLSX = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; // biblioteka Excel (kopia zapasowa) – w cache, żeby „Pobierz kopię” działało bez internetu
const PLIKI = ["./","./index.html","./konfig.js","./manifest.webmanifest","./style.css","./jadro.js","./baza.js","./widoki-karta.js","./widoki-ekrany.js","./tydzien-pdf.js","./tryb-generator.js","./wiadomosci-arkusz.js","./kopia.js","./zdarzenia.js","./firebase.js","./icon.svg","./icon-192.png","./icon-512.png"].concat([SDK + "firebase-app.js", SDK + "firebase-auth.js", SDK + "firebase-firestore.js", XLSX]);
const POMIN = "test/"; // ścieżki innej wersji (test) pod tym samym adresem – nie obsługujemy

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(PLIKI.map((u) =>
      c.add(new Request(u, u.startsWith("http") ? { mode: "cors", cache: "reload" } : { cache: "reload" }))
        .catch((err) => console.warn("SW cache:", u, err))
    ))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => (k.startsWith(PREFIX) || k.startsWith("osk-dziennik-")) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const swoje = url.origin === self.location.origin;
  if (swoje && POMIN && url.pathname.startsWith(new URL(POMIN, self.registration.scope).pathname)) return;
  const sdk = url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  const fonty = url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com";
  const xlsx = req.url === XLSX;
  if (!swoje && !sdk && !fonty && !xlsx) return; // Firestore i logowanie obsługuje SDK (własna pamięć offline)
  e.respondWith(
    caches.match(req, { ignoreSearch: swoje }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const kopia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopia));
        }
        return res;
      }).catch(() => (req.mode === "navigate" ? caches.match("./index.html") : Response.error()));
    })
  );
});
