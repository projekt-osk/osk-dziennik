"use strict";
/* kopia.js – kopia zapasowa (E2b): „Pobierz kopię” (Excel + JSON z danych na urządzeniu), pasek przypomnienia,
   „Przywróć z kopii” (nowy i stary format). Źródło w src/; część czysta (kopiaNorm, kopiaLiczby, kopiaDane…) działa
   też poza przeglądarką (narzedzia/porownaj.mjs ładuje jadro.js + ten plik w vm). */

const KOPIA_FORMAT="osk-kopia", KOPIA_WER=1;            // wersja formatu pliku .json
const KOPIA_DNI=3;                                       // pasek „Zrób kopię” po tylu dniach (decyzja instruktora 25.11)
const XLSX_URL="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; // dokładna wersja; buduj.mjs wstawia ten adres też do sw.js
const KOPIA_KOL=["kursanci","jazdy","koszty"];

/* ---------------------------------------------------------- część czysta */
const kopiaInni=k=>Array.isArray(k&&k.jazdy_inni)?k.jazdy_inni.length:0;
function kopiaLiczby(kol){const K=Object.values(kol.kursanci||{});
  return{kursanci:K.length,jazdy:Object.keys(kol.jazdy||{}).length,koszty:Object.keys(kol.koszty||{}).length,inni:K.reduce((s,k)=>s+kopiaInni(k),0)}}
// Dane z urządzenia (to, co aplikacja ma w pamięci, także offline) → {kursanci:{id:dok}, jazdy, koszty, ustawienia:{instruktor,meta}}
function kopiaDane(){const o=m=>{const r={};Object.keys(m||{}).sort().forEach(id=>r[id]=clone(m[id]));return r};
  const u={};if(S.INST)u.instruktor=clone(S.INST);if(S.META)u.meta=clone(S.META);
  return{kursanci:o(S.K),jazdy:o(S.J),koszty:o(S.KO),ustawienia:u}}
// Rozpoznaje plik kopii: nowy (format osk-kopia), stary z artefaktu (kolekcje albo same tablice). Zwraca {kol,rodzaj,build,liczby} albo rzuca tekst błędu.
function kopiaNorm(d){
  if(!d||typeof d!=="object"||Array.isArray(d))throw "To nie jest plik kopii OSK.";
  let kol,rodzaj,build=null;
  if(d.format===KOPIA_FORMAT){
    if(typeof d.wersja_formatu!=="number"||d.wersja_formatu>KOPIA_WER)throw "Kopia pochodzi z nowszej wersji aplikacji (format "+d.wersja_formatu+"). Zaktualizuj aplikację.";
    if(!d.kolekcje||typeof d.kolekcje!=="object")throw "W pliku kopii brakuje danych.";
    kol=d.kolekcje;rodzaj="nowy";build=d.build||null}
  else if(d.kolekcje&&typeof d.kolekcje==="object"&&d.kolekcje.kursanci&&d.kolekcje.jazdy){kol=d.kolekcje;rodzaj="stary"}
  else if(Array.isArray(d.kursanci)&&Array.isArray(d.jazdy)&&d.instruktor){
    const m=a=>{const r={};a.forEach(x=>{if(x&&typeof x.id==="string")r[x.id]=x});return r};
    const meta=d.meta&&d.meta.nastepne_id?d.meta:{nastepne_id:d.nastepne_id,slowniki:d.slowniki,meta:d.meta};
    kol={kursanci:m(d.kursanci),jazdy:m(d.jazdy),koszty:Array.isArray(d.koszty)?m(d.koszty):{},ustawienia:{instruktor:d.instruktor,meta}};rodzaj="stary"}
  else throw "To nie jest plik kopii OSK.";
  const out={kursanci:{},jazdy:{},koszty:{},ustawienia:{}};
  for(const c of KOPIA_KOL){const src=kol[c]||{};
    if(typeof src!=="object"||Array.isArray(src))throw "Uszkodzona kopia (kolekcja „"+c+"”).";
    for(const[id,doc]of Object.entries(src)){
      if(!id||/[\/]/.test(id)||id==="."||id===".."||id.length>200)throw "Uszkodzona kopia (nieprawidłowy identyfikator w „"+c+"”).";
      if(!doc||typeof doc!=="object"||Array.isArray(doc)||doc.id!==id)throw "Uszkodzona kopia (dokument w „"+c+"” bez zgodnego ID).";
      if(c==="jazdy"&&(typeof doc.kursant!=="string"||typeof doc.data!=="string"))throw "Uszkodzona kopia (jazda bez kursanta lub daty).";
      out[c][id]=doc}}
  const us=kol.ustawienia||{};
  if(!us.instruktor||typeof us.instruktor!=="object")throw "W kopii brakuje ustawień instruktora.";
  out.ustawienia.instruktor=us.instruktor;if(us.meta&&typeof us.meta==="object")out.ustawienia.meta=us.meta;
  if(!Object.keys(out.kursanci).length&&!Object.keys(out.jazdy).length)throw "Kopia jest pusta (brak kursantów i jazd) – nie ma czego przywracać.";
  return{kol:out,rodzaj,build,liczby:kopiaLiczby(out)}}
const kopiaDniOd=(a,b)=>Math.round((pISO(a)-pISO(b))/864e5);
function kopiaDni(){const o=S.META&&S.META.ostatnia_kopia;return typeof o==="string"&&/^\d{4}-\d\d-\d\d$/.test(o)?kopiaDniOd(realToday(),o):null}
const kopiaPotrzebna=()=>S.auth==="in"&&!S.err&&(Object.keys(S.K).length+Object.keys(S.J).length)>0&&(()=>{const n=kopiaDni();return n===null||n>=KOPIA_DNI})();
const kopiaDniTxt=n=>n===0?"dziś":n===1?"wczoraj":pl(n,"dzień","dni","dni")+" temu";

/* ---------------------------------------------------------- Excel */
function kopiaTydzien(t){return t?[0,1,2,3,4,5,6].filter(d=>(t[String(d)]||[]).length).map(d=>DN[d]+" "+t[String(d)].map(wtxt).join(", ")).join("; "):""}
const kopiaRz=r=>(r===undefined||r===null)?"":r;
function kopiaArkusze(kol){
  const K=Object.values(kol.kursanci).sort((a,b)=>a.id.localeCompare(b.id)),J=Object.values(kol.jazdy).sort(cmpJ);
  const odb=id=>J.filter(j=>j.kursant===id&&isKurs(j)&&j.status==="odbyta");
  const inst=kol.ustawienia.instruktor||{},meta=kol.ustawienia.meta||{};
  const tm=m=>m==null||m===""?"":t2s(+m);
  const A=[];
  A.push(["Kursanci",["ID","Imię","Litery nazwiska","Kategoria","Status","Aktywny","Godziny sprzed 2.11","Godziny z innym instruktorem","Saldo godzin kursu","Godziny dodatkowe sprzed","Dostępność","Wyjątki dostępności","Do poprawy (umiejętności)","Zaliczona teoria","Preferencje","Uwagi"],
    K.map(k=>[k.id,kopiaRz(k.imie),kopiaRz(k.litery),kopiaRz(k.kategoria),kopiaRz(k.status),k.aktywny===false?"nie":"tak",k.saldo_przed||0,innych(k),przedH(k)+sumH(odb(k.id)),k.dodatkowe_przed||0,
      kopiaTydzien(k.dostepnosc),(k.wyjatki||[]).map(e=>fdy(e.od)+"–"+fdy(e.do)+": "+((e.okna||[]).length?e.okna.map(wtxt).join(", "):"niedostępny")).join("; "),
      Object.entries(k.oznaczenia||{}).filter(([,l])=>{const s=(l||[]).filter(x=>kol.jazdy[x[0]]&&kol.jazdy[x[0]].status!=="odwołana").sort((a,b)=>key(kol.jazdy[a[0]]).localeCompare(key(kol.jazdy[b[0]])));return s.length&&s[s.length-1][1]==="X"}).map(([n])=>n).join(", "),
      Object.entries(k.teoria||{}).filter(([,v])=>v).map(([n])=>n).join(", "),kopiaRz(k.preferencje),kopiaRz(k.uwagi)]),
    [8,14,10,10,16,9,12,14,12,12,48,30,22,30,30,40]]);
  A.push(["Jazdy",["ID jazdy","Data","Dzień","Od","Do","Godziny","Kursant (ID)","Rodzaj","Status","Płatność","Kwota (zł)","Uwagi"],
    J.map(j=>[j.id,j.data,DN[dow(j.data)],tm(j.od),tm(j.do!=null?j.do:j.od+j.h*60),j.h,j.kursant,kopiaRz(j.rodzaj),kopiaRz(j.status),kopiaRz(j.platnosc),j.kwota==null?"":+j.kwota,kopiaRz(j.uwagi)]),
    [10,12,6,7,7,9,12,11,18,13,10,40]]);
  const II=[];K.forEach(k=>(Array.isArray(k.jazdy_inni)?k.jazdy_inni:[]).forEach((w,i)=>II.push([k.id,w.id!=null?w.id:i+1,w.h,kopiaRz(w.data),kopiaRz(w.notatka)])));
  A.push(["Jazdy z innym instruktorem",["Kursant (ID)","Nr wpisu","Godziny","Data","Notatka"],II,[12,10,9,12,50]]);
  A.push(["Koszty",["ID","Data","Rodzaj","Kwota (zł)","Notatka"],
    Object.values(kol.koszty).sort((a,b)=>String(a.data).localeCompare(String(b.data))||a.id.localeCompare(b.id)).map(o=>[o.id,kopiaRz(o.data),kopiaRz(o.rodzaj),o.kwota==null?"":+o.kwota,kopiaRz(o.notatka)]),[16,12,16,10,40]]);
  const U=[["Stawka za godzinę jazdy dodatkowej (zł)",inst.stawka==null?"":+inst.stawka],["Wyjątkowo do (godzina)",inst.wyjatkowo_do?t2s(inst.wyjatkowo_do):""],
    ["Następne ID kursanta",kopiaRz(meta.nastepne_id&&meta.nastepne_id.ID)],["Następne ID OL",kopiaRz(meta.nastepne_id&&meta.nastepne_id.OL)],["Następny numer jazdy",kopiaRz(meta.nastepne_id&&meta.nastepne_id.jazda)],
    ["Ostatnia kopia (przed tą)",kopiaRz(meta.ostatnia_kopia)],["Wersja aplikacji (BUILD)",typeof BUILD==="string"?BUILD:""]];
  (inst.okresy||[]).forEach((p,i)=>{U.push(["Okres pracy "+(i+1),(p.od?"od "+p.od:"")+(p.do?" do "+p.do:"")]);U.push(["  dyspozycyjność",kopiaTydzien(p.tydzien)])});
  (inst.wyjatki||[]).slice().sort((a,b)=>a.data.localeCompare(b.data)).forEach(e=>U.push(["Wyjątek "+e.data,((e.okna||[]).length?e.okna.map(wtxt).join(", "):"wolne")+(e.powod?" · "+e.powod:"")]));
  A.push(["Ustawienia",["Ustawienie","Wartość"],U,[40,60]]);
  return A}
function kopiaXlsxBajty(XLSX,kol){
  const wb=XLSX.utils.book_new();
  kopiaArkusze(kol).forEach(([nazwa,nagl,wiersze,szer])=>{const ws=XLSX.utils.aoa_to_sheet([nagl,...wiersze]);ws["!cols"]=szer.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,nazwa)});
  return XLSX.write(wb,{bookType:"xlsx",type:"array"})}
function kopiaJson(kol){
  return JSON.stringify({format:KOPIA_FORMAT,wersja_formatu:KOPIA_WER,build:typeof BUILD==="string"?BUILD:"",utworzono:new Date().toISOString(),
    srodowisko:(typeof S!=="undefined"&&S.db&&S.db.srodowisko)||"",kolekcje:kol},null,1)}

/* ---------------------------------------------------------- przeglądarka: pobieranie */
let xlsxProm=null;
const KOPIA_ANDROID=/Android/i.test(navigator.userAgent||"");
function kopiaXlsxLib(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(xlsxProm)return xlsxProm;
  xlsxProm=new Promise((ok,err)=>{const s=document.createElement("script");let t=null;
    const fail=m=>{clearTimeout(t);s.remove();xlsxProm=null;err(new Error(m))};
    s.src=XLSX_URL;s.crossOrigin="anonymous";s.onload=()=>{clearTimeout(t);window.XLSX?ok(window.XLSX):fail("xlsx: brak biblioteki")};s.onerror=()=>fail("xlsx: nie wczytano");
    t=setTimeout(()=>fail("xlsx: przekroczono czas"),15000);document.head.appendChild(s)});
  return xlsxProm}
const kopiaCzekaj=ms=>new Promise(r=>setTimeout(r,ms));
// Zapisuje dwa pliki (JSON i Excel). Zwraca {xlsx:true|false}; błąd JSON rzuca. Nie dotyka bazy (działa offline).
async function kopiaPliki(przed){
  const kol=kopiaDane(),d=realToday(),baza="osk-kopia-"+d+(przed?"-przed-przywroceniem":"");
  // Excel przygotowany PRZED pierwszym pobraniem: na tablecie (Chrome Android) drugie pobranie po dłuższym czekaniu bywa blokowane.
  let X=null,b=null;try{X=window.XLSX||await kopiaXlsxLib();b=kopiaXlsxBajty(X,kol)}catch(e){console.warn("kopia xlsx",e)}
  pobierzPlik(new Blob([kopiaJson(kol)],{type:"application/json"}),baza+".json");
  // Android (Chrome pyta o każdy plik i drugie pobranie przepada): Excel osobnym dotknięciem „Pobierz Excel”; przed przywróceniem wystarczy JSON.
  if(KOPIA_ANDROID){if(b&&!przed){S.kopiaXl={blob:new Blob([b],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),nazwa:baza+".xlsx"};return{xlsx:"czeka"}}return{xlsx:!!b&&przed?"pominiety":false}}
  let xl=true;
  try{if(!b)throw new Error("xlsx: brak biblioteki");await kopiaCzekaj(400);
    pobierzPlik(new Blob([b],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),baza+".xlsx")}
  catch(e){console.warn("kopia xlsx",e);xl=false}
  return{xlsx:xl}}
async function kopiaPobierz(){
  if(S.kopiaBusy)return;S.kopiaBusy=true;
  try{const r=await kopiaPliki(false);
    if(!pvOn()){const m=clone(S.META||{});m.ostatnia_kopia=realToday();S.META=m;put("ustawienia","meta",m)}  // data kopii synchronizuje się między urządzeniami
    toast(r.xlsx==="czeka"?"Pobrano plik JSON. Teraz dotknij „Pobierz Excel”, aby pobrać drugi plik.":r.xlsx?"Kopia pobrana: dwa pliki (Excel i JSON) są w Pobranych":"Pobrano plik JSON z kopią. Excel się nie zrobił (brak biblioteki) – spróbuj ponownie przy połączeniu z internetem.")}
  catch(e){toast("Nie udało się pobrać kopii ("+(e&&e.message||e)+")")}
  finally{S.kopiaBusy=false;render()}}

/* ---------------------------------------------------------- ekrany */
function kopiaXlBtn(){return S.kopiaXl?`<button class="btn pri" data-act="kopiaXl">Pobierz Excel</button>`:""}
function kopiaPasek(){
  if(S.kopiaXl)return `<div class="banner kopbar" style="display:flex;align-items:center;gap:12px"><span class="grow"><b>Kopia: JSON pobrany</b><br><span class="small">Pobierz jeszcze plik Excel (do czytania).</span></span>${kopiaXlBtn()}</div>`;
  if(!kopiaPotrzebna())return "";const n=kopiaDni();
  return `<div class="banner kopbar" style="display:flex;align-items:center;gap:12px"><span class="grow"><b>Zrób kopię</b><br><span class="small">${n===null?"Nie zrobiono jeszcze kopii danych.":"Ostatnia kopia: "+kopiaDniTxt(n)+" ("+fdy(S.META.ostatnia_kopia)+")."}</span></span><button class="btn" data-act="eksport">Zrób kopię</button></div>`}
function kopiaHtml(){
  const n=kopiaDni(),R=S.rest;
  let h=`<section class="card"><h3>Kopia zapasowa</h3><p class="small muted">Ostatnia kopia: <b>${n===null?"brak":esc(fdy(S.META.ostatnia_kopia))+" ("+kopiaDniTxt(n)+")"}</b>. Pobiera dwa pliki: Excel (do czytania) i JSON (do przywracania). Działa też bez internetu.</p>
  <div class="row" style="margin-top:10px"><button class="btn pri" data-act="eksport"${S.kopiaBusy?" disabled":""}>Pobierz kopię</button>${kopiaXlBtn()}<button class="btn" data-act="kopiaWybierz"${R&&R.busy?" disabled":""}>Przywróć z kopii…</button></div>`;
  if(R){h+=`<div class="banner${R.done?" info":""}" style="margin-top:12px">`;
    if(R.busy)h+=`<b>${esc(R.busy)}</b><br><span class="small">Nie zamykaj aplikacji.</span>`;
    else if(R.done){const c=R.done;h+=`<b>Przywrócono dane z kopii.</b><br><span class="small">kursanci: ${c.kursanci} · jazdy: ${c.jazdy} · koszty: ${c.koszty} · jazdy z innym instruktorem: ${c.inni}</span>${R.przed?`<br><span class="small">Kopia poprzedniego stanu jest w Pobranych (pliki „…-przed-przywroceniem”).</span>`:""}<div class="row" style="margin-top:8px"><button class="btn sm" data-act="kopiaZamknij">OK</button></div>`}
    else if(R.err)h+=`${esc(R.err)}<div class="row" style="margin-top:8px"><button class="btn sm" data-act="kopiaZamknij">Zamknij</button></div>`;
    else if(R.kol){const c=R.liczby,t=kopiaLiczby({kursanci:S.K,jazdy:S.J,koszty:S.KO});
      h+=`<b>Plik: ${esc(R.plik)}</b> (${R.rodzaj==="stary"?"stary format z poprzedniej aplikacji":"format kopii OSK"}${R.build?", "+esc(R.build):""})<br><span class="small">w pliku – kursanci: ${c.kursanci} · jazdy: ${c.jazdy} · koszty: ${c.koszty} · jazdy z innym instruktorem: ${c.inni}</span><br><span class="small">teraz w aplikacji – kursanci: ${t.kursanci} · jazdy: ${t.jazdy} · koszty: ${t.koszty}</span>
      <p class="small" style="margin:8px 0 0"><b>Przywrócenie zastąpi wszystkie dane w aplikacji</b> zawartością pliku (wszystko spoza pliku zostanie usunięte, także na innych urządzeniach). Przed zastąpieniem aplikacja sama pobierze kopię bieżącego stanu.</p>
      <div class="row" style="margin-top:10px"><button class="btn${S.restArm?" warnb":" badb"}" data-act="kopiaGo">${S.restArm?"Dotknij ponownie, aby przywrócić":"Przywróć dane z tego pliku"}</button><button class="btn" data-act="kopiaAnuluj">Anuluj</button></div>`}
    h+=`</div>`}
  return h+`</section>`}

/* ---------------------------------------------------------- przywracanie */
function kopiaWybierz(){
  if(pvBlok())return;
  const i=document.createElement("input");i.type="file";i.accept=".json,application/json";i.style.display="none";document.body.appendChild(i);
  const sprzat=()=>setTimeout(()=>i.remove(),60000);
  i.addEventListener("change",()=>{const f=i.files&&i.files[0];i.remove();if(!f)return;
    if(f.size>25*1024*1024){S.rest={err:"Plik jest za duży na kopię OSK."};render();return}
    f.text().then(t=>{try{const r=kopiaNorm(JSON.parse(t));S.restArm=false;S.rest={plik:f.name,kol:r.kol,rodzaj:r.rodzaj,build:r.build,liczby:r.liczby}}
      catch(x){S.rest={err:typeof x==="string"?x:"Nie udało się odczytać pliku (to nie jest poprawny plik .json)."}}render()},()=>{S.rest={err:"Nie udało się odczytać pliku."};render()})});
  i.addEventListener("cancel",()=>i.remove());sprzat();i.click()}
async function kopiaPrzywroc(){
  const R=S.rest;if(!R||!R.kol||R.busy||R.done)return;if(pvBlok())return;
  if(!S.db||!S.user){R.err="Brak połączenia z bazą – zaloguj się.";render();return}
  if(navigator.onLine===false){R.err="Przywracanie wymaga połączenia z internetem. Połącz się i spróbuj ponownie (kopię bieżącego stanu można pobrać bez internetu).";render();return}
  R.busy="Pobieram kopię bieżącego stanu…";render();
  try{
    const mam=Object.keys(S.K).length+Object.keys(S.J).length+Object.keys(S.KO).length>0;
    if(mam){await kopiaPliki(true);R.przed=true}
    R.busy="Zapisuję dane z kopii…";render();
    const kol=R.kol,meta=Object.assign({},kol.ustawienia.meta||{},{ostatnia_kopia:realToday()}),ops=[];
    for(const c of KOPIA_KOL)for(const[id,doc]of Object.entries(kol[c]))ops.push(["set",c,id,doc]);
    ops.push(["set","ustawienia","instruktor",kol.ustawienia.instruktor]);ops.push(["set","ustawienia","meta",meta]);
    [["kursanci",S.K],["jazdy",S.J],["koszty",S.KO]].forEach(([c,m])=>Object.keys(m).forEach(id=>{if(!kol[c][id])ops.push(["del",c,id])}));
    const CZ=50;
    for(let i=0;i<ops.length;i+=CZ){
      R.busy="Zapisuję dane z kopii… "+Math.min(i+CZ,ops.length)+" z "+ops.length;render();
      await Promise.race([S.db.batch(ops.slice(i,i+CZ)),kopiaCzekaj(30000).then(()=>{throw new Error("serwer nie odpowiada")})])}
    R.done=kopiaLiczby(kol);R.busy=null;R.kol=null;S.restArm=false;render();
    toast(`Przywrócono: kursanci ${R.done.kursanci}, jazdy ${R.done.jazdy}, koszty ${R.done.koszty}, jazdy z innym instruktorem ${R.done.inni}`)}
  catch(e){R.busy=null;R.err="Przywracanie przerwane ("+(e&&(e.code||e.message)||e)+"). Dane mogą być przywrócone tylko częściowo – wybierz plik kopii i spróbuj ponownie."+(R.przed?" Kopia poprzedniego stanu jest w Pobranych.":"");S.restArm=false;render()}}

// Biblioteka Excel wczytywana z wyprzedzeniem (z cache service workera), żeby kopia nie czekała na nią po kliknięciu.
setTimeout(()=>{kopiaXlsxLib().catch(()=>{})},3000);
function kopiaXlPobierz(){const x=S.kopiaXl;if(!x)return;S.kopiaXl=null;pobierzPlik(x.blob,x.nazwa);toast("Pobrano plik Excel");render()}
