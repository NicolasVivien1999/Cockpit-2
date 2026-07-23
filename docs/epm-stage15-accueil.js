/* =====================================================================
   Couche 6 — Accueil & présentation de l'entité (stage15)
   Onglet d'accueil entièrement dérivé de la fiche d'identité (stage14) :
   toute modification dans « Données & paramètres › Identité de l'entité »
   se répercute immédiatement ici, ainsi que la palette de marque.
   ===================================================================== */
(function(){
'use strict';
function ready(){return (typeof App!=='undefined')&&App.st&&App.st.ident&&App.C&&
  document.getElementById('tabs')&&(typeof window.renderAll==='function')&&(typeof window.selectTab==='function');}
function boot(){if(!ready())return setTimeout(boot,150);init();}

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NF0=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const NF1=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
const fk=v=>(v==null||isNaN(v))?'—':NF0.format(Math.round(v/1000))+' k€';

/* identité fusionnée : socle + saisies de l'utilisateur */
function ID(){return Object.assign({},App.st.ident||{},(App.ov&&App.ov.ident)||{});}
function TH(){return (App.ov&&App.ov.theme)||{};}

/* ---------- blocs affichés ---------- */
const BLOCS=[
 ["Identification légale",[
   ["raison","Dénomination sociale"],["sigle","Nom commercial"],["forme","Forme juridique"],
   ["capital","Capital social"],["siren","SIREN"],["siret","SIRET (siège)"],
   ["tva","TVA intracommunautaire"],["rcs","Immatriculation"],["creation","Date de création"]]],
 ["Activité & dimension",[
   ["naf","Code NAF / APE"],["naf_lib","Activité"],["secteur","Secteur"],
   ["categorie","Catégorie"],["effectif","Effectif"],["tranche_effectif","Tranche déclarée"]]],
 ["Siège & implantation",[
   ["adresse","Adresse"],["cp","Code postal"],["ville","Commune"],
   ["region","Région"],["pays","Pays"]]],
 ["Cadre comptable & fiscal",[
   ["exercice","Exercice social"],["cloture_n","Clôture N"],["cloture_n1","Clôture N-1"],
   ["date_situation","Date de situation"],["regime_is","Régime d'imposition"],
   ["regime_tva","Régime de TVA"],["devise","Devise"],["entite","Entité de consolidation"]]],
 ["Cadre social & gouvernance",[
   ["ccn","Convention collective"],["dirigeant","Représentant légal"],
   ["cac","Commissaire aux comptes"],["expert","Expert-comptable"]]]
];
const MONETAIRE={capital:1};

function valeur(k,I){
 let v=I[k];
 if(v==null||v==='')return null;
 if(MONETAIRE[k]&&!isNaN(parseFloat(v)))return NF0.format(parseFloat(v))+' €';
 if(k==='effectif'&&!isNaN(parseFloat(v)))return NF0.format(parseFloat(v))+' personnes';
 return String(v);
}

/* ---------- repères chiffrés (live) ---------- */
function reperes(){
 const C=App.C, I=ID();
 const s=C.s25||{}, t=C.t26||{}, sc=C.sc||{};
 const eff=parseFloat(I.effectif);
 return [
  {l:"Chiffre d'affaires",v:fk(s.ca),s:'exercice '+(I.cloture_n?String(I.cloture_n).slice(-4):'N'),t:'n'},
  {l:"Marge commerciale",v:fk(s.mc),s:s.ca?NF1.format(s.mc/s.ca*100)+' % du CA':'',t:'n'},
  {l:"Excédent brut d'exploitation",v:fk(s.ebe),s:s.ca?NF1.format(s.ebe/s.ca*100)+' % du CA':'',t:s.ebe>=0?'pos':'neg'},
  {l:"Résultat net",v:fk(s.rn),s:'après impôt et financier',t:s.rn>=0?'pos':'neg'},
  {l:"Trésorerie",v:fk(t.tn0626),s:t.runway?('autonomie '+NF1.format(t.runway)+' mois'):'',t:t.tn0626>=0?'pos':'neg'},
  {l:"Score de pilotage",v:(sc.global!=null?sc.global+' /100':'—'),
   s:(sc.alertes&&sc.alertes.length?sc.alertes.length+' indicateur(s) en alerte':'40 indicateurs suivis'),
   t:sc.global>=60?'pos':(sc.global>=40?'n':'neg')},
  ...(isNaN(eff)?[]:[{l:"Effectif",v:NF0.format(eff),s:I.tranche_effectif||'personnes inscrites',t:'n'}])
 ];
}

/* ---------- rendu ---------- */
function render(){
 const P=document.getElementById('panel-accueil'); if(!P)return;
 const I=ID(), th=TH(), cols=(th.colors||[]).filter(Boolean);
 // Titre : nom commercial (enseigne) s'il est renseigné, sinon dénomination sociale.
 // Quand l'enseigne est affichée, la dénomination reste visible juste en dessous.
 const enseigne=(I.sigle&&String(I.sigle).trim())||'';
 const titre=enseigne||(I.raison&&String(I.raison).trim())||'';
 const chips=[
  I.siren?['SIREN',I.siren]:null, I.naf?['NAF',I.naf]:null,
  I.forme?['Forme',I.forme]:null, I.ville?['Siège',I.ville]:null,
  I.effectif?['Effectif',NF0.format(parseFloat(I.effectif)||I.effectif)]:null,
  I.creation?['Depuis',I.creation]:null, I.devise?['Devise',I.devise]:null
 ].filter(Boolean);
 const src=(window.__EXT&&window.__EXT.entreprise)||null;

 P.innerHTML=`
  <section class="s15-hero">
   <div class="eyebrow">Master EPM · Cockpit 360°</div>
   <h2>${esc(titre||'Entité non renseignée')}</h2>
   <div class="forme">${[enseigne?I.raison:null,I.forme,
     I.capital?('capital de '+NF0.format(parseFloat(I.capital)||I.capital)+' €'):null,
     I.rcs].filter(Boolean).map(esc).join(' · ')||'&nbsp;'}</div>
   <div class="activite">${esc(I.naf_lib||I.secteur||'Activité non renseignée')}${I.ville?` — siège à ${esc(I.ville)}${I.region?` (${esc(I.region)})`:''}.`:'.'}</div>
   <div class="s15-chips">${chips.map(([l,v])=>`<span class="s15-chip">${esc(l)} <b>${esc(v)}</b></span>`).join('')}</div>
  </section>

  <h3 style="margin:1.1rem 0 .1rem">Repères de l'exercice</h3>
  <p class="small" style="margin:.1rem 0 .5rem;color:var(--ink3)">Calculés en direct depuis les données du cockpit — ils suivent toute modification de la balance ou des hypothèses.</p>
  <div class="s15-kpis">
   ${reperes().map(k=>`<div class="s15-kpi"><div class="l">${esc(k.l)}</div>
     <div class="v ${k.t}">${esc(k.v)}</div><div class="s">${esc(k.s||'')}</div></div>`).join('')}
  </div>

  <h3 style="margin:1.2rem 0 .1rem">Carte d'identité</h3>
  <p class="small" style="margin:.1rem 0 .6rem;color:var(--ink3)">Renseignée dans <b>Données &amp; paramètres › Identité de l'entité</b> ; cette page se met à jour à chaque modification.</p>
  <div class="s15-grid">
   ${BLOCS.map(([titre,champs])=>{
     const lignes=champs.map(([k,lbl])=>{const v=valeur(k,I);
       return `<dt>${esc(lbl)}</dt><dd class="${v?'':'vide'}">${v?esc(v):'non renseigné'}</dd>`;}).join('');
     return `<section class="s15-card"><h4>${esc(titre)}</h4><dl>${lignes}</dl></section>`;}).join('')}
   ${cols.length?`<section class="s15-card"><h4>Palette de marque</h4>
     <div class="s15-pal" style="padding-bottom:1.6rem">
      ${cols.map((c,i)=>`<div class="s15-sw" style="background:${esc(c)}"><span>${esc(c.toUpperCase())}</span></div>`).join('')}
     </div>
     ${th.police_nom?`<dl style="padding-top:0"><dt>Typographie</dt><dd>${esc(th.police_nom)}</dd></dl>`:''}
    </section>`:''}
  </div>

  <div class="s15-foot">
   <button class="s15-btn" id="s15-edit">Modifier l'identité</button>
   <button class="s15-btn sec" id="s15-go">Ouvrir le cockpit 360°</button>
   ${src&&src.profil_veille?`<span class="s15-src">Veille sectorielle calibrée sur <b>${esc(src.profil_veille)}</b>.</span>`:''}
  </div>`;

 const e=P.querySelector('#s15-edit');
 if(e)e.onclick=()=>{App.donView='s14ident';selectTab('donnees');
   try{renderDonnees();}catch(_){}
   const p=document.getElementById('panel-donnees'); if(p)p.scrollIntoView({behavior:'smooth',block:'start'});};
 const g=P.querySelector('#s15-go');
 if(g)g.onclick=()=>selectTab('cockpit');
}

/* ---------- intégration ---------- */
function addTab(){
 const main=document.getElementById('main'), nav=document.getElementById('tabs');
 if(!document.getElementById('panel-accueil')){
   const s=document.createElement('section'); s.className='panel'; s.id='panel-accueil';
   s.setAttribute('role','tabpanel'); s.tabIndex=0; s.setAttribute('aria-labelledby','tab-accueil');
   s.style.setProperty('--tabc','var(--navy)');
   main.insertBefore(s,main.firstElementChild);}
 if(!document.getElementById('tab-accueil')){
   const b=document.createElement('button'); b.setAttribute('role','tab'); b.id='tab-accueil';
   b.setAttribute('aria-controls','panel-accueil'); b.setAttribute('aria-selected','false'); b.tabIndex=-1;
   b.style.setProperty('--tabc','var(--navy)'); b.textContent='Accueil';
   b.addEventListener('click',()=>selectTab('accueil'));
   nav.insertBefore(b,nav.firstElementChild);}
}
function init(){
 addTab();
 if(!window.__s15wrap){window.__s15wrap=true;
   const _ra=window.renderAll;
   window.renderAll=function(){_ra.apply(this,arguments);try{render();}catch(e){console.warn('s15',e);}};}
 render();
}
document.addEventListener('DOMContentLoaded',boot); boot();
})();
