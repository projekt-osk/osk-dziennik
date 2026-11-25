"use strict";
/* zdarzenia.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
/* ============================================================ zdarzenia */
const A={
  tab(el){S.view=el.dataset.v;S.wtOd=null;if(S.view==="grafik"&&!S.day)S.scrollGrid=true;S.addWin=null;S.addEx=null;try{localStorage.setItem("osk-b-view",S.view==="karta"?"kursanci":S.view)}catch(e){}render();window.scrollTo(0,0)},
  filter(el){S.filter=el.dataset.v;S.q="";try{localStorage.setItem("osk-filter",S.filter)}catch(e){}render()},
  openK(el){S.kid=el.dataset.id;S.iiEd=null;S.iiArm=null;S.showSmsU=false;S.wczArm=false;S.wczVal=null;S.mj=null;S.showPast=false;S.showKset=false;S.showDost=false;S.view="karta";S.ktab=el.dataset.tab||"dane";S.tj=el.dataset.j||null;S.tq="";S.tf=null;if(S.ktab==="umiej")S.scrollSk=true;S.addWin=null;S.addEx=null;render();window.scrollTo(0,0)},
  back(){S.view="kursanci";render()},
  ktab(el){S.ktab=el.dataset.v;window.scrollTo(0,0);S.addWin=null;S.addEx=null;if(S.ktab==="umiej")S.scrollSk=true;render()},
  newK(){S.newK={kat:"staly",lit:"",h:0};render();setTimeout(()=>document.getElementById("nk-lit")?.focus(),0)},
  cancelNewK(){S.newK=null;render()},
  saveNewK(){const d=S.newK,lit=(document.getElementById("nk-lit")?.value||"").trim(),hh=Math.max(0,Math.min(30,parseInt(document.getElementById("nk-h")?.value||"0",10)||0));
    const im=(document.getElementById("nk-im")?.value||"").trim();
    if(!im){toast("Wpisz imię");return}
    if(!lit){toast("Wpisz dwie pierwsze litery nazwiska");return}
    const pre=d.kat==="OL"?"OL_":"ID_",n=nextNum(pre,d.kat==="OL"?"OL":"ID");const id=pre+String(n).padStart(3,"0");
    const teoria={};(S.META?.slowniki?.teoria||[]).forEach(t=>teoria[t]=false);const miejsca={};(S.META?.slowniki?.miejsca||[]).forEach(m=>miejsca[m]=[]);
    const k={id,imie:im.charAt(0).toUpperCase()+im.slice(1),litery:lit.charAt(0).toUpperCase()+lit.slice(1).toLowerCase(),kategoria:d.kat,status:d.kat==="OL"?"OL":(hh>=30?"ukonczony":"w_trakcie"),aktywny:true,saldo_przed:hh,dodatkowe_przed:0,dostepnosc:null,wyjatki:[],preferencje:"",oznaczenia:{},miejsca,teoria,uwagi:""};
    S.K[id]=k;S.newK=null;put("kursanci",id,k);bumpMeta(d.kat==="OL"?"OL":"ID",n);toast(`Dodano ${id}`);S.kid=id;S.view="karta";S.ktab="dost";render()},
  togglePast(){S.showPast=!S.showPast;render()},
  toggleDost(){S.showDost=!S.showDost;render()},
  toggleKset(){S.showKset=!S.showKset;render()},
  toggleSmsU(){S.showSmsU=!S.showSmsU;render()},
  kopiujU(el){const id=el.dataset.k,t=smsUTxt(id);if(!t)return;kopiujTekst(t,"smsu-"+id,()=>{S.copiedU=id+"|"+t;render();toast("Skopiowano – wklej w SMS do kursanta")})},
  wczSave(){if(pvBlok())return;const k=S.K[S.kid];if(!k)return;  // P-033 pkt 2: 1. dotknięcie = „Na pewno zmienić?”, 2. w ciągu 4 s zapisuje
    const x=parseFloat(String(document.getElementById("kwcz")?.value??"").replace(",","."));
    if(!isFinite(x)||x<0||x>30){toast("Podaj liczbę godzin od 0 do 30 (także połówki)");return}
    const v=Math.round(x*2)/2;
    if(v===wczOf(k)){S.wczArm=false;S.wczVal=null;render();toast("Bez zmian");return}
    if(S.wczArm&&v!==S.wczVal){clearTimeout(A._wczT);S.wczArm=false;S.wczVal=v;render();return}  // BUG-033: zmiana wartości rozbraja potwierdzenie
    if(!S.wczArm){S.wczArm=true;S.wczVal=v;render();clearTimeout(A._wczT);A._wczT=setTimeout(()=>{S.wczArm=false;render()},4000);return}
    clearTimeout(A._wczT);S.wczArm=false;S.wczVal=null;
    saveK(k,c=>{c.saldo_przed=v+(c.godziny_poprz||0)});syncStatus(k.id);toast(`Zapisano: ${v} h wyjeżdżone wcześniej · saldo ${saldo(S.K[k.id])} h`)},
  czekaToggle(){S.czOpen=!S.czOpen;S.czDelArm=false;render()},
  czekaDel(){if(pvBlok())return;const z=czekaZakres();if(!z||!z.l.length)return;  // P-033 pkt 3
    if(!S.czDelArm){S.czDelArm=true;render();setTimeout(()=>{S.czDelArm=false;render()},4000);return}
    S.czDelArm=false;z.l.forEach(j=>{delete S.J[j.id];rm("jazdy",j.id)});oczyscPoJazdach(z.l.map(j=>j.id));render();toast(`Usunięto: ${ileJazd(z.l.length)} (czekały na kursanta)`)},
  platnosc(el){const d=S.draft;if(!d||d.rodzaj!=="dodatkowa")return;d.platnosc=el.dataset.v;  // P-033 pkt 4
    if(d.platnosc==="gotowka"){if(d.kwota==null||d.kwota===""){const p=kwotaPodp(d);if(p!=null)d.kwota=p}}else{delete d.kwota;delete d.kwotaRecz}
    platSync();updWarn()},
  gotToggle(){S.gotOpen=!S.gotOpen;render()},
  gotMon(el){S.gotM=S.gotM||{};S.gotM[el.dataset.m]=!S.gotM[el.dataset.m];render()},
  dopiszPoprz(){const k=S.K[S.kid],v=Math.max(0,Math.min(30,parseInt(document.getElementById("kpoprz")?.value||"0",10)||0));
    saveK(k,c=>{c.saldo_przed=Math.max(0,(c.saldo_przed||0)-(c.godziny_poprz||0)+v);c.godziny_poprz=v});syncStatus(k.id);toast(`Zapisano: ${v} h od poprzedniego instruktora · saldo ${saldo(S.K[k.id])} h`)},
  iiEdit(el){S.iiEd=parseInt(el.dataset.id,10);S.iiArm=null;render()},
  iiCancel(){S.iiEd=null;render()},
  iiDel(el){const k=S.K[S.kid],id=parseInt(el.dataset.id,10);if(S.iiArm!==id){S.iiArm=id;render();return}
    S.iiArm=null;if(S.iiEd===id)S.iiEd=null;saveK(k,c=>{c.jazdy_inni=(c.jazdy_inni||[]).filter(x=>x.id!==id)});syncStatus(k.id);toast(`Usunięto wpis · saldo ${saldo(S.K[k.id])} h`)},
  iiSave(){if(pvBlok())return;const k=S.K[S.kid],g=i=>document.getElementById(i),v=Math.round((parseFloat(String(g("iih")?.value||"").replace(",","."))||0)*2)/2,dt=g("iid")?.value||"",nt=(g("iin")?.value||"").trim();
    if(!(v>=0.5&&v<=30)){toast("Wpisz liczbę godzin od 0,5 do 30 (co pół godziny)");return}
    const ed=S.iiEd;S.iiEd=null;S.iiArm=null;
    saveK(k,c=>{const a=c.jazdy_inni=(c.jazdy_inni||[]).slice(),w={h:v};if(dt)w.data=dt;if(nt)w.notatka=nt;
      const x=ed&&a.findIndex(y=>y.id===ed);if(ed&&x>=0)a[x]={id:ed,...w};else a.push({id:Math.max(0,...a.map(y=>y.id||0))+1,...w})});
    syncStatus(k.id);toast(`Zapisano · saldo ${saldo(S.K[k.id])} h`)},
  toggleAkt(){const k=S.K[S.kid];saveK(k,c=>c.aktywny=!c.aktywny)},
  mark(el){const k=S.K[S.kid],nr=el.dataset.nr,jid=el.dataset.j,cyc=el.dataset.sec==="cwiczenia"?["","V","X"]:["","X","V"];
    saveK(k,c=>{c.oznaczenia=c.oznaczenia||{};const l=(c.oznaczenia[nr]||[]).filter(x=>x[0]!==jid);const cur=((k.oznaczenia||{})[nr]||[]).find(x=>x[0]===jid)?.[1]||"";const nx=cyc[(cyc.indexOf(cur)+1)%3];if(nx)l.push([jid,nx]);if(l.length)c.oznaczenia[nr]=l;else delete c.oznaczenia[nr]})},
  place(el){const k=S.K[S.kid],n=el.dataset.n,j=S.mj;if(!j)return;saveK(k,c=>{c.miejsca=c.miejsca||{};const l=c.miejsca[n]||[];c.miejsca[n]=l.includes(j)?l.filter(x=>x!==j):[...l,j]})},
  addPlace(){const inp=document.getElementById("newplace"),n=(inp?.value||"").trim();if(!n)return;const k=S.K[S.kid];if((k.miejsca||{})[n]||(S.META?.slowniki?.miejsca||[]).includes(n)){toast("To miejsce już jest");return}inp.blur();saveK(k,c=>{c.miejsca=c.miejsca||{};c.miejsca[n]=[]})},
  initDost(){const k=S.K[S.kid];saveK(k,c=>{c.dostepnosc={};for(let i=0;i<7;i++)c.dostepnosc[String(i)]=[]})},
  addWinOpen(el){S.addWin={ctx:el.dataset.ctx,d:+el.dataset.d,od:el.dataset.ctx==="k"?900:420,do:el.dataset.ctx==="k"?1440:1200};render()},
  addWinCancel(){S.addWin=null;render()},
  addWinAll(){winAdd([0,1440])},
  addWinSave(){const od=+document.getElementById("aw-od").value,dd=+document.getElementById("aw-do").value;if(dd<=od){toast("Koniec musi być po początku");return}winAdd([od,dd])},
  rmWin(el){winMut(el.dataset.ctx,t=>{const l=t[el.dataset.d]||[];l.splice(+el.dataset.i,1);t[el.dataset.d]=l})},
  addExOpen(el){const d=today();S.addEx={ctx:el.dataset.ctx,od:d,do:d,typ:"brak",s:600,e:1200,pow:""};render()},
  addExCancel(){S.addEx=null;render()},
  addExSave(){const d=S.addEx,od=document.getElementById("ex-od").value,dd=document.getElementById("ex-do")?.value||od,pow=document.getElementById("ex-pow").value.trim();
    if(!od||dd<od){toast("Sprawdź daty wyjątku");return}
    let okna=[];if(d.typ==="okno"){const s=+document.getElementById("ex-s").value,e=+document.getElementById("ex-e").value;if(e<=s){toast("Koniec okna musi być po początku");return}okna=[[s,e]]}
    S.addEx=null;
    if(d.ctx==="k")saveK(S.K[S.kid],c=>{c.wyjatki=[...(c.wyjatki||[]),{od,do:dd,okna,powod:pow}]});
    else{const I=clone(S.INST);I.wyjatki=[...(I.wyjatki||[]).filter(e=>e.data!==od),{data:od,okna,powod:pow}];S.INST=I;put("ustawienia","instruktor",I);render()}},
  rmEx(el){const i=+el.dataset.i;if(el.dataset.ctx==="k")saveK(S.K[S.kid],c=>{c.wyjatki.splice(i,1)});else{const I=clone(S.INST);I.wyjatki.splice(i,1);S.INST=I;put("ustawienia","instruktor",I);render()}},
  pv(el){const v=+el.dataset.v,was=S.pv;S.pv=v;
    if(v>0){if(!was){const n=new Date();S.pvD=addD(realToday(),1);S.pvT=Math.floor((n.getHours()*60+n.getMinutes())/15)*15}}
    else S.pvT=null;
    S.week=null;S.day=null;S.tj=null;S.mj=null;render()},
  tf(el){S.tf=el.dataset.v;S.tq="";render()},
  tmark(el){const k=S.K[S.kid],nr=el.dataset.nr,v=el.dataset.v,jid=S.tj;if(!k||!jid)return;saveK(k,c=>{c.oznaczenia=c.oznaczenia||{};const l=(c.oznaczenia[nr]||[]).filter(x=>x[0]!==jid);const was=((k.oznaczenia||{})[nr]||[]).find(x=>x[0]===jid)?.[1];if(was!==v)l.push([jid,v]);if(l.length)c.oznaczenia[nr]=l;else delete c.oznaczenia[nr]})},
  tplace(el){const k=S.K[S.kid],n=el.dataset.n,j=S.tj;if(!j)return;saveK(k,c=>{c.miejsca=c.miejsca||{};const l=c.miejsca[n]||[];c.miejsca[n]=l.includes(j)?l.filter(x=>x!==j):[...l,j]})},
  ttheory(el){const k=S.K[S.kid],t=el.dataset.t,j=S.tj;saveK(k,c=>{c.teoria=c.teoria||{};c.teoriaJ=c.teoriaJ||{};if(c.teoria[t]){c.teoria[t]=false;delete c.teoriaJ[t]}else{c.teoria[t]=true;if(j)c.teoriaJ[t]=j}})},
  tfinish(){const j=S.J[S.tj];if(!j)return;const u=document.getElementById("tuw");const o={...j,status:"odbyta",uwagi:u?u.value.trim():j.uwagi};if(saveJ(o))toast("Jazda zakończona – saldo zaktualizowane")},
  tundo(){const j=S.J[S.tj];if(!j)return;if(saveJ({...j,status:"zaplanowana"}))toast("Cofnięto do zaplanowanej")},
  week(el){S.week=addD(S.week,+el.dataset.n);S.day=null;S.kosztEd=null;render()},
  tydToggle(){S.tydOpen=!S.tydOpen;render()},
  weToggle(el){S.weOpen[el.dataset.d]=!S.weOpen[el.dataset.d];render()},
  kosztOpen(el){if(pvBlok())return;const k=el.dataset.id?S.KO[el.dataset.id]:null;S.koDelArm=false;S.kosztEd=k?clone(k):{id:null,data:el.dataset.d,rodzaj:"Paliwo",kwota:"",notatka:""};render();document.getElementById("kform")?.scrollIntoView({block:"nearest"})},
  kosztRodz(el){const e=S.kosztEd;if(!e)return;e.kwota=document.getElementById("ko-kw")?.value??e.kwota;e.notatka=document.getElementById("ko-not")?.value??e.notatka;e.rodzaj=el.dataset.v;render()},
  kosztCancel(){S.kosztEd=null;S.koDelArm=false;render()},
  kosztSave(){const e=S.kosztEd;if(!e||pvBlok())return;const kw=parseFloat(String(document.getElementById("ko-kw")?.value||"").replace(",",".").replace(/\s/g,"")),no=(document.getElementById("ko-not")?.value||"").trim();
    if(!(kw>0)){toast("Podaj kwotę w zł");return}if(e.rodzaj==="Inne"&&!no){toast("Dla „Inne” wpisz notatkę");return}
    const id=e.id||"KO_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),o={id,data:e.data,rodzaj:e.rodzaj,kwota:Math.round(kw*100)/100,notatka:no};
    S.KO[id]=o;S.kosztEd=null;if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();render();put("koszty",id,o);toast("Koszt zapisany")},
  kosztDel(){const e=S.kosztEd;if(!e||!e.id)return;if(!S.koDelArm){S.koDelArm=true;render();return}delete S.KO[e.id];rm("koszty",e.id);S.kosztEd=null;S.koDelArm=false;render();toast("Koszt usunięty")},
  rejNav(el){const[y,m]=(S.rejM||today().slice(0,7)).split("-").map(Number),d=new Date(y,m-1+(+el.dataset.n),1);S.rejM=d.getFullYear()+"-"+pad(d.getMonth()+1);render()},
  rejPdf(){rejPdf()},
  rejToggle(){S.rejOpen=!S.rejOpen;render()},
  tydPdf(){tydPdf()},
  pickDay(el){S.day=el.dataset.d;render()},
  quickDone(el){const j=S.J[el.dataset.id];if(!j)return;if(saveJ({...j,status:"odbyta"}))toast("Jazda odbyta – saldo zaktualizowane")},
  gridAdd(el,e){const r=el.getBoundingClientRect(),m=+el.dataset.st+Math.floor((e.clientY-r.top)/PX/15)*15;openSheet({...newDraft({data:el.dataset.d}),od:Math.min(1380,m)})},
  genApproveWeek(){const mon=S.week,sun=addD(mon,6),pr=Object.values(S.J).filter(j=>j.status==="propozycja"&&j.data>=mon&&j.data<=sun);zatwierdz(pr)},
  wiad(){if(S.view!=="wiad")S.prevView=S.view;S.view="wiad";render();window.scrollTo(0,0)},
  wiadBack(){S.view=S.prevView&&S.prevView!=="wiad"?S.prevView:"dzis";render();window.scrollTo(0,0)},
  kopiuj(el){kopiujSms(el.dataset.k)},
  wolne(){S.view="wolne";render();window.scrollTo(0,0)},
  wtBack(){S.view="ustawienia";render();window.scrollTo(0,0)},
  wtTyp(el){const t=el.dataset.v;if(t===(S.wtTyp||"t"))return;const{o}=wolneZakres();S.wtTyp=t;S.wtOd=t==="m"?o.slice(0,8)+"01":monday(o<today()&&today()<=endOfMonth(o)?today():o);render()},
  wtNav(el){const{t,o}=wolneZakres(),n=+el.dataset.n;S.wtOd=t==="m"?(()=>{const d=pISO(o);return iso(new Date(d.getFullYear(),d.getMonth()+n,1))})():addD(o,7*n);render()},
  wtKopiuj(){const t=wolneTxt(wolneLista());if(!t)return;kopiujTekst(t,"wt-txt",()=>{S.wtCopied=t;render();toast("Skopiowano – wklej w wiadomości")})},
  potw(el){const j=S.J[el.dataset.id];if(!j||j.status!==CZEKA)return;S.odrzArm=null;if(saveJ({...j,status:"zaplanowana"}))toast("Potwierdzone – jazda zaplanowana")},
  potwAll(){const l=czekaOf(S.kid);if(!l.length)return;S.odrzArm=null;let n=0,kol=null;
    l.forEach(j=>{const kj=kolizjaZ(j);if(kj){kol=kol||[j,kj];return}const o={...j,status:"zaplanowana"};S.J[j.id]=o;put("jazdy",j.id,o);n++});render();
    toast(kol?`Potwierdzone: ${ileJazd(n)}. Nie potwierdzono ${fdl(kol[0].data)} ${t2s(kol[0].od)} – ${kolizjaTxt(kol[1])}`:`Potwierdzone: ${ileJazd(n)}`)},
  odrz(el){const id=el.dataset.id,j=S.J[id];if(!j||j.status!==CZEKA)return;
    if(S.odrzArm!==id){S.odrzArm=id;render();return}
    S.odrzArm=null;delete S.J[id];rm("jazdy",id);oczyscPoJazdach([id]);render();toast("Termin odrzucony – usunięty z grafiku")},
  weekToday(){S.week=monday(today());S.day=null;render()},
  newJ(el){openSheet(newDraft({k:el.dataset.k||(S.view==="karta"?S.kid:""),data:el.dataset.d}))},
  openJ(el){const j=S.J[el.dataset.id];if(j){const d=clone(j);if(d.kwota!=null)d.kwotaRecz=true;if(d.rodzaj==="dodatkowa"&&!d.platnosc)d.platnosc="przelew";openSheet(d)}},
  closeSheet(){closeSheet()},
  dur(el){S.draft.h=+el.dataset.n;document.querySelectorAll(".durs button").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.n===S.draft.h)));
    if(S.draft.rodzaj==="dodatkowa"){if(S.draft.platnosc==="gotowka"&&!S.draft.kwotaRecz){const p=kwotaPodp(S.draft);if(p!=null)S.draft.kwota=p}platSync()}updWarn()},
  saveJ(){commitDraft()},
  quick(el){commitDraft(el.dataset.s)},
  cancelJ(){S.draft.status="odwołana";document.getElementById("d-s").value="odwołana";const u=document.getElementById("d-u");u.placeholder="Powód odwołania";u.focus();updWarn();toast("Wpisz powód i zapisz")},
  delJ(){if(!S.delArm){S.delArm=true;drawSheet();return}const id=S.draft.id,kid=S.J[id]?.kursant;delete S.J[id];rm("jazdy",id);oczyscPoJazdach([id]);closeSheet();render();if(kid)syncStatus(kid);toast("Jazda usunięta")},
  impCancel(){S.imp=null;render()},
  // F-2026.11.25: konto Google i baza Firestore
  zaloguj(){if(!S.db)return;S.loginErr=null;render();S.db.login().catch(e=>{const c=e?.code||"";S.loginErr=c.includes("popup-closed")||c.includes("cancelled-popup")?"Logowanie przerwane.":c==="auth/network-request-failed"?"Brak sieci – logowanie wymaga internetu.":c==="auth/unauthorized-domain"?"Ta domena nie jest dopuszczona w Firebase (Authentication → Settings → Authorized domains).":"Nie udało się zalogować ("+(c||e?.message||e)+").";render()})},
  wyloguj(){if(!S.db)return;if(!S.wylArm){S.wylArm=true;render();setTimeout(()=>{if(S.wylArm){S.wylArm=false;render()}},4000);return}S.wylArm=false;S.db.logout().catch(e=>toast("Nie udało się wylogować ("+(e?.code||e)+")"))},
  kopiujUid(){const u=S.user;if(!u)return;kopiujTekst(u.uid,"uid-pole",()=>toast("Skopiowano uid"))},
  retryDb(){dbStart()},
  // E2b: kopia zapasowa (kopia.js); eksport jest w PV_OK (nie zmienia danych kursantów), przywracanie nie
  eksport(){kopiaPobierz()},
  kopiaXl(){kopiaXlPobierz()},
  kopiaWybierz(){kopiaWybierz()},
  kopiaAnuluj(){S.rest=null;S.restTxt="";render()},
  kopiaZamknij(){S.rest=null;S.restTxt="";render()},
  kopiaGo(){if(pvBlok())return;if(!kopiaSlowoOk(S.restTxt))return;kopiaPrzywroc()},
  przyklad(){if(pvBlok()||typeof przykladWczytaj!=="function")return;if(Object.keys(S.K).length&&!S.przArm){S.przArm=true;render();setTimeout(()=>{if(S.przArm){S.przArm=false;render()}},4000);return}S.przArm=false;przykladWczytaj()},
  toggleOdw(el){S.odwOpen=S.odwOpen||{};S.odwOpen[el.dataset.d]=!S.odwOpen[el.dataset.d];render()},
  togglePastDays(){S.showPastDays=!S.showPastDays;render()},
  genToggle(){S.genOpen=!S.genOpen;render()},
  genGo(){const f=document.getElementById("g-od").value,tt=document.getElementById("g-do").value;S.genFrom=f;S.genTo=tt;
    if(!f||!tt||tt<f){toast("Sprawdź zakres dat");return}
    const lim=endOfMonth(addD(endOfMonth(f),1));if(tt>lim){toast("Maksymalnie 2 miesiące kalendarzowe – do "+fdy(lim));return}
    const res=generuj(f,tt);zapiszGen(res);S.genRes=res;S.week=monday(f);S.day=null;render();toast(`Dodano: ${ileProp(res.created.length)}`)},
  genApprove(){const pr=Object.values(S.J).filter(j=>j.status==="propozycja");S.genRes=null;zatwierdz(pr)},
  genClear(){if(!S.genDelArm){S.genDelArm=true;render();setTimeout(()=>{S.genDelArm=false;render()},4000);return}S.genDelArm=false;const pr=Object.values(S.J).filter(j=>j.status==="propozycja");pr.forEach(j=>{delete S.J[j.id];rm("jazdy",j.id)});oczyscPoJazdach(pr.map(j=>j.id));S.genRes=null;render();toast(`Usunięto: ${ileProp(pr.length)}`)},
};
function winMut(ctx,fn){
  if(ctx==="k")saveK(S.K[S.kid],c=>{fn(c.dostepnosc)});
  else{const pi=+ctx.slice(1),I=clone(S.INST);fn(I.okresy[pi].tydzien);S.INST=I;put("ustawienia","instruktor",I);render()}}
function winAdd(w){const{ctx,d}=S.addWin;S.addWin=null;winMut(ctx,t=>{const l=(t[String(d)]||[]).slice();if(w[0]===0&&w[1]===1440)t[String(d)]=[w];else{l.push(w);l.sort((a,b)=>a[0]-b[0]);const m=[];for(const x of l){const p=m[m.length-1];if(p&&x[0]<=p[1])p[1]=Math.max(p[1],x[1]);else m.push([x[0],x[1]])}t[String(d)]=m}})}  // P-023 pkt 1

// Akcje dozwolone w Podglądzie (nie zmieniają danych); każda inna pokazuje PV_MSG.
const PV_OK=new Set(["tab","filter","openK","back","ktab","togglePast","toggleDost","toggleKset","pv","tf","week","pickDay","weekToday","openJ","closeSheet","toggleOdw","togglePastDays","genToggle","wiad","wiadBack","kopiuj","wolne","wtBack","wtTyp","wtNav","wtKopiuj","dur","toggleSmsU","kopiujU","platnosc","gotToggle","gotMon","cancelNewK","addWinCancel","addExCancel","impCancel","zaloguj","wyloguj","kopiujUid","retryDb","eksport","kopiaXl","tydToggle","weToggle","kosztCancel","kosztRodz","rejNav","rejPdf","rejToggle","tydPdf"]);
const PV_OK_CH=new Set(["mj","pvt","pvd","tj","g-od","g-do","c-od","c-do","c-k","nk-kat","ex-typ"]);
// BUG-020: drugie dotknięcie w to samo miejsce w ciągu 450 ms (albo dblclick) jest ignorowane – po przerysowaniu trafiłoby w inny przycisk.
let lastTap={t:0,x:0,y:0};
document.addEventListener("click",e=>{const el=e.target.closest("[data-act]");if(!el)return;const f=A[el.dataset.act];if(f){e.preventDefault();
  const now=e.timeStamp||performance.now();if(e.detail>1||(e.detail===1&&now-lastTap.t<450&&Math.abs(e.clientX-lastTap.x)<40&&Math.abs(e.clientY-lastTap.y)<40))return;
  lastTap={t:now,x:e.clientX,y:e.clientY};
  if(pvOn()&&!PV_OK.has(el.dataset.act)){toast(PV_MSG);return}f(el,e)}});
document.addEventListener("input",e=>{const el=e.target;
  if(el.dataset.in==="q"){S.q=el.value;render()}
  if(el.dataset.in==="tq"){S.tq=el.value;render()}
  if(el.dataset.in==="rtxt"){S.restTxt=el.value;const b=document.querySelector("[data-act=kopiaGo]");if(b)b.disabled=!kopiaSlowoOk(el.value)}  // przywracanie: przycisk aktywny po wpisaniu słowa, bez przerysowania (fokus)
  if(el.dataset.in==="wcz"&&S.wczArm){const x=parseFloat(String(el.value).replace(",","."));if(!(Math.round(x*2)/2===S.wczVal)){  // BUG-033: edycja pola zdejmuje „Na pewno zmienić?” bez przerysowania (fokus)
    clearTimeout(A._wczT);S.wczArm=false;S.wczVal=null;const b=document.querySelector("[data-act=wczSave]");if(b){b.classList.remove("warnb");b.textContent="Zapisz godziny"}}}
  if(el.dataset.sh==="uwagi"&&S.draft){S.draft.uwagi=el.value}});
document.addEventListener("change",e=>{const el=e.target,k=S.K[S.kid];
  if(pvOn()&&el.dataset.ch&&!PV_OK_CH.has(el.dataset.ch)){toast(PV_MSG);render();return}
  if(el.dataset.sh&&S.draft){const f=el.dataset.sh;let v=el.value;if(f==="od")v=+v;S.draft[f]=v;if(f==="kwota")S.draft.kwotaRecz=true;if(f==="kursant"&&v){S.draft.rodzaj=defRodzaj(v);document.getElementById("d-r").innerHTML=rodzajOpts(S.draft)}if(f==="kursant"||f==="rodzaj")platSync();if(f==="status"){const u=document.getElementById("d-u");if(u)u.placeholder=v==="odwołana"?"Powód odwołania":"Uwagi"}updWarn();return}
  switch(el.dataset.ch){
    case "uwagi":if(k&&el.value!==(k.uwagi||""))saveK(k,c=>c.uwagi=el.value);break;
    case "pref":if(k&&el.value!==(k.preferencje||""))saveK(k,c=>c.preferencje=el.value);break;
    case "c-od":S.czFrom=el.value;S.czDelArm=false;render();break;
    case "c-do":S.czTo=el.value;S.czDelArm=false;render();break;
    case "c-k":S.czK=el.value;S.czDelArm=false;render();break;
    case "stawka":{const q=el.value.trim().replace(",","."),I=clone(S.INST||{});
      if(q===""){delete I.stawka}else{const n=parseFloat(q);if(!/^\d+(\.\d{1,2})?$/.test(q)||!(n>=0)){toast("Stawka: wpisz liczbę, np. 80 lub 80,50");render();break}I.stawka=n}
      S.INST=I;put("ustawienia","instruktor",I);render();toast(q===""?"Stawka usunięta":"Zapisano stawkę za godzinę");break}
    case "kim":{const v=el.value.trim();if(k&&v!==(k.imie||""))saveK(k,c=>c.imie=v);break}
    case "klit":{const v=el.value.trim();if(k&&v&&v!==k.litery)saveK(k,c=>c.litery=v);break}
    case "kst":if(k&&el.value==="ukonczony"&&k.kategoria==="staly"&&saldo(k)<30){toast(`Status „ukończony kurs” liczy się z godzin – ${lab(k.id)} ma ${saldo(k)} z 30 h.`);render();break}
      if(k){const zOL=k.kategoria==="OL"&&el.value!=="OL";saveK(k,c=>{c.status=el.value;c.kategoria=el.value==="OL"?"OL":"staly";if(zOL)c.zOL=true;if(el.value==="OL")delete c.zOL});
      if(zOL){S.showKset=true;toast("Kursant stały – godziny OL u Ciebie liczą się do 30 h. Godziny od poprzedniego instruktora dopisz w Ustawieniach kursanta.")}else syncStatus(k.id)}break;
    case "theory":if(k)saveK(k,c=>{c.teoria=c.teoria||{};c.teoriaJ=c.teoriaJ||{};const t=el.dataset.t;c.teoria[t]=el.checked;if(el.checked){const b=biezaca(k);if(b)c.teoriaJ[t]=b.id}else delete c.teoriaJ[t]});break;
    case "mj":S.mj=el.value;render();break;
    case "pvt":S.pvT=+el.value;render();break;
    case "pvd":if(/^\d{4}-\d{2}-\d{2}$/.test(el.value)){S.pvD=el.value;S.week=null;S.day=null;S.tj=null;S.mj=null;render()}break;
    case "tj":S.tj=el.value;render();break;
    case "tuwagi":{const j=S.J[S.tj];if(j&&el.value.trim()!==(j.uwagi||""))saveJ({...j,uwagi:el.value.trim()});break}
    case "g-od":S.genFrom=el.value;break;
    case "g-do":S.genTo=el.value;break;
    case "nk-kat":S.newK.kat=el.value;render();break;
    case "ex-typ":{S.addEx.typ=el.value;S.addEx.od=document.getElementById("ex-od").value;const dd=document.getElementById("ex-do");if(dd)S.addEx.do=dd.value;S.addEx.pow=document.getElementById("ex-pow").value;render();break}
    case "impfile":{const f=el.files&&el.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!Array.isArray(d.kursanci)||!Array.isArray(d.jazdy)||!d.instruktor)throw 0;S.imp={data:d}}catch(x){S.imp={err:"To nie jest plik dane-pilot.json z importu."}}render()});break}
  }});
document.addEventListener("focusout",()=>{setTimeout(()=>{if(S.pending)render()},0)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&S.draft)closeSheet()});

/* ============================================================ start */
// F-2026.11.25: Firestore (firebase.js → window.oskFb) z logowaniem Google. Bez zalogowania – ekran logowania, dane wyczyszczone.
// Nasłuch po błędzie (np. permission-denied przed wklejeniem reguł) wznawia się sam: co 20 s, po powrocie sieci,
// po powrocie do karty, po zalogowaniu i przyciskiem „Spróbuj ponownie” – bez przeładowania strony.
let dbUn=[],dbTimer=null,dbRetry=null;
function dbStop(){S.pw={};dbUn.forEach(f=>{try{f()}catch(e){}});dbUn=[];clearTimeout(dbTimer);clearTimeout(dbRetry);dbRetry=null}
function dbBlad(e){clearTimeout(dbTimer);S.err=e?.code||"błąd";S.slow=false;render();
  if(S.user&&!dbRetry)dbRetry=setTimeout(()=>{dbRetry=null;if(S.user&&S.err)dbStart()},20000)}
function dbStart(){
  const db=S.db;if(!db||!S.user)return;dbStop();S.err=null;S.slow=false;S.got={k:false,j:false,u:false};render();
  dbTimer=setTimeout(()=>{S.slow=true;render()},10000);
  const ready=()=>{if(S.got.k&&S.got.j&&S.got.u){clearTimeout(dbTimer);S.slow=false}};
  const fail=e=>{dbStop();dbBlad(e)};
  dbUn.push(db.listen("kursanci",s=>{pw("k",s);const m={};s.docs.forEach(d=>m[d.id]=d.data());S.K=m;if(!s.metadata.fromCache)S.got.k=true;ready();schedule();if(S.draft)updWarn()},fail));
  dbUn.push(db.listen("jazdy",s=>{pw("j",s);const m={};s.docs.forEach(d=>m[d.id]=d.data());S.J=m;if(!s.metadata.fromCache)S.got.j=true;ready();schedule();if(S.draft)updWarn()},fail));
  dbUn.push(db.listen("koszty",s=>{pw("ko",s);const m={};s.docs.forEach(d=>m[d.id]=d.data());S.KO=m;schedule()},()=>{}));  // P-025: osobny zbiór, błąd nie blokuje aplikacji
  dbUn.push(db.listen("ustawienia",s=>{pw("u",s);S.INST=null;S.META=null;s.docs.forEach(d=>{if(d.id==="instruktor")S.INST=d.data();if(d.id==="meta")S.META=d.data()});if(!s.metadata.fromCache)S.got.u=true;ready();schedule()},fail))}
/* ============================================================ pasek offline i auto-wysokość SMS */
// Pasek u góry (w nagłówku, przesuwa treść): offline = brak sieci; „Synchronizuję…” = sieć wróciła, a zapisy z offline jeszcze nie dotarły do serwera.
function pw(n,s){S.pw=S.pw||{};S.pw[n]=!!(s.metadata&&s.metadata.hasPendingWrites);netBar()}
function netBar(){
  const el=document.getElementById("offbar");if(!el)return;
  const off=navigator.onLine===false,pend=Object.values(S.pw||{}).some(Boolean);
  if(off&&pend)S.offPend=true;if(!pend)S.offPend=false;
  const st=S.auth!=="in"?"":off?"off":(pend&&S.offPend)?"sync":"";
  if(el.dataset.st!==st){el.dataset.st=st;el.hidden=!st;
    el.textContent=st==="off"?"Pracujesz offline – zmiany zapiszą się po połączeniu z internetem":st==="sync"?"Synchronizuję…":""}
  document.documentElement.style.setProperty("--offh",(st?el.offsetHeight:0)+"px")}
function smsFit(){document.querySelectorAll("textarea.sms").forEach(t=>{t.style.height="auto";t.style.height=(t.scrollHeight+t.offsetHeight-t.clientHeight)+"px"})}
addEventListener("online",netBar);addEventListener("offline",netBar);addEventListener("resize",()=>{netBar();smsFit()});addEventListener("load",smsFit);
const dbWznow=()=>{if(S.user&&S.err&&navigator.onLine!==false)dbStart()};
addEventListener("online",dbWznow);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")dbWznow()});
(async function boot(){
  render();
  const fb=window.oskFb||await new Promise(r=>{addEventListener("osk-fb",()=>r(window.oskFb),{once:true});setTimeout(()=>r(window.oskFb||null),20000)});
  if(!fb){S.err="nie udało się wczytać Firebase";render();return}
  S.db=fb;
  fb.onUser(u=>{const zmiana=(u&&u.uid)!==(S.user&&S.user.uid);S.user=u;S.auth=u?"in":"out";
    if(!u){dbStop();S.K={};S.J={};S.KO={};S.INST=null;S.META=null;S.err=null;S.slow=false;S.got={k:false,j:false,u:false};if(S.draft)closeSheet();render();return}
    if(zmiana||S.err||!dbUn.length)dbStart();else render()});
})();
