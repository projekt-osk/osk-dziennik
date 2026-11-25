const WERSJA = "E1-2026.11.25-1";
const CACHE = "osk-dziennik-" + WERSJA;
const SDK = "https://www.gstatic.com/firebasejs/10.14.1/";
const PLIKI = [
  "./", "./index.html", "./app.js", "./manifest.webmanifest",
  "./icon.svg", "./icon-192.png", "./icon-512.png",
  SDK + "firebase-app.js", SDK + "firebase-auth.js", SDK + "firebase-firestore.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(PLIKI.map((u) =>
        c.add(new Request(u, u.startsWith("http") ? { mode: "cors" } : {})).catch((err) => console.warn("SW cache:", u, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("osk-dziennik-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const swoje = url.origin === self.location.origin;
  const sdk = url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  if (!swoje && !sdk) return; // Firestore/Auth (sieć) obsługuje SDK samo
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
