/* =====================================================================
   Couche 4 — Lien données externes (stage13)
   Ingestion du JSON produit par les notebooks (Pipeline_OpenData /
   Enrichissement) : onglet « Veille & alertes » (BODACC, presse, marché),
   application des facteurs CO₂ ADEME aux hypothèses du module Géo,
   change BCE exposé au module Flux. Persistance via App.ov.ext.
   ===================================================================== */
(function(){
'use strict';
function ready(){return (typeof App!=='undefined')&&App.st&&App.C&&document.getElementById('tabs')&&(typeof window.renderAll==='function');}
function boot(){if(!ready())return setTimeout(boot,150);init();}

const COLV='#6B4FA3';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NF0=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const kpi=(l,v,s)=>`<div class="kpi"><div class="lab">${l}</div><div class="val num">${v}</div>${s?`<div class="sub">${esc(s)}</div>`:''}</div>`;
const card=(t,inner)=>`<div class="card">${t?`<h3>${t}</h3>`:''}${inner}</div>`;
const EXT=()=>App.ov.ext||null;

/* ---------- ingestion ---------- */
function valider(d){
 if(!d||typeof d!=='object')return "fichier illisible";
 if(!d.meta&&!d.fx&&!d.veille)return "structure inattendue (méta/fx/veille absents)";
 return null;
}
function ingest(d,annonce){
 const err=valider(d); if(err){toast('Import refusé : '+err);return false;}
 // borne la taille (localStorage) : presse limitée à 80 articles
 if(d.veille&&Array.isArray(d.veille.presse))d.veille.presse=d.veille.presse.slice(0,80);
 App.ov.ext=d; window.__EXT=d;
 try{persist(false);}catch(_){}
 if(annonce){const n=(d.veille&&d.veille.presse||[]).length;
   toast(`Données externes chargées — ${n} article(s), généré le ${String((d.meta||{}).genere_le||'?').slice(0,16)}`);}
 renderAll();
 return true;
}
function importFichier(){
 const inp=document.getElementById('s13-file'); if(inp)inp.click();
}
function onFile(ev){
 const f=ev.target.files&&ev.target.files[0]; if(!f)return;
 const r=new FileReader();
 r.onload=()=>{try{ingest(JSON.parse(r.result),true);}catch(e){toast('JSON invalide : '+e.message);}};
 r.readAsText(f); ev.target.value='';
}
function autoload(){
 // Servi en http(s) : on interroge le fichier à CHAQUE ouverture et on adopte la
 // collecte si elle est plus récente que celle mémorisée (rafraîchissement hebdo).
 // En file:// l'appel échoue silencieusement : l'import manuel prend le relais.
 try{
   fetch('cockpit_data_v2.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
     .then(d=>{
       if(!d)return;
       const cur=EXT();
       const neuf=String((d.meta||{}).genere_le||'');
       const actu=String(cur&&(cur.meta||{}).genere_le||'');
       if(!cur){ingest(d,true);return;}
       if(neuf&&neuf>actu){
         App.ov.ext=d; window.__EXT=d;
         try{persist(false);}catch(_){}
         toast('Collecte actualisée — '+neuf.slice(0,16).replace('T',' '));
         renderAll();
       }
     }).catch(()=>{});
 }catch(_){}
}

/* ---------- actions ---------- */
function appliquerAdeme(){
 const d=EXT(); if(!d||!d.co2)return;
 const pick=o=>{if(!o)return null;let v=o.valeur;
   if(typeof v!=='number')return null;
   if(/kg/i.test(String(o.unite||''))&&v<3)v=v*1000;   // kgCO2e/t.km -> g
   return (v>0&&v<3000)?v:null;};
 const mar=pick(d.co2.maritime_g_tkm), rou=pick(d.co2.routier_g_tkm);
 if(mar==null&&rou==null){toast('Facteurs ADEME inexploitables — hypothèses inchangées.');return;}
 App.ov.geo=App.ov.geo||{};
 if(mar!=null)App.ov.geo['hyp:mar']=Math.round(mar*10)/10;
 if(rou!=null)App.ov.geo['hyp:rou']=Math.round(rou*10)/10;
 try{persist(false);}catch(_){}
 toast(`Facteurs ADEME appliqués : maritime ${mar??'—'} · routier ${rou??'—'} g/t·km`);
 renderAll();
}
function copierPrompt(){
 const d=EXT(); const p=d&&d.veille&&d.veille.prompt_digest;
 if(!p){toast('Aucun prompt de digest dans les données.');return;}
 const done=()=>toast('Prompt copié — colle-le dans l\u2019onglet Assistant IA.');
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(p).then(done,()=>fallback());}
 else fallback();
 function fallback(){
   const ta=document.createElement('textarea');ta.value=p;document.body.appendChild(ta);
   ta.select();try{document.execCommand('copy');done();}catch(_){toast('Copie impossible — sélectionne le texte manuellement.');}
   ta.remove();}
}

/* ---------- rendu ---------- */
function alertes(){
 const d=EXT(); if(!d)return [];
 return ((d.veille||{}).bodacc||[]).filter(x=>x.alerte);
}
function badge(){
 const b=document.getElementById('tab-veille2'); if(!b)return;
 const n=alertes().length;
 let dot=b.querySelector('.s13-dot');
 if(n&&!dot){dot=document.createElement('span');dot.className='s13-dot';dot.title=n+' alerte(s) BODACC';b.appendChild(dot);}
 if(!n&&dot)dot.remove();
}
function vide(P){
 P.innerHTML=`<h2>Veille &amp; alertes</h2>
  <div class="s13-empty">
   <h3>Aucune donnée externe chargée</h3>
   <p style="font-size:.86rem">Ce panneau affiche la collecte du pipeline open data (identité des tiers, alertes BODACC, veille presse, change BCE, facteurs CO₂ ADEME, conjoncture).</p>
   <ol>
    <li>Exécute le notebook <b>Pipeline_OpenData_Bastide.ipynb</b> (Colab, aucune clé requise) ;</li>
    <li>Récupère le fichier <b>cockpit_data_v2.json</b> téléchargé ;</li>
    <li>Importe-le ici — il est conservé dans ce navigateur.</li>
   </ol>
   <div class="s13-actions">
    <button class="s13-btn" id="s13-import">Importer cockpit_data_v2.json</button>
   </div>
  </div>
  <input type="file" id="s13-file" accept="application/json,.json">`;
 P.querySelector('#s13-import').onclick=importFichier;
 P.querySelector('#s13-file').addEventListener('change',onFile);
}
function plein(P){
 const d=EXT(); const v=d.veille||{}; const presse=v.presse||[]; const bod=v.bodacc||[];
 const th=App.filters.s13theme||null;
 const themes=[...new Set(presse.map(a=>a.theme).filter(Boolean))];
 const arts=th?presse.filter(a=>a.theme===th):presse;
 const nAl=bod.filter(x=>x.alerte).length;
 const fx=d.fx||{}; const cj=d.conjoncture||{};
 const rappels=v.rappels_produits||[]; const sect=d.secteur||{};
 const baro=sect.barometre||{}; const trends=sect.tendances_recherche||{};
 const pubs=baro.publications_secteur||baro.fevad_ecommerce||[]; const trK=Object.keys(trends);
 const ipch=cj.ipch_pct||cj.ipch_habillement_fr_pct||{}; const ipchK=Object.keys(ipch).sort();
 const ipchLib=cj.ipch_libelle||'Habillement';
 const mp=cj.matiere_premiere||(cj.coton_usd_kg?{nom:'coton',serie:cj.coton_usd_kg}:null);
 const coton=(mp&&mp.serie)||{}; const cotK=Object.keys(coton).sort();
 const ent=d.entreprise||{};
 const rap=(d.meta||{}).rapport_sections||{};
 P.innerHTML=`<h2>Veille &amp; alertes</h2>
  <p class="s13-meta">Collecte du <b>${esc(String((d.meta||{}).genere_le||'?').slice(0,16).replace('T',' '))}</b> · ${(d.meta&&d.meta.sources||[]).length} sources${ent.profil_veille?` · veille calibrée sur <b>${esc(ent.profil_veille)}</b>${ent.naf?` (NAF ${esc(ent.naf)})`:''}`:''}
   &nbsp;<button class="s13-btn sec" id="s13-reimport" style="font-size:.7rem;padding:.2rem .55rem">Recharger un JSON</button></p>
  <input type="file" id="s13-file" accept="application/json,.json">
  <div class="kpis">
   ${kpi('Alertes BODACC',nAl,nAl?'procédures à examiner':'aucun signal grave')}
   ${kpi('Articles de veille',presse.length,(rap.veille_presse||''))}
   ${kpi('EUR / USD',fx.rates&&fx.rates.USD?fx.rates.USD.toFixed(3):'—',fx.variation_1an_pct&&fx.variation_1an_pct.USD!=null?(fx.variation_1an_pct.USD>0?'+':'')+fx.variation_1an_pct.USD+' % sur 1 an':'')}
   ${kpi('Inflation '+esc(String(ipchLib).toLowerCase().slice(0,18)),ipchK.length?ipch[ipchK[ipchK.length-1]]+' %':'—',ipchK.length?'IPCH France · '+ipchK[ipchK.length-1]:'')}
   ${kpi('Rappels produits',rappels.length,rappels.length?'mode/textile · 90 jours':(/échec|indispo/i.test(String(rap.rappels_produits||''))?'source indisponible':'aucun sur la période'))}
  </div>
  <div class="s12-grid c2">
  ${card('Tiers sous surveillance (BODACC)',`<div class="twrap"><table><thead><tr><th>Tiers</th><th>SIREN</th><th>Dernière annonce</th><th>Type</th><th>Signal</th></tr></thead><tbody>
   ${bod.map(x=>{const a=(x.annonces||[])[0]||{};return `<tr class="${x.alerte?'s13-alerte':''}"><td>${esc(x.nom||x.code)}</td><td class="small">${esc(x.siren||'—')}</td>
     <td class="small">${esc(a.date||'—')}</td><td class="small">${esc(a.type||'—')}</td>
     <td class="s13-flag ${x.alerte?'ko':'ok'}">${x.alerte?'🔴 ALERTE':'RAS'}</td></tr>`;}).join('')||'<tr><td colspan="5">—</td></tr>'}
  </tbody></table></div><p class="s12-cap">Annonces légales officielles. Une alerte = sauvegarde, redressement, liquidation ou radiation détectée : vérifier l'encours et les conditions de règlement du tiers.</p>`)}
  ${card('Marché & conjoncture',`<div class="twrap"><table><tbody>
    ${fx.rates?Object.keys(fx.rates).map(dv=>`<tr><td>EUR / ${dv}</td><td class="num">${fx.rates[dv]}</td><td class="num small">${fx.variation_1an_pct&&fx.variation_1an_pct[dv]!=null?((fx.variation_1an_pct[dv]>0?'+':'')+fx.variation_1an_pct[dv]+' % / 1 an'):''}</td></tr>`).join(''):''}
    ${cotK.length?`<tr><td>${esc((mp&&mp.nom)||'Matière première')}</td><td class="num">${coton[cotK[cotK.length-1]]} $</td><td class="num small">${esc(cotK[cotK.length-1])}</td></tr>`:''}
    ${ipchK.length?`<tr><td>IPCH ${esc(ipchLib)} France</td><td class="num">${ipch[ipchK[ipchK.length-1]]} %</td><td class="num small">${esc(ipchK[ipchK.length-1])}</td></tr>`:''}
    ${cj.jours_feries?`<tr><td>Jours fériés restants ${new Date().getFullYear()}</td><td class="num">${Object.keys(cj.jours_feries).filter(x=>x>=new Date().toISOString().slice(0,10)).length}</td><td></td></tr>`:''}
  </tbody></table></div>
  <div class="s13-actions">
   <button class="s13-btn" id="s13-ademe">Appliquer les facteurs CO₂ ADEME aux hypothèses</button>
   <button class="s13-btn sec" id="s13-prompt">Copier le prompt de digest (Assistant IA)</button>
  </div>
  ${d.co2?`<p class="s12-cap">ADEME : maritime ${esc(String((d.co2.maritime_g_tkm||{}).valeur??'—'))} · routier ${esc(String((d.co2.routier_g_tkm||{}).valeur??'—'))} (${esc((d.co2.provenance||''))}) — l'application écrase les hypothèses éditables du module Géo (réversible dans Données → Géographie & logistique).</p>`:''}`)}
  </div>
  ${(rappels.length||trK.length||pubs.length||baro.climat_commerce_detail_bdf)?`<div class="s12-grid c2">
  ${card('Rappels produits (RappelConso)',rappels.length?`<div class="twrap"><table><thead><tr><th>Date</th><th>Marque</th><th>Motif</th><th>Risque</th></tr></thead><tbody>
    ${rappels.slice(0,12).map(r=>`<tr><td class="small">${esc(r.date||'')}</td><td>${r.lien?`<a href="${esc(r.lien)}" target="_blank" rel="noopener">${esc(r.marque||'—')}</a>`:esc(r.marque||'—')}</td>
      <td class="small">${esc(r.motif||'')}</td><td class="small">${esc(r.risques||'')}</td></tr>`).join('')}
   </tbody></table></div><p class="s12-cap">Rappels officiels du secteur habillement/textile publiés sur les 90 derniers jours — veille de conformité produit et signal fournisseur.</p>`
   :'<p class="s12-cap">Aucun rappel mode/textile sur les 90 derniers jours — ou source indisponible lors de la collecte.</p>')}
  ${card('Secteur — baromètre &amp; tendances',`
   ${trK.length?`<div class="twrap"><table><thead><tr><th>Terme de recherche</th><th class="num">Indice</th><th class="num">12 mois</th></tr></thead><tbody>
    ${trK.map(t=>`<tr><td>${esc(t)}</td><td class="num">${esc(String(trends[t].dernier??'—'))}</td>
      <td class="num ${trends[t].tendance==='▲'?'s12-pos':(trends[t].tendance==='▼'?'s12-neg':'')}">${esc(trends[t].tendance||'')}</td></tr>`).join('')}
   </tbody></table></div><p class="s12-cap">Intérêt de recherche Google (base 100 sur la période) — signal avancé de demande, à lire comme une tendance, pas comme un volume.</p>`:''}
   ${baro.climat_commerce_detail_bdf?`<p class="s12-cap">Banque de France : ${esc(baro.climat_commerce_detail_bdf)}.</p>`:''}
   ${pubs.length?`<div style="margin-top:.5rem">${pubs.slice(0,5).map(a=>`<div class="s13-art"><div class="t"><a href="${esc(a.lien||'#')}" target="_blank" rel="noopener">${esc(a.titre)}</a></div>
     <div class="m">${esc(a.source||'')} · ${esc(a.date||'')}</div></div>`).join('')}</div>`:''}
   ${(!trK.length&&!pubs.length&&!baro.climat_commerce_detail_bdf)?'<p class="s12-cap">Sources sectorielles indisponibles lors de la dernière collecte (voir le rapport de sections).</p>':''}`)}
  </div>`:''}
  ${card('Veille presse sectorielle',`
   <div class="s13-chips"><button data-th="" aria-pressed="${!th}">Tous (${presse.length})</button>
    ${themes.map(t=>`<button data-th="${esc(t)}" aria-pressed="${th===t}">${esc(t)} (${presse.filter(a=>a.theme===t).length})</button>`).join('')}</div>
   ${arts.map(a=>`<div class="s13-art"><div class="t"><span class="s13-theme">${esc(a.theme||'')}</span><a href="${esc(a.lien||'#')}" target="_blank" rel="noopener">${esc(a.titre)}</a></div>
     <div class="m">${esc(a.source||'')} · ${esc(a.date||'')}</div></div>`).join('')||'<p class="s12-cap">Aucun article sur la période.</p>'}`)}`;
 P.querySelector('#s13-reimport').onclick=importFichier;
 P.querySelector('#s13-file').addEventListener('change',onFile);
 const ad=P.querySelector('#s13-ademe'); if(ad)ad.onclick=appliquerAdeme;
 const pr=P.querySelector('#s13-prompt'); if(pr)pr.onclick=copierPrompt;
 P.querySelectorAll('.s13-chips button').forEach(b=>b.onclick=()=>{App.filters.s13theme=b.dataset.th||null;renderVeille();});
}
function renderVeille(){
 const P=document.getElementById('panel-veille2'); if(!P)return;
 window.__EXT=EXT()||null;
 (EXT()?plein:vide)(P);
 badge();
}
function addTab(){
 const main=document.getElementById('main'), nav=document.getElementById('tabs');
 const beforeP=document.getElementById('panel-donnees'), beforeT=document.getElementById('tab-donnees');
 if(!document.getElementById('panel-veille2')){
   const s=document.createElement('section'); s.className='panel'; s.id='panel-veille2'; s.setAttribute('role','tabpanel');
   s.setAttribute('aria-labelledby','tab-veille2'); s.style.setProperty('--tabc',COLV);
   main.insertBefore(s,beforeP||null);}
 if(!document.getElementById('tab-veille2')){
   const b=document.createElement('button'); b.setAttribute('role','tab'); b.id='tab-veille2';
   b.setAttribute('aria-controls','panel-veille2'); b.setAttribute('aria-selected','false'); b.tabIndex=-1;
   b.style.setProperty('--tabc',COLV); b.textContent='Veille & alertes';
   b.addEventListener('click',()=>selectTab('veille2'));
   nav.insertBefore(b,beforeT||null);}
}
function init(){
 App.ov=App.ov||{}; App.filters=App.filters||{};
 addTab();
 if(!window.__s13wrapRA){window.__s13wrapRA=true;
   const _ra=window.renderAll;
   window.renderAll=function(){_ra.apply(this,arguments);try{renderVeille();}catch(e){console.warn('s13',e);}};}
 window.__EXT=EXT()||null;
 renderVeille();
 autoload();
}
document.addEventListener('DOMContentLoaded',boot); boot();
})();
