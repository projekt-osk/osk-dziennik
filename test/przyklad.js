"use strict";
/* przyklad.js – TYLKO wersja testowa (buduj.mjs nie dołącza go do produkcji).
   „Wczytaj dane przykładowe”: kilku zmyślonych kursantów i jazdy generowane w kodzie, daty liczone od dziś.
   Nadpisuje dokumenty o tych samych ID (ID_001–ID_004, OL_001, J_0001…), innych nie rusza. */
function przykladDane(){
  const t0=realToday(),mon=monday(t0),d=(n)=>addD(mon,n);   // dni względem poniedziałku bieżącego tygodnia
  const tydz={"0":[[480,1200]],"1":[[480,1200]],"2":[[480,1200]],"3":[[480,1200]],"4":[[480,1200]]};
  const INST={okresy:[{od:addD(mon,-28),do:null,tydzien:tydz}],wyjatki:[],wyjatkowo_do:1260,stawka:100};
  const U=[["1.1","Przygotowanie do jazdy","cwiczenia"],["1.2","Ruszanie i zatrzymywanie","cwiczenia"],["2.1","Zmiana biegów","cwiczenia"],
    ["3.1","Jazda po łuku","cwiczenia"],["4.1","Parkowanie równoległe","cwiczenia"],["5.1","Skrzyżowania równorzędne","cwiczenia"],
    ["6.1","Ronda","cwiczenia"],["7.1","Obserwacja lusterek","obserwacje"],["7.2","Sygnalizowanie manewrów","obserwacje"]].map(([nr,nazwa,sekcja])=>({nr,nazwa,sekcja}));
  const MIEJ=["Plac manewrowy","Centrum","Obwodnica"],TEO=["Pierwszeństwo","Znaki poziome","Hamowanie awaryjne"];
  const okna=(o)=>{const r={};Object.entries(o).forEach(([k,v])=>r[k]=v);return r};
  const kurs=(id,imie,litery,kat,przed,dost)=>({id,imie,litery,kategoria:kat,status:kat==="OL"?"OL":(przed>=30?"ukonczony":"w_trakcie"),aktywny:true,
    saldo_przed:przed,dodatkowe_przed:0,dostepnosc:dost,wyjatki:[],preferencje:"",oznaczenia:{},miejsca:Object.fromEntries(MIEJ.map(m=>[m,[]])),
    teoria:Object.fromEntries(TEO.map(x=>[x,false])),uwagi:""});
  const K=[kurs("ID_001","Anna","Ko","staly",0,okna({"0":[[900,1200]],"2":[[900,1200]],"4":[[480,720]]})),
    kurs("ID_002","Bartek","Ma","staly",12,okna({"1":[[480,1200]],"3":[[480,1200]]})),
    kurs("ID_003","Celina","Wi","staly",26,okna({"0":[[480,900]],"1":[[480,900]],"2":[[480,900]],"3":[[480,900]],"4":[[480,900]]})),
    kurs("ID_004","Darek","No","staly",30,okna({"4":[[600,1200]]})),
    kurs("OL_001","Ewa","Pa","OL",0,null)];
  K[2].jazdy_inni=[{id:1,h:1.5,notatka:"przykład – inny instruktor"}];
  let n=0;const J=[];
  const jz=(k,data,od,h,status,rodzaj,extra)=>{n++;const id="J_"+String(n).padStart(4,"0");J.push(Object.assign({id,data,od,do:od+h*60,h,kursant:k,rodzaj,status,uwagi:""},extra||{}));return id};
  const a1=jz("ID_001",d(-7),960,2,"odbyta","kurs"),a2=jz("ID_001",d(-5),960,2,"odbyta","kurs");
  jz("ID_001",d(0),960,2,t0>d(0)?"odbyta":"zaplanowana","kurs");jz("ID_001",d(9),960,2,CZEKA,"kurs");
  jz("ID_002",d(-6),600,2,"odbyta","kurs");jz("ID_002",d(1),600,2,"zaplanowana","kurs");jz("ID_002",d(8),600,2,"propozycja","kurs");
  jz("ID_003",d(-4),480,2,"odbyta","kurs");jz("ID_003",d(2),480,2,"zaplanowana","kurs");jz("ID_003",d(3),480,1,"odwołana","kurs");
  jz("ID_004",d(-3),720,2,"odbyta","dodatkowa",{platnosc:"gotowka",kwota:200});jz("ID_004",d(4),720,2,"zaplanowana","dodatkowa",{platnosc:"przelew"});
  jz("OL_001",d(-10),840,2,"odbyta","OL");
  K[0].oznaczenia={"1.1":[[a1,"V"],[a2,"V"]],"2.1":[[a1,"X"],[a2,"V"]],"7.1":[[a2,"X"]]};K[0].miejsca["Plac manewrowy"]=[a1];K[0].teoria["Pierwszeństwo"]=true;K[0].teoriaJ={"Pierwszeństwo":a2};
  const META={nastepne_id:{ID:5,OL:2,jazda:n+1},slowniki:{umiejetnosci:U,miejsca:MIEJ,teoria:TEO}};
  const KO=[{id:"KO_przyklad1",data:d(-5),rodzaj:"Paliwo",kwota:150,notatka:""}];
  return{INST,META,K,J,KO}}
function przykladWczytaj(){const D=przykladDane();
  put("ustawienia","instruktor",D.INST);put("ustawienia","meta",D.META);
  D.K.forEach(k=>put("kursanci",k.id,k));D.J.forEach(j=>put("jazdy",j.id,j));D.KO.forEach(o=>put("koszty",o.id,o));
  toast(`Wczytano dane przykładowe: ${D.K.length} kursantów, ${D.J.length} jazd`)}
function przykladHtml(){return `<section class="card"><h3>Dane przykładowe (tylko wersja testowa)</h3><p class="small muted">Kilku zmyślonych kursantów i jazd do sprawdzania aplikacji. Nadpisuje kursantów ID_001–ID_004, OL_001 i jazdy J_0001–J_0013.</p><div class="row" style="margin-top:10px"><button class="btn${S.przArm?" warnb":""}" data-act="przyklad">${S.przArm?"Baza nie jest pusta – dotknij ponownie":"Wczytaj dane przykładowe"}</button></div></section>`}
