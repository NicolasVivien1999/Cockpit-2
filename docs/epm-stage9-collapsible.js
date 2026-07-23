/* =====================================================================
   Étape 5b — Blocs transversaux pliables
   ===================================================================== */
(function(){
'use strict';
const LS={get(k){try{return localStorage.getItem(k);}catch(_){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(_){}}};

const TARGETS=[
  {id:'s7-xf',        key:'s9-xf',  title:'Filtre transversal',       sum:xfSum,  hint:'sélection'},
  {id:'stage4-filter',key:'s9-exp', title:'Exploration transversale', sum:expSum, hint:'indicateurs'}
];

function xfSum(){
  const f=((typeof App!=='undefined')&&App.filters&&App.filters.com)||{};
  const parts=[];
  if(f.ca&&f.ca.size)parts.push([...f.ca].join(', '));
  if(f.fa&&f.fa.size)parts.push([...f.fa].join(', '));
  const rg=(typeof App!=='undefined')&&App.filters&&App.filters.xfRegion;
  if(rg&&rg.size)parts.push([...rg].join(', '));
  return parts.length?('<b>'+parts.join('</b> · <b>')+'</b>'):'vue globale — aucun filtre';
}
function expSum(){
  try{const rows=App.C.sc.rows;const red=rows.filter(r=>r.feu==='rouge').length;
    return red?('<b>'+red+'</b> indicateurs en alerte rouge'):'référentiel de pilotage complet';}
  catch(_){return 'référentiel de pilotage';}
}

function setup(t){
  const el=document.getElementById(t.id); if(!el)return;
  if(el.parentNode&&el.parentNode.classList&&el.parentNode.classList.contains('s9-wrap'))return; // déjà fait
  const wrap=document.createElement('div'); wrap.className='s9-wrap';
  const head=document.createElement('button'); head.type='button'; head.className='s9-toggle'; head.setAttribute('aria-controls',t.id);
  head.innerHTML=`<span class="s9-chev" aria-hidden="true">▸</span><span class="s9-title">${t.title}</span>`
    +`<span class="s9-sum" id="${t.key}-sum"></span><span class="s9-hint">afficher / masquer</span>`;
  el.parentNode.insertBefore(wrap,el);
  wrap.appendChild(head); wrap.appendChild(el);
  const collapsed=LS.get(t.key)!=='open';                 // replié par défaut
  wrap.classList.toggle('s9-collapsed',collapsed);
  head.setAttribute('aria-expanded',collapsed?'false':'true');
  head.addEventListener('click',()=>{
    const now=wrap.classList.toggle('s9-collapsed');
    head.setAttribute('aria-expanded',now?'false':'true');
    LS.set(t.key, now?'closed':'open');
  });
  t.wrap=wrap; t.sumEl=head.querySelector('.s9-sum');
  updateSum(t);
}
function updateSum(t){ if(t.sumEl)t.sumEl.innerHTML=t.sum(); }
function updateAll(){ TARGETS.forEach(t=>{ if(!t.wrap)setup(t); else updateSum(t); }); }

function ready(){return (typeof App!=='undefined')&&document.getElementById('s7-xf')&&document.getElementById('stage4-filter');}
function init(){
  TARGETS.forEach(setup);
  if(!window.__s9wrap){window.__s9wrap=true;
    const _ra=window.renderAll;
    if(typeof _ra==='function')window.renderAll=function(){_ra.apply(this,arguments);try{updateAll();}catch(_){}};
  }
  updateAll();
}
function boot(){ if(!ready())return setTimeout(boot,150); init(); }
document.addEventListener('DOMContentLoaded',boot); boot();
})();
