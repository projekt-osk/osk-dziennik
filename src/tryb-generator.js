"use strict";
/* tryb-generator.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
function kartaHtml(k){
  const nc=czekaOf(k.id).length,T=[["dane","Przegląd"],["tryb","Tryb jazdy"],["umiej","Historia"],["dost","Dostępność"]];
  if(nc||S.ktab==="potw")T.splice(1,0,["potw",`Do potwierdzenia${nc?` <span class="tcnt">${nc}</span>`:""}`]);
  let h=`<div class="ktabs" role="tablist">${T.map(([v,t])=>`<button role="tab" data-act="ktab" data-v="${v}" aria-current="${S.ktab===v}">${t}${v==="tryb"?"":""}</button>`).join("")}</div>`;
  if(S.ktab==="miejsca"||S.ktab==="teoria")h+=`<div><button class="btn sm" data-act="ktab" data-v="dane">‹ Wróć do przeglądu</button></div>`;
  if(S.ktab==="tryb")h+=trybHtml(k);
  else if(S.ktab==="umiej")h+=histHtml(k);
  else if(S.ktab==="dost")h+=dostHtml(k);
  else if(S.ktab==="miejsca")h+=miejscaHtml(k);
  else if(S.ktab==="teoria")h+=teoriaHtml(k);
  else if(S.ktab==="potw")h+=potwHtml(k);
  else{const b=biezaca(k),bo=!b&&lekcje(k).opts.length;h+=bo?`<button class="cta" data-act="ktab" data-v="tryb"><span class="cta-i">${IC_PLAY}</span><span><b>Tryb jazdy</b><br><span class="small">${brakBiezTxt()}</span></span></button>`:b?`<button class="cta" data-act="ktab" data-v="tryb"><span class="cta-i">${IC_PLAY}</span><span><b>Tryb jazdy</b><br><span class="small">${b.data===today()?"dziś":"ostatnia odbyta: "+DNI[dow(b.data)]+" "+fd(b.data)}, ${t2s(b.od)}–${t2s(b.od+b.h*60)} · oznaczenia, miejsca, teoria, uwagi</span></span></button>`:"";h+=daneHtml(k)}
  return h}
const norm=s=>String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l");
function trybHtml(k){
  const L=lekcje(k),opts=L.opts;
  if(!S.tj||!opts.find(j=>j.id===S.tj))S.tj=biezaca(k)?.id||null;
  if(!S.tj){
    if(opts.length)return `<section class="card"><p style="margin:0 0 10px">${brakBiezTxt()}</p><label class="field"><span class="lbl">Jazda</span><select id="tj-sel" data-ch="tj"><option value="">— wybierz jazdę —</option>${opts.map(o=>optHtml(o,null)).join("")}</select></label></section>`;
    const pr=jOf(k.id).some(j=>j.status==="propozycja");
    return `<div class="card empty">${pr?"Kursant ma tylko niezatwierdzone propozycje. Zatwierdź jazdę w grafiku, żeby otworzyć Tryb jazdy.":"Kursant nie ma jeszcze żadnej jazdy w grafiku. Dodaj jazdę przyciskiem + na górze."}</div>`}
  const j=S.J[S.tj],U=S.META?.slowniki?.umiejetnosci||[],lm=lastMarks(k),dp=doPop(k),oz=k.oznaczenia||{};
  const cur=nr=>(oz[nr]||[]).find(x=>x[0]===j.id)?.[1]||"";
  const order={};Object.values(S.J).forEach(x=>order[x.id]=key(x));
  const hist=nr=>(oz[nr]||[]).filter(x=>x[0]!==j.id&&S.J[x[0]]&&S.J[x[0]].status!=="odwołana").sort((a,b)=>(order[a[0]]||"").localeCompare(order[b[0]]||"")).slice(-6);
  const nMarked=U.filter(u=>cur(u.nr)).length;
  if(!S.tf)S.tf=dp.length?"pop":"cw";
  let h=`<section class="block tj-head"><label class="field"><span class="lbl">Jazda</span><select id="tj-sel" data-ch="tj">${opts.map(o=>optHtml(o,j.id)).join("")}</select></label>
    <div class="row small muted" style="margin-top:6px"><span>${j.h} h${j.rodzaj!=="kurs"?" · "+j.rodzaj:""}</span><span>·</span><span>${j.status==="odbyta"?"✓ odbyta":j.status}</span><span>·</span><span>zaznaczono ${nMarked}</span></div></section>`;
  // umiejętności
  const F=[["pop",`Do poprawy ${dp.length}`],["cw","Ćwiczenia"],["ob","Obserwacje"],["mark","Ta jazda "+nMarked]];
  const q=norm(S.tq||"");
  let list=U;
  if(q)list=U.filter(u=>u.nr.startsWith(q)||norm(u.nazwa).includes(q));
  else if(S.tf==="pop")list=U.filter(u=>dp.includes(u.nr));
  else if(S.tf==="cw")list=U.filter(u=>u.sekcja==="cwiczenia");
  else if(S.tf==="ob")list=U.filter(u=>u.sekcja==="obserwacje");
  else if(S.tf==="mark")list=U.filter(u=>cur(u.nr));
  h+=`<section class="block"><div class="block-h"><h2>Umiejętności</h2></div>
    <input type="text" id="tq" placeholder="Szukaj: numer albo słowo, np. 5.9 lub rondo" value="${esc(S.tq||"")}" data-in="tq" autocomplete="off" style="margin-top:8px">
    <div class="seg" role="group" style="margin-top:8px">${F.map(([v,t])=>`<button data-act="tf" data-v="${v}" aria-pressed="${!q&&S.tf===v}">${t}</button>`).join("")}</div>
    <div class="slist">`;
  if(!list.length)h+=`<p class="hint" style="padding:10px 2px">${q?"Nic nie pasuje do wyszukiwania.":S.tf==="pop"?"Brak umiejętności do poprawy.":S.tf==="mark"?"Na tej jeździe nic jeszcze nie zaznaczono.":"Brak pozycji."}</p>`;
  let lastG="";
  list.forEach(u=>{const g=u.nr.split(".")[0];
    if(!q&&S.tf!=="pop"&&S.tf!=="mark"&&g!==lastG){h+=`<div class="sg" style="--gc:var(${GRP[g]})">${esc(GRUPY[g]||"Grupa "+g)}</div>`;lastG=g}
    const c=cur(u.nr),hs=hist(u.nr);
    h+=`<div class="sr${lm[u.nr]==="X"?" bad":""}" style="--gc:var(${GRP[g]})"><div class="sn"><span class="nr">${u.nr}</span> ${esc(u.nazwa)}${hs.length?`<span class="hist" aria-label="Poprzednie oznaczenia">${hs.map(x=>`<i class="${x[1]==="V"?"v":"x"}"></i>`).join("")}</span>`:""}</div>
      <button class="mb v${c==="V"?" on":""}" data-act="tmark" data-nr="${u.nr}" data-v="V" aria-pressed="${c==="V"}" aria-label="${u.nr} ćwiczone">✓</button><button class="mb x${c==="X"?" on":""}" data-act="tmark" data-nr="${u.nr}" data-v="X" aria-pressed="${c==="X"}" aria-label="${u.nr} błąd">✕</button></div>`});
  h+=`</div><p class="hint">✓ ćwiczone · ✕ błąd do poprawy. Ponowne dotknięcie usuwa oznaczenie. Kropki po prawej od nazwy to poprzednie jazdy.</p></section>`;
  // miejsca
  const names=[...(S.META?.slowniki?.miejsca||[])];Object.keys(k.miejsca||{}).forEach(n=>{if(!names.includes(n))names.push(n)});
  h+=`<section class="block"><div class="block-h"><h2>Miejsca na tej jeździe</h2></div><div class="tgl">${names.map(n=>{const ids=(k.miejsca||{})[n]||[],on=ids.includes(j.id);return `<button class="tg${on?" on":""}" data-act="tplace" data-n="${esc(n)}" aria-pressed="${on}">${esc(n)}<small>${ids.length}×</small></button>`}).join("")}</div></section>`;
  // teoria
  const T=S.META?.slowniki?.teoria||Object.keys(k.teoria||{});
  h+=`<section class="block"><div class="block-h"><h2>Teoria omówiona</h2><span class="muted small">${T.filter(t=>(k.teoria||{})[t]).length} z ${T.length}</span></div><div class="tgl">${T.map(t=>{const on=!!(k.teoria||{})[t],tj=(k.teoriaJ||{})[t],dt=tj&&tj!==j.id&&S.J[tj]?fd(S.J[tj].data):"";return `<button class="tg${on?" on":""}" data-act="ttheory" data-t="${esc(t)}" aria-pressed="${on}">${esc(t)}${dt?`<small>${dt}</small>`:""}</button>`}).join("")}</div></section>`;
  h+=`<section class="block"><div class="block-h"><h2>Uwagi do jazdy</h2></div><textarea id="tuw" data-defer data-ch="tuwagi" placeholder="Co poszło dobrze, co ćwiczyć następnym razem" style="margin-top:8px">${esc(j.uwagi||"")}</textarea></section>`;
  h+=`<div class="finbar">${j.status==="odbyta"?`<span class="grow muted">Jazda odbyta ✓</span><button class="btn" data-act="tundo">Cofnij do zaplanowanej</button>`:`<button class="btn lg okb" data-act="tfinish">✓ Zakończ jazdę – odbyta</button>`}</div>`;
  return h}
function histHtml(k){
  const T=S.META?.slowniki?.teoria||[];const names=[...(S.META?.slowniki?.miejsca||[])];Object.keys(k.miejsca||{}).forEach(n=>{if(!names.includes(n))names.push(n)});
  let h=`<p class="hint">Pełna tabela wszystkich jazd. Do zaznaczania w trakcie jazdy wygodniejszy jest Tryb jazdy.</p>`+umiejHtml(k);
  h+=`<div class="two"><section class="card"><h3>Miejsca</h3><table class="mini">${names.map(n=>{const ids=(k.miejsca||{})[n]||[];return `<tr class="${ids.length?"":"todo"}"><td>${esc(n)}</td><td class="r num">${ids.length||"–"}</td><td class="r num small">${ids.map(id=>S.J[id]?fd(S.J[id].data):"").filter(Boolean).slice(-3).join(", ")}</td></tr>`}).join("")}</table></section>
    <section class="card"><h3>Teoria</h3><table class="mini">${T.map(x=>{const on=(k.teoria||{})[x];return `<tr class="${on?"":"todo"}"><td class="ic">${on?"✓":"○"}</td><td>${esc(x)}</td><td class="r num small">${on&&(k.teoriaJ||{})[x]&&S.J[(k.teoriaJ||{})[x]]?fd(S.J[(k.teoriaJ||{})[x]].data):""}</td></tr>`}).join("")}</table></section></div>`;
  return h}
const GRUPY={1:"1 · Technika jazdy",2:"2 · Miejsca szczególne",3:"3 · Jezdnie",4:"4 · Skrzyżowania",5:"5 · Manewry",6:"6 · Parkowanie",7:"7 · Plac i inne"};

/* ---------------------------------------------------------- generator propozycji */
function ivIntersect(a,b){const r=[];for(const x of a)for(const y of b){const lo=Math.max(x[0],y[0]),hi=Math.min(x[1],y[1]);if(lo<=hi)r.push([lo,hi])}return r}
function permute(arr,fn){const n=arr.length,used=new Array(n).fill(false),cur=[];(function rec(){if(cur.length===n){fn(cur.slice());return}for(let i=0;i<n;i++){if(used[i])continue;used[i]=true;cur.push(arr[i]);rec();cur.pop();used[i]=false}})()}
// Najwcześniejsze ułożenie jazd ciągiem (bez luk, przerwa 30 min po 3. jeździe od grudnia) w oknie [w0,w1]
function seqSearch(mov,d,w0,w1){ // bez jazd stałych – brak kolizji z definicji
  let best=null;const brk=d>=PRZERWA_OD;
  permute(mov,perm=>{let off=0;const offs=[];perm.forEach((L,i)=>{if(i===3&&brk)off+=30;offs.push(off);off+=L.h*60});
    if(w1-off<w0)return;let rg=[[w0,w1-off]];
    for(let i=0;i<perm.length&&rg.length;i++){const L=perm[i],r=[];L.win.forEach(x=>{const a=x[0]-offs[i],b=x[1]-offs[i]-L.h*60;if(b>=a)r.push([a,b])});rg=ivIntersect(rg,r)}
    if(!rg.length)return;let s=Infinity;rg.forEach(x=>{const c=Math.ceil(x[0]/15)*15;if(c<=x[1]&&c<s)s=c});if(s===Infinity)return;
    if(!best||s<best.s)best={s,perm,offs}});
  return best?{start:best.s,placed:best.perm.map((L,i)=>({L,od:best.s+best.offs[i]}))}:null}
// Dzień z jazdami stałymi (np. z papierowego grafiku): nowe jazdy dokładamy stykiem do istniejących
// Ocena dnia: luki przy jazdach ruchomych (propozycjach) i brak przerwy po 3. jeździe (od grudnia).
// P-022: odstęp do 30 min między dwiema stałymi jazdami (np. po odwołaniu jazdy) jest przerwą dnia – generator nie wymaga
// wtedy drugiej przerwy po 3. jeździe. Sam generator robi przerwę tylko po 3. jeździe (nie tworzy innych odstępów).
function dayViol(iv,d){let gapAdj=0,brk=0;const B=d>=PRZERWA_OD;
  let fb=-1;for(let i=1;i<iv.length;i++){const g=iv[i][0]-iv[i-1][1];if(g>0&&g<=30&&!iv[i][2]&&!iv[i-1][2]){fb=i;break}}
  for(let i=1;i<iv.length;i++){const g=iv[i][0]-iv[i-1][1],adj=iv[i][2]||iv[i-1][2];
    if(i===fb)continue;
    if(B&&i===3&&fb<0){if(g<30)brk=1;else if(g>30&&adj)gapAdj+=g-30}
    else if(g>0&&adj)gapAdj+=g}
  return{gapAdj,brk}}
// Dzień z jazdami stałymi: propozycje dokładamy tak, żeby nie stykały się z luką (BUG-013 / decyzja BUG-003)
// i żeby po 3. jeździe była 30 min przerwy (BUG-001). Sprawdzamy różne kolejności wstawiania.
function adjSearch(fixed,mov,w0,w1,d){
  const base=fixed.map(j=>[j.od,j.od+j.h*60,false]).sort((a,b)=>a[0]-b[0]),baseBrk=dayViol(base,d).brk;
  let best=null;const perms=[];permute(mov,p=>perms.push(p));
  for(const order of perms){const occ=base.slice(),placed=[];let ok=true;
    for(const L of order){const len=L.h*60,c=new Set();
      occ.forEach(o=>{c.add(o[1]);c.add(o[1]+30);c.add(o[0]-len);c.add(o[0]-len-30)});
      let pick=null;
      for(const s of [...c].sort((a,b)=>a-b)){
        if(s<w0||s+len>w1||occ.some(o=>s<o[1]&&o[0]<s+len)||!cover(L.win,s,s+len))continue;
        const v=dayViol([...occ,[s,s+len,true]].sort((a,b)=>a[0]-b[0]),d);
        if(v.gapAdj===0&&v.brk<=baseBrk){pick=s;break}}
      if(pick==null){ok=false;break}
      occ.push([pick,pick+len,true]);placed.push({L,od:pick})}
    if(!ok)continue;
    const fin=occ.slice().sort((a,b)=>a[0]-b[0]),v=dayViol(fin,d);
    if(v.gapAdj||v.brk>baseBrk)continue;
    if(!best||fin[0][0]<best.start)best={start:fin[0][0],placed}}
  return best}
function generuj(from,to){
  const props=Object.values(S.J).filter(j=>j.status==="propozycja"&&j.data>=from&&j.data<=to);
  const all=Object.values(S.J).filter(j=>j.status!=="odwołana"&&!(j.status==="propozycja"&&j.data>=from&&j.data<=to)).map(j=>({...j,fixed:true}));
  const elig=kList().filter(k=>k.aktywny&&k.kategoria==="staly"&&k.status==="w_trakcie");
  const skipped=elig.filter(k=>!k.dostepnosc),studs=elig.filter(k=>k.dostepnosc),rnd={};studs.forEach(k=>rnd[k.id]=Math.random());
  let mix=null; // inna kolejność kursantów w kolejnych próbach tygodnia (BUG-002)
  const hrs=k=>przedH(k)+sumH(all.filter(j=>j.kursant===k.id&&isKurs(j)));
  const before=(k,d)=>przedH(k)+sumH(all.filter(j=>j.kursant===k.id&&isKurs(j)&&j.data<d));
  const ord=()=>studs.slice().sort(mix?((a,b)=>mix[a.id]-mix[b.id]):((a,b)=>hrs(a)-hrs(b)||rnd[a.id]-rnd[b.id]));
  const dayL=d=>all.filter(j=>j.data===d);
  const has=(k,d)=>all.some(j=>j.kursant===k.id&&j.data===d);
  function durs(k,d){const rem=30-hrs(k);if(rem<=0)return[];if(rem===1)return[1];const b=before(k,d);
    let o=[2,3].filter(x=>rem-x>=0&&rem-x!==1&&(x<3||b>=8));if(rem===3&&b>=8)o=[3];return o}
  function tryDay(d,L,ext){
    const day=dayL(d),fixed=day.filter(j=>j.fixed),mov=[...day.filter(j=>!j.fixed),L];
    if(sumH(day)+L.h>(ext?11:10))return null;
    let best=null;
    for(const w of instWin(d)){const w1=ext&&w[1]===1200?(S.INST?.wyjatkowo_do||1260):w[1];
      const r=fixed.length?adjSearch(fixed,mov,w[0],w1,d):seqSearch(mov,d,w[0],w1);if(r&&(!best||r.start<best.start))best=r}
    return best}
  // Ponowne ułożenie propozycji dnia w zwykłym oknie (po usunięciu jazdy w naprawie reguły 12)
  function ulozDzien(d){const day=dayL(d),fixed=day.filter(j=>j.fixed),mov=day.filter(j=>!j.fixed);if(!mov.length)return true;
    let best=null;for(const w of instWin(d)){const r=fixed.length?adjSearch(fixed,mov,w[0],w[1],d):seqSearch(mov,d,w[0],w[1]);if(r&&(!best||r.start<best.start))best=r}
    if(!best)return false;commit(best);return true}
  function commit(r){r.placed.forEach(({L,od})=>{L.od=od;L.do=od+L.h*60;if(!all.includes(L))all.push(L)})}
  function newL(k,d,h){return{id:null,data:d,od:0,h,kursant:k.id,rodzaj:"kurs",status:"propozycja",uwagi:"",fixed:false,win:studWin(k,d)||[]}}
  const better=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]<b[i])return true;if(a[i]>b[i])return false}return false};
  // najlepsza jazda kursanta w danym dniu: standard 2 h (3 h, gdy domyka dzień do 10 h albo kończy kurs), potem najwcześniej
  function bestIn(k,d,ext,dh){let best=null;const ds=durs(k,d),w3=!!k.woli_3h&&ds.includes(3)&&ds.length>1; // P-039 pkt 3: „woli 3 h” – 3 h zawsze, gdy się mieści (durs już pilnuje 8 h i końcówki)
    for(const h of ds){if(dh!=null&&dh+h>10)continue;const L=newL(k,d,h);L.ext=!!ext;const r=tryDay(d,L,ext);if(!r)continue;
      const pen=w3?(h===3?0:1):h===3&&ds.length>1&&!(dh!=null&&10-dh===3)?1:0,sc=[pen,r.start];if(!best||better(sc,best.sc))best={r,sc}}
    return best}
  function place(k,days,ext){let best=null;
    for(const d of days){if(has(k,d))continue;const sw=studWin(k,d);if(!sw||!sw.length)continue;
      const b=bestIn(k,d,ext,null);if(!b)continue;const sc=[b.sc[1],sumH(dayL(d)),b.sc[0]];if(!best||better(sc,best.sc))best={r:b.r,sc}}
    if(best){commit(best.r);return true}return false}
  const warns=[];let extOff=false;
  for(let mon=monday(from);mon<=to;mon=addD(mon,7)){
    const sun=addD(mon,6),days=[],pracy=[];
    for(let i=0;i<7;i++){const d=addD(mon,i);if(instWin(d).length){pracy.push(d);if(d>=from&&d<=to)days.push(d)}}
    if(!days.length)continue;
    const inW=k=>all.filter(j=>j.kursant===k.id&&isKurs(j)&&j.data>=mon&&j.data<=sun).length;
    const tgt=k=>{const rem=30-before(k,mon);return rem<=0?0:rem<=3?1:2};
    const dopelnij=d=>{for(let g=0;g<12;g++){const dh=sumH(dayL(d));if(dh>=10)break;let ok=false;
        for(const k of ord()){if(has(k,d))continue;const sw=studWin(k,d);if(!sw||!sw.length)continue;
          const b=bestIn(k,d,false,dh);if(b){commit(b.r);ok=true;break}}
        if(!ok)break}};
    const tydzien=()=>{
      for(const round of[1,2])for(const k of ord()){if(inW(k)>=Math.min(round,tgt(k)))continue;
        if(!place(k,days,false)&&inW(k)===0&&!extOff)place(k,days,true)}
      for(const d of days)dopelnij(d)};
    // BUG-015 (reguła 12) sprawdzana na KOŃCOWYM układzie próby: wyjątek (jazda po 20:00 albo dzień ponad 10 h)
    // tylko dla kursanta, który nie ma w tygodniu innej jazdy. Jazda z wyjątkiem u kursanta z inną jazdą jest usuwana,
    // dzień układany ponownie w zwykłym oknie i dopełniany do 10 h. Zwraca false, gdy naprawa się nie udała.
    const wyjatek=L=>!cover(instWin(L.data),L.od,L.od+L.h*60)||(!!L.ext&&sumH(dayL(L.data))>10);
    const lamie=()=>all.find(j=>!j.fixed&&j.data>=mon&&j.data<=sun&&wyjatek(j)&&inW({id:j.kursant})>1);
    const napraw=()=>{let zm=false;
      for(let it=0;it<60;it++){const L=lamie();if(!L)break;zm=true;
        all.splice(all.indexOf(L),1);if(!ulozDzien(L.data))return false;dopelnij(L.data)}
      if(lamie())return false;
      if(zm){ // po usunięciu: jeszcze raz minimum (zwykłe okno) dla kursantów poniżej minimum
        for(const k of ord())if(inW(k)<tgt(k))place(k,days,false);
        for(let it=0;it<60;it++){const L=lamie();if(!L)break;all.splice(all.indexOf(L),1);if(!ulozDzien(L.data))return false;dopelnij(L.data)}
        if(lamie())return false}
      return true};
    // BUG-002: kilka prób układu tygodnia; wybieramy tę, w której najmniej brakuje do minimum jazd.
    // Próba 0 = zwykła kolejność (najmniej godzin pierwszy); inna próba wygrywa tylko, gdy jest wyraźnie lepsza.
    // Ocena: [próba łamie regułę 12 (BUG-015), brak do minimum jazd].
    const snap=all.slice(),ocen=ok=>[ok?0:1,studs.reduce((s,k)=>s+Math.max(0,tgt(k)-inW(k)),0)];
    const reset=()=>{all.length=0;snap.forEach(x=>all.push(x))};
    let wyb=null;
    for(let att=0;att<16;att++){
      reset();
      mix=null;if(att>0){mix={};studs.forEach(k=>mix[k.id]=Math.random())}
      tydzien();const sc=ocen(napraw());
      if(!wyb||better(sc,wyb.sc))wyb={sc,stan:all.slice()};
      if(wyb.sc[0]===0&&wyb.sc[1]===0&&att===0)break}
    if(wyb.sc[0]){ // żadna próba nie spełnia reguły 12 – układ bez wyjątków 20–21 / ponad 10 h
      reset();mix=null;extOff=true;tydzien();extOff=false;wyb={sc:ocen(true),stan:all.slice()}}
    mix=null;all.length=0;wyb.stan.forEach(x=>all.push(x));
    // BUG-006: ostrzegamy tylko za tydzień, którego większość dni pracy jest w zakresie
    if(days.length*2>pracy.length)for(const k of studs){const t=tgt(k),n=inW(k);if(t>0&&n===0&&ostrzTydz(k,mon))warns.push(`${lab(k.id)}: brak jazd w tygodniu ${fd(mon)}–${fd(sun)}`)}
  }
  // P-022: zabezpieczenie – propozycja nie może nachodzić na żadną nieodwołaną jazdę ani inną propozycję
  const created=[];all.filter(j=>!j.fixed).sort(cmpJ).forEach(L=>{const e=L.od+L.h*60;
    if(!all.some(j=>j!==L&&(j.fixed||created.includes(j))&&j.data===L.data&&j.od<e&&L.od<j.od+j.h*60))created.push(L)});
  return{props,created,warns,skipped,from,to}}
// Usuwa oznaczenia, miejsca i teorię przypisane do usuniętych jazd (BUG-007)
function oczyscPoJazdach(ids){if(pvBlok())return;const S2=new Set(ids);if(!S2.size)return;
  for(const k of Object.values(S.K)){let zm=false;const c=clone(k);
    for(const[nr,l]of Object.entries(c.oznaczenia||{})){const n=l.filter(x=>!S2.has(x[0]));if(n.length!==l.length){zm=true;if(n.length)c.oznaczenia[nr]=n;else delete c.oznaczenia[nr]}}
    for(const[m,l]of Object.entries(c.miejsca||{})){const n=l.filter(x=>!S2.has(x));if(n.length!==l.length){zm=true;c.miejsca[m]=n}}
    for(const[t,id]of Object.entries(c.teoriaJ||{}))if(S2.has(id)){zm=true;delete c.teoriaJ[t];c.teoria[t]=false}
    if(zm){S.K[c.id]=c;put("kursanci",c.id,c)}}}
function zapiszGen(res){if(pvBlok())return;
  res.props.forEach(p=>{delete S.J[p.id];rm("jazdy",p.id)});oczyscPoJazdach(res.props.map(p=>p.id));
  let n=nextNum("J_","jazda");
  res.created.forEach(L=>{const id="J_"+String(n++).padStart(4,"0");const o={id,data:L.data,od:L.od,do:L.od+L.h*60,h:L.h,kursant:L.kursant,rodzaj:"kurs",status:"propozycja",uwagi:""};S.J[id]=o;put("jazdy",id,o)});
  if(res.created.length)bumpMeta("jazda",n-1);
  render()}
const endOfMonth=s=>{const d=pISO(s);return iso(new Date(d.getFullYear(),d.getMonth()+1,0))};
/* P-033 pkt 3 + P-039 pkt 2: masowe usuwanie jazd „propozycja” / „czeka na kursanta” (status + zakres dat + kursant; stan S.czSt, S.czFrom, S.czTo, S.czK, S.czDelArm) */
const CZ_ST=[["propozycja","propozycja"],[CZEKA,"czeka na kursanta"]];
function czekaZakres(){const ma=st=>Object.values(S.J).some(j=>j.status===st);if(!ma("propozycja")&&!ma(CZEKA))return null;
  const st=ma(S.czSt||CZEKA)?(S.czSt||CZEKA):(S.czSt===CZEKA||!S.czSt?"propozycja":CZEKA),all=Object.values(S.J).filter(j=>j.status===st);
  const mx=all.reduce((m,j)=>j.data>m?j.data:m,""),od=S.czFrom||today(),dok=S.czTo||mx,ids=[...new Set(all.map(j=>j.kursant))].sort((a,b)=>lab(a).localeCompare(lab(b),"pl")),kid=ids.includes(S.czK)?S.czK:"";
  return{st,od,do:dok,ids,kid,l:all.filter(j=>j.data>=od&&j.data<=dok&&(!kid||j.kursant===kid)).sort(cmpJ)}}
function czekaHtml(){const z=czekaZakres();if(!z)return "";const o=!!S.czOpen;
  let h=`<div style="margin:10px 0 4px;padding-top:10px;border-top:1px solid var(--line)"><button class="btn ghost sm" data-act="czekaToggle" aria-expanded="${o}">${o?"▾":"▸"} Usuń jazdy z zakresu (propozycje / czekające)</button>`;
  if(!o)return h+`</div>`;
  return h+`<label class="field" style="margin-top:8px"><span class="lbl">Status jazd</span><select id="c-st" data-ch="c-st">${CZ_ST.map(([v,t])=>`<option value="${v}"${v===z.st?" selected":""}>${t}</option>`).join("")}</select></label>
    <div class="grid2" style="margin-top:8px"><label class="field"><span class="lbl">Od</span><input type="date" id="c-od" value="${z.od}" data-ch="c-od"></label><label class="field"><span class="lbl">Do</span><input type="date" id="c-do" value="${z.do}" data-ch="c-do"></label></div>
    <label class="field"><span class="lbl">Kursant</span><select id="c-k" data-ch="c-k"><option value="">Wszyscy</option>${z.ids.map(id=>`<option value="${id}"${id===z.kid?" selected":""}>${esc(lab(id))}</option>`).join("")}</select></label>
    <div class="row" style="margin-top:8px"><span class="pill ${z.l.length?"warn":""}">Do usunięcia: ${ileJazd(z.l.length)} · ${sumH(z.l)} h</span><button class="btn ${S.czDelArm?"warnb":"ghost"}" data-act="czekaDel"${z.l.length?"":" disabled"}>${S.czDelArm?"Na pewno usunąć?":"Usuń te jazdy"}</button></div></div>`}
function genHtml(){
  const pr=Object.values(S.J).filter(j=>j.status==="propozycja");
  let h=`<div class="card"><div class="sec-h"><h3>Generator propozycji</h3><button class="btn ghost sm" data-act="genToggle" aria-expanded="${!!S.genOpen}">${S.genOpen?"Zwiń ▾":"Otwórz ▸"}</button></div>`;
  if(pr.length)h+=`<div class="row" style="margin-top:8px"><span class="pill">${ileProp(pr.length)} · ${sumH(pr)} h</span><button class="btn okb sm" data-act="genApprove">Zatwierdź wszystkie</button><button class="btn ${S.genDelArm?"warnb":"ghost"} sm" data-act="genClear">${S.genDelArm?"Na pewno usunąć?":"Usuń wszystkie"}</button></div>`;
  if(S.genOpen){
    if(!S.genFrom){const nm=addD(monday(today()),7);S.genFrom=S.week&&S.week>today()?S.week:nm;S.genTo=endOfMonth(S.genFrom)}
    h+=`<p class="small muted" style="margin:8px 0">Planuje tylko kursantów w trakcie kursu ze znaną dostępnością. Dopisuje propozycje do istniejących jazd i ich nie przesuwa. Ponowne generowanie zastępuje stare propozycje w tym zakresie. Maksymalnie 2 miesiące kalendarzowe.</p>
    <div class="grid2"><label class="field"><span class="lbl">Od</span><input type="date" id="g-od" value="${S.genFrom}" data-ch="g-od"></label><label class="field"><span class="lbl">Do</span><input type="date" id="g-do" value="${S.genTo}" data-ch="g-do"></label></div>
    <div class="row" style="margin-top:10px"><button class="btn pri" data-act="genGo">Generuj propozycje</button></div>`;
    const R=S.genRes;
    if(R){h+=`<div class="wbox" style="margin-top:10px"><div class="wl ok">Dodano: ${ileProp(R.created.length)} (${sumH(R.created)} h), ${fdy(R.from)}–${fdy(R.to)}${R.props.length?` · zastąpiono ${R.props.length} starych`:""}.</div>`;
      R.skipped.forEach(k=>h+=`<div class="wl">${esc(lab(k.id))}: brak dostępności – pominięty</div>`);
      R.warns.forEach(w=>h+=`<div class="wl">${esc(w)}</div>`);h+=`</div>`}
    h+=czekaHtml()}
  return h+`</div>`}

/* ---------------------------------------------------------- P-017: podwójna akceptacja, Wiadomości */
// Zatwierdzenie propozycji przez instruktora → „czeka na kursanta”; potem SMS z ekranu Wiadomości.
