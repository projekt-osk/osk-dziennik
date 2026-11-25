"use strict";
/* widoki-ekrany.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
function render(){
  const ae=document.activeElement;
  if(ae&&ae.closest&&ae.closest("#view")&&ae.dataset&&ae.dataset.defer!==undefined){S.pending=true;return}
  S.pending=false;
  const focusId=ae&&ae.id&&ae.closest&&ae.closest("#view")?ae.id:null,selS=focusId&&ae.selectionStart!=null?ae.selectionStart:null;
  const navV=S.view==="karta"?"kursanci":S.view==="wolne"?"ustawienia":S.view;
  const wide=S.view==="wiad"||S.view==="wolne";document.getElementById("topbar").classList.toggle("wide",wide);document.getElementById("view").classList.toggle("wide",wide);
  document.querySelectorAll(".bnav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===navV?"page":"false"));
  const wyl=S.auth!=="in";document.body.classList.toggle("wylogowany",wyl);
  document.getElementById("topbar").innerHTML=wyl?`<div class="tt"><h1>Dziennik instruktora</h1></div>`:topHtml();
  const v=document.getElementById("view");
  let h="";
  if(S.auth==="out")h=loginHtml();
  else if(S.err)h=`<div class="banner">Nie mogę połączyć się z bazą danych aplikacji (${esc(S.err)}).${String(S.err).includes("permission-denied")?" Brak uprawnień: sprawdź, czy reguły Firestore zawierają uid tego konta (Więcej → Konto).":""} Ponawiam automatycznie.</div><div class="row"><button class="btn" data-act="retryDb">Spróbuj ponownie</button></div>`+(S.user?kontoHtml():"");
  else if(S.auth!=="in")h=`<div class="empty">Łączę z bazą danych…</div>`;
  else{const ban=(pvOn()?`<div class="banner pvbar" role="status"><span class="grow">Podgląd: ${DN[dow(today())].toLowerCase()} ${fd(today())} · ${t2s(nowMin())}<br><span class="small" style="font-weight:400">${PV_MSG}</span></span><button class="btn sm" data-act="pv" data-v="0">Wróć do teraz</button></div>`:"")+(S.slow?`<div class="banner">Baza danych jeszcze nie odpowiada. Dane mogą być nieaktualne – sprawdź połączenie.</div>`:"");
    const all=S.got.k&&S.got.j&&S.got.u;
    h=ban+(!all&&!Object.keys(S.K).length?`<div class="empty">Wczytuję dane…</div>`:viewHtml())}
  const tw0=v.querySelector(".tw"),twL=tw0?tw0.scrollLeft:null;
  v.innerHTML=h;
  if(twL!=null&&!S.scrollSk){const tw=v.querySelector(".tw");if(tw)tw.scrollLeft=twL}
  if(focusId){const el=document.getElementById(focusId);if(el){el.focus();if(selS!=null&&el.setSelectionRange)try{el.setSelectionRange(selS,selS)}catch(e){}}}
  if(S.scrollSk){const tw=v.querySelector(".tw");if(tw){tw.scrollLeft=tw.scrollWidth;requestAnimationFrame(()=>tw.scrollLeft=tw.scrollWidth)}S.scrollSk=false}
  if(S.scrollGrid){S.scrollGrid=false;const n=v.querySelector(".grid .now");if(n)n.scrollIntoView({block:"center"})}
}
// F-2026.11.25: ekran logowania (bez zalogowania brak danych)
function loginHtml(){return `<section class="card"><h3>Logowanie</h3><p class="small muted">Zaloguj się kontem Google instruktora. Bez logowania aplikacja nie pokazuje żadnych danych.</p>${S.loginErr?`<div class="banner" role="alert">${esc(S.loginErr)}</div>`:""}<div class="row" style="margin-top:10px"><button class="btn pri" data-act="zaloguj">Zaloguj przez Google</button></div></section>`}
function topHtml(){
  const v=S.view;
  if(v==="karta"&&S.K[S.kid]){const k=S.K[S.kid];return `<button class="iconbtn" data-act="back" aria-label="Wróć do listy kursantów">‹</button><div class="tt"><h1>${esc(k.imie||k.id)} <span class="muted" style="font-weight:400">${esc(k.litery)}</span></h1><span class="sub">${ST_K[k.status]||k.status}${k.aktywny?"":" · nieaktywny"}</span></div><button class="iconbtn pri" data-act="newJ" data-k="${k.id}" aria-label="Dodaj jazdę">+</button>`}
  if(v==="grafik")return `<div class="tt"><h1>Grafik</h1><span class="sub">${(S.week=S.week||monday(today()),fd(S.week)+" – "+fdy(addD(S.week,6)))}</span></div><button class="iconbtn txt" data-act="genToggle" aria-expanded="${!!S.genOpen}">Generuj</button><button class="iconbtn pri" data-act="newJ" aria-label="Dodaj jazdę">+</button>`;
  if(v==="wiad")return `<button class="iconbtn" data-act="wiadBack" aria-label="Wróć">‹</button><div class="tt"><h1>Wiadomości</h1><span class="sub">SMS do kursantów – terminy do potwierdzenia</span></div>`;
  if(v==="wolne")return `<button class="iconbtn" data-act="wtBack" aria-label="Wróć">‹</button><div class="tt"><h1>Wolne terminy</h1><span class="sub">Lista do wysłania innemu instruktorowi</span></div>`;
  if(v==="kursanci")return `<div class="tt"><h1>Kursanci</h1></div><button class="iconbtn pri" data-act="newK" aria-label="Dodaj kursanta">+</button>`;
  if(v==="ustawienia")return `<div class="tt"><h1>Więcej</h1><span class="sub">Rejestr godzin, dyspozycyjność, wolne terminy</span></div>`;
  return `<div class="tt"><h1>${pvOn()?"Podgląd":"Dziś"}</h1><span class="sub">${DNI[dow(today())]}, ${fdy(today())}${pvOn()?" · "+t2s(nowMin()):""}</span></div><button class="iconbtn pri" data-act="newJ" data-d="${today()}" aria-label="Dodaj jazdę dziś">+</button>`}
function viewHtml(){
  const empty=!Object.keys(S.K).length&&!Object.keys(S.J).length;
  if(empty&&S.view!=="ustawienia")return `<div class="card empty"><h2>Baza aplikacji jest pusta</h2><p>Tu pojawią się kursanci i jazdy.</p></div>`;
  if(S.view==="karta"&&S.K[S.kid])return kartaHtml(S.K[S.kid]);
  if(S.view==="grafik")return grafikHtml();
  if(S.view==="ustawienia")return ustawHtml();
  if(S.view==="kursanci")return kursanciHtml();
  if(S.view==="wiad")return wiadHtml();
  if(S.view==="wolne")return wolneHtml();
  return dzisHtml()}

/* ---------------------------------------------------------- Dziś */
function dzisHtml(){
  const pv=pvOn(),d=today();
  if(pv&&S.pvT==null)S.pvT=pvDefT(d);
  const nm=nowMin(),dz=pv?"W tym dniu":"Dziś";
  let top=`<div class="seg" role="group" aria-label="Podgląd dnia"><button data-act="pv" data-v="0" aria-pressed="${!pv}">Dziś</button><button data-act="pv" data-v="2" aria-pressed="${pv}">Podgląd</button></div>`;
  if(pv)top+=`<div class="banner info pved"><span>Dzień</span><input type="date" id="pvd" data-ch="pvd" value="${d}" aria-label="Dzień podglądu"><span>godzina</span><select id="pvt" data-ch="pvt" aria-label="Godzina podglądu">${tOpts(nm,0,1425)}</select></div>`;
  const js=Object.values(S.J).filter(j=>j.data===d&&j.status!=="odwołana").sort((a,b)=>a.od-b.od);
  const open=Object.values(S.J).filter(j=>otwSt(j.status)&&(j.data<d||(j.data===d&&j.od+j.h*60<=nm))).sort(cmpJ);
  const cur=js.find(j=>j.status!=="odbyta"&&j.od<=nm&&nm<j.od+j.h*60),nxt=js.find(j=>j.status!=="odbyta"&&j.od>nm),hero=cur||nxt;
  let h=top+kopiaPasek();
  if(hero){const k=S.K[hero.kursant];
    h+=`<section class="hero"><div class="eyebrow">${cur?"Teraz":"Następna jazda"} · ${t2s(hero.od)}–${t2s(hero.od+hero.h*60)}</div><div class="big">${esc(lab(hero.kursant))}</div>
    <div class="meta">${hero.h} h${hero.rodzaj!=="kurs"?" · "+hero.rodzaj:""}${k&&k.kategoria!=="OL"&&k.status==="w_trakcie"?` · ma ${saldo(k)} z 30 h`:""}</div>
    ${k&&doPop(k).length?`<div class="note">Do poprawy: ${doPop(k).map(n=>esc(n+" "+(skill(n)?.nazwa||""))).join(", ")}</div>`:""}
    ${hero.uwagi?`<div class="note">${esc(hero.uwagi)}</div>`:""}
    <div class="hero-act"><button class="btn lg tj" data-act="openK" data-id="${hero.kursant}" data-tab="tryb" data-j="${hero.id}">${IC_PLAY} Tryb jazdy</button><button class="btn lg kt" data-act="openK" data-id="${hero.kursant}">Karta</button><button class="btn lg okb" data-act="quickDone" data-id="${hero.id}">✓ Odbyta</button></div></section>`}
  else{const fut=Object.values(S.J).filter(j=>j.data>d&&j.status!=="odwołana").sort(cmpJ)[0];
    h+=`<section class="hero empty"><div class="eyebrow">${pv?dz+" · "+t2s(nm):"Dziś"}</div><div class="big">${js.length?(pv?"Wszystkie jazdy zamknięte":"Jazdy na dziś zamknięte"):(pv?"Brak jazd w tym dniu":dz+" brak jazd")}</div>${fut?`<div class="meta muted">Następna: ${DNI[dow(fut.data)]} ${fd(fut.data)}, ${t2s(fut.od)} · ${esc(lab(fut.kursant))}</div>`:""}</section>`}
  const cz=Object.values(S.J).filter(j=>j.status===CZEKA),czK=new Set(cz.map(j=>j.kursant)).size;
  if(cz.length)h+=`<button class="czbar" data-act="wiad"><span class="grow"><b>Czeka na odpowiedź: ${ileTerm(cz.length)}</b><br><span class="small">${czK===1?"1 kursant":czK+" kursantów"} · SMS z terminami w Wiadomościach</span></span><span class="cnt">${cz.length}</span><span aria-hidden="true">›</span></button>`;
  if(open.length)h+=`<section class="block"><div class="block-h"><h2>Do zamknięcia</h2><span class="count">${open.length}</span></div><p class="hint">Jazdy, których termin minął, a nie mają jeszcze statusu.</p><div class="list">${open.map(j=>`<div class="crow"><span class="w">${fdl(j.data)} ${t2s(j.od)} · ${esc(lab(j.kursant))}</span><button class="btn sm okb" data-act="quickDone" data-id="${j.id}">✓ Odbyta</button><button class="btn sm" data-act="openJ" data-id="${j.id}">Więcej</button><span class="s">${j.h} h${j.rodzaj!=="kurs"?" · "+j.rodzaj:""}${j.status==="propozycja"?" · niezatwierdzona propozycja":j.status===CZEKA?" · kursant nie potwierdził":""}</span></div>`).join("")}</div></section>`;
  h+=`<section class="block"><div class="block-h"><h2>Plan dnia</h2><span class="muted num">${ileJazd(js.length)} · ${sumH(js)} h</span></div>${js.length?listaDnia(d):`<p class="hint">Brak jazd zaplanowanych ${pv?"w tym dniu":"na dziś"}.</p>`}</section>`;
  const wm=weekMin(monday(d));
  if(wm.length)h+=`<details class="block"><summary style="cursor:pointer;font-weight:700;color:var(--bad)">Bez żadnej jazdy w tym tygodniu: ${wm.length}</summary><div class="list" style="margin-top:6px">${wm.map(x=>`<button class="krow" data-act="openK" data-id="${x.k.id}"><span class="kname">${esc(lab(x.k.id))}</span><span class="kwarn">0 jazd${x.brak?" · brak dostępności":""}</span></button>`).join("")}</div></details>`;
  return h}
function listaDnia(d){
  const dj=Object.values(S.J).filter(j=>j.data===d),a=dj.filter(j=>j.status!=="odwołana").sort((x,y)=>x.od-y.od),O=odstepy(a,d);
  let h=`<div class="list">`;
  a.forEach((j,k)=>{const x=O.G.find(g=>g.k===k);if(x&&x.g>0){let s=x.s;
    if(x.brk){h+=`<div class="gaprow brkrow">przerwa ${dur(x.brk)} · ${t2s(s)}–${t2s(s+x.brk)}</div>`;s+=x.brk}
    if(x.luka>0)h+=`<div class="gaprow">luka ${dur(x.luka)} · ${t2s(s)}–${t2s(x.e)}</div>`}h+=lesHtml(j)});
  return h+`</div>`}

/* ---------------------------------------------------------- kursanci */
function kursanciHtml(){
  const c={w_trakcie:0,ukonczony:0,OL:0,nieaktywni:0};kList().forEach(k=>{if(!k.aktywny)c.nieaktywni++;else c[k.status]=(c[k.status]||0)+1});
  const q=norm(S.q.trim());
  let list=kList().filter(k=>S.filter==="nieaktywni"?!k.aktywny:(k.aktywny&&k.status===S.filter));
  if(q)list=kList().filter(k=>norm(k.id+" "+nm(k)).includes(q));
  if(S.filter==="w_trakcie"&&!q)list.sort((a,b)=>saldo(a)-saldo(b));
  const F=[["w_trakcie","W trakcie"],["ukonczony","Po kursie"],["OL","OL"],["nieaktywni","Nieaktywni"]];
  let h=`<input type="text" id="q" placeholder="Szukaj kursanta" value="${esc(S.q)}" data-in="q" autocomplete="off">
  <div class="seg" role="group" aria-label="Filtr">${F.map(([v,t])=>`<button data-act="filter" data-v="${v}" aria-pressed="${!q&&S.filter===v}">${t} <span class="num">${c[v]||0}</span></button>`).join("")}</div>`;
  if(S.newK)h+=newKHtml();
  if(!list.length)return h+`<div class="empty">Brak kursantów w tej grupie.</div>`;
  h+=`<section class="block"><div class="list">`+list.map(k=>{
    const s=saldo(k),n=nastepna(k),dp=doPop(k).length,nc=czekaOf(k.id).length;
    let side;
    if(k.status==="w_trakcie")side=`<span class="khours num">${s}<small> / 30 h</small></span>`;
    else if(k.status==="ukonczony")side=`<span class="khours num">+${dodat(k)}<small> h dod.</small></span>`;
    else side=`<span class="khours num">${s}<small> h</small></span>`;
    const sub=[n?`następna ${fdl(n.data)}, ${t2s(n.od)}${n.status==="propozycja"?" (propozycja)":n.status===CZEKA?" (czeka na kursanta)":""}`:"brak zaplanowanej jazdy",k.status==="w_trakcie"&&!k.dostepnosc?"brak dostępności":""].filter(Boolean).join(" · ");
    return `<button class="krow" data-act="openK" data-id="${k.id}"><span><span class="kname">${esc(k.imie||k.id)} <span class="kl">${esc(k.litery)}</span></span><br><span class="ksub">${sub}</span></span><span>${side}${dp?`<br><span class="kwarn">${dp} do poprawy</span>`:""}${nc?`<br><span class="kczk">czeka na odp.: ${nc}</span>`:""}</span>${k.status==="w_trakcie"?barHtml(k)+`<span class="kdays">${daysHtml(k)}</span>`:""}</button>`}).join("")+`</div></section>`;
  return h}

/* ---------------------------------------------------------- karta */
/* ---------------------------------------------------------- grafik */
const PX=1.4; // px na minutę osi czasu
function dayInfo(d){const a=Object.values(S.J).filter(j=>j.data===d&&j.status!=="odwołana").sort((x,y)=>x.od-y.od);let gaps=0;
  gaps=odstepy(a,d).G.filter(x=>x.luka>0).length;
  return{a,h:sumH(a),gaps,prop:a.some(j=>j.status==="propozycja"),iw:instWin(d)}}
function grafikHtml(){
  if(!S.week)S.week=monday(today());
  const mon=S.week,sun=addD(mon,6);
  if(!S.day||S.day<mon||S.day>sun){const t=today();S.day=t>=mon&&t<=sun?t:mon;if(!instWin(S.day).length){for(let i=0;i<7;i++){const d=addD(mon,i);if(instWin(d).length&&d>=S.day){S.day=d;break}}}}
  let h="";
  if(S.genOpen)h+=genHtml();
  h+=`<div class="wstrip"><button class="nav" data-act="week" data-n="-7" aria-label="Poprzedni tydzień">‹</button>`;
  for(let i=0;i<7;i++){const d=addD(mon,i),I=dayInfo(d),off=!I.iw.length&&!I.a.length;
    h+=`<button class="dchip${off?" off":""}${d<today()?" past":""}${d===today()?" today":""}" data-act="pickDay" data-d="${d}" aria-pressed="${d===S.day}" aria-label="${DNI[i]} ${fd(d)}, ${I.h} h${I.gaps?", luki":""}">${I.gaps?`<span class="mk2"></span>`:""}${I.prop?`<span class="mk3"></span>`:""}<span class="dn">${DN[i]}</span><span class="dd">${pISO(d).getDate()}</span><span class="dh">${off?"wolne":I.h+" h"}</span></button>`}
  h+=`<button class="nav" data-act="week" data-n="7" aria-label="Następny tydzień">›</button></div>`;
  const wj=Object.values(S.J).filter(j=>j.data>=mon&&j.data<=sun&&j.status!=="odwołana"),pr=wj.filter(j=>j.status==="propozycja"),wm=weekMin(mon);
  h+=`<div class="wsum"><span class="num">Tydzień: ${ileJazd(wj.length)} · ${sumH(wj)} h</span>${mon!==monday(today())?`<button class="btn ghost sm" data-act="weekToday">Wróć do bieżącego tygodnia</button>`:""}</div>`;
  const czw=wj.filter(j=>j.status===CZEKA);
  if(czw.length)h+=`<div class="banner row"><span class="grow">${ileTerm(czw.length)} w tym tygodniu czeka na odpowiedź kursanta.</span><button class="btn sm" data-act="wiad">Wiadomości</button></div>`;
  if(pr.length)h+=`<div class="banner info row"><span class="grow">${ileProp(pr.length)} w tym tygodniu ${pr.length===1||pr.length>=5&&!(pr.length%10>=2&&pr.length%10<=4&&!(pr.length%100>=12&&pr.length%100<=14))?"czeka":"czekają"} na zatwierdzenie.</span><button class="btn sm pri" data-act="genApproveWeek">Zatwierdź tydzień</button></div>`;
  h+=tydHtml();
  if(wm.length)h+=`<details class="card"><summary class="small" style="cursor:pointer;font-weight:700;color:var(--bad)">Bez żadnej jazdy w tym tygodniu: ${wm.length}</summary><div class="list" style="margin-top:6px">${wm.map(x=>`<button class="krow" data-act="openK" data-id="${x.k.id}"><span class="kname" style="font-size:16px">${esc(lab(x.k.id))}</span><span class="kwarn">0 jazd${x.brak?" · brak dostępności":""}</span></button>`).join("")}</div></details>`;
  h+=dayView(S.day);
  return h}
function dayView(d){
  const I=dayInfo(d),ex=instEx(d),dw=dayCheck(I.a,d).filter(w=>!w.startsWith("Luka"));
  const odw=Object.values(S.J).filter(j=>j.data===d&&j.status==="odwołana").sort((a,b)=>a.od-b.od);
  // P-022: faktyczny początek i koniec jazd dnia (z propozycjami i „czeka na kursanta”), bez jazd – godziny pracy
  const jSt=I.a.length?Math.min(...I.a.map(j=>j.od)):0,jEn=I.a.length?Math.max(...I.a.map(j=>j.od+j.h*60)):0;
  const meta=I.a.length?`· jazdy ${t2s(jSt)}–${t2s(jEn)} · <b class="dsum num${I.h>10?" over":""}">${I.h}h</b>`:I.iw.length?"· brak jazd (praca "+I.iw.map(wtxt).join(", ")+")":"· wolne"+(ex?.powod?" · "+esc(ex.powod):"");
  let h=`<div class="dhead"><h2>${DN[dow(d)]} ${fd(d)}</h2><span class="meta num">${meta}</span></div>`;
  if(dw.length)h+=`<div class="wbox">${dw.map(w=>`<div class="wl">${esc(w)}</div>`).join("")}</div>`;
  let oh="";if(odw.length){const open=S.odwOpen&&S.odwOpen[d];oh=`<button class="btn ghost sm odwbtn" data-act="toggleOdw" data-d="${d}">${open?"▾":"▸"} Odwołane (${odw.length})</button>`;if(open)oh+=`<section class="block"><div class="list">${odw.map(lesHtml).join("")}</div></section>`}
  if(!I.iw.length&&!I.a.length)return h+`<div class="card empty">Dzień wolny. <button class="btn ghost sm" data-act="newJ" data-d="${d}">Dodaj jazdę mimo to</button></div>`+oh;  // BUG-026
  h+=gridHtml(d,I);
  h+=`<p class="gridnote">Dotknij pustego miejsca na osi, aby dodać jazdę o tej godzinie.</p>`;
  return h+oh}
function gridHtml(d,I){
  const a=I.a,iw=I.iw;
  let st=Math.min(iw[0]?.[0]??1440,a[0]?.od??1440),en=Math.max(iw.length?iw[iw.length-1][1]:0,...a.map(j=>j.od+j.h*60));
  st=Math.floor(st/60)*60;en=Math.ceil(en/60)*60;const H=(en-st)*PX,y=m=>((m-st)*PX).toFixed(1);
  let h=`<div class="grid" data-act="gridAdd" data-d="${d}" data-st="${st}" style="height:${H}px">`;
  // poza godzinami pracy
  if(iw.length){if(iw[0][0]>st)h+=`<div class="offz" style="top:0;height:${y(iw[0][0])}px"></div>`;const e=iw[iw.length-1][1];if(e<en)h+=`<div class="offz" style="top:${y(e)}px;height:${((en-e)*PX).toFixed(1)}px"></div>`}
  else h+=`<div class="offz" style="top:0;height:${H}px"></div>`;
  for(let m=st;m<en;m+=60)h+=`<div class="hr" style="top:${y(m)}px"><span>${t2s(m)}</span></div>`;
  for(const x of odstepy(a,d).G){let s=x.s;const e=x.e;if(e<=s)continue;
    if(x.brk){h+=`<div class="brkz" style="top:${y(s)}px;height:${(x.brk*PX).toFixed(1)}px">przerwa ${dur(x.brk)}</div>`;s+=x.brk;if(e<=s)continue}  // BUG-014 / P-022: przerwa + reszta jako luka
    h+=`<div class="gapz" style="top:${y(s)+2}px;height:${((e-s)*PX-4).toFixed(1)}px">luka ${dur(e-s)}</div>`}
  a.forEach(j=>{const nw=check(j).w.length,cls=j.status==="odbyta"?" done":j.status==="propozycja"?" prop":j.status===CZEKA?" czk":"";
    h+=`<button class="blk${cls}${j.h===1?" short":""}" data-act="openJ" data-id="${j.id}" style="top:${(+y(j.od)+2).toFixed(1)}px;height:${(j.h*60*PX-4).toFixed(1)}px"><span class="bt">${t2s(j.od)}–${t2s(j.od+j.h*60)}${nw?`<span class="warn">${IC_WARN} ${nw}</span>`:""}</span><span class="bn">${esc(lab(j.kursant))}</span><span class="bi">${j.rodzaj!=="kurs"?j.rodzaj:""}${j.uwagi?(j.rodzaj!=="kurs"?" · ":"")+esc(j.uwagi):""}</span><span class="bh">${j.status==="odbyta"?"✓ ":""}${j.h} h</span></button>`});
  if(d===today()){const nmn=nowMin();if(nmn>=st&&nmn<=en)h+=`<div class="now" style="top:${y(nmn)}px"></div>`}
  return h+`</div>`}

/* ---------------------------------------------------------- P-025: karta tygodnia (jak papierowa) z kosztami */
