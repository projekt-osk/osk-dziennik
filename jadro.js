"use strict";
/* jadro.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
/* ============================================================ stałe */
const BUILD="F-2026.11.25-7"; // numer wersji – podawany w zgłoszeniach QA
const DNI=["Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota","Niedziela"];
const DN=["Pn","Wt","Śr","Cz","Pt","Sb","Nd"];
const PRZERWA_OD="2026-12-01";            // przerwa po 3. jeździe obowiązuje od grudnia
const CZEKA="czeka na kursanta";           // P-017: zatwierdzona przez instruktora propozycja, czeka na odpowiedź kursanta (blokuje miejsce)
const STATUSY_J=["propozycja",CZEKA,"zaplanowana","odbyta","odwołana"];
const otwSt=s=>s==="zaplanowana"||s==="propozycja"||s===CZEKA;  // jazda jeszcze nie zamknięta
const RODZAJE=["kurs","dodatkowa","OL"];
const ST_K={w_trakcie:"W trakcie kursu",ukonczony:"Ukończony kurs",OL:"OL – dorywczy"};
const GRP={1:"--g1",2:"--g2",3:"--g3",4:"--g4",5:"--g5",6:"--g6",7:"--g7"};

/* ============================================================ stan */
const S={K:{},J:{},INST:null,META:null,got:{k:false,j:false,u:false},db:null,err:null,slow:false,
  view:"dzis",kid:null,ktab:"dane",filter:"w_trakcie",q:"",week:null,mj:null,addWin:null,addEx:null,
  draft:null,delArm:false,pending:false,imp:null,scrollSk:false,KO:{},tydOpen:false,weOpen:{},kosztEd:null,rejM:null,rejOpen:false};
try{const v=localStorage.getItem("osk-b-view");if(v)S.view=v;const f=localStorage.getItem("osk-filter");if(f)S.filter=f}catch(e){}

/* ============================================================ narzędzia */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const t2s=m=>m>=1440?"24:00":pad(Math.floor(m/60))+":"+pad(m%60);
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const pISO=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addD=(s,n)=>{const d=pISO(s);d.setDate(d.getDate()+n);return iso(d)};
const dow=s=>(pISO(s).getDay()+6)%7;
const monday=s=>addD(s,-dow(s));
const realToday=()=>iso(new Date());
// Podgląd (zgłoszenie 14.11; 18.11: przycisk „Jutro” usunięty, pv=1 traktowane jak 2): S.pv 0 = teraz, 2 = dowolny dzień (S.pvD, domyślnie jutro) – cała aplikacja liczy „dziś” i „teraz” z podglądu. Podgląd sam niczego nie zapisuje.
const pvOn=()=>S.pv===1||S.pv===2;
const today=()=>!pvOn()?realToday():(S.pvD||addD(realToday(),1));
const nowMin=()=>{if(pvOn()&&S.pvT!=null)return S.pvT;const n=new Date();return n.getHours()*60+n.getMinutes()};
const pvDefT=d=>{const a=Object.values(S.J).filter(j=>j.data===d&&j.status!=="odwołana").sort((x,y)=>x.od-y.od);return a.length?a[0].od+30:600};
// Ikony jako SVG zamiast znaków ▶ ⚠ – Samsung (Chrome/Samsung Internet) rysuje je jako kolorowe emoji (niebieski kwadrat).
const IC_PLAY=`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.6v10.8l8.6-5.4z" fill="currentColor"/></svg>`;
const IC_WARN=`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6 15.2 14H.8z" fill="currentColor"/><path d="M8 6v4" stroke="var(--surface)" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="var(--surface)"/></svg>`;
const fd=s=>{const d=pISO(s);return pad(d.getDate())+"."+pad(d.getMonth()+1)};
const fdy=s=>fd(s)+"."+pISO(s).getFullYear();
const fdl=s=>DN[dow(s)]+" "+fd(s);
const clone=o=>JSON.parse(JSON.stringify(o));
const key=j=>j.data+String(j.od).padStart(4,"0");
const cmpJ=(a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0;
const wtxt=w=>w[0]<=0&&w[1]>=1440?"cały dzień":w[1]>=1440?"od "+t2s(w[0]):t2s(w[0])+"–"+t2s(w[1]);
const cover=(w,s,e)=>w.some(x=>x[0]<=s&&e<=x[1]);
function tOpts(sel,from,to,end){let h="";for(let m=from;m<=to;m+=15)h+=`<option value="${m}"${m===sel?" selected":""}>${t2s(m)}</option>`;if(end)h+=`<option value="1440"${sel===1440?" selected":""}>do końca dnia</option>`;return h}

/* ============================================================ dane pochodne */
const kList=()=>Object.values(S.K).sort((a,b)=>a.id.localeCompare(b.id));
const nm=k=>(k.imie?k.imie+" ":"")+k.litery;
const lab=id=>{const k=S.K[id];return k?(k.imie?nm(k):id+" "+k.litery):(id||"?")};
const jOf=id=>Object.values(S.J).filter(j=>j.kursant===id).sort(cmpJ);
const isKurs=j=>j.rodzaj==="kurs"||j.rodzaj==="OL"; // godziny do kursu/salda: kurs + jazdy u instruktora jako OL (po przejściu OL → stały też się liczą)
const pl=(n,a,b,c)=>{const m10=n%10,m100=n%100;return n+" "+(n===1?a:(m10>=2&&m10<=4&&!(m100>=12&&m100<=14))?b:c)};
const ileJazd=n=>pl(n,"jazda","jazdy","jazd"),ileProp=n=>pl(n,"propozycja","propozycje","propozycji");
const rodzajeDla=k=>!k?RODZAJE:k.kategoria==="OL"?["OL"]:["kurs","dodatkowa"]; // BUG-004: rodzaj zgodny z kategorią
const sumH=a=>a.reduce((s,j)=>s+j.h,0);
const innych=k=>sumH((k&&k.jazdy_inni)||[]); // P-032: godziny z innym instruktorem (wpisy k.jazdy_inni)
const przedH=k=>(k.saldo_przed||0)+innych(k); // godziny sprzed 2.11 + z innym instruktorem (do salda 30 h)
const saldo=k=>przedH(k)+sumH(jOf(k.id).filter(j=>isKurs(j)&&j.status==="odbyta"));
const wPlanie=k=>sumH(jOf(k.id).filter(j=>isKurs(j)&&otwSt(j.status)));
const czekaOf=id=>jOf(id).filter(j=>j.status===CZEKA);
const ileTerm=n=>pl(n,"termin","terminy","terminów");
const dodat=k=>(k.dodatkowe_przed||0)+sumH(jOf(k.id).filter(j=>j.rodzaj==="dodatkowa"&&j.status==="odbyta"));
const gotJ=j=>j.rodzaj==="dodatkowa"&&j.status==="odbyta"&&j.platnosc==="gotowka"?(+j.kwota||0):0; // P-033 pkt 4: gotówka liczy się tylko z jazd odbytych
const gotSuma=l=>Math.round(l.reduce((a,j)=>a+gotJ(j),0)*100)/100;
const nastepna=k=>jOf(k.id).find(j=>otwSt(j.status)&&j.data>=today());
function lastMarks(k){const o={};Object.values(S.J).forEach(j=>o[j.id]=key(j));const r={};
  for(const[nr,l0]of Object.entries(k.oznaczenia||{})){const l=(l0||[]).filter(x=>S.J[x[0]]&&S.J[x[0]].status!=="odwołana");if(!l.length)continue;const s=[...l].sort((a,b)=>(o[a[0]]||a[0]).localeCompare(o[b[0]]||b[0]));r[nr]=s[s.length-1][1]}return r}
const doPop=k=>Object.entries(lastMarks(k)).filter(([,v])=>v==="X").map(([n])=>n);
const skill=nr=>(S.META?.slowniki?.umiejetnosci||[]).find(u=>u.nr===nr);

function instWin(d){const ex=(S.INST?.wyjatki||[]).find(e=>e.data===d);if(ex&&Array.isArray(ex.okna))return ex.okna;
  const p=(S.INST?.okresy||[]).find(p=>(!p.od||p.od<=d)&&(!p.do||d<=p.do));return p?(p.tydzien[String(dow(d))]||[]):[]}
function instEx(d){return (S.INST?.wyjatki||[]).find(e=>e.data===d)}
function studWin(k,d){if(!k.dostepnosc)return null;const ex=(k.wyjatki||[]).find(e=>e.od<=d&&d<=e.do);if(ex)return ex.okna||[];return k.dostepnosc[String(dow(d))]||[]}

/* ============================================================ ostrzeżenia */
// P-022 (decyzja 14.11): jeden odstęp do 30 min w dniu to PRZERWA (nie luka), niezależnie od tego, po której jeździe wypada
// (np. po odwołaniu wcześniejszej jazdy). Od PRZERWA_OD przy więcej niż 3 jazdach przerwa jest wymagana; najpierw liczy się
// odstęp po 3. jeździe, potem pierwszy inny odstęp do 30 min. Gdy brak takiego odstępu, a po 3. jeździe jest ponad 30 min –
// przerwa 30 min + reszta jako luka (BUG-014). Wspólne dla osi dnia, Planu dnia, ostrzeżeń, paska dni i Wolnych terminów.
// a = jazdy dnia bez odwołanych, posortowane po godzinie. Zwraca {G:[{k,s,e,g,brk,luka}], wymagana, brak, krotka}.
function odstepy(a,d){
  const G=[];for(let k=1;k<a.length;k++){const s=a[k-1].od+a[k-1].h*60,e=a[k].od,g=e-s;G.push({k,s,e,g,brk:0,luka:Math.max(0,g)})}
  const wym=d>=PRZERWA_OD&&a.length>3,g3=G.find(x=>x.k===3);
  let b=d<PRZERWA_OD?null:g3&&g3.g>0&&g3.g<=30?g3:G.find(x=>x.g>0&&x.g<=30);  // P-023 pkt 4: przed 1.12 odstęp do 30 min to luka
  if(b){b.brk=b.g;b.luka=0}
  else if(wym&&g3&&g3.g>30){g3.brk=30;g3.luka=g3.g-30}
  const p=G.find(x=>x.brk>0);
  return{G,wymagana:wym,brak:wym&&!p,krotka:wym&&p&&p.brk<30?p.brk:0}}
function dayCheck(list,d){
  const a=list.filter(j=>j.status!=="odwołana").sort((x,y)=>x.od-y.od),W=[];if(!a.length)return W;
  const tot=sumH(a);if(tot>11)W.push(`Dzień: ${tot} h jazd (limit 11 h)`);
  const O=odstepy(a,d);
  if(O.brak)W.push("Brak 30 min przerwy po 3. jeździe");
  if(O.krotka)W.push(`Przerwa tylko ${O.krotka} min (wymagane 30 min przerwy)`);
  for(const x of O.G){if(x.luka<=0)continue;
    if(x.brk)W.push(`Luka ${x.luka} min po przerwie (${t2s(x.s)}–${t2s(x.e)})`);
    else W.push(`Luka ${x.luka} min (${t2s(x.s)}–${t2s(x.e)})`)}
  return W}
function check(L){
  const W=[];if(!L||L.status==="odwołana")return{w:W,day:[]};
  const e=L.od+L.h*60,k=S.K[L.kursant];
  const others=Object.values(S.J).filter(j=>j.id!==L.id&&j.status!=="odwołana");
  const iw=instWin(L.data);
  if(!iw.length)W.push("Instruktor jest niedostępny tego dnia");
  else if(!cover(iw,L.od,e)){const ext=iw.map(x=>[x[0],x[1]===1200?(S.INST?.wyjatkowo_do||1260):x[1]]);
    if(!cover(ext,L.od,e))W.push("Poza godzinami pracy instruktora");
    else{const mon=monday(L.data),sun=addD(mon,6); // P-020: ostrzegamy tylko przy złamaniu reguły 12 (kursant ma w tygodniu inną jazdę)
      if(others.some(j=>j.kursant===L.kursant&&j.data>=mon&&j.data<=sun))W.push("Wyjątkowe okno 20:00–21:00, a kursant ma w tym tygodniu inną jazdę (dozwolone tylko, gdy to jego jedyna jazda)")}}
  if(k){const sw=studWin(k,L.data);
    if(sw===null){if(L.rodzaj==="kurs")W.push("Dostępność kursanta nieznana")}
    else if(!cover(sw,L.od,e))W.push("Poza dostępnością kursanta")}
  for(const j of others){if(j.data!==L.data)continue;
    if(j.od<e&&L.od<j.od+j.h*60)W.push(`Kolizja z jazdą: ${lab(j.kursant)}, ${t2s(j.od)}–${t2s(j.od+j.h*60)}`);
    if(j.kursant===L.kursant)W.push(`Kursant ma już jazdę tego dnia (${t2s(j.od)})`)}
  {const liczy=k&&(L.rodzaj==="kurs"||(L.rodzaj==="OL"&&k.kategoria==="staly"));   // P-020: 1 h dozwolona, gdy do 30 h zostało dokładnie 1 h
   const przed=liczy?przedH(k)+sumH(others.filter(j=>j.kursant===L.kursant&&isKurs(j)&&cmpJ(j,L)<0)):0;
   if(L.h===1&&!(liczy&&30-przed===1))W.push("Jazda 1 h")}
  if(k&&(L.rodzaj==="kurs"||(L.rodzaj==="OL"&&k.kategoria==="staly"))){const mine=others.filter(j=>j.kursant===L.kursant&&isKurs(j));
    const before=przedH(k)+sumH(mine.filter(j=>cmpJ(j,L)<0));
    if(L.h===3&&before<8)W.push(`Jazda 3 h przed wyjeżdżeniem 8 h (przed tą jazdą: ${before} h)`);
    const tot=przedH(k)+sumH(mine)+L.h;
    if(tot>30)W.push(`Przekroczone 30 h kursu (razem z planem: ${tot} h)`);else if(tot===29)W.push("Do końca kursu zostanie 1 h");
    if(k.kategoria==="OL"&&L.rodzaj==="kurs")W.push("Kursant OL – rodzaj jazdy powinien być „OL”");
    else if(k.status==="ukonczony"&&!(L.id&&S.J[L.id]&&S.J[L.id].status==="odbyta"))W.push("Kursant ukończył kurs – to powinna być jazda dodatkowa")}
  if(k&&L.rodzaj==="dodatkowa"&&k.status==="w_trakcie")W.push("Kursant jest w trakcie kursu – jazda dodatkowa nie wchodzi do 30 h");
  if(L.status==="zaplanowana"&&L.data<today())W.push("Termin minął – oznacz jazdę jako odbytą lub odwołaną");
  if(L.status==="propozycja"&&L.data<today())W.push("Termin propozycji minął – zatwierdź ją jako odbytą albo usuń");
  if(L.status===CZEKA&&L.data<today())W.push("Termin minął, a kursant nie potwierdził – oznacz jazdę jako odbytą albo usuń");
  if(k&&L.rodzaj==="dodatkowa"&&k.kategoria==="OL")W.push("Kursant OL – rodzaj jazdy powinien być „OL”");
  return{w:W,day:dayCheck([...others.filter(j=>j.data===L.data),L],L.data)}}
function weekMin(mon){
  const sun=addD(mon,6),r=[];
  for(const k of kList()){if(!k.aktywny||k.kategoria!=="staly"||k.status!=="w_trakcie")continue;
    const js=jOf(k.id).filter(j=>j.status!=="odwołana"&&isKurs(j));
    const przed=przedH(k)+sumH(js.filter(j=>j.data<mon)),rem=30-przed;if(rem<=0)continue;
    const n=js.filter(j=>j.data>=mon&&j.data<=sun).length,need=rem<=3?1:2;
    if(n===0)r.push({k,n,need,brak:!k.dostepnosc})}
  return r}

