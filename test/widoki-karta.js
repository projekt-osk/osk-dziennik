"use strict";
/* widoki-karta.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
/* ============================================================ render */
let raf=0;function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
/* ---------------------------------------------------------- kursanci */
function barHtml(k,big){const d=Math.min(30,saldo(k)),p=Math.min(30-d,wPlanie(k));let s="";for(let i=0;i<30;i++)s+=`<span class="${i<d?"d":i<d+p?"p":""}"></span>`;return `<div class="bar${big?" big":""}" aria-label="${d} z 30 h, ${p} h w planie">${s}</div>`}
function daysHtml(k){if(!k.dostepnosc)return `<span class="pill warn">dostępność nieznana</span>`;
  return `<div class="days">${DN.map((n,i)=>{const w=k.dostepnosc[String(i)]||[];return `<span class="${w.length?"on":"off"}" title="${esc(DNI[i])}: ${esc(w.map(wtxt).join(", ")||"brak")}">${n}</span>`}).join("")}</div>`}
function newKHtml(){const d=S.newK;const id=(d.kat==="OL"?"OL_":"ID_")+String(nextNum(d.kat==="OL"?"OL_":"ID_",d.kat==="OL"?"OL":"ID",3)).padStart(3,"0");
  return `<div class="card"><div class="sec-h"><h3>Nowy kursant: ${id}</h3><button class="btn ghost sm" data-act="cancelNewK">Anuluj</button></div>
  <p class="small muted">Kursant = ID + imię + dwie pierwsze litery nazwiska. Pamiętaj dopisać go też w swoich plikach.</p>
  <div class="grid2"><label class="field"><span class="lbl">Imię</span><input type="text" id="nk-im" maxlength="30" value="${esc(d.im||"")}" data-defer autocomplete="off"></label><label class="field"><span class="lbl">Kategoria</span><select id="nk-kat" data-ch="nk-kat"><option value="staly"${d.kat==="staly"?" selected":""}>Stały – w trakcie kursu</option><option value="OL"${d.kat==="OL"?" selected":""}>OL – dorywczy</option></select></label>
  <label class="field"><span class="lbl">Litery nazwiska</span><input type="text" id="nk-lit" maxlength="3" value="${esc(d.lit)}" data-defer data-in="nk-lit" autocomplete="off"></label>
  <label class="field"><span class="lbl">Godziny wyjeżdżone wcześniej</span><input type="number" id="nk-h" min="0" max="30" value="${d.h}" data-defer data-in="nk-h"></label></div>
  <div class="row" style="margin-top:10px"><button class="btn pri" data-act="saveNewK">Dodaj ${id}</button></div></div>`}

/* ---------------------------------------------------------- karta */
function jRow(j){const ch=check(j);const nw=ch.w.length;
  return `<button class="jrow${j.status==="odwołana"?" odw":""}" data-act="openJ" data-id="${j.id}"><span class="when">${fdl(j.data)} <span class="muted small">${t2s(j.od)}</span></span><span class="what">${j.h} h${j.rodzaj!=="kurs"?` · ${j.rodzaj}`:""}</span><span>${nw?`<span class="pill warn" title="Ostrzeżenia: ${nw}">${IC_WARN} ${nw}</span> `:""}${stPill(j.status)}</span>${(()=>{const k=S.K[j.kursant],tt=k?Object.entries(k.teoriaJ||{}).filter(([t,id])=>id===j.id&&(k.teoria||{})[t]).map(([t])=>t):[];return tt.length?`<span class="sub th"><b>Teoria:</b> ${esc(tt.join(", "))}</span>`:""})()}${j.uwagi?`<span class="sub">${esc(j.uwagi)}</span>`:""}</button>`}
function stPill(s){return `<span class="pill ${s==="odbyta"?"ok":s==="zaplanowana"?"acc":s==="odwołana"?"bad":s===CZEKA?"warn":""}">${s}</span>`}
function lekcje(k){ // BUG-005: bieżąca = jazda z dziś (także odbyta); gdy dziś brak – ostatnia odbyta. Przyszłe tylko z ręcznego wyboru.
  const t0=today(),js=jOf(k.id).filter(j=>j.status!=="odwołana"),done=js.filter(j=>j.status==="odbyta"&&j.data!==t0);
  const dzis=js.filter(j=>j.data===t0&&j.status!=="propozycja");                       // dzisiejsze (bez niezatwierdzonych propozycji – BUG-007)
  const zalegle=js.filter(j=>j.status==="zaplanowana"&&j.data<t0);                     // niezamknięte z przeszłości
  const przysz=js.filter(j=>j.data>t0&&j.status==="zaplanowana");                      // przyszłe – tylko ręcznie
  const pend=js.filter(j=>otwSt(j.status));
  const next=pend.find(j=>j.data<=t0)||pend.find(j=>j.data>t0)||null;                  // „Najbliższa jazda” w Przeglądzie
  return{done,cur:dzis,zalegle,przysz,next,all:[...done,...zalegle,...dzis].sort(cmpJ),
    opts:[...dzis,...done.slice().reverse(),...zalegle.slice().reverse(),...przysz]}}
const optLab=j=>j.data===today()?" · dziś":j.data>today()?" · przyszła":j.status==="zaplanowana"?" · niezamknięta":"";
const biezaca=k=>{const L=lekcje(k);return L.cur[L.cur.length-1]||L.done[L.done.length-1]||null};
const optHtml=(o,sel)=>`<option value="${o.id}"${o.id===sel?" selected":""}>${fdl(o.data)} · ${t2s(o.od)}–${t2s(o.od+o.h*60)}${optLab(o)}</option>`;
// Zgłoszenie 14.11 (ID_009): brak dzisiejszej i odbytej jazdy → nie wybieramy automatycznie (BUG-005), ale mówimy prawdę i dajemy listę (przyszłe, niezamknięte).
const brakBiezTxt=()=>(pvOn()?"W tym dniu":"Dziś")+" brak jazdy i brak jazd odbytych – wybierz jazdę z listy.";
function daneHtml(k){
  const s=saldo(k),p=wPlanie(k),js=jOf(k.id),L=lekcje(k),nx=L.next;
  const fut=js.filter(j=>otwSt(j.status)),past=js.filter(j=>j.status==="odbyta").reverse(),odw=js.filter(j=>j.status==="odwołana");
  let hero;
  if(k.kategoria==="OL")hero=`<div class="lbl">Wyjeżdżone u mnie</div><div class="hero-n num">${s} <small>h</small></div>`;
  else hero=`<div class="row" style="align-items:flex-end;justify-content:space-between"><div><div class="lbl">Kurs kat. B</div><div class="hero-n num">${Math.min(s,30)} <small>/ 30 h</small></div></div><div class="small muted num" style="text-align:right">pozostało <b style="color:var(--fg)">${Math.max(0,30-s)} h</b>${p?`<br>w planie ${p} h`:""}${k.status==="ukonczony"?`<br>dodatkowe ${dodat(k)} h`:""}</div></div><div style="margin-top:10px">${barHtml(k,true)}</div>`;
  if(nx)hero+=`<button class="next" data-act="openJ" data-id="${nx.id}"><span class="lbl">${nx.data<today()?"Niezamknięta jazda":nx.data===today()?"Dzisiejsza jazda":"Najbliższa jazda"}</span><b>${DNI[dow(nx.data)]} ${fd(nx.data)} · ${t2s(nx.od)}–${t2s(nx.od+nx.h*60)}</b><span class="small muted">${nx.h} h · ${nx.rodzaj}</span></button>`;
  let h=`<section class="card">${hero}</section>`;
  const dp=doPop(k);
  h+=`<section class="card"><div class="sec-h"><h3>Do poprawy</h3><button class="btn ghost sm" data-act="ktab" data-v="tryb">Tryb jazdy ›</button></div>${dp.length?`<div class="chips" style="margin-top:8px">${dp.map(n=>`<span class="chip np"><b>${n}</b> ${esc(skill(n)?.nazwa||"")}</span>`).join("")}</div>`:`<p class="small muted" style="margin:4px 0 0">Brak – żadna umiejętność nie ma ostatniego oznaczenia ✕.</p>`}</section>`;
  // podsumowania teorii i miejsc
  const T=S.META?.slowniki?.teoria||Object.keys(k.teoria||{}),tn=T.filter(x=>(k.teoria||{})[x]).length;
  const names=[...(S.META?.slowniki?.miejsca||[])];Object.keys(k.miejsca||{}).forEach(n=>{if(!names.includes(n))names.push(n)});
  const last=ids=>{const d=ids.map(id=>S.J[id]?.data).filter(Boolean).sort();return d.length?fd(d[d.length-1]):""};
  h+=`<div class="two"><section class="card"><div class="sec-h"><h3>Teoria</h3><span class="pill acc num">${tn} z ${T.length}</span></div>
    <table class="mini">${T.map(x=>{const on=(k.teoria||{})[x];return `<tr class="${on?"":"todo"}"><td class="ic">${on?"✓":"○"}</td><td>${esc(x)}</td><td class="r num small">${on&&(k.teoriaJ||{})[x]&&S.J[(k.teoriaJ||{})[x]]?fd(S.J[(k.teoriaJ||{})[x]].data):""}</td></tr>`}).join("")}</table>
    <button class="btn ghost sm" data-act="ktab" data-v="teoria">Edytuj ›</button></section>
    <section class="card"><div class="sec-h"><h3>Miejsca</h3><span class="pill acc num">${names.filter(n=>((k.miejsca||{})[n]||[]).length).length} z ${names.length}</span></div>
    <table class="mini"><tr><th></th><th class="r">wizyt</th><th class="r">ostatnio</th></tr>${names.map(n=>{const ids=(k.miejsca||{})[n]||[];return `<tr class="${ids.length?"":"todo"}"><td>${esc(n)}</td><td class="r num">${ids.length||"–"}</td><td class="r num">${last(ids)}</td></tr>`}).join("")}</table>
    <button class="btn ghost sm" data-act="ktab" data-v="miejsca">Edytuj ›</button></section></div>`;
  h+=`<section class="card"><div class="sec-h"><h3>Jazdy</h3><button class="btn sm" data-act="newJ" data-k="${k.id}">+ Jazda</button></div>`;
  if(!js.length)h+=`<p class="small muted">Brak jazd w grafiku.</p>`;
  if(fut.length)h+=tygodnie(fut);else if(js.length)h+=`<p class="small muted">Brak zaplanowanych jazd.</p>`;
  if(past.length||odw.length){h+=`<button class="btn ghost sm" style="margin-top:6px" data-act="togglePast" aria-expanded="${!!S.showPast}">${S.showPast?"▾":"▸"} Odbyte (${past.length})${odw.length?` · odwołane (${odw.length})`:""}</button>`;
    if(S.showPast)h+=tygodnie(past)+(odw.length?`<p class="lbl" style="margin:12px 0 2px">Odwołane</p><div class="jl">${odw.map(jRow).join("")}</div>`:"")}
  h+=`</section>`;
  h+=`<section class="card"><h3>Uwagi ogólne</h3><textarea id="uwagi" data-defer data-ch="uwagi" placeholder="Np. zapowiedziane spóźnienia, miejsce startu w wyjątkowej sytuacji" style="margin-top:6px">${esc(k.uwagi||"")}</textarea></section>`;
  h+=`<section class="card"><button class="btn ghost sm" data-act="toggleDost" aria-expanded="${!!S.showDost}">${S.showDost?"▾":"▸"} Dostępność${k.dostepnosc?"":` <span class="pill warn">nieznana</span>`}</button>`;
  if(S.showDost){
    if(!k.dostepnosc)h+=`<p class="small muted">Dostępność nieznana – generator pominie tego kursanta.</p>`;
    else h+=`<table class="mini" style="margin-top:6px">${DNI.map((n,i)=>{const w=k.dostepnosc[String(i)]||[];return `<tr class="${w.length?"":"todo"}"><td style="width:110px">${n}</td><td>${w.length?w.map(wtxt).join(", "):"—"}</td></tr>`}).join("")}</table>`;
    const ex=(k.wyjatki||[]).filter(e=>e.do>=today()).sort((a,b)=>a.od.localeCompare(b.od));
    if(ex.length)h+=`<p class="lbl" style="margin:10px 0 2px">Wyjątki</p><table class="mini">${ex.map(e=>`<tr><td style="width:110px" class="num">${fd(e.od)}${e.do!==e.od?"–"+fd(e.do):""}</td><td>${e.okna&&e.okna.length?e.okna.map(wtxt).join(", "):"niedostępny"}${e.powod?` · <span class="muted">${esc(e.powod)}</span>`:""}</td></tr>`).join("")}</table>`;
    if(k.preferencje)h+=`<p class="small muted" style="margin:8px 0 0">${esc(k.preferencje)}</p>`;
    h+=`<button class="btn ghost sm" style="margin-top:6px" data-act="ktab" data-v="dost">Edytuj ›</button>`}
  h+=`</section>`;
  h+=smsUHtml(k);
  h+=`<section class="card"><button class="btn ghost sm" data-act="toggleKset" aria-expanded="${!!S.showKset}">${S.showKset?"▾":"▸"} Ustawienia kursanta</button>`;
  if(S.showKset)h+=`<div class="grid2" style="margin-top:10px"><label class="field"><span class="lbl">Status</span><select id="kst" data-ch="kst">${Object.entries(ST_K).map(([v,t])=>`<option value="${v}"${k.status===v?" selected":""}>${t}</option>`).join("")}</select></label>
    <label class="field"><span class="lbl">Imię</span><input type="text" id="kim" maxlength="30" value="${esc(k.imie||"")}" data-defer data-ch="kim"></label>
    <label class="field"><span class="lbl">Litery nazwiska</span><input type="text" id="klit" maxlength="3" value="${esc(k.litery)}" data-defer data-ch="klit"></label></div>
    ${k.zOL&&k.kategoria==="staly"?`<div class="card" style="margin-top:10px;background:var(--sunk);box-shadow:none"><label class="field"><span class="lbl">Godziny od poprzedniego instruktora</span><input type="number" id="kpoprz" min="0" max="30" value="${k.godziny_poprz||0}" data-defer style="max-width:120px"></label><p class="small muted" style="margin:6px 0">Tylko przy przejściu z OL na kursanta stałego. Saldo = te godziny + jazdy u Ciebie (także dawne OL).</p><button class="btn sm" data-act="dopiszPoprz">Zapisz godziny</button></div>`:""}
    ${innyHtml(k)}
    <div class="row" style="margin-top:10px"><button class="btn ${k.aktywny?"badb":"okb"} sm" data-act="toggleAkt">${k.aktywny?"Oznacz jako nieaktywnego":"Przywróć jako aktywnego"}</button><span class="small muted">ID ${k.id} zostaje na stałe.</span></div>
    ${wczHtml(k)}`;
  h+=`</section>`;
  return h}
/* P-033 pkt 1: SMS „umówione jazdy” (sekcja zwijana pod Dostępnością) */
function smsUHtml(k){const open=!!S.showSmsU,l=jUmowione(k.id),t=smsUTxt(k.id),cp=!!t&&S.copiedU===k.id+"|"+t;
  let h=`<section class="card"><button class="btn ghost sm" data-act="toggleSmsU" aria-expanded="${open}">${open?"▾":"▸"} SMS „umówione jazdy”${l.length?` <span class="pill">${l.length}</span>`:""}</button>`;
  if(open){if(!t)h+=`<p class="small muted" style="margin:8px 0 0">Brak umówionych jazd.</p>`;
    else h+=`<textarea class="sms" id="smsu-${k.id}" readonly rows="${l.length+6}" aria-label="Treść SMS z umówionymi jazdami" style="margin-top:8px">${esc(t)}</textarea><div class="row" style="margin-top:8px"><button class="btn ${cp?"":"pri"}" data-act="kopiujU" data-k="${k.id}">${cp?"Kopiuj ponownie":"Kopiuj"}</button>${cp?`<span class="pill ok">✓ skopiowano</span>`:""}</div>`}
  return h+`</section>`}
/* P-033 pkt 2: edycja godzin wyjeżdżonych wcześniej (k.saldo_przed bez k.godziny_poprz; połówki; zapis z podwójnym potwierdzeniem) */
const wczOf=k=>Math.max(0,(k.saldo_przed||0)-(k.godziny_poprz||0));
function wczHtml(k){const arm=!!S.wczArm,val=S.wczVal!=null?S.wczVal:wczOf(k);
  return `<div class="card" style="margin-top:10px;background:var(--sunk);box-shadow:none"><label class="field"><span class="lbl">Godziny wyjeżdżone wcześniej</span><input type="number" id="kwcz" min="0" max="30" step="0.5" inputmode="decimal" value="${val}" data-defer data-in="wcz" style="max-width:120px"></label><p class="small muted" style="margin:6px 0">Godziny sprzed używania aplikacji (0–30, także połówki).${k.zOL&&k.kategoria==="staly"?" Godziny od poprzedniego instruktora to osobne pole i zostają bez zmian.":""} Saldo teraz: <b class="num">${saldo(k)} h</b>.</p><button class="btn ${arm?"warnb":""}" data-act="wczSave">${arm?"Na pewno zmienić?":"Zapisz godziny"}</button></div>`}
/* P-032 pkt 1: jazdy z innym instruktorem (Ustawienia kursanta; pole k.jazdy_inni = [{id,h,data?,notatka?}]) */
function innyHtml(k){
  const ii=(k.jazdy_inni||[]).slice().sort((a,b)=>(a.data||"9999").localeCompare(b.data||"9999")||a.id-b.id),ed=ii.find(x=>x.id===S.iiEd);
  let h=`<div class="card" style="margin-top:10px;background:var(--sunk);box-shadow:none"><p class="lbl" style="margin:0 0 4px">Jazdy z innym instruktorem</p><p class="small muted" style="margin:0 0 6px">Liczą się do salda 30 h, ale nie do Twoich godzin pracy ani grafiku.</p>`;
  if(ii.length)h+=`<table class="mini">${ii.map(x=>`<tr><td style="width:56px" class="num">${x.h} h</td><td>${x.data?`<span class="num">${fdy(x.data)}</span>`:`<span class="muted">bez daty</span>`}${x.notatka?` · ${esc(x.notatka)}`:""}</td><td style="text-align:right;white-space:nowrap"><button class="btn ghost sm" data-act="iiEdit" data-id="${x.id}">Edytuj</button> <button class="btn ${S.iiArm===x.id?"warnb":"ghost"} sm" data-act="iiDel" data-id="${x.id}">${S.iiArm===x.id?"Na pewno?":"Usuń"}</button></td></tr>`).join("")}</table><p class="small" style="margin:6px 0">Razem: <b class="num">${innych(k)} h</b></p>`;
  h+=`<div class="grid2"><label class="field"><span class="lbl">Liczba godzin</span><input type="number" id="iih" min="0.5" max="30" step="0.5" value="${ed?ed.h:""}" data-defer></label><label class="field"><span class="lbl">Data (opcjonalnie)</span><input type="date" id="iid" value="${ed&&ed.data||""}" data-defer></label></div><label class="field"><span class="lbl">Notatka (opcjonalnie)</span><input type="text" id="iin" maxlength="120" value="${ed?esc(ed.notatka||""):""}" data-defer></label>
  <div class="row"><button class="btn sm" data-act="iiSave">${ed?"Zapisz zmiany":"Dodaj wpis"}</button>${ed?`<button class="btn ghost sm" data-act="iiCancel">Anuluj</button>`:""}</div></div>`;
  return h}
/* lista jazd pogrupowana tygodniami (pn–nd) z podsumowaniem */
function tygodnie(list){
  const cur=monday(today()),g={};list.forEach(j=>{const m=monday(j.data);(g[m]=g[m]||[]).push(j)});
  return Object.keys(g).sort((a,b)=>list[0]&&cmpJ(list[0],list[list.length-1])>0?b.localeCompare(a):a.localeCompare(b)).map(m=>{const js=g[m],a=js.filter(j=>j.status!=="odwołana");
    const diff=Math.round((pISO(m)-pISO(cur))/864e5/7);
    const nazwa=diff===0?"Ten tydzień":diff===1?"Przyszły tydzień":diff===-1?"Poprzedni tydzień":diff>1?"Za "+diff+" tyg.":-diff+" tyg. temu";
    return `<div class="wkh${diff===0?" now":""}"><span class="wkn">${nazwa}</span><span class="wkd num">${fd(m)}–${fd(addD(m,6))}</span><span class="wks num">${a.length} ${a.length===1?"jazda":a.length<5?"jazdy":"jazd"} · ${sumH(a)} h</span></div><div class="jl">${js.map(jRow).join("")}</div>`}).join("")}
function cols(k){let st=przedH(k);return lekcje(k).all.map(j=>{let l;if(isKurs(j)){l=j.h===1?`${st+1}`:`${st+1}-${st+j.h}`;st+=j.h}else l="dod.";return{j,l,cur:j.status!=="odbyta"}})}
function umiejHtml(k){
  const C=cols(k),U=S.META?.slowniki?.umiejetnosci||[],lm=lastMarks(k);
  if(!C.length)return `<div class="card empty">Brak odbytych i zaplanowanych jazd. Kolumny tabeli to kolejne jazdy – ostatnia to najbliższa nadchodząca.</div>`;
  const val=(nr,jid)=>((k.oznaczenia||{})[nr]||[]).find(x=>x[0]===jid)?.[1]||"";
  const row=u=>{const g=u.nr.split(".")[0];return `<tr class="${lm[u.nr]==="X"?"bad":""}"><th class="st" style="--gc:var(${GRP[g]})"><span class="nr">${u.nr}</span>${esc(u.nazwa)}</th>${C.map(c=>{const v=val(u.nr,c.j.id);return `<td class="${c.cur?"cur":""}"><button class="mk ${v}" data-act="mark" data-nr="${u.nr}" data-j="${c.j.id}" data-sec="${u.sekcja}" aria-label="${u.nr}, jazda ${c.l}: ${v||"puste"}">${v==="V"?"✓":v==="X"?"✕":""}</button></td>`}).join("")}</tr>`};
  const sec=(t,s)=>`<tr class="secr"><th class="st">${t}</th><td colspan="${C.length}"></td></tr>`+U.filter(u=>u.sekcja===s).map(row).join("");
  return `<p class="small muted">Dotknij pola: Ćwiczenia – puste → ✓ → ✕; Obserwacje – puste → ✕ → ✓. Wiersz na czerwono = ostatnie oznaczenie to ✕.</p>
  <div class="tw"><table class="sk"><thead><tr><th class="st">Umiejętność</th>${C.map(c=>`<th class="${c.cur?"cur":""}">${c.l}<span>${fd(c.j.data)}${c.cur?" · teraz":""}</span></th>`).join("")}</tr></thead><tbody>${sec("Ćwiczenia","cwiczenia")}${sec("Obserwacje – błędy","obserwacje")}</tbody></table></div>`}
function miejscaHtml(k){
  const L=lekcje(k),opts=L.opts;
  if(!S.mj||!opts.find(j=>j.id===S.mj))S.mj=biezaca(k)?.id||null;
  const names=[...(S.META?.slowniki?.miejsca||[])];Object.keys(k.miejsca||{}).forEach(n=>{if(!names.includes(n))names.push(n)});
  let h=`<section class="card">`;
  if(opts.length)h+=`<label class="field"><span class="lbl">Jazda</span><select id="mj" data-ch="mj">${opts.map(j=>`<option value="${j.id}"${j.id===S.mj?" selected":""}>${fdl(j.data)} ${t2s(j.od)}${optLab(j)}</option>`).join("")}</select></label>`;
  else h+=`<p class="small muted">Brak jazd – wizyty dopiszesz, gdy kursant będzie miał jazdę w grafiku.</p>`;
  h+=`<div style="margin-top:6px">`+names.map(n=>{const ids=(k.miejsca||{})[n]||[],on=S.mj&&ids.includes(S.mj);
    const ds=ids.map(id=>S.J[id]?fd(S.J[id].data):id).join(", ");
    return `<div class="plc"><span style="font-weight:600">${esc(n)}</span><span class="cnt num">${ids.length}</span>${S.mj?`<button class="btn sm ${on?"okb":""}" data-act="place" data-n="${esc(n)}">${on?"✓ była":"+ była"}</button>`:"<span></span>"}${ids.length?`<span class="dates">${esc(ds)}</span>`:""}</div>`}).join("")+`</div>
    <div class="row" style="margin-top:10px"><input type="text" id="newplace" class="grow" placeholder="Nowe miejsce" data-defer style="flex:1 1 160px"><button class="btn sm" data-act="addPlace">Dodaj miejsce</button></div></section>`;
  return h}
function teoriaHtml(k){const T=S.META?.slowniki?.teoria||Object.keys(k.teoria||{});const n=T.filter(t=>(k.teoria||{})[t]).length;
  return `<section class="card"><div class="sec-h"><h3>Teoria omówiona</h3><span class="pill acc num">${n} z ${T.length}</span></div><div style="margin-top:6px">${T.map((t,i)=>`<label class="toggle"><input type="checkbox" id="th${i}" data-ch="theory" data-t="${esc(t)}"${(k.teoria||{})[t]?" checked":""}><span>${esc(t)}</span></label>`).join("")}</div></section>`}
function winEditor(ctx,tyg){
  return `<div class="wedit">${DNI.map((n,i)=>{const w=tyg[String(i)]||[];const open=S.addWin&&S.addWin.ctx===ctx&&S.addWin.d===i;
    return `<div class="wday"><span class="dn">${n}</span><div><div class="chips">${w.length?w.map((x,wi)=>`<span class="chip">${wtxt(x)}<button data-act="rmWin" data-ctx="${ctx}" data-d="${i}" data-i="${wi}" aria-label="Usuń okno ${wtxt(x)}">✕</button></span>`).join(""):`<span class="muted small" style="padding-top:6px">brak</span>`}
    ${open?"":`<button class="btn ghost sm" data-act="addWinOpen" data-ctx="${ctx}" data-d="${i}">+ okno</button>`}</div>
    ${open?`<div class="addw"><select id="aw-od" aria-label="Od">${tOpts(S.addWin.od,300,1425)}</select><span>–</span><select id="aw-do" aria-label="Do">${tOpts(S.addWin.do,315,1425,true)}</select><button class="btn pri sm" data-act="addWinSave">Dodaj</button><button class="btn sm" data-act="addWinAll">Cały dzień</button><button class="btn ghost sm" data-act="addWinCancel">Anuluj</button></div>`:""}</div></div>`}).join("")}</div>`}
function exForm(ctx){const d=S.addEx;if(!d||d.ctx!==ctx)return `<button class="btn sm" data-act="addExOpen" data-ctx="${ctx}">+ Wyjątek</button>`;
  return `<div class="card" style="background:var(--sunk);border:0"><div class="grid2"><label class="field"><span class="lbl">${ctx==="k"?"Od":"Data"}</span><input type="date" id="ex-od" value="${d.od}"></label>${ctx==="k"?`<label class="field"><span class="lbl">Do</span><input type="date" id="ex-do" value="${d.do}"></label>`:""}
   <label class="field"><span class="lbl">Zmiana</span><select id="ex-typ" data-ch="ex-typ"><option value="brak"${d.typ==="brak"?" selected":""}>niedostępny</option><option value="okno"${d.typ==="okno"?" selected":""}>tylko w oknie</option></select></label>
   ${d.typ==="okno"?`<div class="field"><span class="lbl">Okno</span><div class="row"><select id="ex-s" style="width:auto">${tOpts(d.s,300,1425)}</select>–<select id="ex-e" style="width:auto">${tOpts(d.e,315,1425,true)}</select></div></div>`:""}
   <label class="field full"><span class="lbl">Powód</span><input type="text" id="ex-pow" value="${esc(d.pow)}" placeholder="Np. wyjazd, sesja, urlop"></label></div>
   <div class="row" style="margin-top:10px"><button class="btn pri sm" data-act="addExSave">Zapisz wyjątek</button><button class="btn ghost sm" data-act="addExCancel">Anuluj</button></div></div>`}
function dostHtml(k){
  let h=`<section class="card"><div class="sec-h"><h3>Dostępność tygodniowa</h3></div>`;
  if(!k.dostepnosc)h+=`<div class="banner" style="margin-top:8px">Dostępność nieznana – generator pominie tego kursanta.</div><div class="row" style="margin-top:10px"><button class="btn pri" data-act="initDost">Uzupełnij dostępność</button></div>`;
  else h+=`<p class="small muted">„od 15:00” = do końca dnia pracy instruktora. Dzień bez okien = niedostępny.</p>`+winEditor("k",k.dostepnosc);
  h+=`</section><section class="card"><div class="sec-h"><h3>Wyjątki dostępności</h3></div><p class="small muted">Jednorazowe zmiany – wyjazd, sesja, urlop. Wyjątek ma pierwszeństwo przed planem tygodniowym.</p>`;
  const ex=(k.wyjatki||[]).slice().sort((a,b)=>a.od.localeCompare(b.od));
  if(ex.length)h+=`<div class="chips" style="margin:8px 0">${ex.map((e,i)=>`<span class="chip">${fdy(e.od)}${e.do!==e.od?"–"+fdy(e.do):""} · ${e.okna&&e.okna.length?e.okna.map(wtxt).join(", "):"niedostępny"}${e.powod?" · "+esc(e.powod):""}<button data-act="rmEx" data-ctx="k" data-i="${(k.wyjatki||[]).indexOf(e)}" aria-label="Usuń wyjątek">✕</button></span>`).join("")}</div>`;
  h+=exForm("k")+`</section><section class="card"><h3>Preferencje</h3><textarea id="pref" data-defer data-ch="pref" placeholder="Np. najwygodniej poniedziałki i środy">${esc(k.preferencje||"")}</textarea></section>`;
  return h}

/* ---------------------------------------------------------- grafik */
/* jeden dzień grafiku: pasek dnia (luki widać od razu) + lista jazd z wierszami luk i przerwy */
function dayHtml(d,dj){
  const i=dow(d),iw=instWin(d),ex=instEx(d);
  if(!dj.length&&!iw.length)return `<div class="day off"><div class="day-h"><h3>${DN[i]} ${fd(d)}</h3><span class="meta">wolne${ex?.powod?" · "+esc(ex.powod):""}</span></div></div>`;
  const a=dj.filter(j=>j.status!=="odwołana").sort((x,y)=>x.od-y.od),odw=dj.filter(j=>j.status==="odwołana").sort((x,y)=>x.od-y.od);
  const brk=d>=PRZERWA_OD,tot=sumH(a);
  // odstępy między jazdami
  const gaps=[];for(let k=1;k<a.length;k++){const s=a[k-1].od+a[k-1].h*60,e=a[k].od;if(e>s)gaps.push({s,e,brk:brk&&k===3&&e-s===30,idx:k})}
  const nLuk=gaps.filter(g=>!g.brk).length;
  const dw=dayCheck(dj,d).filter(w=>!w.startsWith("Luka"));
  let h=`<div class="day${d===today()?" today":""}"><div class="day-h"><h3>${DNI[i]} ${fd(d)}</h3><span class="meta">${d===today()?"dziś · ":""}${iw.length?iw.map(wtxt).join(", "):"instruktor niedostępny"}</span><span class="grow"></span><span class="dsum num${tot>10?" over":""}">${tot} h</span>${nLuk?`<span class="pill bad">luki: ${nLuk}</span>`:""}<button class="btn ghost sm" data-act="newJ" data-d="${d}" aria-label="Dodaj jazdę ${fd(d)}">+</button></div>`;
  // pasek dnia
  if(a.length||iw.length){const st=a.length?a[0].od:iw[0][0],en=a.length?Math.max(...a.map(j=>j.od+j.h*60)):iw[iw.length-1][1],span=Math.max(60,en-st);
    const pc=m=>((m-st)/span*100).toFixed(2)+"%";
    let bar=`<div class="dbar" aria-hidden="true">`;
    const sh=m=>m%60===0?m/60+"h":m<60?m+" min":Math.floor(m/60)+"h"+pad(m%60);
    a.forEach(j=>bar+=`<span class="seg${j.status==="propozycja"?" prop":j.status==="odbyta"?" done":""}" style="left:${pc(j.od)};width:${pc(st+j.h*60)}">${j.h}h</span>`);
    gaps.forEach(g=>bar+=`<span class="seg ${g.brk?"brkseg":"gapseg"}" style="left:${pc(g.s)};width:${pc(st+g.e-g.s)}">${g.brk?`<i>${sh(g.e-g.s)}</i>`:sh(g.e-g.s)}</span>`);
    bar+=`</div><div class="dbar-ax num"><span>${t2s(st)}</span><span>${t2s(en)}</span></div>`;h+=bar}
  if(dw.length)h+=`<div class="wbox">${dw.map(w=>`<div class="wl">${esc(w)}</div>`).join("")}</div>`;
  if(!a.length)h+=`<p class="small muted" style="margin:2px">Brak jazd.</p>`;
  a.forEach((j,k)=>{const g=gaps.find(x=>x.idx===k);
    if(g)h+=g.brk?`<div class="gaprow brkrow">przerwa · ${t2s(g.s)}–${t2s(g.e)}</div>`:`<div class="gaprow">luka ${dur(g.e-g.s)} · ${t2s(g.s)}–${t2s(g.e)}</div>`;
    h+=lesHtml(j)});
  if(odw.length){const open=S.odwOpen&&S.odwOpen[d];h+=`<button class="btn ghost sm odwbtn" data-act="toggleOdw" data-d="${d}">${open?"▾":"▸"} odwołane (${odw.length})</button>`;if(open)odw.forEach(j=>h+=lesHtml(j))}
  return h+`</div>`}
const dur=m=>m<60?m+" min":Math.floor(m/60)+" h"+(m%60?" "+(m%60)+" min":"");
function lesHtml(j){const nw=check(j).w.length;
  const st=j.status==="odbyta"?`<span class="stx ok">✓ odbyta</span>`:j.status==="propozycja"?`<span class="stx">propozycja</span>`:j.status==="odwołana"?`<span class="stx bad">odwołana</span>`:j.status===CZEKA?`<span class="stx wt">czeka na kursanta</span>`:`<span class="stx">zaplanowana</span>`;
  return `<button class="les st-${j.status==="odwołana"?"odwolana":j.status}" data-act="openJ" data-id="${j.id}"><span class="time">${t2s(j.od)}<small>${t2s(j.od+j.h*60)}</small></span><span class="who">${esc(lab(j.kursant))}</span><span class="rt">${nw?`<span class="wn" title="Ostrzeżenia">${IC_WARN} ${nw}</span>`:""}${st}</span><span class="info"><span>${j.h} h${j.rodzaj!=="kurs"?` · ${j.rodzaj}`:""}</span>${j.uwagi?`<span>${esc(j.uwagi)}</span>`:""}</span></button>`}

