/* =====================================================================
   Couche 2 — Géo & supply chain
   Régionalisation des ventes (clés d'allocation éditables), boutiques,
   effectifs par site (registre vivant), stocks localisés, flux amont/aval
   (haversine), international & near-shoring. Cross-filter région partagé
   avec la barre transversale (App.filters.xfRegion).
   ===================================================================== */
(function(){
'use strict';
function ready(){return (typeof App!=='undefined')&&App.st&&App.C&&(typeof CALC!=='undefined')&&(typeof Chart!=='undefined')&&document.getElementById('tabs');}
function boot(){if(!ready())return setTimeout(boot,140);init();}

/* ---------- défauts éditables (App.ov.geo prime) ---------- */
const D12={
 ret:{B01:{p:0.14,tm:0.58},B02:{p:0.09,tm:0.57},B03:{p:0.18,tm:0.58},B04:{p:0.07,tm:0.56},B05:{p:0.11,tm:0.47},
      B06:{p:0.10,tm:0.57},B07:{p:0.06,tm:0.55},B08:{p:0.05,tm:0.54},B09:{p:0.06,tm:0.55},B10:{p:0.08,tm:0.56},B11:{p:0.06,tm:0.59}},
 wsl:{"Île-de-France":0.50,"Nouvelle-Aquitaine":0.15,"Occitanie":0.11,"Auvergne-Rhône-Alpes":0.10,
      "Pays de la Loire":0.05,"Bretagne":0.032,"Hauts-de-France":0.030,"Grand Est":0.028},
 wslTm:{"Île-de-France":0.55,"Nouvelle-Aquitaine":0.55,"Occitanie":0.55,"Auvergne-Rhône-Alpes":0.55,
      "Pays de la Loire":0.54,"Bretagne":0.54,"Hauts-de-France":0.54,"Grand Est":0.54},
 eco:{"Île-de-France":0.190,"Auvergne-Rhône-Alpes":0.125,"Nouvelle-Aquitaine":0.093,"Occitanie":0.093,
      "Hauts-de-France":0.092,"Grand Est":0.084,"Provence-Alpes-Côte d'Azur":0.079,"Pays de la Loire":0.059,
      "Bretagne":0.052,"Normandie":0.051,"Autres régions":0.082},
 ag:{B01:{surf:180,loyer:96000,ouv:2016,st:"Propre"},B02:{surf:120,loyer:60000,ouv:2018,st:"Propre"},B03:{surf:320,loyer:180000,ouv:2021,st:"Propre"},
     B04:{surf:90,loyer:54000,ouv:2019,st:"Propre"},B05:{surf:260,loyer:78000,ouv:2017,st:"Propre"},B06:{surf:150,loyer:84000,ouv:2020,st:"Propre"},
     B07:{surf:80,loyer:42000,ouv:2019,st:"Franchise"},B08:{surf:70,loyer:33000,ouv:2022,st:"Franchise"},B09:{surf:85,loyer:45000,ouv:2021,st:"Propre"},
     B10:{surf:140,loyer:78000,ouv:2020,st:"Propre"},B11:{surf:75,loyer:132000,ouv:2022,st:"Propre"}},
 stk:{"Femme":{pb:0.22,cu:58},"Homme":{pb:0.20,cu:52},"Accessoires":{pb:0.25,cu:24},"Capsule lin":{pb:0.30,cu:45},
      "Matières & fournitures atelier":{pb:0,cu:12},"Emballages & PLV":{pb:0,cu:3}},
 frq:{AT:3,B01:4,B02:3,B03:5,B04:2,B05:3,B06:2,B07:2,B08:1.5,B09:1.5,B10:2,B11:2},
 hyp:{kg:25,mar:12,rou:90,nav:0.35,def:800},
 ns:{shift:0.30,pt:0.60,sur:0.06}
};
const gv=(path,def)=>{const o=App.ov.geo||{};return o[path]!=null?o[path]:def;};

/* ---------- utilitaires ---------- */
const NF0=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const NF1=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
const fk=v=>NF0.format(Math.round(v/1000))+' k€';
const fe=v=>NF0.format(Math.round(v))+' €';
const fp=(v,d)=>new Intl.NumberFormat('fr-FR',{style:'percent',minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d}).format(v);
const fi=v=>NF1.format(v);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kpi=(l,v,s)=>`<div class="kpi"><div class="lab">${l}</div><div class="val num">${v}</div>${s?`<div class="sub">${esc(s)}</div>`:''}</div>`;
const card=(t,inner)=>`<div class="card">${t?`<h3>${t}</h3>`:''}${inner}</div>`;
const COL={navy:'#1F3864',chalk:'#2456A6',green:'#1F7145',red:'#B3261E',amber:'#B26A00',teal:'#2E8B8B',grey:'#8A94A0'};
const REGC={"Nouvelle-Aquitaine":'#1F3864',"Île-de-France":'#B3261E',"Occitanie":'#B26A00',"Auvergne-Rhône-Alpes":'#2E8B8B',
 "Pays de la Loire":'#1F7145',"Bretagne":'#6B4FA3',"Hauts-de-France":'#C2611E',"Grand Est":'#8A2E4A',
 "Provence-Alpes-Côte d'Azur":'#5B7C99',"Normandie":'#7A6C5D',"Autres régions":'#8A94A0',"France":'#8A94A0'};
const parseFrLoc=raw=>{const v=parseFloat(String(raw).replace(/[^\d.,-]/g,'').replace(/\s/g,'').replace(',','.'));return isNaN(v)?null:v;};
function hav(a,b,c,d){const R=6371,r=x=>x*Math.PI/180;const dl=r(c-a),dn=r(d-b);
 const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(h)));}
function mkChart(id,cfg){const el=document.getElementById(id);if(!el)return;
 if(App.charts[id]){try{App.charts[id].destroy();}catch(_){}}
 cfg.options=cfg.options||{};cfg.options.responsive=true;cfg.options.maintainAspectRatio=false;cfg.options.animation={duration:240};
 try{App.charts[id]=new Chart(el.getContext('2d'),cfg);}catch(e){console.warn('s12 chart',id,e);}}
const axK={grid:{color:'rgba(30,40,51,.07)'},ticks:{font:{size:10},callback:v=>NF0.format(v/1000)+'k'}};
const S12IDS=['s12-reg-cv','s12-bout-cv','s12-flux-cv','s12-pnl-cv'];
let MAPS={};
function clearViz(){S12IDS.forEach(id=>{if(App.charts[id]){try{App.charts[id].destroy();}catch(_){}delete App.charts[id];}});
 for(const k in MAPS){try{MAPS[k].remove();}catch(_){ } delete MAPS[k];}}

/* ---------- données géo vivantes ---------- */
const sites=()=>App.st.geo.sites||[];
const hub=()=>App.st.geo.hub;
const bySite=n=>sites().find(s=>s.nom===n);
const boutiques=()=>sites().filter(s=>s.typ==='Boutique');

function canalBase(){
 const st=App.st;
 const g=(canal,per)=>CALC.ventesAgg(st,{canaux:new Set([canal]),per}).tot;
 const o={};
 ['Retail','E-commerce','Wholesale'].forEach(c=>{
   o[c]={a25:g(c,CALC.in25),s125:g(c,CALC.inS125),s126:g(c,CALC.inS126)};});
 return o;
}
function ventesGeoRows(){
 const cb=canalBase(); const rows=[];
 boutiques().forEach(b=>{
   const p=gv('ret:'+b.code+':p',D12.ret[b.code].p), tm=gv('ret:'+b.code+':tm',D12.ret[b.code].tm);
   rows.push({id:b.code,nom:b.nom,region:b.region,canal:'Retail',part:p,tm,
     ca:cb.Retail.a25.net*p,marge:cb.Retail.a25.net*p*tm,s125:cb.Retail.s125.net*p,s126:cb.Retail.s126.net*p});});
 Object.keys(D12.wsl).forEach(rg=>{
   const p=gv('wsl:'+rg,D12.wsl[rg]);
   const wtm=gv('wsl:'+rg+':tm',D12.wslTm[rg]);
   rows.push({id:'W:'+rg,nom:'Wholesale '+rg,region:rg,canal:'Wholesale',part:p,tm:wtm,
     ca:cb.Wholesale.a25.net*p,marge:cb.Wholesale.a25.net*p*wtm,s125:cb.Wholesale.s125.net*p,s126:cb.Wholesale.s126.net*p});});
 Object.keys(D12.eco).forEach(rg=>{
   const p=gv('eco:'+rg,D12.eco[rg]);
   rows.push({id:'E:'+rg,nom:'E-commerce '+rg,region:rg,canal:'E-commerce',part:p,tm:0.56,
     ca:cb['E-commerce'].a25.net*p,marge:cb['E-commerce'].a25.net*p*0.56,s125:cb['E-commerce'].s125.net*p,s126:cb['E-commerce'].s126.net*p});});
 return rows;
}
function regionAgg(){
 const m={};
 ventesGeoRows().forEach(r=>{const o=m[r.region]=m[r.region]||{region:r.region,ca:0,marge:0,s125:0,s126:0};
   o.ca+=r.ca;o.marge+=r.marge;o.s125+=r.s125;o.s126+=r.s126;});
 const arr=Object.values(m).sort((a,b)=>b.ca-a.ca);
 const tot=arr.reduce((s,x)=>s+x.ca,0)||1;
 arr.forEach((x,i)=>{x.part=x.ca/tot;x.tm=x.ca?x.marge/x.ca:0;x.croiss=x.s125?x.s126/x.s125-1:0;x.rang=i+1;});
 return arr;
}
function etpSite(nom){let n=0,e=0;App.st.salaries.forEach(s=>{if(s.so==null&&s.si===nom){n++;e+=s.tp||0;}});return{n,e};}
function boutiquesTable(){
 const stk=stocksGeo();
 return ventesGeoRows().filter(r=>r.canal==='Retail').map(r=>{
   const s=bySite(r.nom)||{}; const {n,e}=etpSite(r.nom);
   const stock=stk.reseau*r.partRetail0; // filled below
   return {...r,surf:s.surf||0,etp:e,actifs:n};
 });
}
function stocksGeo(){
 const st=App.st; const fam={};
 (st.stocks||[]).forEach(x=>{fam[x[0]]=(fam[x[0]]||0)+x[2]*1000;});
 let hubV=0,atel=0,res=0,pieces=0,piecesB=0;
 Object.keys(fam).forEach(f=>{
   const d=D12.stk[f]||{pb:0,cu:30};
   const pb=gv('stk:'+f+':pb',d.pb), cu=gv('stk:'+f+':cu',d.cu);
   const v=fam[f]; pieces+=v/cu;
   if(f==='Matières & fournitures atelier'){atel+=v;}
   else{hubV+=v*(1-pb);res+=v*pb;piecesB+=v*pb/cu;}
 });
 return {fam,hub:hubV,atelier:atel,reseau:res,total:hubV+atel+res,pieces,piecesB};
}
function fluxAmont(){
 const h=hub(); const dft=gv('hyp:def',D12.hyp.def);
 const F={kg:gv('hyp:kg',D12.hyp.kg),mar:gv('hyp:mar',D12.hyp.mar),rou:gv('hyp:rou',D12.hyp.rou)};
 const rows=(App.st.fournisseurs||[]).filter(f=>f[11]==='Marchandises').map(f=>{
   const dist=(f[13]!=null&&f[14]!=null)?hav(h.lat,h.lon,f[13],f[14]):dft;
   const mode=/aritime/.test(String(f[9]||''))?'Maritime':'Routier';
   const vol=(f[4]||0)*1000, t=vol/F.kg/1000, fac=mode==='Maritime'?F.mar:F.rou;
   return {code:f[0],nom:f[1],pays:f[2],dev:f[3]||'EUR',dist,vol,t,mode,fac,tkm:t*dist,co2:t*dist*fac/1e6,delai:f[6]||0};
 });
 const vol=rows.reduce((s,r)=>s+r.vol,0)||1;
 return {rows,vol,dist:rows.reduce((s,r)=>s+r.dist*r.vol,0)/vol,
   co2:rows.reduce((s,r)=>s+r.co2,0),delai:rows.reduce((s,r)=>s+r.delai*r.vol,0)/vol};
}
function fluxAval(){
 const h=hub(); const nav=gv('hyp:nav',D12.hyp.nav);
 const rows=[];
 const at=sites().find(s=>/Atelier/.test(s.nom));
 if(at){const d=hav(h.lat,h.lon,at.lat,at.lon)||6;const f=gv('frq:AT',D12.frq.AT);
   rows.push({nom:'Atelier Bègles → hub',region:at.region,dist:d,freq:f,km:d*2*f*52,co2:d*2*f*52*nav/1000,ca:null});}
 ventesGeoRows().filter(r=>r.canal==='Retail').forEach(r=>{
   const b=bySite(r.nom); const d=hav(h.lat,h.lon,b.lat,b.lon)||5;
   const f=gv('frq:'+b.code,D12.frq[b.code]);
   rows.push({nom:b.nom,region:b.region,dist:d,freq:f,km:d*2*f*52,co2:d*2*f*52*nav/1000,ca:r.ca});});
 return {rows,km:rows.reduce((s,r)=>s+r.km,0),co2:rows.reduce((s,r)=>s+r.co2,0)};
}
function intl(){
 const am=fluxAmont(); const m={};
 am.rows.forEach(r=>{const o=m[r.pays]=m[r.pays]||{pays:r.pays,vol:0,wd:0,wj:0,co2:0,dev:r.dev,ue:['France','Portugal'].includes(r.pays)};
   o.vol+=r.vol;o.wd+=r.dist*r.vol;o.wj+=r.delai*r.vol;o.co2+=r.co2;if(r.dev==='USD')o.dev='USD';});
 const arr=Object.values(m).sort((a,b)=>b.vol-a.vol);
 const tot=arr.reduce((s,x)=>s+x.vol,0)||1;
 arr.forEach(x=>{x.part=x.vol/tot;x.dist=x.wd/x.vol;x.delai=x.wj/x.vol;});
 const horsUE=arr.filter(x=>!x.ue).reduce((s,x)=>s+x.vol,0)/tot;
 const usd=arr.filter(x=>x.dev==='USD').reduce((s,x)=>s+x.vol,0)/tot;
 return {arr,tot,horsUE,usd,top:arr[0],am};
}
function nearShoring(){
 const I=intl(); const am=I.am;
 const sh=gv('ns:shift',D12.ns.shift), pt=gv('ns:pt',D12.ns.pt), sur=gv('ns:sur',D12.ns.sur);
 const chine=I.arr.find(x=>x.pays==='Chine')||{vol:0,dist:0,delai:0,co2:0};
 const ptg=I.arr.find(x=>x.pays==='Portugal')||{dist:733,delai:32};
 const tun=I.arr.find(x=>x.pays==='Tunisie')||{dist:1485,delai:26};
 const mv=chine.vol*sh, kg=gv('hyp:kg',D12.hyp.kg), rou=gv('hyp:rou',D12.hyp.rou);
 const dist2=(am.dist*am.vol - mv*chine.dist + mv*(pt*ptg.dist+(1-pt)*tun.dist))/am.vol;
 const del2 =(am.delai*am.vol - mv*chine.delai + mv*(pt*ptg.delai+(1-pt)*tun.delai))/am.vol;
 const co2add=(mv/(kg*1000))*(pt*ptg.dist+(1-pt)*tun.dist)*rou/1e6;
 const co22=am.co2 - chine.co2*sh + co2add;
 return {sh,pt,sur,mv,base:{dist:am.dist,delai:am.delai,co2:am.co2},apres:{dist:dist2,delai:del2,co2:co22},surcout:mv*sur};
}


/* ---------- P&L boutiques (Couche 3) ---------- */
function prefixSum(p){let s=0;(App.st.balance||[]).forEach(x=>{if(String(x.c||'').slice(0,p.length)===p)s+=x.s25||0;});return s;}
function pnl(){
 const S=App.C.s25, px=gv('pnl:m2',120);
 const PERS=prefixSum('64'), IMPT=prefixSum('63');
 const LOY=prefixSum('613')+prefixSum('614'), INT=prefixSum('621'), MKT=prefixSum('623'), FRET=prefixSum('624');
 const MC=S.mc, PSER=S.prod, EBE=S.ebe;
 const AACE=MC+PSER-IMPT-PERS-EBE;                 // identité SIG — garantit le pont
 const ACE=AACE-LOY-INT-MKT-FRET;
 const etpT=sites().reduce((a,s)=>a+etpSite(s.nom).e,0)||1;
 const rowsR=ventesGeoRows().filter(r=>r.canal==='Retail');
 const rows=rowsR.map(r=>{
   const e=etpSite(r.nom).e, surf=gv('ag:'+r.id+':surf',(D12.ag[r.id]||{}).surf||0);
   const loyer=gv('ag:'+r.id+':loyer',(D12.ag[r.id]||{}).loyer||0);
   return {...r,etp:e,surf,ms:PERS*e/etpT,loyer,dir:surf*px};});
 const MSb=rows.reduce((a,r)=>a+r.ms,0), LOYb=rows.reduce((a,r)=>a+r.loyer,0), DIRb=rows.reduce((a,r)=>a+r.dir,0);
 const ACEc=ACE-DIRb;
 const POOL=(PERS-MSb)+(LOY-LOYb)+INT+MKT+FRET+ACEc+IMPT;
 const all=ventesGeoRows(); const CAT=all.reduce((a,r)=>a+r.ca,0)||1;
 rows.forEach(r=>{r.contrib=r.marge-r.ms-r.loyer-r.dir; r.qp=POOL*r.ca/CAT; r.ebe=r.contrib-r.qp;});
 const can=c=>{const rs=all.filter(r=>r.canal===c);const ca=rs.reduce((a,r)=>a+r.ca,0),mg=rs.reduce((a,r)=>a+r.marge,0);
   return {ca,marge:mg,qp:POOL*ca/CAT,contrib:mg-POOL*ca/CAT};};
 const wsl=can('Wholesale'), eco=can('E-commerce');
 const sumB=rows.reduce((a,r)=>a+r.ebe,0);
 const sous=sumB+wsl.contrib+eco.contrib;
 const margesAll=rows.reduce((a,r)=>a+r.marge,0)+wsl.marge+eco.marge;
 const ecart=MC-margesAll;
 const recomp=sous+ecart+PSER;
 const regions={};
 all.forEach(r=>{
   const dirR=(r.canal==='Retail')?(rows.find(x=>x.id===r.id)||{}).ms+ (rows.find(x=>x.id===r.id)||{}).loyer+(rows.find(x=>x.id===r.id)||{}).dir:0;
   const c=r.marge-(dirR||0)-POOL*r.ca/CAT;
   const o=regions[r.region]=regions[r.region]||{region:r.region,ca:0,ebe:0};
   o.ca+=r.ca; o.ebe+=c;});
 const regArr=Object.values(regions).sort((a,b)=>b.ebe-a.ebe);
 return {px,PERS,IMPT,LOY,INT,MKT,FRET,ACE,MC,PSER,EBE,MSb,LOYb,DIRb,ACEc,POOL,CAT,
   rows:rows.sort((a,b)=>b.contrib-a.contrib),wsl,eco,sumB,sous,ecart,recomp,delta:recomp-EBE,regArr};
}
function vPnl(host){
 const P=pnl();
 const rows=P.rows.filter(r=>xfHas(r.region));
 const okD=Math.abs(P.delta)<1;
 host.innerHTML=`<div class="kpis">
   ${kpi('Contribution directe réseau',fk(rows.reduce((a,r)=>a+r.contrib,0)),fp(rows.reduce((a,r)=>a+r.contrib,0)/Math.max(1,rows.reduce((a,r)=>a+r.ca,0)))+' du CA')}
   ${kpi('EBE économique réseau',fk(rows.reduce((a,r)=>a+r.ebe,0)),'après quote-part centraux')}
   ${kpi('Frais centraux répartis',fk(P.POOL),'prorata CA marchandises')}
   ${kpi('Pont vers EBE société',okD?'Δ = 0':fk(P.delta),okD?'bouclage exact':'écart à investiguer')}</div>
  <p class="s12-cap">Coûts directs d'exploitation : <label><input class="edit" data-ed="geo:pnl:m2" value="${NF0.format(P.px)}" style="width:5em"> €/m²/an</label> — prélevés sur les autres charges externes (conservation du total).</p>
  ${card('Contribution directe par boutique','<div class="s12-chartwrap short"><canvas id="s12-pnl-cv"></canvas></div>')}
  ${card('P&L économique par boutique (trié par contribution)',`<div class="twrap"><table><thead><tr><th>Boutique</th><th>Région</th><th class="num">CA</th><th class="num">Marge</th><th class="num">MS site</th><th class="num">Loyer</th><th class="num">Directs</th><th class="num">Contribution</th><th class="num">% CA</th><th class="num">QP centraux</th><th class="num">EBE éco</th><th class="num">% CA</th></tr></thead><tbody>
   ${rows.map((r,i)=>`<tr><td>${i+1}. ${esc(r.nom)}</td><td class="small">${esc(r.region)}</td>
     <td class="num">${fk(r.ca)}</td><td class="num">${fk(r.marge)}</td><td class="num">${fk(r.ms)}</td>
     <td class="num">${fk(r.loyer)}</td><td class="num">${fk(r.dir)}</td>
     <td class="num ${r.contrib>=0?'s12-pos':'s12-neg'}"><b>${fk(r.contrib)}</b></td><td class="num">${fp(r.contrib/r.ca)}</td>
     <td class="num">${fk(r.qp)}</td><td class="num ${r.ebe>=0?'s12-pos':'s12-neg'}">${fk(r.ebe)}</td><td class="num">${fp(r.ebe/r.ca)}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="s12-note">La <b>contribution directe</b> (marge − charges du point de vente) est le critère de pilotage d'une boutique. L'<b>EBE économique</b> ajoute la quote-part des ${fk(P.POOL)} de frais centraux (structure, marketing, transport, intérim, impôts) : il mesure ce que chaque point de vente doit « porter » de la maison.</div>`)}
  ${card('EBE économique par région (tous canaux)',`<div class="twrap"><table><thead><tr><th>Région</th><th class="num">CA</th><th class="num">EBE économique</th><th class="num">% CA</th></tr></thead><tbody>
   ${P.regArr.filter(r=>xfHas(r.region)).map(r=>`<tr><td>${esc(r.region)}</td><td class="num">${fk(r.ca)}</td>
     <td class="num ${r.ebe>=0?'s12-pos':'s12-neg'}">${fk(r.ebe)}</td><td class="num">${fp(r.ebe/r.ca)}</td></tr>`).join('')}
  </tbody></table></div>`)}
  ${card('Pont vers l’EBE société',`<div class="twrap"><table><tbody>
   <tr><td>Σ EBE économiques boutiques</td><td class="num">${fk(P.sumB)}</td></tr>
   <tr><td>+ Contribution wholesale</td><td class="num">${fk(P.wsl.contrib)}</td></tr>
   <tr><td>+ Contribution e-commerce</td><td class="num">${fk(P.eco.contrib)}</td></tr>
   <tr><td><b>= Sous-total contributions allouées</b></td><td class="num"><b>${fk(P.sous)}</b></td></tr>
   <tr><td>+ Écart de marge d'allocation</td><td class="num">${fk(P.ecart)}</td></tr>
   <tr><td>+ Production de services (non allouée)</td><td class="num">${fk(P.PSER)}</td></tr>
   <tr><td><b>= EBE société recomposé</b></td><td class="num"><b>${fk(P.recomp)}</b></td></tr>
   <tr><td>EBE société (SIG)</td><td class="num">${fk(P.EBE)}</td></tr>
   <tr><td><b>Contrôle Δ</b></td><td class="num"><b class="${okD?'s12-pos':'s12-neg'}">${okD?'0 — exact':fk(P.delta)}</b></td></tr>
  </tbody></table></div>`)}`;
 const cr=rows.slice().sort((a,b)=>b.contrib-a.contrib);
 mkChart('s12-pnl-cv',{type:'bar',data:{labels:cr.map(r=>r.nom.replace(' (flagship)','')),
   datasets:[{data:cr.map(r=>r.contrib),backgroundColor:cr.map(r=>r.contrib>=0?COL.green:COL.red)}]},
  options:{plugins:{legend:{display:false}},scales:{y:axK,x:{ticks:{font:{size:9},maxRotation:55,minRotation:35}}}}});
}
/* ---------- vues ---------- */
const xfHas=r=>!App.filters.xfRegion||App.filters.xfRegion.has(r);
function toggleRegion(rg){
 let s=App.filters.xfRegion;
 if(s&&s.has(rg)){s.delete(rg); if(!s.size)s=null;}
 else{s=s||new Set(); s.add(rg);}
 App.filters.xfRegion=s; renderAll();
}
function vRegions(host){
 const agg=regionAgg(); const sel=agg.filter(r=>xfHas(r.region));
 const ca=sel.reduce((s,r)=>s+r.ca,0), tot=agg.reduce((s,r)=>s+r.ca,0);
 const hhi=agg.reduce((s,r)=>s+r.part*r.part,0);
 host.innerHTML=`<div class="kpis">
   ${kpi('CA sélection',fk(ca),fp(ca/tot)+' du total')}
   ${kpi('Région leader',esc(agg[0].region),fp(agg[0].part))}
   ${kpi('Concentration (HHI)',hhi.toFixed(3),hhi>0.25?'forte':'modérée')}
   ${kpi('Régions couvertes',agg.length,'tous canaux confondus')}</div>
  <div class="s12-grid c2">
   ${card('CA 2025 par région — cliquer pour filtrer','<div class="s12-chartwrap"><canvas id="s12-reg-cv"></canvas></div>')}
   ${card('Carte du réseau (bulles ∝ CA boutique)','<div id="s12-map-reg" class="s12-map"></div><p class="s12-cap">Fond OpenStreetMap (réseau requis pour les tuiles).</p>')}
  </div>
  ${card('Détail par région',`<div class="twrap"><table><thead><tr><th>Région</th><th class="num">CA 2025</th><th class="num">Part</th><th class="num">Taux marge</th><th class="num">Croiss. S1</th><th class="num">Rang</th></tr></thead><tbody>
   ${agg.map(r=>`<tr class="s12-click ${App.filters.xfRegion&&App.filters.xfRegion.has(r.region)?'s12-sel':''}" data-rg="${esc(r.region)}">
     <td>${esc(r.region)}</td><td class="num">${fk(r.ca)}</td><td class="num">${fp(r.part)}</td><td class="num">${fp(r.tm)}</td>
     <td class="num ${r.croiss>=0?'s12-pos':'s12-neg'}">${fp(r.croiss)}</td><td class="num s12-rank">${r.rang}</td></tr>`).join('')}
  </tbody></table></div><p class="s12-cap">Le clic (ligne ou barre) alimente le filtre « Régions » de la barre transversale — et réciproquement.</p>`)}`;
 host.querySelectorAll('tr.s12-click').forEach(tr=>tr.onclick=()=>toggleRegion(tr.dataset.rg));
 mkChart('s12-reg-cv',{type:'bar',data:{labels:agg.map(r=>r.region),datasets:[{data:agg.map(r=>r.ca),
   backgroundColor:agg.map(r=>xfHas(r.region)?(REGC[r.region]||COL.teal):'rgba(138,148,160,.35)')}]},
  options:{plugins:{legend:{display:false}},indexAxis:'y',
   onClick:(e,el,ch)=>{if(el.length)toggleRegion(ch.data.labels[el[0].index]);},
   scales:{x:axK,y:{ticks:{font:{size:10}}}}}});
 if(window.L){try{
   const m=MAPS.reg=L.map('s12-map-reg',{scrollWheelZoom:false}).setView([46.3,1.8],5.4);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(m);
   const h=hub(); L.circleMarker([h.lat,h.lon],{radius:7,color:COL.navy,fillOpacity:.9}).addTo(m).bindTooltip('Hub — '+h.nom);
   ventesGeoRows().filter(r=>r.canal==='Retail').forEach(r=>{const b=bySite(r.nom);
     if(!xfHas(b.region))return;
     L.circleMarker([b.lat,b.lon],{radius:4+Math.sqrt(r.ca)/180,color:REGC[b.region]||COL.teal,fillOpacity:.55})
      .addTo(m).bindTooltip(`${b.nom} — ${fk(r.ca)}`);});
 }catch(e){console.warn('s12 map',e);}}
}
function vBoutiques(host){
 const stk=stocksGeo(); const rowsR=ventesGeoRows().filter(r=>r.canal==='Retail');
 const totR=rowsR.reduce((s,r)=>s+r.ca,0)||1;
 const rows=rowsR.map(r=>{const b=bySite(r.nom)||{}; const {e}=etpSite(r.nom);
   const stock=stk.reseau*(r.ca/totR);
   const surf=gv('ag:'+r.id+':surf',(D12.ag[r.id]||{}).surf||b.surf||0);
   return {...r,surf,etp:e,cam2:surf?r.ca/surf:0,caetp:e?r.ca/e:0,stock,
     couv:r.ca?stock/((r.ca*(1-r.tm))/365):0,
     loyer:gv('ag:'+r.id+':loyer',D12.ag[r.id].loyer),statut:D12.ag[r.id].st};})
  .filter(r=>xfHas(r.region)).sort((a,b)=>b.ca-a.ca);
 const best=rows.reduce((a,b)=>(b.cam2>a.cam2?b:a),rows[0]||{cam2:0,nom:'—'});
 host.innerHTML=`<div class="kpis">
   ${kpi('Boutiques (sélection)',rows.length,'sur 11')}
   ${kpi('CA retail sélection',fk(rows.reduce((s,r)=>s+r.ca,0)),'')}
   ${kpi('Meilleure densité',esc(best.nom),NF0.format(Math.round(best.cam2))+' €/m²')}
   ${kpi('Stock en boutiques',fk(stk.reseau),NF0.format(Math.round(stk.piecesB))+' pièces')}</div>
  ${card('Densité — CA au m² par boutique','<div class="s12-chartwrap short"><canvas id="s12-bout-cv"></canvas></div>')}
  ${card('Classement des points de vente',`<div class="twrap"><table><thead><tr><th>Boutique</th><th>Région</th><th class="num">CA 2025</th><th class="num">Marge</th><th class="num">CA/m²</th><th class="num">CA/ETP</th><th class="num">Stock</th><th class="num">Couv. (j)</th><th class="num">Loyer/CA</th><th>Statut</th></tr></thead><tbody>
   ${rows.map((r,i)=>`<tr><td>${i+1}. ${esc(r.nom)}</td><td class="small">${esc(r.region)}</td>
     <td class="num">${fk(r.ca)}</td><td class="num">${fp(r.tm)}</td>
     <td class="num">${NF0.format(Math.round(r.cam2))}</td><td class="num">${fk(r.caetp)}</td>
     <td class="num">${fk(r.stock)}</td><td class="num">${Math.round(r.couv)}</td>
     <td class="num">${fp(r.loyer/r.ca)}</td><td class="small">${r.statut}</td></tr>`).join('')}
  </tbody></table></div>`)}`;
 mkChart('s12-bout-cv',{type:'bar',data:{labels:rows.map(r=>r.nom.replace(' (flagship)','')),
   datasets:[{data:rows.map(r=>r.cam2),backgroundColor:rows.map(r=>REGC[r.region]||COL.teal)}]},
  options:{plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(30,40,51,.07)'},ticks:{font:{size:10},callback:v=>NF0.format(v)+' €/m²'}},x:{ticks:{font:{size:9},maxRotation:55,minRotation:35}}}}});
}
function vSites(host){
 const rows=sites().map(s=>{const {n,e}=etpSite(s.nom);return {...s,n,e};}).filter(s=>xfHas(s.region));
 const tn=rows.reduce((a,b)=>a+b.n,0), te=rows.reduce((a,b)=>a+b.e,0);
 const msTot=(App.C.att&&App.C.att.attT&&App.C.att.attT.pers)||0;
 const eTot=sites().reduce((a,s)=>a+etpSite(s.nom).e,0)||1;
 host.innerHTML=`<div class="kpis">
   ${kpi('Sites (sélection)',rows.length,'sur '+sites().length)}
   ${kpi('Effectif actif',tn,'personnes')}
   ${kpi('ETP',fi(te),'équivalents temps plein')}
   ${kpi('MS estimée sélection',fk(msTot*te/eTot),'prorata ETP')}</div>
  ${card('Effectifs par lieu de travail (registre du personnel)',`<div class="twrap"><table><thead><tr><th>Site</th><th>Type</th><th>Région</th><th class="num">Actifs</th><th class="num">ETP</th><th class="num">MS estimée</th></tr></thead><tbody>
   ${rows.sort((a,b)=>b.e-a.e).map(s=>`<tr><td>${esc(s.nom)}</td><td class="small">${esc(s.typ)}</td><td class="small">${esc(s.region)}</td>
     <td class="num">${s.n}</td><td class="num">${fi(s.e)}</td><td class="num">${fk(msTot*s.e/eTot)}</td></tr>`).join('')}
  </tbody></table></div><p class="s12-cap">Actifs et ETP calculés en direct depuis le registre embarqué (site nominatif par salarié).</p>`)}`;
}
function vStocks(host){
 const g=stocksGeo();
 const famRows=Object.keys(g.fam).map(f=>{const d=D12.stk[f]||{pb:0,cu:30};
   const pb=gv('stk:'+f+':pb',d.pb),cu=gv('stk:'+f+':cu',d.cu),v=g.fam[f];
   const at=f==='Matières & fournitures atelier';
   return {f,v,pb:at?0:pb,cu,hub:at?0:v*(1-pb),atel:at?v:0,res:at?0:v*pb,pcs:v/cu};});
 host.innerHTML=`<div class="kpis">
   ${kpi('Stock total',fk(g.total),NF0.format(Math.round(g.pieces))+' pièces')}
   ${kpi('Hub Bruges',fk(g.hub),fp(g.hub/g.total))}
   ${kpi('Réseau boutiques',fk(g.reseau),NF0.format(Math.round(g.piecesB))+' pièces')}
   ${kpi('Atelier',fk(g.atelier),'matières & fournitures')}</div>
  ${card('Ventilation par famille et par lieu',`<div class="twrap"><table><thead><tr><th>Famille</th><th class="num">Stock (€)</th><th class="num">Part boutiques</th><th class="num">Coût unit.</th><th class="num">Pièces</th><th class="num">Hub (€)</th><th class="num">Boutiques (€)</th></tr></thead><tbody>
   ${famRows.map(r=>`<tr><td>${esc(r.f)}</td><td class="num">${fk(r.v)}</td><td class="num">${fp(r.pb)}</td>
     <td class="num">${fe(r.cu)}</td><td class="num">${NF0.format(Math.round(r.pcs))}</td>
     <td class="num">${fk(r.hub)}</td><td class="num">${fk(r.res)}</td></tr>`).join('')}
  </tbody></table></div><p class="s12-cap">Parts et coûts unitaires éditables dans Données → Géographie & logistique. Le stock famille provient du modèle (F_STOCKS).</p>`)}`;
}
function vFlux(host){
 const am=fluxAmont(), av=fluxAval(), I=intl(), ns=nearShoring();
 const xfx=(window.__EXT||{}).fx||null;
 host.innerHTML=`<div class="kpis">
   ${kpi('Distance moy. amont',NF0.format(Math.round(am.dist))+' km','pondérée volumes')}
   ${kpi('Délai moy. amont',fi(am.delai)+' j','pondéré volumes')}
   ${kpi('CO₂ amont',fi(am.co2)+' t/an','transport achats')}
   ${kpi('CO₂ aval',fi(av.co2)+' t/an',NF0.format(Math.round(av.km))+' km/an de navettes')}</div>
  ${xfx&&xfx.rates&&xfx.rates.USD?`<div class="s12-note">Change vivant (BCE, ${esc(xfx.date||'')}) : <b>EUR/USD ${xfx.rates.USD}</b>${xfx.variation_1an_pct&&xfx.variation_1an_pct.USD!=null?` (${xfx.variation_1an_pct.USD>0?'+':''}${xfx.variation_1an_pct.USD} % sur 1 an)`:''} — exposition Ningbo facturée en USD${xfx.rates.CNY?` · EUR/CNY ${xfx.rates.CNY}`:''}.</div>`:''}
  <div class="s12-grid c2">
   ${card('Flux amont — fournisseurs → hub',`<div class="twrap"><table><thead><tr><th>Fournisseur</th><th>Pays</th><th class="num">Dist. (km)</th><th class="num">Volume</th><th>Mode</th><th class="num">CO₂ (t)</th><th class="num">Délai (j)</th></tr></thead><tbody>
     ${am.rows.map(r=>`<tr><td>${esc(r.nom)}</td><td class="small">${esc(r.pays)}</td><td class="num">${NF0.format(r.dist)}</td>
       <td class="num">${fk(r.vol)}</td><td class="small">${r.mode}</td><td class="num">${fi(r.co2)}</td><td class="num">${r.delai}</td></tr>`).join('')}
   </tbody></table></div>`)}
   ${card('Flux aval — navettes hub → réseau',`<div class="twrap"><table><thead><tr><th>Destination</th><th class="num">Dist. (km)</th><th class="num">Livr./sem.</th><th class="num">Km/an</th><th class="num">CO₂ (t)</th></tr></thead><tbody>
     ${av.rows.map(r=>`<tr><td>${esc(r.nom)}</td><td class="num">${r.dist}</td><td class="num">${fi(r.freq)}</td>
       <td class="num">${NF0.format(r.km)}</td><td class="num">${fi(r.co2)}</td></tr>`).join('')}
   </tbody></table></div>`)}
  </div>
  ${card('Achats par pays d’origine',`<div class="s12-chartwrap short"><canvas id="s12-flux-cv"></canvas></div>
   <div class="twrap"><table><thead><tr><th>Pays</th><th class="num">Volume</th><th class="num">Part</th><th class="num">Dist. (km)</th><th class="num">Délai (j)</th><th>Devise</th><th>Zone</th></tr></thead><tbody>
   ${I.arr.map(x=>`<tr><td>${esc(x.pays)}</td><td class="num">${fk(x.vol)}</td><td class="num">${fp(x.part)}</td>
     <td class="num">${NF0.format(Math.round(x.dist))}</td><td class="num">${fi(x.delai)}</td>
     <td class="small">${x.dev}</td><td class="small">${x.ue?'UE':'Hors UE'}</td></tr>`).join('')}
   </tbody></table></div>`)}
  ${card('Near-shoring — simulateur',`
   <div class="s12-hyp"><label>Part du volume Chine relocalisée : <input class="edit" data-ed="geo:ns:shift" value="${(ns.sh*100).toFixed(0)}"> %</label>
    &nbsp;·&nbsp;<label>vers Portugal : <input class="edit" data-ed="geo:ns:pt" value="${(ns.pt*100).toFixed(0)}"> %</label>
    &nbsp;·&nbsp;<label>surcoût d'achat : <input class="edit" data-ed="geo:ns:sur" value="${(ns.sur*100).toFixed(1)}"> %</label></div>
   <div class="twrap"><table><thead><tr><th>Indicateur</th><th class="num">Avant</th><th class="num">Après</th><th class="num">Δ</th></tr></thead><tbody>
    <tr><td>Distance moyenne (km)</td><td class="num">${NF0.format(Math.round(ns.base.dist))}</td><td class="num">${NF0.format(Math.round(ns.apres.dist))}</td><td class="num s12-pos">${NF0.format(Math.round(ns.apres.dist-ns.base.dist))}</td></tr>
    <tr><td>Délai moyen (j)</td><td class="num">${fi(ns.base.delai)}</td><td class="num">${fi(ns.apres.delai)}</td><td class="num s12-pos">${fi(ns.apres.delai-ns.base.delai)}</td></tr>
    <tr><td>CO₂ amont (t/an)</td><td class="num">${fi(ns.base.co2)}</td><td class="num">${fi(ns.apres.co2)}</td><td class="num">${fi(ns.apres.co2-ns.base.co2)}</td></tr>
    <tr><td>Surcoût annuel (€)</td><td class="num">0</td><td class="num">${fk(ns.surcout)}</td><td class="num s12-neg">+${fk(ns.surcout)}</td></tr>
   </tbody></table></div>
   <div class="s12-note">Basculer <b>${fp(ns.sh,0)}</b> du volume Chine (${fk(ns.mv)}) réduit la distance de <b>${NF0.format(Math.round(ns.base.dist-ns.apres.dist))} km</b> et le délai de <b>${fi(ns.base.delai-ns.apres.delai)} j</b>, pour <span class="neg">${fk(ns.surcout)}</span> de surcoût. Le CO₂ varie peu : le maritime émet ~7× moins par t·km que le routier.</div>`)}
  <div class="s12-note">Exposition : <b>${fp(I.horsUE)}</b> des achats hors UE · <b>${fp(I.usd)}</b> facturés en USD · 1er pays : <b>${esc(I.top.pays)}</b> (${fp(I.top.part)}).</div>`;
 mkChart('s12-flux-cv',{type:'bar',data:{labels:I.arr.map(x=>x.pays),datasets:[{data:I.arr.map(x=>x.vol),
   backgroundColor:I.arr.map(x=>x.ue?COL.green:COL.red)}]},
  options:{plugins:{legend:{display:false}},scales:{y:axK,x:{ticks:{font:{size:10}}}}}});
}

/* ---------- onglet & rendu ---------- */
function renderGeo(){
 const P=document.getElementById('panel-geosc'); if(!P)return;
 clearViz();
 const view=App.filters.s12view||'regions';
 P.innerHTML=`<h2>Géographie &amp; supply chain</h2>
  <p class="lead">Ventes régionalisées par clés d'allocation (éditables), réseau de boutiques, effectifs par lieu de travail, stocks localisés et flux logistiques amont/aval — avec simulateur de relocalisation. Le filtre « Régions » de la barre transversale s'applique ici pleinement.</p>
  <div class="s12-sub">${[['regions','Régions'],['boutiques','Boutiques'],['pnl','P&L boutiques'],['sites','Sites & effectifs'],['stocks','Stocks localisés'],['flux','Flux & international']]
    .map(([k,l])=>`<button data-s12="${k}" aria-pressed="${k===view}">${l}</button>`).join('')}</div>
  <div id="s12-body"></div>`;
 P.querySelectorAll('[data-s12]').forEach(b=>b.onclick=()=>{App.filters.s12view=b.dataset.s12;renderGeo();});
 const body=document.getElementById('s12-body');
 ({regions:vRegions,boutiques:vBoutiques,pnl:vPnl,sites:vSites,stocks:vStocks,flux:vFlux}[view])(body);
}
function addTab(){
 const main=document.getElementById('main'), nav=document.getElementById('tabs');
 const beforeP=document.getElementById('panel-donnees'), beforeT=document.getElementById('tab-donnees');
 if(!document.getElementById('panel-geosc')){
   const s=document.createElement('section'); s.className='panel'; s.id='panel-geosc'; s.setAttribute('role','tabpanel');
   s.setAttribute('aria-labelledby','tab-geosc'); s.style.setProperty('--tabc',COL.teal);
   main.insertBefore(s,beforeP||null);}
 if(!document.getElementById('tab-geosc')){
   const b=document.createElement('button'); b.setAttribute('role','tab'); b.id='tab-geosc';
   b.setAttribute('aria-controls','panel-geosc'); b.setAttribute('aria-selected','false'); b.tabIndex=-1;
   b.style.setProperty('--tabc',COL.teal); b.textContent='Géo & supply chain';
   b.addEventListener('click',()=>selectTab('geosc'));
   nav.insertBefore(b,beforeT||null);}
}

/* ---------- Données : vue d'édition ---------- */
function donGeo(){
 const P=document.getElementById('panel-donnees'); if(!P)return;
 const cb=canalBase();
 const sums={ret:0,wsl:0,eco:0};
 const retRows=boutiques().map(b=>{const p=gv('ret:'+b.code+':p',D12.ret[b.code].p);sums.ret+=p;
   const tm=gv('ret:'+b.code+':tm',D12.ret[b.code].tm);
   return `<tr><td>${esc(b.nom)}</td><td class="small">${esc(b.region)}</td>
     <td><input class="edit" data-ed="geo:ret:${b.code}:p" value="${(p*100).toFixed(1)}"></td>
     <td><input class="edit" data-ed="geo:ret:${b.code}:tm" value="${(tm*100).toFixed(1)}"></td>
     <td class="num">${fk(cb.Retail.a25.net*p)}</td></tr>`;}).join('');
 const mk=(obj,pre,base)=>Object.keys(obj).map(rg=>{const p=gv(pre+rg,obj[rg]);sums[pre.slice(0,3)]+=p;
   return `<tr><td>${esc(rg)}</td><td><input class="edit" data-ed="geo:${pre}${rg}" value="${(p*100).toFixed(1)}"></td>
     <td class="num">${fk(base*p)}</td></tr>`;}).join('');
 const wslRows=mk(D12.wsl,'wsl:',cb.Wholesale.a25.net);
 const ecoRows=mk(D12.eco,'eco:',cb['E-commerce'].a25.net);
 const ck=(v,lbl)=>`<p class="s12-ck">Σ ${lbl} = <b class="${Math.abs(v-1)<0.001?'ok':'ko'}">${fp(v)}</b> (cible 100 %)</p>`;
 const hyp=(k,lbl,mult)=>`<label>${lbl} <input class="edit" data-ed="geo:hyp:${k}" value="${gv('hyp:'+k,D12.hyp[k])*(mult||1)}"></label>`;
 const frq=boutiques().map(b=>`<tr><td>${esc(b.nom)}</td><td><input class="edit" data-ed="geo:frq:${b.code}" value="${gv('frq:'+b.code,D12.frq[b.code])}"></td></tr>`).join('');
 P.innerHTML=`<h2>Données &amp; paramètres</h2>
  <p class="lead">Clés d'allocation géographique et hypothèses logistiques : toute édition recalcule l'onglet Géo & supply chain (et se conserve dans ce navigateur).</p>
  ${window.__s12subnav?window.__s12subnav('s12geo'):''}
  <div class="s12-grid c2">
   ${card('Allocation retail — parts & taux de marge (%)',`<div class="twrap"><table><thead><tr><th>Boutique</th><th>Région</th><th>Part (%)</th><th>Marge (%)</th><th class="num">CA alloué</th></tr></thead><tbody>${retRows}</tbody></table></div>${ck(sums.ret,'parts retail')}`)}
   ${card('Allocation wholesale (%)',`<div class="twrap"><table><thead><tr><th>Région</th><th>Part (%)</th><th class="num">CA alloué</th></tr></thead><tbody>${wslRows}</tbody></table></div>${ck(sums.wsl,'parts wholesale')}`)}
   ${card('Allocation e-commerce (%)',`<div class="twrap"><table><thead><tr><th>Région</th><th>Part (%)</th><th class="num">CA alloué</th></tr></thead><tbody>${ecoRows}</tbody></table></div>${ck(sums.eco,'parts e-commerce')}`)}
   ${card('Hypothèses logistiques & navettes',`<div class="s12-hyp" style="display:flex;flex-direction:column;gap:.45rem">
     ${hyp('kg','Valeur marchandise (€/kg)')} ${hyp('mar','CO₂ maritime (g/t·km)')} ${hyp('rou','CO₂ routier (g/t·km)')}
     ${hyp('nav','CO₂ navette (kg/km)')} ${hyp('def','Distance par défaut (km)')}</div>
    <div class="twrap" style="margin-top:.6rem"><table><thead><tr><th>Navette hub → boutique</th><th>Livraisons / semaine</th></tr></thead><tbody>
     <tr><td>Atelier Bègles → hub</td><td><input class="edit" data-ed="geo:frq:AT" value="${gv('frq:AT',D12.frq.AT)}"></td></tr>${frq}
    </tbody></table></div>`)}
   ${card('P&L boutiques — attributs & paramètre',`<p class="s12-cap">Coûts directs d'exploitation : <label><input class="edit" data-ed="geo:pnl:m2" value="${NF0.format(gv('pnl:m2',120))}" style="width:5em"> €/m²/an</label></p>
    <div class="twrap"><table><thead><tr><th>Boutique</th><th>Surface (m²)</th><th>Loyer (€/an)</th></tr></thead><tbody>
    ${boutiques().map(b=>`<tr><td>${esc(b.nom)}</td>
      <td><input class="edit" data-ed="geo:ag:${b.code}:surf" value="${gv('ag:'+b.code+':surf',(D12.ag[b.code]||{}).surf||0)}"></td>
      <td><input class="edit" data-ed="geo:ag:${b.code}:loyer" value="${NF0.format(gv('ag:'+b.code+':loyer',(D12.ag[b.code]||{}).loyer||0))}"></td></tr>`).join('')}
    </tbody></table></div>`)}
  </div>`;
 P.querySelectorAll('.subnav button').forEach(b=>b.addEventListener('click',()=>{App.donView=b.dataset.v;renderDonnees();}));
}

/* ---------- init & branchements ---------- */
function init(){
 App.filters=App.filters||{}; App.ov=App.ov||{}; App.ov.geo=App.ov.geo||{};
 if(App.filters.xfRegion===undefined)App.filters.xfRegion=null;
 addTab();
 if(!window.__s12wrapRA){window.__s12wrapRA=true;
   const _ra=window.renderAll;
   window.renderAll=function(){_ra.apply(this,arguments);try{renderGeo();}catch(e){console.warn('s12',e);}};}
 if(!window.__s12wrapOE){window.__s12wrapOE=true;
   const _oe=window.onEdit;
   window.onEdit=function(key,raw,input){
     if(/^geo:/.test(key)){
       const v=parseFrLoc(raw); if(v===null){toast('Valeur non reconnue.');return;}
       const k=key.slice(4);
       const pct=/^(ret:.*:(p|tm)|wsl:|eco:|ns:|stk:.*:pb)/.test(k);
       App.ov.geo[k]=pct?v/100:v;
       input.classList.add('dirty'); renderAll(); persist(false); return;
     }
     return _oe.apply(this,arguments);
   };}
 if(!window.__s12wrapRD){window.__s12wrapRD=true;
   const _rd=window.renderDonnees;
   window.renderDonnees=function(){
     if(App.donView==='s12geo'){donGeo();return;}
     _rd.apply(this,arguments);
     const nav=document.querySelector('#panel-donnees .subnav');
     if(nav&&!nav.querySelector('[data-v="s12geo"]')){
       const b=document.createElement('button'); b.dataset.v='s12geo'; b.textContent='Géographie & logistique';
       b.addEventListener('click',()=>{App.donView='s12geo';renderDonnees();}); nav.appendChild(b);}
   };
   window.__s12subnav=function(active){
     const items=[['balance','Balance générale'],['cibles','Cibles & seuils'],['ventes','Ventes'],['paie','Paie'],
      ['absences','Absences'],['mouvements','Mouvements RH'],['salaries','Registre du personnel'],
      ['clients','Clients'],['fournisseurs','Fournisseurs'],['pipeline','Pipeline'],
      ['s6hist','Historique mensuel'],['s6scen','Hypothèses scénarios'],['s12geo','Géographie & logistique']];
     return `<div class="subnav">${items.map(([v,l])=>`<button data-v="${v}" ${v===active?'aria-current="true"':''}>${l}</button>`).join('')}</div>`;
   };}
 try{window.__S12REGIONS=regionAgg().map(r=>r.region);}catch(_){ }
 renderGeo();
}
document.addEventListener('DOMContentLoaded',boot); boot();
})();
