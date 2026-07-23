/* =====================================================================
   Étape 5 — Design system : glossaire des sigles + lexique
   ===================================================================== */
(function(){
'use strict';
const LS={get(k){try{return localStorage.getItem(k);}catch(_){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(_){}}};
function ready(){return (typeof App!=='undefined')&&document.getElementById('main');}
function boot(){if(!ready())return setTimeout(boot,150);init();}

/* ---------- dictionnaire ---------- */
const G={
 Finance:{
  CAF:"Capacité d’autofinancement : trésorerie dégagée par l’activité, avant investissement et financement.",
  EBE:"Excédent brut d’exploitation : profit de l’exploitation avant amortissements, intérêts et impôts.",
  REX:"Résultat d’exploitation : résultat de l’activité courante, après amortissements.",
  RCAI:"Résultat courant avant impôts.",
  SIG:"Soldes intermédiaires de gestion : la cascade d’indicateurs du compte de résultat (marge, VA, EBE, REX…).",
  VA:"Valeur ajoutée : richesse créée par l’entreprise (production moins consommations externes).",
  BFR:"Besoin en fonds de roulement : argent immobilisé dans les stocks et les créances clients, net des dettes fournisseurs.",
  Gearing:"Ratio dette nette / capitaux propres : mesure le niveau d’endettement de l’entreprise.",
  CBC:"Concours bancaires courants : découvert ou ligne de crédit à court terme.",
  PCG:"Plan comptable général : le référentiel comptable français.",
  IS:"Impôt sur les sociétés."
 },
 "Trésorerie":{
  DSO:"Days Sales Outstanding : délai moyen de paiement des clients, en jours.",
  DPO:"Days Payables Outstanding : délai moyen de paiement aux fournisseurs, en jours.",
  DIO:"Days Inventory Outstanding : durée moyenne d’écoulement des stocks, en jours.",
  Runway:"Nombre de mois de trésorerie disponible avant épuisement, au rythme de consommation actuel."
 },
 "RH & social":{
  GVT:"Glissement Vieillesse Technicité : hausse automatique de la masse salariale (ancienneté, promotions) à effectif constant.",
  Noria:"Effet de renouvellement : économie ou surcoût lié au remplacement des sortants par des entrants (souvent moins bien payés).",
  Turnover:"Taux de rotation du personnel : départs rapportés à l’effectif moyen.",
  ETP:"Équivalent temps plein : unité de mesure de l’effectif rapportée à un temps complet."
 },
 "Production & QHSE":{
  MTBF:"Mean Time Between Failures : temps moyen de bon fonctionnement entre deux pannes.",
  MTTR:"Mean Time To Repair : temps moyen de réparation après une panne.",
  TRS:"Taux de rendement synthétique : efficacité globale d’un équipement (disponibilité × performance × qualité).",
  OTD:"On-Time Delivery : taux de livraisons effectuées à l’heure.",
  OTIF:"On-Time In-Full : taux de livraisons à l’heure ET complètes.",
  QHSE:"Qualité, Hygiène, Sécurité, Environnement.",
  TF:"Taux de fréquence : accidents du travail avec arrêt par million d’heures travaillées.",
  TG:"Taux de gravité : jours d’arrêt pour accident par millier d’heures travaillées."
 },
 "Pilotage & data":{
  CPI:"Cost Performance Index : indice de performance des coûts d’un projet (valeur acquise / coût réel).",
  HHI:"Indice de Herfindahl-Hirschman : mesure de concentration (clients, achats). Plus il est élevé, plus c’est concentré.",
  ABC:"Classification par importance : la classe A regroupe le petit nombre d’éléments qui font l’essentiel de la valeur.",
  Pareto:"Principe 80/20 : une minorité d’éléments concentre l’essentiel de la valeur.",
  PVM:"Décomposition Prix / Volume / Mix : explique une variation de chiffre d’affaires par ses trois moteurs.",
  Pearson:"Coefficient de corrélation (de −1 à 1) mesurant le lien entre deux séries de données.",
  RSE:"Responsabilité sociétale des entreprises.",
  EPM:"Enterprise Performance Management : pilotage de la performance (budgets, prévisions, tableaux de bord).",
  KPI:"Key Performance Indicator : indicateur clé de performance."
 }
};
const DEF={}; const CAT={};
for(const cat in G)for(const t in G[cat]){DEF[t]=G[cat][t];CAT[t]=cat;}
const TERMS=Object.keys(DEF).sort((a,b)=>b.length-a.length);
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const RE=new RegExp('(?<![\\w-])('+TERMS.map(esc).join('|')+')(?![\\w-])','g');
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- annotation des sigles ---------- */
const SKIP=new Set(['SCRIPT','STYLE','ABBR','INPUT','TEXTAREA','SELECT','OPTION','BUTTON','CANVAS','SVG','CODE','H1']);
function annotate(root){
  if(!root)return;
  const nodes=[];
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
    if(!n.nodeValue||n.nodeValue.length<2)return NodeFilter.FILTER_REJECT;
    let p=n.parentNode;
    while(p&&p!==root.parentNode){
      if(p.nodeType===1){
        if(SKIP.has(p.nodeName))return NodeFilter.FILTER_REJECT;
        if(p.classList&&(p.classList.contains('gloss')||p.classList.contains('s8-lex')||p.id==='s8-lex-back'))return NodeFilter.FILTER_REJECT;
      }
      p=p.parentNode;
    }
    RE.lastIndex=0; return RE.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  while(w.nextNode())nodes.push(w.currentNode);
  nodes.forEach(n=>{
    const s=n.nodeValue; const frag=document.createDocumentFragment(); let last=0,m; RE.lastIndex=0;
    while((m=RE.exec(s))){
      if(m.index>last)frag.appendChild(document.createTextNode(s.slice(last,m.index)));
      const ab=document.createElement('abbr'); ab.className='gloss'; ab.setAttribute('data-term',m[1]);
      ab.title=DEF[m[1]]; ab.textContent=m[1]; frag.appendChild(ab); last=m.index+m[1].length;
    }
    if(last<s.length)frag.appendChild(document.createTextNode(s.slice(last)));
    if(frag.childNodes.length)n.parentNode.replaceChild(frag,n);
  });
}
let __obs=null,__annoScheduled=false;
function annotateAll(){ const main=document.getElementById('main'); if(!main)return;
  if(__obs)__obs.disconnect();
  try{annotate(main);}catch(e){console.warn('gloss',e);}
  if(__obs)try{__obs.observe(main,{childList:true,subtree:true});}catch(_){}
}
function scheduleAnnotate(){ if(__annoScheduled)return; __annoScheduled=true;
  requestAnimationFrame(()=>{__annoScheduled=false;annotateAll();}); }
function startObserver(){ const main=document.getElementById('main'); if(!main||__obs)return;
  __obs=new MutationObserver(()=>scheduleAnnotate()); __obs.observe(main,{childList:true,subtree:true}); }

/* ---------- lexique (panneau latéral) ---------- */
function buildLexicon(){
  if(document.getElementById('s8-lex'))return;
  const back=document.createElement('div'); back.className='s8-lex-back'; back.id='s8-lex-back';
  const panel=document.createElement('aside'); panel.className='s8-lex'; panel.id='s8-lex';
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Lexique des sigles');
  panel.innerHTML=`<header><h3>Lexique</h3><button class="s8-close" aria-label="Fermer">×</button></header>
    <div class="s8-tools">
      <input type="search" id="s8-lex-q" placeholder="Rechercher un sigle…" aria-label="Rechercher">
      <label class="s8-tog"><input type="checkbox" id="s8-lex-tog" checked> Surligner</label>
    </div><div class="s8-body" id="s8-lex-body"></div>`;
  document.body.appendChild(back); document.body.appendChild(panel);
  const body=panel.querySelector('#s8-lex-body');
  function render(q){
    q=(q||'').trim().toLowerCase(); let html='';
    for(const cat in G){
      const items=Object.keys(G[cat]).filter(t=>!q||t.toLowerCase().includes(q)||G[cat][t].toLowerCase().includes(q));
      if(!items.length)continue;
      html+=`<div class="s8-cat">${escH(cat)}</div><dl>`;
      items.forEach(t=>{html+=`<dt>${escH(t)}</dt><dd>${escH(G[cat][t])}</dd>`;});
      html+='</dl>';
    }
    body.innerHTML=html||'<p class="s8-empty">Aucun sigle ne correspond.</p>';
  }
  render('');
  const open=()=>{back.classList.add('open');panel.classList.add('open');panel.querySelector('#s8-lex-q').focus();};
  const close=()=>{back.classList.remove('open');panel.classList.remove('open');};
  back.addEventListener('click',close);
  panel.querySelector('.s8-close').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  panel.querySelector('#s8-lex-q').addEventListener('input',e=>render(e.target.value));
  const tog=panel.querySelector('#s8-lex-tog');
  tog.checked=LS.get('s8-gloss')!=='off';
  document.body.classList.toggle('gloss-off',!tog.checked);
  tog.addEventListener('change',()=>{document.body.classList.toggle('gloss-off',!tog.checked);
    LS.set('s8-gloss',tog.checked?'on':'off');});
  // bouton dans la toolbar
  const tb=document.querySelector('.toolbar');
  if(tb&&!document.getElementById('s8-lex-btn')){
    const btn=document.createElement('button'); btn.className='btn'; btn.id='s8-lex-btn'; btn.type='button';
    btn.textContent='Lexique'; btn.addEventListener('click',open);
    const a11y=document.getElementById('b-a11y');
    if(a11y&&a11y.parentNode)a11y.parentNode.insertBefore(btn,a11y.nextSibling); else tb.appendChild(btn);
  }
}

function init(){
  if(LS.get('s8-gloss')==='off')document.body.classList.add('gloss-off');
  buildLexicon();
  startObserver(); scheduleAnnotate();
}
document.addEventListener('DOMContentLoaded',boot); boot();
})();
