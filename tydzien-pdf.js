"use strict";
/* tydzien-pdf.js – źródło w src/ (repo osk-dziennik); wersje prod i test buduje narzedzia/buduj.mjs */
const TY_H=36; // px na godzinę
const zl=n=>{n=Math.round((+n||0)*100)/100;return n.toLocaleString("pl-PL",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+" zł"};
const sumKo=(l,r)=>l.filter(k=>k.rodzaj===r).reduce((s,k)=>s+(+k.kwota||0),0);
function tydHtml(){
  const mon=S.week,sun=addD(mon,6),D=[...Array(7)].map((_,i)=>addD(mon,i));
  const wj=Object.values(S.J).filter(j=>j.data>=mon&&j.data<=sun&&j.status!=="odwołana");
  const odb=sumH(wj.filter(j=>j.status==="odbyta")),plan=sumH(wj),ko=Object.values(S.KO||{}).filter(k=>k.data>=mon&&k.data<=sun),gw=gotSuma(wj);
  const open=!!S.tydOpen;
  let h=`<section class="card tyd"><button class="tydh" data-act="tydToggle" aria-expanded="${open}"><span class="grow"><b>${open?"▾":"▸"} Tydzień ${fd(mon)} – ${fd(sun)}</b><br><span class="small muted num">przepracowane ${odb} h / ${plan} h w planie · paliwo ${zl(sumKo(ko,"Paliwo"))} · inne ${zl(sumKo(ko,"Inne"))}${gw>0?` · gotówka ${zl(gw)}`:""}</span></span></button>`;
  if(!open)return h+`</section>`;
  let st=360,en=1200;wj.forEach(j=>{st=Math.min(st,Math.floor(j.od/60)*60);en=Math.max(en,Math.ceil(konJ(j)/60)*60)});en=Math.min(en,1440);
  const HH=(en-st)/60*TY_H,y=m=>((m-st)/60*TY_H).toFixed(1);
  const maJ=d=>wj.some(j=>j.data===d)||ko.some(k=>k.data===d),au=D.map((d,i)=>i<5||maJ(d));au[5]=au[5]||au[6];const vis=D.map((d,i)=>au[i]||!!S.weOpen[d]);vis[5]=vis[5]||vis[6];
  let g=`<div class="tyw"><div class="tyg" style="grid-template-columns:40px ${D.map((d,i)=>vis[i]?"minmax(104px,1fr)":"34px").join(" ")}"><div></div>`;
  g+=D.map((d,i)=>!vis[i]?`<button class="tywe" data-act="weToggle" data-d="${d}" aria-label="Rozwiń: ${DNI[i]} ${fd(d)}">${DN[i]}</button>`
    :`<div class="tyhd${d===today()?" today":""}">${i>4&&!au[i]&&!(i===5&&vis[6])?`<button class="tyx" data-act="weToggle" data-d="${d}" aria-label="Zwiń: ${DNI[i]}">${DN[i]} ${fd(d)} ‹</button>`:`${DN[i]} ${fd(d)}`}</div>`).join("");
  g+=`<div class="tyl" style="height:${HH}px">`;for(let m=st;m<en;m+=60)g+=`<span style="top:${y(m)}px">${m/60}</span>`;g+=`</div>`;
  D.forEach((d,i)=>{const bs=`height:${HH}px;background-size:100% ${TY_H}px`;
    if(!vis[i]){g+=`<button class="tycol off" data-act="weToggle" data-d="${d}" style="${bs}" aria-label="Rozwiń: ${DNI[i]} ${fd(d)}"></button>`;return}
    let c=`<div class="tycol" style="${bs}">`;
    instWin(d).forEach(w=>{const a=Math.max(st,w[0]),b=Math.min(en,w[1]);if(b>a)c+=`<div class="tyon" style="top:${y(a)}px;height:${((b-a)/60*TY_H).toFixed(1)}px;background-size:100% ${TY_H}px;background-position:0 -${y(a)}px"></div>`});
    wj.filter(j=>j.data===d).forEach(j=>{const cls=j.status==="propozycja"?" prop":j.status===CZEKA?" czk":"";
      c+=`<button class="tyb${cls}" data-act="openJ" data-id="${j.id}" style="top:${(+y(j.od)+1).toFixed(1)}px;height:${(j.h*TY_H-2).toFixed(1)}px"><b>${esc(lab(j.kursant))}</b><span>${t2s(j.od)}–${t2s(konJ(j))}</span></button>`});
    g+=c+`</div>`});
  g+=`<div class="tyr0">Suma h</div>`+D.map((d,i)=>`<div class="tyr num">${vis[i]?(sumH(wj.filter(j=>j.data===d))||""):""}</div>`).join("");
  if(gw>0)g+=`<div class="tyr0">Gotówka</div>`+D.map((d,i)=>{const x=vis[i]?gotSuma(wj.filter(j=>j.data===d)):0;return `<div class="tyr num">${x?zl(x):""}</div>`}).join("");
  g+=`<div class="tyr0">Koszty</div>`+D.map((d,i)=>{if(!vis[i])return `<div class="tyr"></div>`;const l=ko.filter(k=>k.data===d).sort((a,b)=>a.id<b.id?-1:1);
    return `<div class="tyr tyk">${l.map(k=>`<button class="tykc" data-act="kosztOpen" data-id="${k.id}">${k.rodzaj==="Paliwo"?"Paliwo":"Inne"} ${zl(k.kwota)}${k.notatka?`<small>${esc(k.notatka)}</small>`:""}</button>`).join("")}<button class="tyadd" data-act="kosztOpen" data-d="${d}" aria-label="Dodaj koszt: ${DNI[i]} ${fd(d)}">+</button></div>`}).join("");
  h+=g+`</div></div>`;
  if(S.kosztEd)h+=kosztForm();
  h+=`<div class="row noprint" style="margin-top:10px"><button class="btn pri" data-act="tydPdf">Pobierz PDF</button></div>`;
  return h+`<p class="gridnote noprint">Szare – poza godzinami pracy. Dotknij jazdy, aby ją edytować. „+” w wierszu Koszty dodaje paliwo albo inny koszt.</p></section>`}
function kosztForm(){const e=S.kosztEd;
  return `<div class="kform" id="kform"><h3>${e.id?"Koszt":"Nowy koszt"} · ${fdl(e.data)}</h3>
  <div class="seg" role="group" aria-label="Rodzaj kosztu">${["Paliwo","Inne"].map(r=>`<button data-act="kosztRodz" data-v="${r}" aria-pressed="${e.rodzaj===r}">${r}</button>`).join("")}</div>
  <div class="grid2"><label class="field"><span class="lbl">Kwota (zł)</span><input type="text" inputmode="decimal" id="ko-kw" value="${esc(e.kwota??"")}" data-defer autocomplete="off"></label>
  <label class="field"><span class="lbl">Notatka${e.rodzaj==="Inne"?"":" (opcjonalnie)"}</span><input type="text" id="ko-not" maxlength="80" value="${esc(e.notatka||"")}" data-defer autocomplete="off"></label></div>
  <div class="row">${e.id?`<button class="btn ${S.koDelArm?"warnb":"ghost"} sm" data-act="kosztDel">${S.koDelArm?"Na pewno usunąć?":"Usuń"}</button>`:""}<span class="grow"></span><button class="btn" data-act="kosztCancel">Anuluj</button><button class="btn pri" data-act="kosztSave">Zapisz</button></div></div>`}

/* ---------------------------------------------------------- P-026: rejestr godzin miesiąca (Więcej) */
const DNK=["Pn","Wt","Śr","Cz","Pt","So","N"]; // skróty dni w rejestrze godzin i karcie PDF (wzór papierowy)
const MIES=["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
function rejDane(ym){const[y,m]=ym.split("-").map(Number),n=new Date(y,m,0).getDate(),t=today(),dni=[];let suma=0;
  for(let i=1;i<=n;i++){const d=ym+"-"+pad(i);let h=0;
    if(d<=t)h=sumH(Object.values(S.J).filter(j=>j.data===d&&j.status==="odbyta"));  // tylko jazdy odbyte; przyszłe dni puste
    suma+=h;dni.push({d,h})}
  return{y,m,dni,suma,tyt:"Rejestr godzin realizacji zlecenia – "+MIES[m-1]+" "+y}}
function rejHtml(){const ym=S.rejM||today().slice(0,7),R=rejDane(ym),open=!!S.rejOpen;
  let h=`<section class="card rejcard"><button class="tydh noprint" data-act="rejToggle" aria-expanded="${open}"><span class="grow"><b>${open?"▾":"▸"} Rejestr godzin</b><br><span class="small muted">${MIES[R.m-1]} ${R.y} · liczba godzin ${R.suma}</span></span></button>`;
  if(!open)return h+`</section>`;
  return h+`<div class="sec-h noprint" style="margin-top:10px"><span></span><div class="row"><button class="btn sm" data-act="rejNav" data-n="-1" aria-label="Poprzedni miesiąc">‹</button><b class="num">${MIES[R.m-1]} ${R.y}</b><button class="btn sm" data-act="rejNav" data-n="1" aria-label="Następny miesiąc">›</button></div></div>
  <p class="small muted noprint">Liczą się tylko jazdy odbyte (bez odwołanych, propozycji i „czeka na kursanta”). Korekta – popraw jazdę w grafiku.</p>
  <div class="rejk"><div class="rejf"><span>Nazwa firmy:</span><i></i></div><div class="rejf"><span>Adres:</span><i></i></div><h4>${R.tyt}</h4><div class="rejf"><span>Imię i nazwisko zleceniobiorcy:</span><i></i></div>
  <table class="rejt"><thead><tr><th colspan="2">Dzień</th><th>Liczba godzin realizacji zlecenia</th><th>Podpis zleceniobiorcy</th><th>Podpis zleceniodawcy</th></tr></thead><tbody>${R.dni.map(x=>`<tr${dow(x.d)>4?' class="we"':""}><td class="dn">${+x.d.slice(8)}</td><td class="dd">${DNK[dow(x.d)]}</td><td class="num">${x.h||""}</td><td></td><td></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2">Suma:</td><td class="num">${R.suma}</td><td></td><td></td></tr></tfoot></table></div>
  <div class="row noprint" style="margin-top:10px"><button class="btn pri" data-act="rejPdf">Pobierz PDF</button></div></section>`}
// PDF: karta rysowana na płótnie (polskie znaki z fontu systemowego), JPEG w jednostronicowym PDF A4.
// Zapis: zwykłe pobranie pliku w przeglądarce (F-2026.11.25); gdy się nie uda – druk przeglądarki (Zapisz jako PDF).
function pdfZJpg(jpg,w,h,pw,ph){pw=pw||595.28;ph=ph||841.89;const enc=new TextEncoder(),parts=[],offs=[];let len=0;
  const add=x=>{const b=typeof x==="string"?enc.encode(x):x;parts.push(b);len+=b.length};
  const obj=(n,s)=>{offs[n]=len;add(n+" 0 obj\n"+s+"\nendobj\n")};
  add("%PDF-1.4\n");
  obj(1,"<< /Type /Catalog /Pages 2 0 R >>");
  obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offs[4]=len;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);add(jpg);add("\nendstream\nendobj\n");
  const cs=`q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;obj(5,`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
  const x=len;let t="xref\n0 6\n0000000000 65535 f \n";for(let i=1;i<=5;i++)t+=String(offs[i]).padStart(10,"0")+" 00000 n \n";
  add(t+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`);
  const out=new Uint8Array(len);let p=0;for(const b of parts){out.set(b,p);p+=b.length}return out}
function rejCanvas(R){const W=1240,H=1754,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#000";g.strokeStyle="#000";g.textBaseline="middle";
  const F=(s,b)=>{g.font=(b?"700 ":"400 ")+s+'px "Atkinson Hyperlegible", Arial, sans-serif'};
  const M=100;let y=110;
  const pole=t=>{F(26);g.textAlign="left";g.fillText(t,M,y);const w=g.measureText(t).width;g.lineWidth=1.5;g.beginPath();g.moveTo(M+w+12,y+14);g.lineTo(W-M,y+14);g.stroke();y+=62};
  pole("Nazwa firmy:");pole("Adres:");y+=24;F(32,1);g.textAlign="center";g.fillText(R.tyt,W/2,y);y+=70;pole("Imię i nazwisko zleceniobiorcy:");y+=6;
  // kolumny: nr dnia | skrót dnia | liczba godzin realizacji zlecenia | podpisy; nagłówek „Dzień” nad dwiema pierwszymi
  const X=[M,M+85,M+170,M+470,M+755,W-M],n=R.dni.length,hh=60,rh=Math.min(44,Math.floor((H-70-y-hh)/(n+1)));
  const mid=i=>(X[i]+X[i+1])/2,y0=y;
  F(21,1);g.textAlign="center";g.fillText("Dzień",(X[0]+X[2])/2,y0+hh/2);
  g.fillText("Liczba godzin",mid(2),y0+hh/2-13);g.fillText("realizacji zlecenia",mid(2),y0+hh/2+13);
  g.fillText("Podpis zleceniobiorcy",mid(3),y0+hh/2);g.fillText("Podpis zleceniodawcy",mid(4),y0+hh/2);
  y+=hh;
  R.dni.forEach(x=>{F(22);g.textAlign="center";g.fillText(String(+x.d.slice(8)),mid(0),y+rh/2);g.fillText(DNK[dow(x.d)],mid(1),y+rh/2);if(x.h)g.fillText(String(x.h),mid(2),y+rh/2);y+=rh});
  F(22,1);g.textAlign="center";g.fillText("Suma:",(X[0]+X[2])/2,y+rh/2);g.fillText(String(R.suma),mid(2),y+rh/2);y+=rh;
  const yb=y0+hh+n*rh,ye=y;g.lineWidth=1.5;g.beginPath();
  [y0,y0+hh,yb,ye].forEach(v=>{g.moveTo(X[0],v);g.lineTo(X[5],v)});
  for(let i=1;i<=n;i++){const v=y0+hh+i*rh;g.moveTo(X[0],v);g.lineTo(X[5],v)}
  [0,2,3,4,5].forEach(i=>{g.moveTo(X[i],y0);g.lineTo(X[i],ye)});g.moveTo(X[1],y0+hh);g.lineTo(X[1],yb);g.stroke();
  return c}
function pobierzPlik(blob,fname){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=fname;a.rel="noopener";a.style.display="none";document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},4000)}
// Wspólny mechanizm PDF (rejestr i karta tygodnia): płótno → JPEG → pdfZJpg → pobranie pliku; błąd → druk (cls = klasa body dla CSS @media print, land = A4 poziomo).
function drukuj(cls,land){document.body.classList.add(cls);let st=null;
  if(land){st=document.createElement("style");st.textContent="@page{size:A4 landscape;margin:8mm}";document.head.appendChild(st)}
  const fin=()=>{document.body.classList.remove(cls);if(st)st.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);try{window.print()}catch(e){fin()}}
async function pdfZapisz(mk,fname,cls,land){
  const druk=()=>{toast("Nie udało się pobrać pliku – otwieram drukowanie (wybierz „Zapisz jako PDF”).");setTimeout(()=>drukuj(cls,land),300)};
  let pdf;try{try{await document.fonts?.ready}catch(e){}
    const c=mk(),url=c.toDataURL("image/jpeg",0.9),bin=atob(url.split(",")[1]),jpg=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)jpg[i]=bin.charCodeAt(i);
    pdf=land?pdfZJpg(jpg,c.width,c.height,841.89,595.28):pdfZJpg(jpg,c.width,c.height)}catch(e){druk();return}
  try{pobierzPlik(new Blob([pdf],{type:"application/pdf"}),fname);toast("PDF pobrany – plik jest w Pobranych")}catch(e){druk()}}
async function rejPdf(){const ym=S.rejM||today().slice(0,7),R=rejDane(ym);return pdfZapisz(()=>rejCanvas(R),`rejestr-godzin-${ym}.pdf`,"pr-rej",false)}
// Karta tygodnia → PDF, A4 poziomo, 1754×1240 (150 dpi)
function tydCanvas(mon){
  const sun=addD(mon,6),D=[...Array(7)].map((_,i)=>addD(mon,i));
  const wj=Object.values(S.J).filter(j=>j.data>=mon&&j.data<=sun&&j.status!=="odwołana");
  const odb=sumH(wj.filter(j=>j.status==="odbyta")),plan=sumH(wj),ko=Object.values(S.KO||{}).filter(k=>k.data>=mon&&k.data<=sun),GW=gotSuma(wj),GH=GW>0?40:0;
  const ma=D.map((d,i)=>i<5||wj.some(j=>j.data===d)||ko.some(k=>k.data===d));ma[5]=ma[5]||ma[6];const dni=D.filter((d,i)=>ma[i]),DI=dni.map(d=>D.indexOf(d));
  let st=360,en=1200;wj.forEach(j=>{st=Math.min(st,Math.floor(j.od/60)*60);en=Math.max(en,Math.ceil(konJ(j)/60)*60)});en=Math.min(en,1440);
  const W=1754,H=1240,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#000";g.strokeStyle="#000";g.textBaseline="middle";
  const F=(s,b)=>{g.font=(b?"700 ":"400 ")+s+'px "Atkinson Hyperlegible", Arial, sans-serif'};
  const fit=(t,w)=>{if(g.measureText(t).width<=w)return t;while(t.length>1&&g.measureText(t+"…").width>w)t=t.slice(0,-1);return t+"…"};
  const M=60,LW=96,TW=W-2*M-LW,CW=TW/dni.length;
  F(38,1);g.textAlign="left";g.fillText("Karta tygodnia "+fd(mon)+" – "+fdy(sun),M,56);
  F(23);g.fillText(`Przepracowane ${odb} h / ${plan} h w planie  ·  Paliwo ${zl(sumKo(ko,"Paliwo"))}  ·  Inne koszty ${zl(sumKo(ko,"Inne"))}${GW>0?`  ·  Gotówka ${zl(GW)}`:""}`,M,104);
  // wiersz Koszty: wysokość zależna od liczby wpisów
  const kl=dni.map(d=>ko.filter(k=>k.data===d).sort((a,b)=>a.id<b.id?-1:1)),maxK=Math.max(1,...kl.map(l=>l.length)),KH=Math.min(150,10+maxK*28),SH=40,HR=38;
  const y0=130,gy=y0+HR,gh=H-M-SH-GH-KH-gy,TH=gh/((en-st)/60),yy=m=>gy+(m-st)/60*TH,x0=M+LW;
  F(21,1);g.textAlign="center";dni.forEach((d,i)=>g.fillText(DN[DI[i]]+" "+fd(d),x0+(i+.5)*CW,y0+HR/2));
  // tło: godziny pracy białe, reszta lekko szara
  g.fillStyle="#EEE";g.fillRect(x0,gy,TW,gh);g.fillStyle="#fff";
  dni.forEach((d,i)=>instWin(d).forEach(w=>{const a=Math.max(st,w[0]),b=Math.min(en,w[1]);if(b>a)g.fillRect(x0+i*CW,yy(a),CW,yy(b)-yy(a))}));
  g.lineWidth=1;g.strokeStyle="#BBB";g.beginPath();for(let m=st;m<=en;m+=60){g.moveTo(M+LW-6,yy(m));g.lineTo(x0+TW,yy(m))}g.stroke();
  g.fillStyle="#000";F(19);g.textAlign="right";for(let m=st;m<en;m+=60)g.fillText(String(m/60),M+LW-12,yy(m)+13);
  // jazdy: imię + 2 litery, od–do
  dni.forEach((d,i)=>wj.filter(j=>j.data===d).forEach(j=>{
    const bx=x0+i*CW+4,by=yy(j.od)+2,bw=CW-8,bh=j.h*TH-4,pr=j.status==="propozycja"||j.status===CZEKA;
    g.fillStyle=pr?"#fff":"#DCE6FB";g.fillRect(bx,by,bw,bh);g.strokeStyle="#1E4FD8";g.lineWidth=pr?2:1.5;if(pr)g.setLineDash([6,4]);g.strokeRect(bx,by,bw,bh);g.setLineDash([]);
    g.fillStyle="#1E4FD8";g.fillRect(bx,by,5,bh);g.fillStyle="#000";g.textAlign="left";
    const nmT=lab(j.kursant),tm=t2s(j.od)+"–"+t2s(konJ(j));
    if(bh>=54){F(22,1);g.fillText(fit(nmT,bw-18),bx+14,by+bh/2-12);F(19);g.fillText(tm,bx+14,by+bh/2+13)}
    else{F(17,1);const nt=fit(nmT,bw-110);g.fillText(nt,bx+12,by+bh/2);F(16);g.textAlign="right";g.fillText(tm,bx+bw-8,by+bh/2)}}));
  // siatka
  g.strokeStyle="#000";g.lineWidth=1.5;g.beginPath();
  const yb=gy+gh,ys=yb+SH,yk=ys+GH,ye=yk+KH;
  [y0,gy,yb,ys,yk,ye].forEach(v=>{g.moveTo(M,v);g.lineTo(x0+TW,v)});
  g.moveTo(M,y0);g.lineTo(M,ye);for(let i=0;i<=dni.length;i++){g.moveTo(x0+i*CW,y0);g.lineTo(x0+i*CW,ye)}g.stroke();
  // Suma h, Koszty
  F(20,1);g.textAlign="center";g.fillText("Suma h",M+LW/2,ys-SH/2);g.fillText("Koszty",M+LW/2,yk+KH/2);if(GH)g.fillText("Gotówka",M+LW/2,ys+GH/2);
  dni.forEach((d,i)=>{const sh=sumH(wj.filter(j=>j.data===d));F(22,1);g.textAlign="center";if(sh)g.fillText(String(sh),x0+(i+.5)*CW,ys-SH/2);
    if(GH){const gd=gotSuma(wj.filter(j=>j.data===d));if(gd)g.fillText(zl(gd),x0+(i+.5)*CW,ys+GH/2)}
    F(18);g.textAlign="left";kl[i].forEach((k,r)=>g.fillText(fit((k.rodzaj==="Paliwo"?"Paliwo ":"Inne ")+zl(k.kwota)+(k.notatka?" – "+k.notatka:""),CW-16),x0+i*CW+8,yk+20+r*28))});
  return c}
async function tydPdf(){const mon=S.week;return pdfZapisz(()=>tydCanvas(mon),`karta-tygodnia-${mon}.pdf`,"pr-tyd",true)}

/* ---------------------------------------------------------- wersja C: karta z trybem jazdy */
