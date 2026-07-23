/* =====================================================================
   Étape 3 — Analyses avancées · Scénarios · Tendances
   Se branche sur l'API interne du cockpit (App, CALC, recompute,
   renderAll, onEdit, persist). N'ajoute que des onglets et panneaux ;
   ne modifie aucun calcul existant.
   ===================================================================== */
(function(){
'use strict';
const S6DATA={"produits": [{"code": "PF-ROB", "lib": "Robes & jupes", "fam": "Femme", "pv": 89, "vol": 54.5, "marge": 0.582, "rota": 3.1}, {"code": "PF-MAI", "lib": "Maille & pulls", "fam": "Femme", "pv": 72, "vol": 49.8, "marge": 0.574, "rota": 2.6}, {"code": "PF-CHE", "lib": "Chemises & blouses", "fam": "Femme", "pv": 65, "vol": 44.1, "marge": 0.568, "rota": 3.4}, {"code": "PF-PAN", "lib": "Pantalons & denim F", "fam": "Femme", "pv": 79, "vol": 50.6, "marge": 0.549, "rota": 2.9}, {"code": "PF-MAN", "lib": "Manteaux & vestes F", "fam": "Femme", "pv": 189, "vol": 31.8, "marge": 0.601, "rota": 1.4}, {"code": "PH-CHE", "lib": "Chemises homme", "fam": "Homme", "pv": 69, "vol": 36.8, "marge": 0.538, "rota": 2.8}, {"code": "PH-PAN", "lib": "Pantalons & denim H", "fam": "Homme", "pv": 82, "vol": 34.7, "marge": 0.526, "rota": 2.7}, {"code": "PH-MAI", "lib": "Maille homme", "fam": "Homme", "pv": 75, "vol": 29.6, "marge": 0.531, "rota": 2.2}, {"code": "PH-VES", "lib": "Vestes & manteaux H", "fam": "Homme", "pv": 205, "vol": 20.4, "marge": 0.556, "rota": 1.3}, {"code": "PA-MAR", "lib": "Maroquinerie", "fam": "Accessoires", "pv": 115, "vol": 14.8, "marge": 0.635, "rota": 2.4}, {"code": "PA-CEI", "lib": "Ceintures & petite maro.", "fam": "Accessoires", "pv": 45, "vol": 17.6, "marge": 0.612, "rota": 3}, {"code": "PA-FOU", "lib": "Foulards & bonnets", "fam": "Accessoires", "pv": 35, "vol": 23.1, "marge": 0.604, "rota": 3.8}, {"code": "PA-BIJ", "lib": "Bijoux fantaisie", "fam": "Accessoires", "pv": 28, "vol": 16.4, "marge": 0.648, "rota": 4.1}, {"code": "PC-CAP", "lib": "Capsule lin Aquitaine", "fam": "Femme", "pv": 95, "vol": 6.2, "marge": 0.495, "rota": 2}, {"code": "PS-RET", "lib": "Retouches & services", "fam": "Services", "pv": 24, "vol": null, "marge": 0.71, "rota": null}], "histV": {"y2023": [1324000, 1314000, 1411000, 1242000, 1060000, 1274000, 1357000, 1281000, 1804000, 1557000, 1235000, 1741000], "y2024": [1475000, 1420000, 1414000, 1261000, 1084000, 1369000, 1390000, 1325000, 1918000, 1575000, 1276000, 1793000], "mix": {"2023": [0.595, 0.283, 0.122], "2024": [0.592, 0.278, 0.13]}}};

/* ---------- attente que le cockpit soit prêt ---------- */
function ready(){return (typeof App!=='undefined')&&App.C&&App.C.sc&&App.C.att&&App.st&&(typeof Chart!=='undefined');}
function boot(){ if(!ready())return setTimeout(boot,120); init(); }
document.addEventListener('DOMContentLoaded',boot); boot();

/* ---------- formats & palette ---------- */
const NF0=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const NF1=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
const fk=v=>NF0.format(Math.round(v/1000))+' k€';
const fe=v=>NF0.format(Math.round(v))+' €';
const fx=v=>NF1.format(v)+'x';
const fp=(v,d)=>new Intl.NumberFormat('fr-FR',{style:'percent',minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d}).format(v);
const fi=v=>NF1.format(v);
const COL={navy:'#1F3864',chalk:'#2456A6',green:'#1F7145',red:'#B3261E',amber:'#B26A00',orange:'#C2611E',purple:'#6B4FA3',teal:'#2E8B8B',grey:'#8A94A0',
  gsoft:'rgba(31,113,69,.16)',rsoft:'rgba(179,38,30,.16)',csoft:'rgba(36,86,166,.14)'};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kpi=(l,v,s)=>`<div class="kpi"><div class="lab">${l}</div><div class="val num">${v}</div>${s?`<div class="sub">${esc(s)}</div>`:''}</div>`;
const card=(t,inner,extra)=>`<div class="card ${extra||''}">${t?`<h3>${t}</h3>`:''}${inner}</div>`;
const parseFrLoc=raw=>{const v=parseFloat(String(raw).replace(/[^\d.,-]/g,'').replace(/\s/g,'').replace(',','.'));return isNaN(v)?null:v;};

/* ---------- période helpers ---------- */
const in25=m=>m<'2026-01', inS125=m=>m>='2025-01'&&m<='2025-06', inS126=m=>m>='2026-01'&&m<='2026-06';
const MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

/* ---------- chart util : (re)crée et enregistre dans App.charts ---------- */
function mkChart(id,cfg){
  const el=document.getElementById(id); if(!el)return;
  if(App.charts[id]){try{App.charts[id].destroy();}catch(_){}}
  cfg.options=cfg.options||{}; cfg.options.responsive=true; cfg.options.maintainAspectRatio=false;
  cfg.options.animation={duration:260};
  cfg.options.font=cfg.options.font||{family:'system-ui,Segoe UI,Roboto,Arial,sans-serif'};
  try{App.charts[id]=new Chart(el.getContext('2d'),cfg);}catch(e){console.warn('s6 chart',id,e);}
}
const gridY={grid:{color:'rgba(30,40,51,.07)'},ticks:{font:{size:10},callback:v=>NF0.format(v)}};
const axK={grid:{color:'rgba(30,40,51,.07)'},ticks:{font:{size:10},callback:v=>NF0.format(v/1000)+'k'}};

/* ==========================================================
   1) ANALYSES : Pareto/ABC · Prix-Volume-Mix · Cascades
   ========================================================== */
function pareto(items){
  const s=items.filter(x=>x.val>0).sort((a,b)=>b.val-a.val);
  const tot=s.reduce((a,x)=>a+x.val,0)||1; let cum=0;
  return s.map(x=>{cum+=x.val;const cp=cum/tot;return{lib:x.lib,fam:x.fam,val:x.val,part:x.val/tot,cumul:cp,cls:cp<=0.8?'A':cp<=0.95?'B':'C'};});
}
function paretoData(axis){
  const st=App.st;
  var rg=App.filters.xfRegion;
  if(axis==='clients')return pareto((st.clients||[]).filter(c=>!rg||rg.has(c[11])).map(c=>({lib:c[1],fam:c[11]||c[3],val:(c[4]||0)*1000})));
  if(axis==='fournisseurs')return pareto((st.fournisseurs||[]).map(f=>({lib:f[1],fam:f[2],val:(f[4]||0)*1000})));
  var ff=App.filters.com&&App.filters.com.fa;
  return pareto(((App.base.produits||st.produits||[])).filter(p=>!ff||ff.has(p.fam)).map(p=>({lib:p.lib,fam:p.fam,val:p.pv*p.vol*1000})));
}
function renderPareto(host){
  const axis=(App.filters.s6par||'produits');
  const rows=paretoData(axis);
  const nA=rows.filter(r=>r.cls==='A').length, partA=rows.filter(r=>r.cls==='A').reduce((a,r)=>a+r.part,0);
  const top=rows[0]||{lib:'—',part:0};
  const chips=[['produits','Produits'],['clients','Clients'],['fournisseurs','Fournisseurs']]
    .map(([k,l])=>`<button data-s6par="${k}" aria-pressed="${k===axis}">${l}</button>`).join('');
  const kpis=`<div class="s6-grid k4">
    ${kpi('Items classe A',nA,'≤ 80 % de la valeur')}
    ${kpi('Poids classe A',fp(partA),'concentration du haut de portefeuille')}
    ${kpi('1<sup>er</sup> contributeur',fp(top.part),esc(top.lib))}
    ${kpi('Nombre d’items',rows.length,axis)}</div>`;
  const trs=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.lib)}</td><td class="small">${esc(r.fam||'')}</td>
    <td class="num">${fk(r.val)}</td><td class="num">${fp(r.part)}</td><td class="num">${fp(r.cumul)}</td>
    <td><span class="s6-tag ${r.cls}">${r.cls}</span></td></tr>`).join('');
  const table=`<div class="twrap"><table><thead><tr><th>Rang</th><th>Libellé</th><th>Famille / zone</th>
    <th class="num">Valeur</th><th class="num">Part</th><th class="num">Part cumulée</th><th>Classe</th></tr></thead>
    <tbody>${trs}</tbody></table></div>`;
  host.innerHTML=`<div class="s6-sub">${chips}</div>${kpis}
    ${card('Courbe de Pareto — '+axis,'<div class="s6-chartwrap"><canvas id="s6-pareto-cv"></canvas></div>')}
    ${card('Classement ABC',table)}`;
  host.querySelectorAll('[data-s6par]').forEach(b=>b.onclick=()=>{App.filters.s6par=b.dataset.s6par;renderPareto(host);});
  const labels=rows.map(r=>r.lib.length>16?r.lib.slice(0,15)+'…':r.lib);
  const cols=rows.map(r=>r.cls==='A'?COL.green:r.cls==='B'?COL.amber:COL.grey);
  mkChart('s6-pareto-cv',{data:{labels,datasets:[
      {type:'bar',label:'Valeur (€)',data:rows.map(r=>r.val),backgroundColor:cols,order:2,yAxisID:'y'},
      {type:'line',label:'Part cumulée',data:rows.map(r=>r.cumul*100),borderColor:COL.navy,backgroundColor:COL.navy,
       pointRadius:2,borderWidth:2,tension:.25,order:1,yAxisID:'y1'}]},
    options:{plugins:{legend:{labels:{font:{size:11},boxWidth:12}}},
      scales:{y:axK,y1:{position:'right',min:0,max:100,grid:{drawOnChartArea:false},ticks:{font:{size:10},callback:v=>v+'%'}},
        x:{ticks:{font:{size:9},maxRotation:60,minRotation:40}}}}});
}

/* ----- Prix / Volume / Mix ----- */
function pvm(){
  const st=App.st, cf=App.filters.com&&App.filters.com.ca, ff=App.filters.com&&App.filters.com.fa;
  const F=(ff?[...ff]:['Femme','Homme','Accessoires']);
  const agg=(fam,per,f)=>st.ventes.filter(v=>v.fa===fam&&per(v.m)&&(!cf||cf.has(v.ca))).reduce((a,v)=>a+(f==='q'?v.q:(v.b-v.r)),0);
  const rows=F.map(fam=>{
    const q0=agg(fam,inS125,'q'),q1=agg(fam,inS126,'q'),ca0=agg(fam,inS125,'n'),ca1=agg(fam,inS126,'n');
    const p0=q0?ca0/q0:0,p1=q1?ca1/q1:0;
    return{fam,q0,q1,ca0,ca1,vol:(q1-q0)*p0,prix:(p1-p0)*q1,dca:ca1-ca0};
  });
  const T=rows.reduce((a,r)=>({q0:a.q0+r.q0,q1:a.q1+r.q1,ca0:a.ca0+r.ca0,ca1:a.ca1+r.ca1,vol:a.vol+r.vol,prix:a.prix+r.prix,dca:a.dca+r.dca}),{q0:0,q1:0,ca0:0,ca1:0,vol:0,prix:0,dca:0});
  const pMg0=T.q0?T.ca0/T.q0:0; const volPur=(T.q1-T.q0)*pMg0; const mix=T.vol-volPur; const prix=T.prix;
  return{rows,T,volPur,mix,prix,dca:T.dca};
}
function renderPVM(host){
  const d=pvm();
  const kpis=`<div class="s6-grid k4">
    ${kpi('Δ CA S1-25 → S1-26',fk(d.dca),(d.dca>=0?'+':'')+fp(d.dca/d.T.ca0))}
    ${kpi('Effet volume pur',fk(d.volPur),'à mix constant')}
    ${kpi('Effet mix',fk(d.mix),'déformation du panier')}
    ${kpi('Effet prix',fk(d.prix),'prix moyen net')}</div>`;
  const trs=d.rows.map(r=>`<tr><td>${r.fam}</td><td class="num">${NF0.format(r.q0)}</td><td class="num">${NF0.format(r.q1)}</td>
    <td class="num">${fk(r.ca0)}</td><td class="num">${fk(r.ca1)}</td>
    <td class="num s6-delta ${r.vol>=0?'pos':'neg'}">${fk(r.vol)}</td>
    <td class="num s6-delta ${r.prix>=0?'pos':'neg'}">${fk(r.prix)}</td>
    <td class="num">${fk(r.dca)}</td></tr>`).join('');
  const table=`<div class="twrap"><table><thead><tr><th>Famille</th><th class="num">Q S1-25</th><th class="num">Q S1-26</th>
    <th class="num">CA S1-25</th><th class="num">CA S1-26</th><th class="num">Effet volume</th><th class="num">Effet prix</th><th class="num">Δ CA</th></tr></thead>
    <tbody>${trs}</tbody></table></div>`;
  host.innerHTML=`${kpis}
    ${card('Décomposition Prix / Volume / Mix','<div class="s6-chartwrap"><canvas id="s6-pvm-cv"></canvas></div>')}
    ${card('Détail par famille',table)}`;
  // waterfall CA0 -> volPur -> mix -> prix -> CA1
  const steps=[['CA S1-25',d.T.ca0,'lvl'],['Volume pur',d.volPur,'f'],['Mix',d.mix,'f'],['Prix',d.prix,'f'],['CA S1-26',d.T.ca1,'lvl']];
  wfChart('s6-pvm-cv',steps);
}

/* ----- Cascades (waterfall) : util générique ----- */
function wfChart(id,steps){
  // steps: [label, value, 'lvl'|'f']  ; 'lvl' = barre pleine depuis 0
  let run=0; const bars=[],cols=[],labels=[];
  steps.forEach(([lab,val,typ])=>{
    labels.push(lab);
    if(typ==='lvl'){bars.push([0,val]);cols.push(COL.navy);run=val;}
    else{const start=run;run+=val;bars.push([start,run]);cols.push(val>=0?COL.green:COL.red);}
  });
  mkChart(id,{type:'bar',data:{labels,datasets:[{data:bars,backgroundColor:cols,borderWidth:0,barPercentage:.72}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>{const a=c.raw;return fk(a[1]-a[0]);}}}},
      scales:{y:axK,x:{ticks:{font:{size:10}}}}}});
}
function renderCascades(host){
  const s=App.C.s25, fl=App.C.fl;
  host.innerHTML=`<p class="s6-cap">Cascades reconstituées à partir des états recalculés — sensibles à toute édition de la balance.</p>
    <div class="s6-grid c2">
    ${card('Résultat 2025 : EBE → Résultat net','<div class="s6-chartwrap"><canvas id="s6-wf-res"></canvas></div>')}
    ${card('Trésorerie 2025 : ouverture → clôture (OEC)','<div class="s6-chartwrap"><canvas id="s6-wf-tre"></canvas></div>')}
    </div>`;
  wfChart('s6-wf-res',[['EBE',s.ebe,'lvl'],['+ Reprises',s.repr||0,'f'],['− Dotations',-(s.dot||0),'f'],
    ['− Autres ch.',-(s.achx||0),'f'],['REX',s.rex,'lvl'],['+ Rés. fin.',s.rf||0,'f'],['RCAI',s.rcai,'lvl'],
    ['+ Except.',s.rexc||0,'f'],['− IS',-(s.pis||0),'f'],['Rés. net',s.rn,'lvl']]);
  wfChart('s6-wf-tre',[['Ouverture',fl.ouv,'lvl'],['+ CAF',fl.caf,'f'],['± Stocks',fl.dStk,'f'],['± Créances',fl.dCre,'f'],
    ['± Dettes',fl.dDet,'f'],['− Invest.',fl.B,'f'],['± Financ.',fl.C,'f'],['Clôture',fl.clo,'lvl']]);
}

function renderAnalyses(){
  const P=document.getElementById('panel-analyses'); if(!P)return;
  const view=App.filters.s6ana||'pareto';
  P.innerHTML=`<h2>Analyses avancées</h2>
    <p class="lead">Concentration (Pareto/ABC), décomposition prix-volume-mix du chiffre d’affaires et cascades de résultat et de trésorerie. Tout est recalculé à partir des données du cockpit ; les éditions de la balance se répercutent ici.</p>
    <div class="s6-sub" id="s6-ana-nav">
      ${[['pareto','Pareto / ABC'],['pvm','Prix · Volume · Mix'],['cascades','Cascades']]
        .map(([k,l])=>`<button data-s6ana="${k}" aria-pressed="${k===view}">${l}</button>`).join('')}
    </div><div id="s6-ana-body"></div>`;
  P.querySelectorAll('[data-s6ana]').forEach(b=>b.onclick=()=>{App.filters.s6ana=b.dataset.s6ana;renderAnalyses();});
  const body=document.getElementById('s6-ana-body');
  if(view==='pareto')renderPareto(body); else if(view==='pvm')renderPVM(body); else renderCascades(body);
}

/* ==========================================================
   2) SCÉNARIOS
   ========================================================== */
const SCEN=[['croi','Croissance du CA','%',[-0.08,0.03,0.08]],
  ['marge','Variation taux de marge','pts',[-0.015,0,0.01]],
  ['pers','Évolution charges de personnel','%',[0.05,0.025,0.015]],
  ['inter','Évolution intérim','%',[0.25,0,-0.35]],
  ['chext','Évolution charges externes','%',[0.06,0.02,0]],
  ['bfrj','BFR cible','jours',[92,80,70]],
  ['inv','Investissements','€',[250000,400000,550000]],
  ['fin','Financement net','€',[-300000,0,250000]],
  ['etp','Variation effectif','ETP',[-4,0,3]]];
const SCOLS=['stress','central','optim'];
function scenVal(drv,ci){const o=App.ov.scen&&App.ov.scen[drv+':'+ci];return o!=null?o:SCEN.find(s=>s[0]===drv)[3][ci];}
function scenBase(){
  const a=App.C.att.attT, b=App.C.b25;
  const bfrjRow=(App.C.sc.rows.find(r=>r.code==='TRE_BFRJ')||{}).val;
  return{ca:a.ca,txm:a.marge/a.ca,ap:a.ap,pers:a.pers,inte:a.inte,
    chext:(a.loy+a.mkt+a.fret+a.ace),imp:a.imp,dot:a.dot,rf:a.rf,
    cp:b.cp,dn:b.dfn,tr:(App.C.t26&&App.C.t26.tn0626)||-560000,
    bfrj:bfrjRow||79.86,cbc:800000,etp:88.1};
}
function projScenario(ci,B){
  const g=d=>scenVal(d,ci);
  const ca=B.ca*(1+g('croi')), txm=B.txm+g('marge'), marge=ca*txm;
  const pers=B.pers*(1+g('pers')), inte=B.inte*(1+g('inter')), chext=B.chext*(1+g('chext')), imp=B.imp*(1+g('croi'));
  const ebe=marge+B.ap-pers-inte-chext-imp, dot=B.dot, rex=ebe-dot, rcai=rex+B.rf;
  const is=rcai>0?rcai*0.25:0, rn=rcai-is, caf=rn+dot;
  const bfr=ca/365*g('bfrj'), bfrBase=B.ca/365*B.bfrj, dBfr=bfr-bfrBase;
  const treso=B.tr+caf-dBfr-g('inv')+g('fin');
  const cp=B.cp+rn, dn=B.dn-(treso-B.tr), gearing=cp?dn/cp:0, dnCaf=caf?dn/caf:0;
  const etp=B.etp+g('etp'), msCa=ca?pers/ca:0;
  const net=treso-B.tr, burn=net<0?-net/12:0, runway=burn<=0?99:Math.min(99,(treso+B.cbc)/burn);
  return{ca,txm,marge,pers,inte,chext,imp,ebe,rex,rcai,rn,caf,bfr,treso,cp,dn,gearing,dnCaf,etp,msCa,runway};
}
function renderScenarios(){
  const P=document.getElementById('panel-scenarios'); if(!P)return;
  const B=scenBase(); const pr=SCOLS.map((_,i)=>projScenario(i,B));
  const clsN=['stress','central','optim'];
  // hypothèses éditables
  const hypRows=SCEN.map(([drv,lab,unit,def])=>{
    const cells=SCOLS.map((_,ci)=>{const val=scenVal(drv,ci);
      const isPct=unit==='%'||unit==='pts'; const disp=isPct?(val*100).toFixed(unit==='pts'?1:1):NF0.format(val);
      const dirty=App.ov.scen&&App.ov.scen[drv+':'+ci]!=null;
      return `<td class="${clsN[ci]}"><input class="edit${dirty?' dirty':''}" data-ed="scen:${drv}:${ci}" value="${disp}" aria-label="${esc(lab)} ${SCOLS[ci]}"></td>`;}).join('');
    return `<tr><td>${lab} <span class="small">(${unit})</span></td>${cells}</tr>`;
  }).join('');
  const hypTable=`<div class="twrap"><table class="s6-scen"><thead><tr><th>Levier</th>
    <th class="stress">Stress</th><th class="central">Central</th><th class="optim">Optimiste</th></tr></thead>
    <tbody>${hypRows}</tbody></table></div>
    <p class="s6-cap">Cellules éditables : toute modification recalcule instantanément la projection et se conserve dans ce navigateur.</p>`;
  // projection
  const line=(lab,f,fmt,lvl)=>`<tr class="${lvl?'lvl':''}"><td>${lab}</td>`+
    pr.map((p,ci)=>`<td class="${clsN[ci]} num">${fmt(f(p))}</td>`).join('')+`</tr>`;
  const projTable=`<div class="twrap"><table class="s6-scen"><thead><tr><th>Indicateur projeté (N+1)</th>
    <th class="stress">Stress</th><th class="central">Central</th><th class="optim">Optimiste</th></tr></thead><tbody>
    ${line('Chiffre d’affaires',p=>p.ca,fk)}
    ${line('Marge commerciale',p=>p.marge,fk)}
    ${line('EBE',p=>p.ebe,fk,true)}
    ${line('Taux d’EBE',p=>p.ca?p.ebe/p.ca:0,v=>fp(v))}
    ${line('Résultat net',p=>p.rn,fk,true)}
    ${line('CAF',p=>p.caf,fk)}
    ${line('Trésorerie fin de période',p=>p.treso,fk,true)}
    ${line('BFR',p=>p.bfr,fk)}
    ${line('Gearing (dette nette / CP)',p=>p.gearing,fx)}
    ${line('Dette nette / CAF (ans)',p=>p.dnCaf,fi)}
    ${line('Effectif ETP',p=>p.etp,fi)}
    ${line('Runway (mois)',p=>p.runway,v=>v>=99?'≥ 99':fi(v),true)}
    </tbody></table></div>`;
  // sensibilités (base central)
  const C=pr[1];
  const sens=[['+1 % de CA',B.ca*0.01*C.txm],['+1 pt de marge',C.ca*0.01],['−5 j de BFR',C.ca/365*5],['+10 % d’intérim',-B.inte*0.10]];
  const sensTable=`<div class="twrap"><table><thead><tr><th>Choc unitaire</th><th class="num">Impact (€)</th></tr></thead>
    <tbody>${sens.map(([l,v])=>`<tr><td>${l}</td><td class="num s6-delta ${v>=0?'pos':'neg'}">${fk(v)}</td></tr>`).join('')}</tbody></table></div>`;
  // narratif
  const st=pr[0],cen=pr[1],op=pr[2];
  const nWarn=cen.treso<0||cen.rn<0;
  const narr=`<div class="s6-note ${nWarn?'warn':''}">Dans le scénario <b>central</b>, l’EBE ressort à <b>${fk(cen.ebe)}</b> et la trésorerie de fin de période à <b>${fk(cen.treso)}</b> (runway ${cen.runway>=99?'≥ 99':fi(cen.runway)+' mois'}).
    Le scénario <b>stress</b> dégrade la trésorerie à ${fk(st.treso)} et porte le gearing à ${fx(st.gearing)} ; le scénario <b>optimiste</b> restaure un résultat net de ${fk(op.rn)}.
    L’écart de trésorerie stress ↔ optimiste atteint <b>${fk(op.treso-st.treso)}</b> — mesure de l’enjeu de pilotage.</div>`;
  P.innerHTML=`<h2>Scénarios — Stress · Central · Optimiste</h2>
    <p class="lead">Moteur piloté par hypothèses appliquées simultanément au compte de résultat, au BFR, à la trésorerie, au gearing et aux effectifs. Base : atterrissage 2026 recalculé. Ajustez les hypothèses et la projection suit.</p>
    <div class="s6-leg"><span><i style="background:${COL.red}"></i>Stress</span><span><i style="background:${COL.chalk}"></i>Central</span><span><i style="background:${COL.green}"></i>Optimiste</span></div>
    ${card('Hypothèses par scénario',hypTable)}
    <div class="s6-grid c2">${card('Comparaison EBE · Résultat net · Trésorerie','<div class="s6-chartwrap"><canvas id="s6-scen-cv"></canvas></div>')}
      ${card('Sensibilités (base central)',sensTable)}</div>
    ${card('Projection détaillée',projTable)}
    ${narr}`;
  mkChart('s6-scen-cv',{type:'bar',data:{labels:['EBE','Résultat net','Trésorerie fin'],datasets:[
      {label:'Stress',data:[st.ebe,st.rn,st.treso],backgroundColor:COL.red},
      {label:'Central',data:[cen.ebe,cen.rn,cen.treso],backgroundColor:COL.chalk},
      {label:'Optimiste',data:[op.ebe,op.rn,op.treso],backgroundColor:COL.green}]},
    options:{plugins:{legend:{labels:{font:{size:11},boxWidth:12}}},scales:{y:axK,x:{ticks:{font:{size:11}}}}}});
}

/* ==========================================================
   3) TENDANCES : saisonnalité 3 ans · historisation · prévision
   ========================================================== */
function monthly25(){const a=Array(12).fill(0);App.st.ventes.forEach(v=>{if(in25(v.m)){const mo=+v.m.slice(5,7)-1;a[mo]+=v.b-v.r;}});return a;}
function histSeries(){
  const base=App.base.histV||{y2023:[],y2024:[]};
  const ov=App.ov.histv||{};
  const rd=(y,i)=>{const k=y+':'+i;return ov[k]!=null?ov[k]:(base['y'+y]?base['y'+y][i]:0);};
  const y23=Array.from({length:12},(_,i)=>rd(2023,i));
  const y24=Array.from({length:12},(_,i)=>rd(2024,i));
  const y25=monthly25();
  return{y23,y24,y25};
}
function seasonIdx(arr){const avg=arr.reduce((a,b)=>a+b,0)/12||1;return arr.map(v=>v/avg);}
function renderTendances(){
  const P=document.getElementById('panel-tendances'); if(!P)return;
  const view=App.filters.s6tend||'saison';
  P.innerHTML=`<h2>Tendances pluriannuelles</h2>
    <p class="lead">Saisonnalité fondée sur trois exercices (2023-2025), prévision lissée par indice saisonnier moyen, et historisation annuelle avec détection d’anomalie. L’historique 2023-2024 est éditable ci-dessous.</p>
    <div class="s6-sub">${[['saison','Saisonnalité 3 ans'],['prev','Prévision 2026'],['hist','Historisation & anomalies'],['edit','Éditer l’historique']]
      .map(([k,l])=>`<button data-s6tend="${k}" aria-pressed="${k===view}">${l}</button>`).join('')}</div>
    <div id="s6-tend-body"></div>`;
  P.querySelectorAll('[data-s6tend]').forEach(b=>b.onclick=()=>{App.filters.s6tend=b.dataset.s6tend;renderTendances();});
  const body=document.getElementById('s6-tend-body');
  const H=histSeries();
  if(view==='saison')tendSaison(body,H);
  else if(view==='prev')tendPrev(body,H);
  else if(view==='hist')tendHist(body);
  else tendEdit(body,H);
}
function tendSaison(host,H){
  const i23=seasonIdx(H.y23),i24=seasonIdx(H.y24),i25=seasonIdx(H.y25);
  const moy=MOIS.map((_,i)=>(i23[i]+i24[i]+i25[i])/3);
  const mn=MOIS.map((_,i)=>Math.min(i23[i],i24[i],i25[i])), mx=MOIS.map((_,i)=>Math.max(i23[i],i24[i],i25[i]));
  const pk=moy.indexOf(Math.max(...moy)), cr=moy.indexOf(Math.min(...moy));
  host.innerHTML=`<div class="s6-grid k4">
    ${kpi('Pic saisonnier',MOIS[pk],'indice '+fi(moy[pk]))}
    ${kpi('Creux saisonnier',MOIS[cr],'indice '+fi(moy[cr]))}
    ${kpi('Amplitude',fp(moy[pk]-moy[cr]),'pic − creux')}
    ${kpi('CA 2023 → 2025',fp(Math.pow(H.y25.reduce((a,b)=>a+b,0)/(H.y23.reduce((a,b)=>a+b,0)||1),.5)-1),'CAGR annuel')}</div>
    ${card('Indice saisonnier par exercice & bande min-max','<div class="s6-chartwrap tall"><canvas id="s6-seas-cv"></canvas></div>')}`;
  mkChart('s6-seas-cv',{data:{labels:MOIS,datasets:[
      {type:'line',label:'Max',data:mx,borderColor:'transparent',backgroundColor:COL.csoft,fill:'+1',pointRadius:0,order:5},
      {type:'line',label:'Min',data:mn,borderColor:'transparent',backgroundColor:COL.csoft,fill:false,pointRadius:0,order:5},
      {type:'line',label:'2023',data:i23,borderColor:COL.grey,borderWidth:1.5,pointRadius:0,tension:.3},
      {type:'line',label:'2024',data:i24,borderColor:COL.amber,borderWidth:1.5,pointRadius:0,tension:.3},
      {type:'line',label:'2025',data:i25,borderColor:COL.chalk,borderWidth:1.5,pointRadius:0,tension:.3},
      {type:'line',label:'Moyenne 3 ans',data:moy,borderColor:COL.navy,borderWidth:2.6,pointRadius:2,tension:.3}]},
    options:{plugins:{legend:{labels:{font:{size:10},boxWidth:12,filter:l=>l.text!=='Min'}}},
      scales:{y:{...gridY,ticks:{font:{size:10},callback:v=>fi(v)}},x:{ticks:{font:{size:10}}}}}});
}
function tendPrev(host,H){
  const i23=seasonIdx(H.y23),i24=seasonIdx(H.y24),i25=seasonIdx(H.y25);
  const idx=MOIS.map((_,i)=>(i23[i]+i24[i]+i25[i])/3);
  const t25=H.y25.reduce((a,b)=>a+b,0),t23=H.y23.reduce((a,b)=>a+b,0);
  const cagr=Math.pow(t25/(t23||1),.5)-1; const proj=t25*(1+cagr);
  const prev=idx.map(ix=>proj/12*ix);
  const bud=(App.st.bud26&&App.st.bud26.ca)?App.st.bud26.ca.map(x=>x*1000):Array(12).fill(proj/12);
  const tot=v=>v.reduce((a,b)=>a+b,0);
  host.innerHTML=`<div class="s6-grid k4">
    ${kpi('Projection CA 2026',fk(proj),'2025 × (1+CAGR)')}
    ${kpi('CAGR 2023-2025',fp(cagr),'croissance annuelle')}
    ${kpi('Total budget 2026',fk(tot(bud)),'référence')}
    ${kpi('Écart prévision / budget',fk(proj-tot(bud)),(proj-tot(bud)>=0?'au-dessus':'en-dessous'))}</div>
    ${card('Prévision mensuelle 2026 (base 3 ans) vs budget','<div class="s6-chartwrap tall"><canvas id="s6-prev-cv"></canvas></div>')}`;
  mkChart('s6-prev-cv',{data:{labels:MOIS,datasets:[
      {type:'bar',label:'Budget 2026',data:bud,backgroundColor:COL.csoft,borderColor:COL.chalk,borderWidth:1},
      {type:'line',label:'Prévision 3 ans',data:prev,borderColor:COL.navy,borderWidth:2.4,pointRadius:2,tension:.25}]},
    options:{plugins:{legend:{labels:{font:{size:11},boxWidth:12}}},scales:{y:axK,x:{ticks:{font:{size:10}}}}}});
}
function tendHist(host){
  // historisation annuelle : 2023-2024 fictifs (CA depuis histV) + 2025/2026 du modèle
  const H=histSeries(); const C=App.C;
  const ca23=H.y23.reduce((a,b)=>a+b,0),ca24=H.y24.reduce((a,b)=>a+b,0),ca25=C.s25.ca,ca26=C.att.attT.ca;
  const met=[
    ['CA net',[ca23,ca24,ca25,ca26],fk],
    ['EBE',[ca23*0.069,ca24*0.041,C.s25.ebe,C.att.attT.ebe],fk],
    ['Résultat net',[380000,40000,C.s25.rn,C.att.attT.rcai],fk],
    ['Taux de marge',[0.580,0.563,C.s25.mc/C.s25.ca,C.att.attT.marge/C.att.attT.ca],v=>fp(v)],
  ];
  const yr=[2023,2024,2025,2026];
  const rows=met.map(([lab,vals,fmt])=>{
    const mean=(vals[0]+vals[1]+vals[2])/3, sd=Math.sqrt(vals.slice(0,4).reduce((a,v)=>a+(v-vals.reduce((x,y)=>x+y,0)/4)**2,0)/4);
    const z=sd?Math.abs(vals[3]-mean)/sd:0; const anom=z>1;
    const cagr=vals[0]>0?Math.pow(vals[3]/vals[0],1/3)-1:null;
    return `<tr><td>${lab}</td>${vals.map(v=>`<td class="num">${fmt(v)}</td>`).join('')}
      <td class="num">${cagr==null?'—':fp(cagr)}</td>
      <td class="num s6-anom ${anom?'warn':'ok'}">${anom?'⚠':'ok'}</td></tr>`;
  }).join('');
  host.innerHTML=card('Historisation annuelle & détection d’anomalie',
    `<div class="twrap"><table><thead><tr><th>Indicateur</th>${yr.map(y=>`<th class="num">${y}</th>`).join('')}
     <th class="num">CAGR</th><th class="num">Anomalie</th></tr></thead><tbody>${rows}</tbody></table></div>
     <p class="s6-cap">⚠ = valeur 2026 s’écartant de plus d’un écart-type de la moyenne. 2023-2024 : historique de démonstration (éditable). 2025-2026 : issus du modèle.</p>`)
    +card('Trajectoire du CA net','<div class="s6-chartwrap short"><canvas id="s6-hist-cv"></canvas></div>');
  mkChart('s6-hist-cv',{data:{labels:yr.map(String),datasets:[{type:'bar',label:'CA net',data:[ca23,ca24,ca25,ca26],
      backgroundColor:[COL.grey,COL.grey,COL.chalk,COL.navy]}]},
    options:{plugins:{legend:{display:false}},scales:{y:axK,x:{ticks:{font:{size:11}}}}}});
}
function tendEdit(host,H){
  const base=App.base.histV||{}; const ov=App.ov.histv||{};
  const cell=(y,i)=>{const k=y+':'+i;const val=ov[k]!=null?ov[k]:(base['y'+y]?base['y'+y][i]:0);
    return `<td><input class="edit${ov[k]!=null?' dirty':''}" data-ed="histv:${y}:${i}" value="${NF0.format(val)}" aria-label="CA ${MOIS[i]} ${y}"></td>`;};
  const rows=MOIS.map((mn,i)=>`<tr><td>${mn}</td>${cell(2023,i)}${cell(2024,i)}<td class="num small">${fk(H.y25[i])}</td></tr>`).join('');
  host.innerHTML=card('Éditer l’historique mensuel (CA net marchandises)',
    `<div class="twrap"><table><thead><tr><th>Mois</th><th class="num">2023 (€)</th><th class="num">2024 (€)</th><th class="num">2025 (lié)</th></tr></thead>
     <tbody>${rows}</tbody></table></div>
     <p class="s6-cap">2023-2024 éditables (jaune) ; 2025 est lié aux ventes réelles. Remplacez par vos historiques : saisonnalité, prévision et anomalies se recalculent partout.</p>`);
}

/* ==========================================================
   Intégration : onglets, hooks d'édition, onglet Données
   ========================================================== */
function addTabsAndPanels(){
  const NEW=[['analyses','Analyses','#6B4FA3'],['scenarios','Scénarios','#B3261E'],['tendances','Tendances','#1F7145']];
  const main=document.getElementById('main')||document.querySelector('main')||document.querySelector('.panel').parentNode;
  const donPanel=document.getElementById('panel-donnees');
  NEW.forEach(([k,l,c])=>{
    if(!document.getElementById('panel-'+k)){
      const s=document.createElement('section'); s.className='panel'; s.id='panel-'+k; s.setAttribute('role','tabpanel');
      s.setAttribute('aria-labelledby','tab-'+k); s.style.setProperty('--tabc',c);
      main.insertBefore(s,donPanel||null);
    }
  });
  // insère les boutons d'onglet avant "Données"
  const nav=document.getElementById('tabs');
  const donTab=document.getElementById('tab-donnees');
  NEW.forEach(([k,l,c])=>{
    if(!document.getElementById('tab-'+k)){
      const b=document.createElement('button'); b.setAttribute('role','tab'); b.id='tab-'+k;
      b.setAttribute('aria-controls','panel-'+k); b.setAttribute('aria-selected','false'); b.tabIndex=-1;
      b.style.setProperty('--tabc',c); b.textContent=l;
      b.addEventListener('click',()=>selectTab(k));
      nav.insertBefore(b,donTab||null);
    }
  });
}
const S6IDS=['s6-pareto-cv','s6-pvm-cv','s6-wf-res','s6-wf-tre','s6-scen-cv','s6-seas-cv','s6-prev-cv','s6-hist-cv'];
function s6ClearCharts(){S6IDS.forEach(id=>{if(App.charts[id]){try{App.charts[id].destroy();}catch(_){}delete App.charts[id];}});}
function renderS6(){s6ClearCharts();renderAnalyses();renderScenarios();renderTendances();}

function init(){
  App.filters=App.filters||{};
  App.ov=App.ov||{}; App.ov.scen=App.ov.scen||{}; App.ov.histv=App.ov.histv||{};
  (function(){function ap(o){if(o)for(var k in S6DATA)o[k]=S6DATA[k];}
   if(typeof window.DATA!=='undefined')ap(window.DATA);ap(App.base);ap(App.st);})();
  addTabsAndPanels();

  // wrap renderAll -> re-render nos panneaux à chaque recompute/édition
  if(!window.__s6wrapRA){window.__s6wrapRA=true;
    const _ra=window.renderAll;
    window.renderAll=function(){_ra.apply(this,arguments);try{renderS6();}catch(e){console.warn('s6 render',e);}};
  }
  // wrap onEdit -> gère nos clés scen: et histv:
  if(!window.__s6wrapOE){window.__s6wrapOE=true;
    const _oe=window.onEdit;
    window.onEdit=function(key,raw,input){
      if(/^(scen|histv):/.test(key)){
        const v=parseFrLoc(raw); if(v===null){toast('Valeur non reconnue — saisissez un nombre.');return;}
        const [t,a,b]=key.split(':');
        if(t==='scen'){const drv=a,ci=+b;const unit=SCEN.find(s=>s[0]===drv)[2];
          App.ov.scen[drv+':'+ci]=(unit==='%'||unit==='pts')?v/100:v;}
        else{App.ov.histv[a+':'+b]=v;}
        input.classList.add('dirty'); recompute(); renderAll(); persist(false); return;
      }
      return _oe.apply(this,arguments);
    };
  }
  // onglet Données : ajoute deux sous-vues éditables
  if(!window.__s6wrapRD){window.__s6wrapRD=true;
    const _rd=window.renderDonnees;
    window.renderDonnees=function(){
      if(App.donView==='s6hist'||App.donView==='s6scen'){donExtra(App.donView);return;}
      _rd.apply(this,arguments); donInjectButtons();
    };
  }
  renderS6();
}
function donInjectButtons(){
  const P=document.getElementById('panel-donnees'); if(!P)return;
  const nav=P.querySelector('.subnav'); if(!nav||nav.querySelector('[data-v="s6hist"]'))return;
  [['s6hist','Historique mensuel'],['s6scen','Hypothèses scénarios']].forEach(([v,l])=>{
    const b=document.createElement('button'); b.dataset.v=v; b.textContent=l;
    b.addEventListener('click',()=>{App.donView=v;renderDonnees();});
    nav.appendChild(b);
  });
}
function donSubnav(active){
  const items=[['balance','Balance générale'],['cibles','Cibles & seuils'],['ventes','Ventes'],['paie','Paie'],
    ['absences','Absences'],['mouvements','Mouvements RH'],['salaries','Registre du personnel'],
    ['clients','Clients'],['fournisseurs','Fournisseurs'],['pipeline','Pipeline'],
    ['s6hist','Historique mensuel'],['s6scen','Hypothèses scénarios']];
  return `<div class="subnav">${items.map(([v,l])=>`<button data-v="${v}" ${v===active?'aria-current="true"':''}>${l}</button>`).join('')}</div>`;
}
function donExtra(view){
  const P=document.getElementById('panel-donnees'); if(!P)return;
  const H=histSeries(); const base=App.base.histV||{}; const ov=App.ov.histv||{};
  let body='';
  if(view==='s6hist'){
    const cell=(y,i)=>{const k=y+':'+i;const val=ov[k]!=null?ov[k]:(base['y'+y]?base['y'+y][i]:0);
      return `<td><input class="edit${ov[k]!=null?' dirty':''}" data-ed="histv:${y}:${i}" value="${NF0.format(val)}"></td>`;};
    const rows=MOIS.map((mn,i)=>`<tr><td>${mn}</td>${cell(2023,i)}${cell(2024,i)}<td class="num small">${fk(H.y25[i])}</td></tr>`).join('');
    body=card('Historique mensuel des ventes — CA net (€)',
      `<div class="twrap"><table><thead><tr><th>Mois</th><th class="num">2023</th><th class="num">2024</th><th class="num">2025 (lié)</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }else{
    const clsN=['stress','central','optim'];
    const rows=SCEN.map(([drv,lab,unit])=>{
      const cells=SCOLS.map((_,ci)=>{const val=scenVal(drv,ci);const isPct=unit==='%'||unit==='pts';
        const disp=isPct?(val*100).toFixed(1):NF0.format(val);const dirty=App.ov.scen[drv+':'+ci]!=null;
        return `<td class="${clsN[ci]}"><input class="edit${dirty?' dirty':''}" data-ed="scen:${drv}:${ci}" value="${disp}"></td>`;}).join('');
      return `<tr><td>${lab} <span class="small">(${unit})</span></td>${cells}</tr>`;}).join('');
    body=card('Hypothèses de scénarios',
      `<div class="twrap"><table class="s6-scen"><thead><tr><th>Levier</th><th class="stress">Stress</th><th class="central">Central</th><th class="optim">Optimiste</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }
  P.innerHTML=`<h2>Données &amp; paramètres</h2>
    <p class="lead">Tables de faits et référentiels éditables. Les données ajoutées à l’Étape 3 (historique mensuel, hypothèses de scénarios) sont éditables ici et se répercutent sur les onglets Tendances et Scénarios.</p>
    ${donSubnav(view)}${body}`;
  P.querySelectorAll('.subnav button').forEach(b=>b.addEventListener('click',()=>{App.donView=b.dataset.v;renderDonnees();}));
}
})();
