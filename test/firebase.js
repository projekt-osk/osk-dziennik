/* firebase.js – logowanie Google i warstwa danych Firestore (trwała pamięć offline, wiele kart).
   Konfigurację (prod/test) podaje konfig.js generowany przez narzedzia/buduj.mjs.
   Udostępnia window.oskFb: set, del, batch, listen, onUser, login, logout, user. Zdarzenie „osk-fb” = gotowe. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  setPersistence, browserLocalPersistence, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const K = window.OSK_KONFIG;
const app = initializeApp(K.firebase);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true
});

// Firestore nie przyjmuje tablic w tablicach (okna [[od,do]], oznaczenia [[jazda,"V"]]).
// Zapis: tablica wewnątrz tablicy → {_a:[...]}; odczyt: odwrotnie. Dane w aplikacji bez zmian.
const enc = (v, wTablicy) => {
  if (Array.isArray(v)) { const a = v.map((x) => enc(x, true)); return wTablicy ? { _a: a } : a; }
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

let user = null;
const sluchacze = [];
const fb = {
  srodowisko: K.srodowisko,
  get user() { return user; },
  // Zapis bez czekania na serwer: zmiana trafia od razu do pamięci urządzenia, offline czeka w kolejce SDK
  // (także po zamknięciu karty) i wysyła się sama. Obietnica kończy się po potwierdzeniu przez serwer albo błędem.
  set: (c, id, data) => setDoc(doc(db, c, id), enc(data, false)),
  del: (c, id) => deleteDoc(doc(db, c, id)),
  // Partia zapisów (przywracanie z kopii): ops = [["set", kolekcja, id, dane] | ["del", kolekcja, id]], max. 500 w jednej partii.
  batch: (ops) => { const b = writeBatch(db); ops.forEach(([r, c, id, data]) => r === "set" ? b.set(doc(db, c, id), enc(data, false)) : b.delete(doc(db, c, id))); return b.commit(); },
  // Nasłuch kolekcji; ok dostaje {docs:[{id,data()}], metadata}. Zwraca funkcję wyłączającą.
  listen: (c, ok, fail) => onSnapshot(collection(db, c), (s) => ok({
    metadata: s.metadata,
    docs: s.docs.map((d) => ({ id: d.id, data: () => dec(d.data()) }))
  }), fail),
  onUser: (fn) => { sluchacze.push(fn); if (gotowyAuth) fn(user); },
  login: async () => {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth, p); }
    catch (e) {
      const kod = e && e.code;
      if (kod === "auth/popup-closed-by-user" || kod === "auth/cancelled-popup-request") throw e;
      await signInWithRedirect(auth, p);
    }
  },
  logout: () => signOut(auth)
};

let gotowyAuth = false;
(async () => {
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.warn(e); }
  try { await getRedirectResult(auth); } catch (e) { console.warn(e); fb.bladLogowania = e; }
  onAuthStateChanged(auth, (u) => {
    gotowyAuth = true;
    user = u ? { uid: u.uid, email: u.email || "", nazwa: u.displayName || "" } : null;
    sluchacze.forEach((fn) => fn(user));
  });
})();

window.oskFb = fb;
dispatchEvent(new Event("osk-fb"));
