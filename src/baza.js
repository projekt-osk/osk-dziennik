"use strict";
/* baza.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
/* ============================================================ zapis */
// Decyzja 14.11: w Podglądzie zapis zablokowany (tylko oglądanie). Blokada na wejściu (zdarzenia) + zabezpieczenie w zapisie.
const PV_MSG="Podgląd – zmiany wyłączone. Wróć do teraz, aby edytować.";
const pvBlok=()=>{if(!pvOn())return false;toast(PV_MSG);return true};
// Firestore (F-2026.11.25): zapis nie czeka na serwer – SDK zapisuje od razu w pamięci urządzenia, kolejność zachowuje samo,
// a offline zmiany czekają (także po zamknięciu karty) i wysyłają się po powrocie sieci. Błąd (np. brak uprawnień) → komunikat.
const zapisBlad=e=>{toast("Nie udało się zapisać ("+(e?.code||e?.message||e)+"). Sprawdź połączenie.");if(String(e?.code||"").includes("permission-denied"))dbBlad(e)};
function zapis(fn){if(!S.db){toast("Brak połączenia z bazą – zaloguj się.");return Promise.resolve()}try{fn().catch(zapisBlad)}catch(e){zapisBlad(e)}return Promise.resolve()}
const put=(c,id,data)=>pvBlok()?Promise.resolve():zapis(()=>S.db.set(c,id,data));
const rm=(c,id)=>pvBlok()?Promise.resolve():zapis(()=>S.db.del(c,id));
function saveK(k,mut){if(pvBlok())return Promise.resolve();const c=clone(k);mut(c);S.K[c.id]=c;render();return put("kursanci",c.id,c)}
function syncStatus(id){const k=S.K[id];if(!k||k.kategoria!=="staly")return;const ns=saldo(k)>=30?"ukonczony":"w_trakcie";
  if(ns!==k.status){saveK(k,c=>c.status=ns);toast(ns==="ukonczony"?`${lab(id)}: 30 h – status „ukończony kurs”`:`${lab(id)}: wraca do „w trakcie kursu”`)}}
// P-022 (decyzja 14.11): jazdy nie mogą na siebie nachodzić – BLOKADA (nie ostrzeżenie) przy dodaniu i edycji jazdy
// (zmiana terminu, przywrócenie odwołanej, zatwierdzenie propozycji, potwierdzenie „czeka na kursanta”). Odwołana nie blokuje.
// Inne zmiany istniejącej jazdy (✓ Odbyta, uwagi, odwołanie) są dozwolone także przy starej kolizji z danych.
const konJ=j=>j.od+j.h*60;
function kolizjaZ(L,pomin){if(!L||L.status==="odwołana")return null;const e=+L.od+L.h*60;
  return Object.values(S.J).filter(j=>j.id!==L.id&&!(pomin&&pomin.has(j.id))&&j.status!=="odwołana"&&j.data===L.data&&j.od<e&&+L.od<konJ(j)).sort((a,b)=>a.od-b.od)[0]||null}
function kolizjaTxt(j){return `Termin koliduje z jazdą: ${lab(j.kursant)}, ${DN[dow(j.data)].toLowerCase()} ${fd(j.data)}, ${t2s(j.od)}–${t2s(konJ(j))}${j.status==="propozycja"?" (propozycja)":j.status===CZEKA?" (czeka na kursanta)":""}. Zmień termin albo odwołaj tamtą jazdę.`}
function sprawdzKol(L,orig){if(L.status==="odwołana")return false;if(!orig)return true;
  if(orig.data!==L.data||+orig.od!==+L.od||+orig.h!==+L.h||orig.status==="odwołana")return true;
  return (orig.status==="propozycja"||orig.status===CZEKA)&&orig.status!==L.status}
const kolBlok=(L,orig)=>sprawdzKol(L,orig)?kolizjaZ(L):null;
function saveJ(L,oldK){if(pvBlok())return false;const kj=kolBlok(L,S.J[L.id]);if(kj){toast(kolizjaTxt(kj));return false}
  S.J[L.id]=L;render();put("jazdy",L.id,L);syncStatus(L.kursant);if(oldK&&oldK!==L.kursant)syncStatus(oldK);return true}
function nextNum(prefix,field,len){const ids=prefix==="J_"?Object.keys(S.J):Object.keys(S.K).filter(x=>x.startsWith(prefix));
  const mx=Math.max(0,...ids.map(x=>parseInt(x.slice(prefix.length),10)||0));return Math.max(mx+1,S.META?.nastepne_id?.[field]||0)}
function bumpMeta(field,n){const m=clone(S.META||{});m.nastepne_id=m.nastepne_id||{};m.nastepne_id[field]=n+1;S.META=m;put("ustawienia","meta",m)}

/* ============================================================ toast */
let toastT;function toast(m){const t=document.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3600)}

