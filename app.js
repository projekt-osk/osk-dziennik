import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  setPersistence, browserLocalPersistence, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const WERSJA = "E1-2026.11.25-1";

const firebaseConfig = {
  apiKey: "AIzaSyAbvV2cyX-dSQzj4def4l0bNYQE8UA83ck",
  authDomain: "osk-test-3c32a.firebaseapp.com",
  projectId: "osk-test-3c32a",
  storageBucket: "osk-test-3c32a.firebasestorage.app",
  messagingSenderId: "222503608448",
  appId: "1:222503608448:web:ef9f3942bf8559880cc665"
};

const $ = (id) => document.getElementById(id);
$("wersja").textContent = WERSJA;

// --- Service worker (PWA, praca bez sieci) ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW:", e));
}

// --- Błędy ---
function komunikatBledu(e) {
  const kod = (e && e.code) || "";
  if (kod.includes("permission-denied")) return "Brak uprawnień – wklej reguły z uid.";
  if (kod.includes("unavailable")) return "Brak połączenia z chmurą – dane zapiszą się po powrocie sieci.";
  if (kod === "auth/unauthorized-domain") return "Domena nie jest autoryzowana w Firebase Auth.";
  if (kod === "auth/network-request-failed") return "Brak sieci – logowanie wymaga internetu.";
  if (kod === "auth/popup-closed-by-user" || kod === "auth/cancelled-popup-request") return "Logowanie przerwane.";
  return "Błąd: " + (kod || (e && e.message) || e);
}
function pokazBlad(e) {
  console.error(e);
  const el = $("blad");
  el.textContent = typeof e === "string" ? e : komunikatBledu(e);
  el.style.display = "block";
}
function ukryjBlad() { $("blad").style.display = "none"; }

// --- Stan sieci ---
function odswiezSiec() {
  const el = $("st-siec");
  const on = navigator.onLine;
  el.textContent = on ? "online" : "offline";
  el.className = "znacznik " + (on ? "z-ok" : "z-bad");
}
addEventListener("online", odswiezSiec);
addEventListener("offline", odswiezSiec);
odswiezSiec();

// --- Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

let uidAktualny = null;
let wypisz = null;

async function start() {
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) { pokazBlad(e); }
  try { await getRedirectResult(auth); } catch (e) { pokazBlad(e); }
  onAuthStateChanged(auth, (user) => {
    if (user) pokazZalogowanego(user); else pokazWylogowanego();
  });
}

$("btn-login").addEventListener("click", async () => {
  ukryjBlad();
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const kod = e && e.code;
    if (kod === "auth/popup-closed-by-user" || kod === "auth/cancelled-popup-request") {
      pokazBlad(e);
      return;
    }
    try { await signInWithRedirect(auth, provider); } catch (e2) { pokazBlad(e2); }
  }
});

$("btn-wyloguj").addEventListener("click", async () => {
  try { await signOut(auth); } catch (e) { pokazBlad(e); }
});

$("btn-kopiuj").addEventListener("click", async () => {
  const btn = $("btn-kopiuj");
  try {
    await navigator.clipboard.writeText(uidAktualny);
  } catch {
    const r = document.createRange();
    r.selectNodeContents($("uid"));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    try { document.execCommand("copy"); } catch {}
  }
  btn.textContent = "Skopiowano";
  setTimeout(() => (btn.textContent = "Kopiuj uid"), 1500);
});

function pokazZalogowanego(user) {
  uidAktualny = user.uid;
  $("blok-login").classList.add("ukryj");
  $("blok-uid").classList.remove("ukryj");
  $("blok-proby").classList.remove("ukryj");
  $("uid").textContent = user.uid;
  $("uzytkownik").textContent = user.displayName || user.email || "";
  nasluchuj();
}

function pokazWylogowanego() {
  uidAktualny = null;
  if (wypisz) { wypisz(); wypisz = null; }
  $("blok-login").classList.remove("ukryj");
  $("blok-uid").classList.add("ukryj");
  $("blok-proby").classList.add("ukryj");
  $("lista").innerHTML = "";
  $("st-cache").classList.add("ukryj");
}

// --- Kolekcja "proby" ---
function nasluchuj() {
  if (wypisz) wypisz();
  const q = query(collection(db, "proby"), orderBy("czas", "desc"));
  wypisz = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    ukryjBlad();
    $("st-cache").classList.toggle("ukryj", !snap.metadata.fromCache);
    const ul = $("lista");
    ul.innerHTML = "";
    snap.forEach((d) => {
      const dane = d.data();
      const li = document.createElement("li");

      const t = document.createElement("div");
      t.className = "tekst";
      t.textContent = dane.tekst;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = new Date(dane.czas).toLocaleString("pl-PL") + " · " + (dane.urzadzenie || "");
      t.appendChild(meta);

      const z = document.createElement("span");
      const czeka = d.metadata.hasPendingWrites;
      z.className = "znacznik " + (czeka ? "z-warn" : "z-ok");
      z.textContent = czeka ? "czeka na wysłanie" : "w chmurze";

      const b = document.createElement("button");
      b.className = "groza";
      b.textContent = "Usuń";
      b.addEventListener("click", () => {
        deleteDoc(doc(db, "proby", d.id)).catch(pokazBlad);
      });

      li.append(t, z, b);
      ul.appendChild(li);
    });
    $("pusto").classList.toggle("ukryj", snap.size > 0);
  }, pokazBlad);
}

$("form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const pole = $("tekst");
  const tekst = pole.value.trim();
  if (!tekst) return;
  ukryjBlad();
  pole.value = "";
  // Bez await: offline obietnica zakończy się dopiero po synchronizacji.
  addDoc(collection(db, "proby"), {
    tekst,
    czas: Date.now(),
    urzadzenie: navigator.userAgent.slice(0, 80)
  }).catch(pokazBlad);
});

start();
