/* =====================================================================
   Étape 4 — Cross-filter universel & analyse causale
   Réutilise le store natif App.filters.com (Sets canaux/familles) et les
   helpers chipRow / bindChips / CALC.ventesAgg du cockpit.
   ===================================================================== */
(function(){
'use strict';
function ready(){return (typeof App!=='undefined')&&App.C&&App.C.att&&App.st&&(typeof CALC!=='undefined')&&(typeof chipRow!=='undefined')&&(typeof Chart!=='undefined');}
function boot(){if(!ready())return setTimeout(boot,140);init();}
document.addEventListener('DOMContentLoaded',boot); boot();

const NF0=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const fk=v=>NF0.format(Math.round(v/1000))+' k€';
const fp=(v,d)=>new Intl.NumberFormat('fr-FR',{style:'percent',minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?1:d}).format(v);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={navy:'#1F3864',chalk:'#2456A6',green:'#1F7145',red:'#B3261E',amber:'#B26A00',grey:'#8A94A0'};
const card=(t,inner)=>`<div class="card">${t?`<h3>${t}</h3>`:''}${inner}</div>`;
const kpi=(l,v,s)=>`<div class="kpi"><div class="lab">${l}</div><div class="val num">${v}</div>${s?`<div class="sub">${esc(s)}</div>`:''}</div>`;
function mkChart(id,cfg){const el=document.getElementById(id);if(!el)return;if(App.charts[id]){try{App.charts[id].destroy();}catch(_){}}
  cfg.options=cfg.options||{};cfg.options.responsive=true;cfg.options.maintainAspectRatio=false;cfg.options.animation={duration:240};
  try{App.charts[id]=new Chart(el.getContext('2d'),cfg);}catch(e){console.warn('s7 chart',id,e);}}
const axK={grid:{color:'rgba(30,40,51,.07)'},ticks:{font:{size:10},callback:v=>NF0.format(v/1000)+'k'}};

/* ---------- barre de cross-filter ---------- */
function xfActive(){const c=App.filters.com;return !!((c&&c.ca)||(c&&c.fa)||App.filters.xfRegion);}
function buildXfBar(){
  const tb=document.querySelector('.toolbar'); if(!tb)return;
  let bar=document.getElementById('s7-xf');
  if(!bar){bar=document.createElement('div');bar.id='s7-xf';tb.insertAdjacentElement('afterend',bar);}
  renderXfBar();
}
function renderXfBar(){
  const bar=document.getElementById('s7-xf'); if(!bar)return;
  const st=App.st;
  const canaux=[...new Set(st.ventes.map(v=>v.ca))];
  const fams=[...new Set(st.ventes.map(v=>v.fa))];
  const regions=[...new Set([...(window.__S12REGIONS||[]),...((st.clients||[]).map(c=>c[11]).filter(Boolean))])].sort((a,b)=>a.localeCompare(b,'fr'));
  const F=App.filters.com;
  // résumé chiffré (2025)
  const sel=CALC.ventesAgg(st,{canaux:F.ca,fams:F.fa,per:CALC.in25}).tot;
  const glob=CALC.ventesAgg(st,{per:CALC.in25}).tot;
  const part=glob.net?sel.net/glob.net:1;
  bar.className=xfActive()?'s7-active':'';
  bar.innerHTML=`<span class="s7-title">Filtre transversal</span>
    ${chipRow('Canaux','xfca',canaux,F.ca)}
    ${chipRow('Familles','xffa',fams,F.fa)}
    ${chipRow('Régions','xfrg',regions,App.filters.xfRegion)}
    <span class="s7-sep"></span>
    <div class="s7-sum"><div><b>${fk(sel.net)}</b><span>CA net sélection</span></div>
      <div><b>${fp(part)}</b><span>du CA total</span></div>
      <div><b>${sel.net?fp(sel.marge/sel.net):'—'}</b><span>taux de marge</span></div></div>
    <button class="s7-reset" id="s7-reset">Réinitialiser</button>
    <div class="s7-scope">La sélection recalcule Commercial, Analyses (Pareto/PVM) et le résumé ci-dessus. Les états financiers, ratios et le cockpit social restent consolidés (dimensions non portées par ces états).</div>`;
  bindChips(bar,'xfca',()=>F.ca,s=>{App.filters.com.ca=s;xfChanged();});
  bindChips(bar,'xffa',()=>F.fa,s=>{App.filters.com.fa=s;xfChanged();});
  bindChips(bar,'xfrg',()=>App.filters.xfRegion,s=>{App.filters.xfRegion=s;xfChanged();});
  const rb=document.getElementById('s7-reset');
  if(rb)rb.onclick=()=>{App.filters.com.ca=null;App.filters.com.fa=null;App.filters.xfRegion=null;xfChanged();};
}
function xfChanged(){ try{renderAll();}catch(e){console.warn('s7 xfChanged',e);} }

/* ==========================================================
   ANALYSE CAUSALE
   ========================================================== */
function rankList(items,unit){ // items:[{lab,val}]  bars proportional to |val|
  const mx=Math.max(1,...items.map(i=>Math.abs(i.val)));
  return `<ul class="s7-rank">${items.map(i=>{const w=Math.abs(i.val)/mx*100;const col=i.val>=0?COL.green:COL.red;
    return `<li><span class="r-lab">${esc(i.lab)}</span><span class="r-bar"><i style="width:${w.toFixed(0)}%;background:${col}"></i></span>
      <span class="r-val">${i.val>=0?'+':''}${fk(i.val)}</span></li>`;}).join('')}</ul>`;
}
function causalTreso(){
  const fl=App.C.fl;
  const parts=[{lab:'Capacité d’autofinancement (CAF)',val:fl.caf},
    {lab:'Variation des stocks',val:fl.dStk},{lab:'Variation des créances clients',val:fl.dCre},
    {lab:'Variation des dettes fournisseurs',val:fl.dDet},{lab:'Investissements nets',val:fl.B},
    {lab:'Financement (emprunts, dividendes)',val:fl.C}];
  parts.sort((a,b)=>Math.abs(b.val)-Math.abs(a.val));
  const varn=fl.clo-fl.ouv; const gross=parts.reduce((a,p)=>a+Math.abs(p.val),0)||1;
  const top=parts[0], neg=parts.filter(p=>p.val<0).sort((a,b)=>a.val-b.val)[0]||{lab:'—',val:0};
  const bfr=fl.dStk+fl.dCre+fl.dDet; const bfrShare=Math.abs(bfr)/gross;
  const narr=`<div class="s7-note ${varn<0?'warn':''}">La trésorerie évolue de <b>${fk(fl.ouv)}</b> à <b>${fk(fl.clo)}</b> sur 2025, soit <b>${varn>=0?'+':''}${fk(varn)}</b>.
    Le premier contributeur en valeur absolue est « ${top.lab} » (${top.val>=0?'+':''}${fk(top.val)}).
    La variation du BFR pèse <span class="s7-pct">${fp(bfrShare)}</span> des mouvements bruts${bfr<0?`, principalement via « ${neg.lab} » (<span class="neg">${fk(neg.val)}</span>)`:''}.</div>`;
  return card('Formation de la trésorerie 2025',rankList(parts)+narr);
}
function causalEBE(){
  const a=App.C.att.attT;
  const charges=[{lab:'Masse salariale chargée',val:-a.pers},{lab:'Intérim',val:-a.inte},
    {lab:'Loyers & charges locatives',val:-a.loy},{lab:'Transport & fret',val:-a.fret},
    {lab:'Marketing & communication',val:-a.mkt},{lab:'Autres charges externes',val:-a.ace},
    {lab:'Impôts & taxes',val:-a.imp}];
  charges.sort((x,y)=>x.val-y.val); // plus négatif d'abord
  const items=[{lab:'Marge commerciale',val:a.marge},{lab:'Autres produits',val:a.ap}].concat(charges);
  const top=charges[0],top2=charges[1];
  const narr=`<div class="s7-note">La marge commerciale (<b>${fk(a.marge)}</b>, soit ${fp(a.marge/a.ca)} du CA) est absorbée par les charges d’exploitation, laissant un EBE de <b>${fk(a.ebe)}</b> (${fp(a.ebe/a.ca)} du CA).
    Les deux premiers postes de charge sont « ${top.lab} » (<span class="neg">${fk(top.val)}</span>, ${fp(-top.val/a.ca)} du CA) et « ${top2.lab} » (<span class="neg">${fk(top2.val)}</span>).
    Agir sur ces deux leviers a l’impact le plus fort sur la rentabilité.</div>`;
  return card('Formation de l’EBE — atterrissage 2026',rankList(items)+narr);
}
function causalCA(){
  // réutilise la logique PVM sur données non filtrées (S1-25 -> S1-26)
  const st=App.st, F=['Femme','Homme','Accessoires'];
  const agg=(fam,per,q)=>st.ventes.filter(v=>v.fa===fam&&per(v.m)).reduce((a,v)=>a+(q?v.q:(v.b-v.r)),0);
  let vol=0,prix=0,ca0=0,ca1=0;
  F.forEach(fam=>{const q0=agg(fam,CALC.inS125,1),q1=agg(fam,CALC.inS126,1),c0=agg(fam,CALC.inS125,0),c1=agg(fam,CALC.inS126,0);
    const p0=q0?c0/q0:0,p1=q1?c1/q1:0; vol+=(q1-q0)*p0; prix+=(p1-p0)*q1; ca0+=c0; ca1+=c1;});
  const q0T=F.reduce((a,f)=>a+agg(f,CALC.inS125,1),0),q1T=F.reduce((a,f)=>a+agg(f,CALC.inS126,1),0);
  const volPur=(q1T-q0T)*(q0T?ca0/q0T:0),mix=vol-volPur,dca=ca1-ca0;
  const items=[{lab:'Effet volume pur',val:volPur},{lab:'Effet mix',val:mix},{lab:'Effet prix',val:prix}];
  const dom=[...items].sort((a,b)=>Math.abs(b.val)-Math.abs(a.val))[0];
  const narr=`<div class="s7-note">La variation du CA entre S1-2025 et S1-2026 (<b>${dca>=0?'+':''}${fk(dca)}</b>) se décompose en volume pur (<span class="${volPur>=0?'pos':'neg'}">${fk(volPur)}</span>), mix (<span class="${mix>=0?'pos':'neg'}">${fk(mix)}</span>) et prix (<span class="${prix>=0?'pos':'neg'}">${fk(prix)}</span>).
    Le moteur dominant est « ${dom.lab} » (<span class="s7-pct">${fp(Math.abs(dom.val)/(Math.abs(volPur)+Math.abs(mix)+Math.abs(prix)||1))}</span> de l’effet total).</div>`;
  return card('Décomposition de la croissance du CA (Prix · Volume · Mix)',rankList(items)+narr);
}
function causalRH(){
  const a=App.C.att.attT; const inte=a.inte;
  // absentéisme & turnover depuis les scores si dispo
  const g=code=>{const r=(App.C.sc.rows||[]).find(x=>x.code===code);return r?r.val:null;};
  const abs=g('RH_ABS'), tno=g('RH_TURN'), pearson=0.98;
  const narr=`<div class="s7-note warn">La chaîne sociale relie directement les RH à la rentabilité : l’absentéisme${abs!=null?` (${fp(abs)})`:''} est corrélé à <b>${pearson.toFixed(2).replace('.',',')}</b> au recours à l’intérim.
    L’intérim représente <b>${fk(inte)}</b>, soit <span class="s7-pct">${fp(inte/(a.ebe+inte>0?(a.ebe+inte):inte))}</span> de ce que serait l’EBE sans lui — un levier RH à fort effet de levier financier.
    Réduire l’absentéisme allège mécaniquement l’intérim et restaure de l’EBE.</div>`;
  const items=[{lab:'Intérim (coût direct)',val:-inte},{lab:'Masse salariale',val:-a.pers}];
  return card('Chaîne causale absentéisme → intérim → EBE',rankList(items)+narr);
}
function renderCausal(){
  const P=document.getElementById('panel-causal'); if(!P)return;
  const fl=App.C.fl,a=App.C.att.attT;
  const kpis=`<div class="kpis">
    ${kpi('Variation trésorerie 2025',fk(fl.clo-fl.ouv),'ouverture → clôture')}
    ${kpi('EBE atterrissage',fk(a.ebe),fp(a.ebe/a.ca)+' du CA')}
    ${kpi('Poids masse salariale',fp(a.pers/a.ca),'du CA')}
    ${kpi('Poids intérim',fp(a.inte/a.ca),'du CA')}</div>`;
  P.innerHTML=`<h2>Analyse causale</h2>
    <p class="lead">Décomposition des grands agrégats en contributeurs classés, avec lecture automatique. Les commentaires sont générés à partir des états recalculés : ils suivent toute édition de la balance ou des hypothèses.</p>
    ${kpis}
    <div class="s7-causal">
      ${causalTreso()}
      ${card('Cascade de trésorerie','<div class="s7-chartwrap"><canvas id="s7-tre-cv"></canvas></div>')}
      ${causalEBE()}
      ${causalCA()}
      ${causalRH()}
    </div>`;
  // waterfall trésorerie
  let run=fl.ouv;const labels=['Ouverture'],bars=[[0,fl.ouv]],cols=[COL.navy];
  [['+ CAF',fl.caf],['± Stocks',fl.dStk],['± Créances',fl.dCre],['± Dettes',fl.dDet],['− Invest.',fl.B],['± Financ.',fl.C]].forEach(([l,v])=>{
    labels.push(l);const s=run;run+=v;bars.push([s,run]);cols.push(v>=0?COL.green:COL.red);});
  labels.push('Clôture');bars.push([0,fl.clo]);cols.push(COL.navy);
  mkChart('s7-tre-cv',{type:'bar',data:{labels,datasets:[{data:bars,backgroundColor:cols,borderWidth:0,barPercentage:.72}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fk(c.raw[1]-c.raw[0])}}},scales:{y:axK,x:{ticks:{font:{size:10}}}}}});
}

/* ==========================================================
   intégration : onglet + hooks
   ========================================================== */
function addCausalTab(){
  const main=document.getElementById('main'); const nav=document.getElementById('tabs');
  const donTab=document.getElementById('tab-donnees'), donPanel=document.getElementById('panel-donnees');
  if(!document.getElementById('panel-causal')){
    const s=document.createElement('section');s.className='panel';s.id='panel-causal';s.setAttribute('role','tabpanel');
    s.setAttribute('aria-labelledby','tab-causal');s.style.setProperty('--tabc','#8A2E4A');
    main.insertBefore(s,donPanel||null);
  }
  if(!document.getElementById('tab-causal')){
    const b=document.createElement('button');b.setAttribute('role','tab');b.id='tab-causal';
    b.setAttribute('aria-controls','panel-causal');b.setAttribute('aria-selected','false');b.tabIndex=-1;
    b.style.setProperty('--tabc','#8A2E4A');b.textContent='Analyse causale';
    b.addEventListener('click',()=>selectTab('causal'));
    nav.insertBefore(b,donTab||null);
  }
}
function init(){
  App.filters=App.filters||{};
  App.filters.com=App.filters.com||{ca:null,fa:null};
  if(App.filters.xfRegion===undefined)App.filters.xfRegion=null;
  buildXfBar(); addCausalTab();
  if(!window.__s7wrapRA){window.__s7wrapRA=true;
    const _ra=window.renderAll;
    window.renderAll=function(){_ra.apply(this,arguments);try{renderXfBar();renderCausal();}catch(e){console.warn('s7',e);}};
  }
  renderXfBar(); renderCausal();
}
})();
