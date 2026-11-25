"use strict";
/* wiadomosci-arkusz.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
function zatwierdz(pr){if(pvBlok())return;if(!pr.length){toast("Brak propozycji do zatwierdzenia");return}
  const ok=[],kol=[];pr.slice().sort(cmpJ).forEach(j=>{const kj=kolizjaZ(j);if(kj)kol.push([j,kj]);else{const o={...j,status:CZEKA};S.J[j.id]=o;put("jazdy",j.id,o);ok.push(o)}});
  if(kol.length){const [j,kj]=kol[0];
    toast(`${ok.length?`Zatwierdzono: ${ileJazd(ok.length)}. `:""}Nie zatwierdzono ${ileProp(kol.length)} – kolizja: ${fdl(j.data)} ${t2s(j.od)} nachodzi na jazdę ${lab(kj.kursant)} ${t2s(kj.od)}–${t2s(konJ(kj))}.`);
    render();return}
  toast(`Zatwierdzono: ${ileJazd(ok.length)} – czekają na kursanta. Skopiuj SMS.`);A.wiad()}
const DPEL=["poniedziałek","wtorek","środa","czwartek","piątek","sobota","niedziela"]; // SMS: pełna nazwa dnia (decyzja 14.11)
const smsJazdy=id=>czekaOf(id).filter(j=>j.data>=today());
const hs=h=>String(h).replace(".",","); // P-033: godziny w SMS z przecinkiem (1,5h)
const DODAT_ZD=(mn,n)=>(mn?"To dodatkowe terminy, ":"To dodatkowy termin, ")+(n>1?"wcześniej umówione jazdy zostają bez zmian.":"wcześniej umówiona jazda zostaje bez zmian."); // P-032 pkt 2; mn = kilka terminów, n = liczba potwierdzonych
const potwOf=id=>jOf(id).filter(j=>j.status==="zaplanowana"&&(j.data>today()||(j.data===today()&&j.od>=nowMin()))); // przyszłe potwierdzone jazdy
const maPotw=id=>potwOf(id).length>0; // przyszła potwierdzona jazda
const smsLin=(j,i,n)=>`${n>1?(i+1)+". ":""}${fd(j.data)} (${DPEL[dow(j.data)]}), godz. ${t2s(j.od)} (${hs(j.h)}h)`; // numer tylko przy kilku jazdach
function smsTxt(id){const l=smsJazdy(id);if(!l.length)return "";
  const lin=l.map((j,i)=>smsLin(j,i,l.length)).join("\n");
  const np=potwOf(id).length,dz=np?DODAT_ZD(l.length>1,np):"";
  return l.length===1?`Cześć, proponuję kolejną jazdę:\n\n${lin}${dz?"\n\n"+dz:""}\n\nDaj proszę znać ASAP, czy termin Ci odpowiada.`
    :`Cześć, proponuję kolejne jazdy:\n\n${lin}\n\nŁącznie ${hs(sumH(l))}h.${dz?" "+dz:""} Daj proszę znać ASAP, czy wszystkie terminy Ci odpowiadają.`}
// P-033 pkt 1: SMS z umówionymi jazdami (status „zaplanowana”, od teraz; bez „czeka” i odwołanych)
const jUmowione=id=>jOf(id).filter(j=>j.status==="zaplanowana"&&(j.data>today()||(j.data===today()&&j.od>nowMin())));
function smsUTxt(id){const l=jUmowione(id);if(!l.length)return "";
  const lin=l.map((j,i)=>smsLin(j,i,l.length)).join("\n");
  return l.length===1?`Cześć, Twoja umówiona jazda:\n\n${lin}\n\nJeżeli nie możesz pojawić się na jeździe, daj proszę znać z wyprzedzeniem.`
    :`Cześć, Twoje umówione jazdy:\n\n${lin}\n\nŁącznie ${hs(sumH(l))}h. Jeżeli nie możesz pojawić się na którejś z jazd, daj proszę znać z wyprzedzeniem.`}
function kopiujSms(id){const t=smsTxt(id);if(!t)return;
  const ok=()=>{S.copied=S.copied||{};S.copied[id]=t;render();toast("Skopiowano – wklej w SMS do kursanta")};
  const zaznacz=()=>{const ta=document.getElementById("sms-"+id);let done=false;
    if(ta){ta.focus();ta.select();try{ta.setSelectionRange(0,ta.value.length)}catch(e){}try{done=document.execCommand("copy")}catch(e){done=false}}
    if(done)ok();else toast("Tekst zaznaczony – skopiuj go ręcznie (przytrzymaj i wybierz Kopiuj)")};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,zaznacz);else zaznacz()}
function wiadHtml(){
  const ids=[...new Set(Object.values(S.J).filter(j=>j.status===CZEKA).sort(cmpJ).map(j=>j.kursant))];
  let h=`<p class="hint" style="margin:0">Terminy zatwierdzone przez Ciebie, które czekają na odpowiedź kursanta. Skopiuj SMS i wyślij ze swojego telefonu. Odpowiedź zaznacz w karcie kursanta → „Do potwierdzenia”.</p>`;
  if(!ids.length)return h+`<div class="card empty">Nic nie czeka na odpowiedź kursanta.<br><span class="small">Zatwierdź propozycje w Grafiku, a pojawią się tutaj.</span></div>`;
  h+=`<div class="wgrid">`+ids.map(id=>{const all=czekaOf(id),l=smsJazdy(id),t=smsTxt(id),cp=S.copied&&S.copied[id]===t&&t;
    return `<section class="card smsc"><div class="sec-h"><h3>${esc(lab(id))}</h3><span class="pill warn">${ileTerm(all.length)} · ${sumH(all)} h</span></div>
    ${t?`<textarea class="sms" id="sms-${id}" readonly rows="${l.length+6+(maPotw(id)?2:0)}" aria-label="Treść SMS">${esc(t)}</textarea>
    <div class="row"><button class="btn ${cp?"":"pri"}" data-act="kopiuj" data-k="${id}">${cp?"Kopiuj ponownie":"Kopiuj"}</button>${cp?`<span class="pill ok">✓ skopiowano</span>`:""}<span class="grow"></span><button class="btn ghost sm" data-act="openK" data-id="${id}" data-tab="potw">Do potwierdzenia ›</button></div>`
    :`<p class="small muted">Terminy już minęły – zamknij je w karcie kursanta.</p><div class="row"><button class="btn sm" data-act="openK" data-id="${id}" data-tab="potw">Do potwierdzenia ›</button></div>`}</section>`}).join("")+`</div>`;
  return h}
function potwHtml(k){
  const l=czekaOf(k.id);
  if(!l.length)return `<div class="card empty">Brak terminów do potwierdzenia.</div>`;
  return `<section class="card"><div class="sec-h"><h3>Czeka na odpowiedź kursanta</h3><button class="btn okb sm" data-act="potwAll">✓ Potwierdź wszystkie</button></div>
  <div class="list" style="margin-top:6px">${l.map(j=>{const arm=S.odrzArm===j.id;return `<div class="crow prow"><span class="w">${fdl(j.data)} · ${t2s(j.od)}–${t2s(j.od+j.h*60)}</span><button class="btn sm okb" data-act="potw" data-id="${j.id}">✓ Potwierdź</button><button class="btn sm ${arm?"warnb":"badb"}" data-act="odrz" data-id="${j.id}">${arm?"Na pewno usunąć?":"✕ Odrzuć"}</button><span class="s">${j.h} h${j.rodzaj!=="kurs"?" · "+j.rodzaj:""}${j.data<today()?" · termin minął":""}</span></div>`}).join("")}</div>
  <p class="hint">✓ Potwierdź – jazda zaplanowana. ✕ Odrzuć – termin znika z grafiku (miejsce wolne).</p>
  <div class="row"><button class="btn ghost sm" data-act="wiad">SMS z terminami ›</button></div></section>`}

/* ---------------------------------------------------------- P-022: Wolne terminy (Więcej → Wolne terminy) */
// Wolne okna w godzinach pracy instruktora: luki między jazdami (bez przerwy dnia) + wolny początek/koniec dnia, min. 1 h.
// Pomija dni wolne instruktora i dni przed dziś; dziś – tylko od bieżącej godziny. Bez danych kursantów.
const durH=m=>Math.floor(m/60)+"h"+(m%60?(m%60)+"min":"");
function wolneDnia(d){const iw=instWin(d);if(!iw.length)return[];
  const a=Object.values(S.J).filter(j=>j.data===d&&j.status!=="odwołana").sort((x,y)=>x.od-y.od);
  const zaj=a.map(j=>[j.od,konJ(j)]);
  odstepy(a,d).G.forEach(x=>{if(x.brk)zaj.push([x.s,x.s+x.brk])});   // przerwa dnia nie jest wolnym terminem
  if(d===today()){const n=Math.ceil(nowMin()/15)*15;zaj.push([0,n])}
  zaj.sort((x,y)=>x[0]-y[0]);
  const r=[];for(const w of iw){let c=w[0];
    for(const z of zaj){if(z[1]<=c||z[0]>=w[1])continue;if(z[0]>c)r.push([c,Math.min(z[0],w[1])]);c=Math.max(c,z[1]);if(c>=w[1])break}
    if(c<w[1])r.push([c,w[1]])}
  return r.filter(x=>x[1]-x[0]>=60)}
function wolneZakres(){const t=S.wtTyp||"t",o=S.wtOd||(t==="m"?today().slice(0,8)+"01":monday(today()));
  const to=t==="m"?endOfMonth(o):addD(o,6);return{t,o,to}}
function wolneLista(){const{o,to}=wolneZakres(),r=[];
  for(let d=o;d<=to;d=addD(d,1)){if(d<today())continue;const w=wolneDnia(d);if(w.length)r.push({d,w})}
  return r}
function wolneTxt(L){if(!L.length)return "";
  return "Wolne terminy na jazdy:\n\n"+L.map(x=>`${fd(x.d)} (${DPEL[dow(x.d)]}): ${x.w.map(w=>`${t2s(w[0])}–${t2s(w[1])} (${durH(w[1]-w[0])})`).join(", ")}`).join("\n")}
function wolneHtml(){
  const{t,o,to}=wolneZakres(),L=wolneLista(),txt=wolneTxt(L),cp=S.wtCopied&&S.wtCopied===txt&&txt;
  const MS=["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
  let h=`<div class="seg" role="group" aria-label="Zakres"><button data-act="wtTyp" data-v="t" aria-pressed="${t==="t"}">Tydzień</button><button data-act="wtTyp" data-v="m" aria-pressed="${t==="m"}">Miesiąc</button></div>
  <div class="wsum"><button class="btn sm" data-act="wtNav" data-n="-1" aria-label="Wcześniej">‹</button><b class="num grow" style="text-align:center">${t==="m"?MS[pISO(o).getMonth()]+" "+pISO(o).getFullYear():fd(o)+" – "+fdy(to)}</b><button class="btn sm" data-act="wtNav" data-n="1" aria-label="Później">›</button></div>
  <p class="hint">Wolne okna w Twoich godzinach pracy (od 1 h): luki między jazdami i wolny początek lub koniec dnia. Propozycje i terminy „czeka na kursanta” liczą się jako zajęte; przerwa i dni wolne są pominięte. Tekst bez danych kursantów – do wysłania innemu instruktorowi.</p>`;
  if(!L.length)return h+`<div class="card empty">Brak wolnych terminów ${t==="m"?"w tym miesiącu":"w tym tygodniu"}${to<today()?" (zakres minął)":""}.</div>`;
  h+=`<section class="card"><div class="list">${L.map(x=>`<div class="wtday"><b>${DN[dow(x.d)]} ${fd(x.d)}</b><span class="chips">${x.w.map(w=>`<span class="chip num">${t2s(w[0])}–${t2s(w[1])} · ${durH(w[1]-w[0])}</span>`).join("")}</span></div>`).join("")}</div></section>
  <section class="card"><h3>Tekst do wysłania</h3><textarea class="sms" id="wt-txt" readonly rows="${Math.min(L.length+3,16)}" aria-label="Tekst wolnych terminów">${esc(txt)}</textarea>
  <div class="row"><button class="btn ${cp?"":"pri"}" data-act="wtKopiuj">${cp?"Kopiuj ponownie":"Kopiuj"}</button>${cp?`<span class="pill ok">✓ skopiowano</span>`:""}</div></section>`;
  return h}
function kopiujTekst(t,taId,ok){
  const zaznacz=()=>{const ta=document.getElementById(taId);let done=false;
    if(ta){ta.focus();ta.select();try{ta.setSelectionRange(0,ta.value.length)}catch(e){}try{done=document.execCommand("copy")}catch(e){done=false}}
    if(done)ok();else toast("Tekst zaznaczony – skopiuj go ręcznie (przytrzymaj i wybierz Kopiuj)")};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,zaznacz);else zaznacz()}

/* ---------------------------------------------------------- arkusz jazdy */
function rodzajOpts(d){const k=S.K[d.kursant],ok=rodzajeDla(k);if(k&&!ok.includes(d.rodzaj))d.rodzaj=defRodzaj(d.kursant);return ok.map(r=>`<option${r===d.rodzaj?" selected":""}>${r}</option>`).join("")}
function defRodzaj(id){const k=S.K[id];return !k?"kurs":k.kategoria==="OL"?"OL":k.status==="ukonczony"?"dodatkowa":"kurs"}
function newDraft(o){
  const d=o.data||(S.view==="grafik"&&S.week&&today()<S.week?S.week:today());
  const day=Object.values(S.J).filter(j=>j.data===d&&j.status!=="odwołana").sort((a,b)=>a.od-b.od);
  const iw=instWin(d);let od=day.length?day[day.length-1].od+day[day.length-1].h*60:(iw[0]?.[0]??600);
  if(od>1380)od=1380;
  const kid=o.k||"",r=kid?defRodzaj(kid):"kurs";return{id:null,kursant:kid,data:d,od,h:2,rodzaj:r,status:"zaplanowana",uwagi:"",...(r==="dodatkowa"?{platnosc:"przelew"}:{})}}

function openSheet(dr){S.draft=dr;S.delArm=false;drawSheet()}
function closeSheet(){S.draft=null;const s=document.getElementById("sheet");s.hidden=true;s.innerHTML="";if(S.pending)render()}
function drawSheet(){
  const d=S.draft,s=document.getElementById("sheet");if(!d){s.hidden=true;return}
  const orig=d.id?S.J[d.id]:null,ks=kList().filter(k=>k.aktywny||k.id===d.kursant);
  const grp=(t,f)=>{const l=ks.filter(f);return l.length?`<optgroup label="${t}">${l.map(k=>`<option value="${k.id}"${k.id===d.kursant?" selected":""}>${esc(lab(k.id))}${k.status==="w_trakcie"?` · ${saldo(k)} h`:""}</option>`).join("")}</optgroup>`:""};
  let h=`<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t">
  <div class="sec-h"><h2 id="sh-t">${d.id?"Jazda · "+esc(lab(d.kursant)):"Nowa jazda"}</h2><button class="btn ghost sm" data-act="closeSheet" aria-label="Zamknij">✕</button></div>`;
  if(orig){h+=`<div class="row">`;
    if(orig.status!=="odbyta")h+=`<button class="btn okb" data-act="quick" data-s="odbyta">✓ Odbyta</button>`;
    if(orig.status==="propozycja")h+=`<button class="btn" data-act="quick" data-s="${CZEKA}">Zatwierdź – wyślę kursantowi</button>`;
    if(orig.status===CZEKA)h+=`<button class="btn" data-act="quick" data-s="zaplanowana">Kursant potwierdził</button>`;
    if(orig.status==="odbyta"||orig.status==="odwołana")h+=`<button class="btn" data-act="quick" data-s="zaplanowana">Cofnij do zaplanowanej</button>`;
    if(orig.status!=="odwołana")h+=`<button class="btn badb" data-act="cancelJ">Odwołaj…</button>`;
    h+=`</div>`}
  h+=`<div class="grid2">
   <label class="field full"><span class="lbl">Kursant</span><select id="d-k" data-sh="kursant"><option value="">— wybierz —</option>${grp("W trakcie kursu",k=>k.status==="w_trakcie")}${grp("Ukończony kurs",k=>k.status==="ukonczony")}${grp("OL",k=>k.status==="OL")}</select></label>
   <label class="field"><span class="lbl">Data</span><input type="date" id="d-d" value="${d.data}" data-sh="data"></label>
   <label class="field"><span class="lbl">Początek</span><select id="d-od" data-sh="od">${tOpts(d.od,300,1380)}</select></label>
   <div class="field"><span class="lbl">Czas</span><div class="durs" role="group">${[1,2,3].map(n=>`<button type="button" data-act="dur" data-n="${n}" aria-pressed="${d.h===n}">${n} h</button>`).join("")}</div></div>
   <div class="field"><span class="lbl">Koniec</span><div id="d-end" style="padding-top:9px;font-family:var(--f-head);font-weight:600;font-size:17px">${t2s(d.od+d.h*60)}</div></div>
   <label class="field"><span class="lbl">Rodzaj</span><select id="d-r" data-sh="rodzaj">${rodzajOpts(d)}</select></label>
   <label class="field"><span class="lbl">Status</span><select id="d-s" data-sh="status">${STATUSY_J.map(r=>`<option${r===d.status?" selected":""}>${r}</option>`).join("")}</select></label>
   <label class="field full"><span class="lbl">Uwagi</span><textarea id="d-u" data-sh="uwagi" placeholder="${d.status==="odwołana"?"Powód odwołania":"Np. koniec jazdy pod WORD"}">${esc(d.uwagi||"")}</textarea></label></div>
  <div id="d-pay">${platHtml(d)}</div>
  <div id="d-warn" class="wbox"></div>
  <div class="row">${orig?`<button class="btn ${S.delArm?"warnb":"ghost"} sm" data-act="delJ">${S.delArm?"Na pewno usunąć?":"Usuń"}</button>`:""}<span class="grow"></span><button class="btn" data-act="closeSheet">Anuluj</button><button class="btn pri" id="d-save" data-act="saveJ">Zapisz</button></div></div>`;
  s.innerHTML=h;s.hidden=false;updWarn()}
/* P-033 pkt 4: płatność za jazdę „dodatkowa” (d.platnosc: przelew|gotowka|nieoplacona; d.kwota tylko przy gotówce; d.kwotaRecz = kwota wpisana ręcznie, nie nadpisywana podpowiedzią) */
const kwotaPodp=d=>{const st=S.INST&&+S.INST.stawka;return st>0&&+d.h>0?String(Math.round(d.h*st*100)/100).replace(".",","):null};
function platHtml(d){if(d.rodzaj!=="dodatkowa")return "";const p=d.platnosc||"przelew",st=S.INST&&+S.INST.stawka;
  return `<div class="field" style="margin-top:10px"><span class="lbl">Płatność za jazdę dodatkową</span><div class="seg seg-big" role="group">${[["przelew","Przelew"],["gotowka","Gotówka"],["nieoplacona","Nieopłacona"]].map(([v,t])=>`<button type="button" data-act="platnosc" data-v="${v}" aria-pressed="${p===v}">${t}</button>`).join("")}</div></div>${p==="gotowka"?`<label class="field"><span class="lbl">Kwota (zł)</span><input type="text" inputmode="decimal" id="d-kw" value="${esc(d.kwota??"")}" data-sh="kwota" autocomplete="off"></label><p class="small muted" style="margin:0">${st>0?`Podpowiedź: ${d.h} h × ${zl(st)} (stawka z „Więcej”).`:"Stawkę za godzinę ustawisz w „Więcej”."}</p>`:""}`}
function platSync(){const d=S.draft;if(!d)return;
  if(d.rodzaj!=="dodatkowa"){delete d.platnosc;delete d.kwota;delete d.kwotaRecz}else if(!d.platnosc)d.platnosc="przelew";
  const b=document.getElementById("d-pay");if(b)b.innerHTML=platHtml(d)}
// BUG-019: bez daty / godziny nie zapisujemy; BUG-027: jazda nie może kończyć się po północy
function draftErr(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d.data||"")||isNaN(pISO(d.data).getTime()))return "Podaj datę jazdy";
  if(!(+d.h>0)||d.od===""||d.od==null||isNaN(+d.od))return "Podaj godzinę początku i czas jazdy";
  if(+d.od+d.h*60>1440)return "Jazda kończyłaby się po północy – zmień początek albo czas";
  if(d.rodzaj==="dodatkowa"&&d.platnosc==="gotowka"){const q=String(d.kwota??"").trim();if(q!==""&&!/^\d+([.,]\d{1,2})?$/.test(q))return "Kwota: wpisz liczbę, np. 120 lub 120,50"}
  return ""}
function updWarn(){const d=S.draft;if(!d)return;const box=document.getElementById("d-warn"),btn=document.getElementById("d-save"),end=document.getElementById("d-end");
  if(end)end.textContent=t2s(d.od+d.h*60);
  if(!d.kursant){box.innerHTML=`<div class="wl">Wybierz kursanta</div>`;btn.disabled=true;return}
  {const er=draftErr(d);if(er){if(end&&+d.od+d.h*60>1440)end.textContent="po północy";box.innerHTML=`<div class="wl bad">Nie można zapisać. ${esc(er)}</div>`;btn.disabled=true;btn.textContent="Zapisz";btn.className="btn";return}}
  const kj=kolBlok({...d,od:+d.od,h:+d.h},d.id?S.J[d.id]:null);
  btn.disabled=false;const c=check(d),all=[...c.w,...c.day].filter(w=>!(kj&&/^Kolizja/.test(w)));
  if(kj){box.innerHTML=`<div class="wl bad">Nie można zapisać. ${esc(kolizjaTxt(kj))}</div>`+all.map(w=>`<div class="wl">${esc(w)}</div>`).join("");
    btn.disabled=true;btn.textContent="Kolizja – zmień termin";btn.className="btn";return}
  box.innerHTML=all.length?all.map(w=>`<div class="wl">${esc(w)}</div>`).join(""):(d.status==="odwołana"?"":`<div class="wl ok">Zgodne z regułami</div>`);
  btn.textContent=all.length?"Zapisz mimo ostrzeżeń":"Zapisz";btn.className="btn "+(all.length?"warnb":"pri")}
function commitDraft(statusOverride){
  const d=S.draft;if(!d||!d.kursant)return;{const er=draftErr(d);if(er){toast(er);updWarn();return}}const L=clone(d);if(statusOverride)L.status=statusOverride;
  const orig=L.id?S.J[L.id]:null;
  {const kj=kolBlok({...L,od:+L.od,h:+L.h},orig);if(kj){toast(kolizjaTxt(kj));updWarn();return}}  // P-022: blokada przed nadaniem numeru
  if(!L.id){const n=nextNum("J_","jazda",4);L.id="J_"+String(n).padStart(4,"0");bumpMeta("jazda",n)}
  if(!rodzajeDla(S.K[L.kursant]).includes(L.rodzaj))L.rodzaj=defRodzaj(L.kursant);  // BUG-004: nie zapisujemy rodzaju sprzecznego z kategorią
  const out={id:L.id,data:L.data,od:+L.od,do:+L.od+L.h*60,h:+L.h,kursant:L.kursant,rodzaj:L.rodzaj,status:L.status,uwagi:(L.uwagi||"").trim()};
  if(out.rodzaj==="dodatkowa"){out.platnosc=["przelew","gotowka","nieoplacona"].includes(L.platnosc)?L.platnosc:"przelew";  // P-033 pkt 4; inny rodzaj = bez płatności i kwoty
    if(out.platnosc==="gotowka"){const q=String(L.kwota??"").trim().replace(",",".");if(q!=="")out.kwota=Math.round(parseFloat(q)*100)/100}}
  if(saveJ(out,orig?.kursant)){toast("Jazda zapisana");closeSheet()}}

/* ---------------------------------------------------------- ustawienia */
/* P-033 pkt 5: „Gotówka wg miesięcy” (Więcej, zwinięta, pod rejestrem): jazdy odbyte, rodzaj dodatkowa, płatność gotówką */
function gotHtml(){const m={};Object.values(S.J).filter(j=>j.rodzaj==="dodatkowa"&&j.status==="odbyta"&&j.platnosc==="gotowka").forEach(j=>{const y=j.data.slice(0,7);(m[y]=m[y]||[]).push(j)});
  const ms=Object.keys(m).sort().reverse(),open=!!S.gotOpen;
  let h=`<section class="card"><button class="tydh" data-act="gotToggle" aria-expanded="${open}"><span class="grow"><b>${open?"▾":"▸"} Gotówka wg miesięcy</b><br><span class="small muted">jazdy dodatkowe odbyte, płatność gotówką</span></span></button>`;
  if(!open)return h+`</section>`;
  if(!ms.length)return h+`<p class="small muted" style="margin:8px 0 0">Brak odbytych jazd dodatkowych opłaconych gotówką.</p></section>`;
  return h+ms.map(y=>{const l=m[y].sort(cmpJ),o=!!(S.gotM&&S.gotM[y]),[yy,mm]=y.split("-");
    return `<button class="tydh" style="margin-top:6px;border-top:1px solid var(--line)" data-act="gotMon" data-m="${y}" aria-expanded="${o}"><span class="grow"><b>${o?"▾":"▸"} ${MIES[+mm-1]} ${yy}</b></span><b class="num">${zl(gotSuma(l))}</b></button>`+(o?`<table class="mini">${l.map(j=>`<tr><td class="num" style="width:56px">${fd(j.data)}</td><td>${esc(lab(j.kursant))}</td><td class="num r">${j.h} h</td><td class="num r">${zl(j.kwota||0)}</td></tr>`).join("")}</table>`:"")}).join("")+`</section>`}
function ustawHtml(){
  const I=S.INST;let h=rejHtml()+gotHtml();
  if(I){I.okresy.forEach((p,pi)=>{if(p.do&&p.do<"2026-12-01")return;  // P-027: okres listopada ukryty (dane zostają – grafik i generator)
    h+=`<section class="card"><div class="sec-h"><h3>Dyspozycyjność instruktora · ${p.od?"od "+fdy(p.od):"do "+fdy(p.do)}</h3></div><p class="small muted">Jazdy 20:00–21:00 tylko wyjątkowo – gdy kursant inaczej nie ma w tygodniu żadnej jazdy.</p>${winEditor("i"+pi,p.tydzien)}</section>`});
    const ex=(I.wyjatki||[]).slice().sort((a,b)=>a.data.localeCompare(b.data));
    h+=`<section class="card"><h3>Dni wolne i wyjątki instruktora</h3><div class="chips" style="margin:8px 0">${ex.map(e=>`<span class="chip">${DN[dow(e.data)]} ${fdy(e.data)} · ${e.okna&&e.okna.length?e.okna.map(wtxt).join(", "):"wolne"}${e.powod?" · "+esc(e.powod):""}<button data-act="rmEx" data-ctx="i" data-i="${I.wyjatki.indexOf(e)}" aria-label="Usuń">✕</button></span>`).join("")||`<span class="muted small">brak</span>`}</div>${exForm("i")}</section>`}
  // P-027: sekcja „Dane aplikacji” (licznik + wczytywanie importu) usunięta – zasada „nigdy nie wczytywać importu”
  h+=`<section class="card"><h3>Jazdy dodatkowe – stawka</h3><label class="field"><span class="lbl">Stawka za godzinę (zł)</span><input type="text" inputmode="decimal" id="stawka" value="${I&&+I.stawka>0?esc(String(I.stawka).replace(".",",")):""}" data-defer data-ch="stawka" autocomplete="off" style="max-width:160px"></label><p class="small muted">Podpowiada kwotę przy płatności gotówką w oknie jazdy dodatkowej (godziny × stawka). Puste pole = bez podpowiedzi.</p></section>`;
  h+=`<section class="card"><h3>Wolne terminy</h3><p class="small muted">Wolne okna w tygodniu lub miesiącu – tekst do skopiowania dla innego instruktora (bez danych kursantów).</p><button class="btn" data-act="wolne">Wolne terminy ›</button>`;
  h+=`</section>`+kopiaHtml()+kontoHtml();
  if(typeof przykladHtml==="function")h+=przykladHtml();
  h+=`<section class="card"><h3>Wersja aplikacji</h3><p class="small muted">Numer wersji: <b class="num">${BUILD}</b> – podawaj go przy zgłaszaniu błędów.</p>`;
  h+=`</section>`;
  return h}
// F-2026.11.25: zalogowane konto Google i uid (uid jest inny w każdym projekcie Firebase – do wklejenia w reguły).
function kontoHtml(){const u=S.user;if(!u)return "";
  return `<section class="card"><h3>Konto</h3><p class="small muted">Zalogowano: <b>${esc(u.nazwa||u.email||"konto Google")}</b>${u.nazwa&&u.email?" · "+esc(u.email):""}${S.db&&S.db.srodowisko==="test"?" · wersja testowa":""}</p>
  <label class="field"><span class="lbl">uid (do reguł Firestore)</span><input type="text" id="uid-pole" readonly value="${esc(u.uid)}" style="font-family:ui-monospace,monospace"></label>
  <div class="row" style="margin-top:10px"><button class="btn" data-act="kopiujUid">Kopiuj uid</button><button class="btn${S.wylArm?" warnb":""}" data-act="wyloguj">${S.wylArm?"Dotknij ponownie, aby wylogować":"Wyloguj"}</button></div></section>`}

