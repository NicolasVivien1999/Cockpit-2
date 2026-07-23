/* =====================================================================
   Couche 5 — Identité de l'entité (stage14)
   Fiche d'identification complète et éditable dans « Données & paramètres ».
   Les valeurs alimentent l'en-tête du cockpit, les exports, et — via le
   fichier identite.json exporté — le paramétrage de la veille sectorielle
   du pipeline hebdomadaire (code NAF).
   ===================================================================== */
(function(){
'use strict';
function ready(){return (typeof App!=='undefined')&&App.st&&App.st.ident&&document.getElementById('panel-donnees')&&(typeof window.renderDonnees==='function');}
function boot(){if(!ready())return setTimeout(boot,150);init();}

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- référentiels ---------- */
const FORMES=["SAS","SASU","SARL","EURL","SA","SNC","SCS","SCA","SCI","SCM","SCP",
  "Société coopérative (SCOP/SCIC)","GIE","Entreprise individuelle (EI)","Micro-entreprise",
  "Association loi 1901","Fondation","Établissement public","Collectivité territoriale",
  "Groupement d'employeurs","Autre"];
const CATEGORIES=["TPE — moins de 10 salariés","PME — 10 à 249 salariés",
  "ETI — 250 à 4 999 salariés","Grande entreprise — 5 000 salariés et plus"];
const REGIMES_IS=["IS — régime réel normal","IS — régime réel simplifié","IR — BIC réel normal",
  "IR — BIC réel simplifié","IR — micro-BIC","IR — BNC déclaration contrôlée",
  "Non assujetti (association non lucrative)","Autre"];
const REGIMES_TVA=["TVA — réel normal (CA3 mensuelle)","TVA — réel normal (CA3 trimestrielle)",
  "TVA — réel simplifié (CA12)","Franchise en base de TVA","Exonéré / hors champ","Autre"];
const DEVISES=["EUR","USD","GBP","CHF","CAD","XOF","MAD","TND"];

/* Chaque champ : [clé, libellé, type, options|placeholder, aide] */
const SECTIONS=[
 ["Identification légale",[
   ["raison","Dénomination sociale","text","MAISON BASTIDE SAS","Nom officiel inscrit au registre"],
   ["sigle","Nom commercial / enseigne","text","",""],
   ["forme","Forme juridique","select",FORMES,""],
   ["capital","Capital social (€)","num","500000",""],
   ["siren","SIREN","text","512 384 927","9 chiffres — identifiant de l'entité"],
   ["siret","SIRET (siège)","text","512 384 927 00031","14 chiffres — SIREN + NIC de l'établissement"],
   ["tva","N° TVA intracommunautaire","text","FR46 512384927",""],
   ["rcs","Immatriculation (RCS / RNA / RM)","text","RCS Bordeaux 512 384 927","RNA pour une association, RM pour un artisan"],
   ["creation","Date de création","text","12/05/2008",""]]],
 ["Activité & taille",[
   ["naf","Code NAF / APE","text","4771Z","Pilote la veille sectorielle hebdomadaire"],
   ["naf_lib","Libellé de l'activité","text","Commerce de détail d'habillement…",""],
   ["secteur","Secteur déclaré","text","Textile - Habillement",""],
   ["categorie","Catégorie d'entreprise","select",CATEGORIES,""],
   ["effectif","Effectif (personnes)","num","89",""],
   ["tranche_effectif","Tranche d'effectif déclarée","text","50 à 99 salariés",""]]],
 ["Coordonnées du siège",[
   ["adresse","Adresse","text","14 quai de Bacalan",""],
   ["cp","Code postal","text","33300",""],
   ["ville","Commune","text","Bordeaux",""],
   ["region","Région","text","Nouvelle-Aquitaine",""],
   ["pays","Pays","text","France",""]]],
 ["Cadre comptable & fiscal",[
   ["exercice","Exercice social","text","01/01 — 31/12",""],
   ["cloture_n","Clôture N","text","31/12/2025",""],
   ["cloture_n1","Clôture N-1","text","31/12/2024",""],
   ["date_situation","Date de situation","text","30/06/2026",""],
   ["regime_is","Régime d'imposition","select",REGIMES_IS,""],
   ["regime_tva","Régime de TVA","select",REGIMES_TVA,""],
   ["devise","Devise de tenue","select",DEVISES,""],
   ["entite","Entité de consolidation","text","BASTIDE SAS",""]]],
 ["Cadre social & gouvernance",[
   ["ccn","Convention collective (IDCC)","text","Commerce de détail habillement (IDCC 1483)",""],
   ["dirigeant","Représentant légal","text","Prénom NOM — Fonction",""],
   ["cac","Commissaire aux comptes","text","",""],
   ["expert","Expert-comptable","text","",""]]]
];
const CLES=SECTIONS.flatMap(s=>s[1].map(f=>f[0]));


/* =====================================================================
   Identité visuelle : palette de marque & typographie
   La teinte choisie est conservée ; saturation et luminosité sont ramenées
   dans une plage lisible, puis ajustées jusqu'au contraste minimal exigé
   (WCAG). Les couleurs sémantiques (vert = positif, rouge = négatif) ne
   sont jamais remplacées.
   ===================================================================== */
const POLICES={
 editorial:{nom:"Éditorial (défaut)",
   fd:'"Didot","Bodoni MT","Playfair Display",Georgia,"Times New Roman",serif',
   fs:'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'},
 institutionnel:{nom:"Institutionnel",
   fd:'Georgia,"Iowan Old Style","Times New Roman",serif',
   fs:'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif'},
 moderne:{nom:"Moderne",
   fd:'"Segoe UI Semibold",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif',
   fs:'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'},
 humaniste:{nom:"Humaniste",
   fd:'Optima,Candara,"Gill Sans MT","Gill Sans","Trebuchet MS",sans-serif',
   fs:'Candara,"Segoe UI",system-ui,"Trebuchet MS",Arial,sans-serif'},
 compact:{nom:"Compact",
   fd:'"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",Arial,sans-serif',
   fs:'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif'},
 accessible:{nom:"Lisibilité renforcée",
   fd:'Verdana,Tahoma,"DejaVu Sans",Geneva,sans-serif',
   fs:'Verdana,Tahoma,"DejaVu Sans",Geneva,sans-serif'}
};
const ROLES=[
 ["Couleur principale","titres, boutons, en-tête"],
 ["Couleur d'accent","liens, séries de graphiques"],
 ["Secondaire 1","onglets et repères"],
 ["Secondaire 2","onglets et repères"],
 ["Secondaire 3","onglets et repères"]
];
function hex2rgb(h){h=String(h||'').replace('#','').trim();
 if(h.length===3)h=h.split('').map(c=>c+c).join('');
 if(!/^[0-9a-fA-F]{6}$/.test(h))return null;
 return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function rgb2hex(r,g,b){const f=x=>('0'+Math.round(Math.max(0,Math.min(255,x))).toString(16)).slice(-2);
 return '#'+f(r)+f(g)+f(b);}
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;
 if(mx!==mn){const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
  h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4); h/=6;}
 return [h*360,s*100,l*100];}
function hsl2rgb(h,s,l){h=((h%360)+360)%360/360;s/=100;l/=100;
 if(!s)return [l*255,l*255,l*255];
 const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q;
 const f=t=>{t=(t+1)%1;
  if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p;};
 return [f(h+1/3)*255,f(h)*255,f(h-1/3)*255];}
function hsl2hex(h,s,l){const c=hsl2rgb(h,s,l);return rgb2hex(c[0],c[1],c[2]);}
function lumin(hex){const c=hex2rgb(hex); if(!c)return 0;
 const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};
 return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);}
function contraste(a,b){const L1=lumin(a),L2=lumin(b);
 return (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);}
function harmonise(hex,role,sombre){
 const rgb=hex2rgb(hex); if(!rgb)return null;
 let hsl=rgb2hsl(rgb[0],rgb[1],rgb[2]); let h=hsl[0], s=hsl[1];
 const achromatique=(s<8);                       // noir, blanc, gris : on reste neutre
 const fond=sombre?'#12161C':'#F6F4EE';
 if(role==='soft'){
   s=achromatique?0:Math.min(s,sombre?42:38);
   return hsl2hex(h,s,sombre?18:93);
 }
 s=achromatique?0:Math.max(Math.min(s,role==='primaire'?58:64),12);
 const cible=(role==='primaire')?6.0:4.6;
 let l=sombre?72:30;
 const pas=sombre?2:-2;
 for(let i=0;i<34;i++){
   const c=hsl2hex(h,s,l);
   if(contraste(c,fond)>=cible)return c;
   l+=pas; if(l<8||l>94)break;
 }
 return hsl2hex(h,s,sombre?80:18);
}
function TH(){App.ov.theme=App.ov.theme||{};return App.ov.theme;}
/* Rafraîchit l'ensemble du cockpit : l'onglet Accueil et l'en-tête dérivent
   de l'identité, ils doivent suivre chaque modification. */
function rafraichir(){
 try{if(typeof renderAll==='function'){renderAll();return;}}catch(e){console.warn('s14',e);}
 try{donIdentite();}catch(_){}
}
function couleurs(){return (TH().colors||[]).slice(0,5);}
function appliquerTheme(){
 const th=TH(), cols=couleurs().filter(Boolean);
 let st=document.getElementById('s14-theme');
 if(!st){st=document.createElement('style');st.id='s14-theme';document.head.appendChild(st);}
 const morceaux=[];
 if(cols.length){
   const p=c=>harmonise(c,'primaire',false), a=c=>harmonise(c,'accent',false), s=c=>harmonise(c,'soft',false);
   const pd=c=>harmonise(c,'primaire',true), ad=c=>harmonise(c,'accent',true), sd=c=>harmonise(c,'soft',true);
   const c1=cols[0], c2=cols[1]||cols[0], c3=cols[2]||c2, c4=cols[3]||c3, c5=cols[4]||c1;
   morceaux.push(`:root:not(.hc){--navy:${p(c1)};--chalk:${a(c2)};--chalk-soft:${s(c2)};`+
     `--teal:${a(c3)};--orange:${a(c4)};--cockpit:${a(c5)};`+
     `--edit-bg:${s(c1)};--edit-bd:${a(c1)};--stitch2:${s(c1)}}`);
   morceaux.push(`html.dark:not(.hc){--navy:${pd(c1)};--chalk:${ad(c2)};--chalk-soft:${sd(c2)};`+
     `--teal:${ad(c3)};--orange:${ad(c4)};--cockpit:${ad(c5)};`+
     `--edit-bg:${sd(c1)};--edit-bd:${ad(c1)};--stitch2:${sd(c1)}}`);
 }
 const pol=POLICES[th.police];
 if(pol)morceaux.push(`:root{--fd:${pol.fd};--fs:${pol.fs}}`);
 st.textContent=morceaux.join('\n');
 try{if(window.Chart&&App.charts)Object.keys(App.charts).forEach(k=>{try{App.charts[k].update();}catch(_){}});}catch(_){}
}

/* ---------- état ---------- */
function OV(){App.ov.ident=App.ov.ident||{};return App.ov.ident;}
function ID(){return Object.assign({},App.st.ident||{},OV());}
function estModifie(k){return Object.prototype.hasOwnProperty.call(OV(),k);}
function nbModifs(){return Object.keys(OV()).length;}

/* ---------- validation (indicative, jamais bloquante) ---------- */
function controle(k,val){
 const v=String(val==null?'':val).replace(/\s/g,'');
 if(!v)return null;
 if(k==='siren'&&!/^\d{9}$/.test(v))return "Un SIREN comporte 9 chiffres.";
 if(k==='siret'&&!/^\d{14}$/.test(v))return "Un SIRET comporte 14 chiffres.";
 if(k==='naf'&&!/^\d{2}\.?\d{2}[A-Za-z]$/.test(v))return "Format attendu : 4 chiffres + 1 lettre (ex. 4771Z).";
 if(k==='cp'&&!/^\d{5}$/.test(v))return "Un code postal français comporte 5 chiffres.";
 if(k==='tva'&&!/^[A-Za-z]{2}[0-9A-Za-z]{2,13}$/.test(v))return "Format attendu : 2 lettres pays + numéro.";
 return null;
}

/* ---------- en-tête du cockpit ---------- */
function majEntete(){
 const I=ID();
 const meta=document.getElementById('hd-meta');
 if(meta){
   const bouts=[];
   if(I.siren)bouts.push('SIREN '+I.siren);
   if(I.ville)bouts.push(I.ville);
   if(I.secteur)bouts.push(I.secteur);
   if(I.date_situation)bouts.push('Situation au '+I.date_situation);
   bouts.push('Montants en '+(I.devise==='EUR'?'euros':(I.devise||'euros'))+' (affichage k€)');
   meta.textContent=bouts.join(' · ');
 }
 const h1=document.querySelector('.brand h1');
 // Le nom commercial (enseigne) prime sur la dénomination sociale : c'est
 // sous ce nom que l'entité est connue. Repli sur la dénomination si absent.
 const titre=(I.sigle&&String(I.sigle).trim())||(I.raison&&String(I.raison).trim())||'';
 if(h1&&titre&&(estModifie('sigle')||estModifie('raison'))){
   const mots=titre.split(/\s+/);
   h1.innerHTML=mots.length>1
     ? esc(mots[0])+' <em>'+esc(mots.slice(1).join(' '))+'</em>'
     : '<em>'+esc(mots[0])+'</em>';
 }
 if(document.title&&titre)document.title=titre+' — Cockpit 360°';
}

/* ---------- export vers le pipeline ---------- */
function paquetIdentite(){
 const I=ID();
 const out={_lisezmoi:"Fichier d'identité du cockpit. À déposer dans docs/ du dépôt GitHub : "+
   "le pipeline hebdomadaire le lit en priorité pour calibrer la veille sectorielle (code NAF).",
   _genere_le:new Date().toISOString().slice(0,19)};
 CLES.forEach(k=>{if(I[k]!==undefined&&I[k]!=='')out[k]=I[k];});
 const t=TH();
 if((t.colors&&t.colors.filter(Boolean).length)||t.police)out._theme={
   colors:(t.colors||[]).filter(Boolean),police:t.police||null,police_nom:t.police_nom||null};
 return out;
}
function exporter(){
 try{
   const txt=JSON.stringify(paquetIdentite(),null,1);
   const b=new Blob([txt],{type:'application/json'});
   const a=document.createElement('a');
   a.href=URL.createObjectURL(b); a.download='identite.json';
   document.body.appendChild(a); a.click();
   setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},400);
   toast('identite.json téléchargé — déposez-le dans docs/ sur GitHub pour recalibrer la veille.');
 }catch(e){toast('Export impossible : '+e.message);}
}
function importer(ev){
 const f=ev.target.files&&ev.target.files[0]; if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
   try{
     const d=JSON.parse(r.result);
     let n=0;
     CLES.forEach(k=>{if(d[k]!==undefined&&d[k]!==null&&d[k]!==''){OV()[k]=d[k];n++;}});
     if(d._theme&&typeof d._theme==='object'){
       const t=TH();
       if(Array.isArray(d._theme.colors))t.colors=d._theme.colors.filter(c=>hex2rgb(c)).slice(0,5);
       if(d._theme.police&&POLICES[d._theme.police]){t.police=d._theme.police;t.police_nom=POLICES[d._theme.police].nom;}
       appliquerTheme();
     }
     persist(false); majEntete(); rafraichir();
     toast(n+' champ(s) d\u2019identité importé(s).');
   }catch(e){toast('Fichier illisible : '+e.message);}
 };
 r.readAsText(f); ev.target.value='';
}
function reinit(){
 if(!nbModifs()){toast('Aucune modification à annuler.');return;}
 App.ov.ident={};
 persist(false); majEntete();
 try{if(typeof renderAll==='function')renderAll();else renderDonnees();}catch(_){renderDonnees();}
 toast('Identité réinitialisée aux valeurs d\u2019origine.');
}

/* ---------- vue ---------- */
function champ(f){
 const [k,lbl,type,opt,aide]=f;
 const I=ID(); const val=I[k]==null?'':I[k];
 const err=controle(k,val);
 const cls=(estModifie(k)?' dirty':'')+(err?' bad':'');
 let ctrl;
 if(type==='select'){
   const liste=opt.slice();
   if(val&&liste.indexOf(val)<0)liste.unshift(val);
   ctrl=`<select class="s14-in${cls}" data-id14="${k}">`+
        `<option value=""${val?'':' selected'}>—</option>`+
        liste.map(o=>`<option value="${esc(o)}"${o===val?' selected':''}>${esc(o)}</option>`).join('')+
        `</select>`;
 }else{
   ctrl=`<input class="s14-in${cls}" data-id14="${k}" type="${type==='num'?'text':'text'}" `+
        `value="${esc(val)}" placeholder="${esc(type==='select'?'':(opt||''))}" aria-label="${esc(lbl)}">`;
 }
 const hint=err?`<div class="s14-hint ko">${esc(err)}</div>`
                :(aide?`<div class="s14-hint">${esc(aide)}</div>`:'');
 return `<div class="s14-f"><label for="">${esc(lbl)}</label>${ctrl}</div>${hint}`;
}
function donIdentite(){
 const P=document.getElementById('panel-donnees'); if(!P)return;
 const n=nbModifs(); const I=ID(); const cols=couleurs();
 P.innerHTML=`<h2>Données &amp; paramètres</h2>
  <p class="lead">Les tables de faits et référentiels qui alimentent tout le cockpit.</p>
  ${window.__s12subnav?window.__s12subnav('s14ident'):''}
  <h3 style="margin:.2rem 0 .3rem">Identité de l'entité
    <span class="s14-badge ${n?'mod':'ok'}">${n?n+' champ(s) personnalisé(s)':'valeurs d\u2019origine'}</span></h3>
  <p class="s14-intro">Fiche d'identification complète de la société, de l'entité ou de l'association pilotée.
   Ces valeurs alimentent l'en-tête du cockpit, les exports et — via le fichier <b>identite.json</b> — le
   paramétrage de la <b>veille sectorielle hebdomadaire</b> : c'est le <b>code NAF</b> saisi ici qui détermine
   les thèmes de presse, les termes suivis, la catégorie de rappels produits et l'indice de prix collectés.</p>
  <div class="s14-grid">
   ${SECTIONS.map(([titre,champs])=>`<section class="s14-sec"><h4>${esc(titre)}</h4>
     <div class="bd">${champs.map(champ).join('')}</div></section>`).join('')}
  </div>
  <h3 style="margin:1.2rem 0 .3rem">Identité visuelle
    <span class="s14-badge ${cols.length||TH().police?'mod':'ok'}">${cols.length?cols.length+' couleur(s)':'thème d’origine'}${TH().police?' · '+esc(POLICES[TH().police].nom):''}</span></h3>
  <p class="s14-intro">Jusqu'à <b>cinq couleurs</b> de marque et une <b>typographie</b>. Les teintes choisies sont conservées,
   mais leur saturation et leur luminosité sont <b>réharmonisées</b> pour garantir la lisibilité (contraste minimal respecté)
   et éviter les tons criards — la couleur appliquée peut donc différer de la couleur brute, c'est volontaire.
   Le vert « positif » et le rouge « négatif » ne sont jamais remplacés : ils portent un sens.</p>
  <div class="s14-grid">
   <section class="s14-sec"><h4>Palette de marque</h4><div class="bd">
    ${ROLES.map((r,i)=>{const c=cols[i]||'';
      const ap=c?harmonise(c,i===0?'primaire':'accent',false):null;
      return `<div class="s14-col">
        <input type="color" class="s14-wheel" data-col="${i}" value="${esc(c||'#1f3864')}" aria-label="${esc(r[0])}">
        <div class="s14-col-t"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>
        <input type="text" class="s14-hex" data-col="${i}" value="${esc(c)}" placeholder="—" maxlength="7" aria-label="Code hexadécimal ${esc(r[0])}">
        <span class="s14-appl" title="Nuance réellement appliquée">${ap?`<i style="background:${esc(ap)}"></i>${esc(ap)}`:'<i class="off"></i>—'}</span>
        <button class="s14-x" data-clr="${i}" title="Retirer cette couleur" aria-label="Retirer">×</button>
      </div>`;}).join('')}
    <div class="s14-hint" style="grid-column:1">La pastille de droite montre la nuance réellement appliquée après harmonisation.</div>
   </div></section>
   <section class="s14-sec"><h4>Typographie</h4><div class="bd">
    <div class="s14-f"><label>Jeu de polices</label>
     <select class="s14-pol" aria-label="Jeu de polices">
      <option value="">— thème d'origine —</option>
      ${Object.keys(POLICES).map(k=>`<option value="${k}"${TH().police===k?' selected':''}>${esc(POLICES[k].nom)}</option>`).join('')}
     </select></div>
    <div class="s14-hint">Polices présentes sur les systèmes courants : aucun téléchargement, le cockpit reste utilisable hors connexion.</div>
    <div class="s14-apercu">
     <div class="t">${esc(I.raison||'Dénomination')}</div>
     <div class="p">Aperçu du corps de texte — chiffre d'affaires, marge commerciale, excédent brut d'exploitation. 1 234 567 €.</div>
    </div>
    <div class="s14-actions" style="margin:.6rem 0 0">
     <button class="s14-btn sec" id="s14-theme-raz">Réinitialiser le thème</button>
    </div>
   </div></section>
  </div>

  <div class="s14-actions">
   <button class="s14-btn" id="s14-exp">Exporter identite.json</button>
   <button class="s14-btn sec" id="s14-imp">Importer un identite.json</button>
   <button class="s14-btn sec" id="s14-raz">Réinitialiser</button>
   <input type="file" id="s14-file" accept="application/json,.json" style="display:none">
  </div>
  <div class="s14-note"><b>Recalibrer la veille sur GitHub :</b> exportez <b>identite.json</b>, déposez-le
   dans le dossier <b>docs/</b> de votre dépôt (<i>Add file → Upload files</i>), et le prochain
   rafraîchissement hebdomadaire lira le nouveau code NAF <b>${esc(I.naf||'—')}</b> pour recalibrer
   automatiquement thèmes de presse, tendances de recherche, rappels produits et indice de prix.
   Sans ce fichier, le pipeline continue de lire le code NAF inscrit dans le cockpit lui-même.</div>`;
 // sous-navigation
 P.querySelectorAll('.subnav button').forEach(b=>b.addEventListener('click',()=>{
   App.donView=b.dataset.v; renderDonnees();}));
 // saisies
 P.querySelectorAll('.s14-in').forEach(el=>{
   el.addEventListener('change',()=>{
     const k=el.dataset.id14; const brut=el.value;
     const origine=(App.st.ident||{})[k];
     const val=(brut==='')?'':brut;
     if(String(val)===String(origine==null?'':origine))delete OV()[k];
     else OV()[k]=val;
     persist(false); majEntete(); rafraichir();
   });
 });
 // palette & typographie
 const majCouleur=(i,val)=>{
   const t=TH(); t.colors=(t.colors||[]).slice(0,5);
   while(t.colors.length<5)t.colors.push('');
   const v=String(val||'').trim();
   t.colors[i]=(v&&hex2rgb(v))?(v.startsWith('#')?v.toLowerCase():'#'+v.toLowerCase()):'';
   if(!t.colors.filter(Boolean).length)delete t.colors;
   persist(false); appliquerTheme(); rafraichir();
 };
 P.querySelectorAll('.s14-wheel').forEach(el=>{
   el.addEventListener('change',()=>majCouleur(+el.dataset.col,el.value));});
 P.querySelectorAll('.s14-hex').forEach(el=>{
   el.addEventListener('change',()=>{
     const v=el.value.trim();
     if(v&&!hex2rgb(v)){toast('Code couleur non reconnu — format attendu #RRGGBB.');el.value='';return;}
     majCouleur(+el.dataset.col,v);});});
 P.querySelectorAll('.s14-x').forEach(el=>{
   el.addEventListener('click',()=>majCouleur(+el.dataset.clr,''));});
 const sp=P.querySelector('.s14-pol');
 if(sp)sp.addEventListener('change',()=>{
   const t=TH(); if(sp.value){t.police=sp.value;t.police_nom=POLICES[sp.value].nom;}
   else{delete t.police;delete t.police_nom;}
   persist(false); appliquerTheme(); rafraichir();});
 const traz=P.querySelector('#s14-theme-raz');
 if(traz)traz.onclick=()=>{App.ov.theme={};persist(false);appliquerTheme();rafraichir();
   toast('Thème visuel réinitialisé.');};
 P.querySelector('#s14-exp').onclick=exporter;
 P.querySelector('#s14-raz').onclick=reinit;
 P.querySelector('#s14-imp').onclick=()=>P.querySelector('#s14-file').click();
 P.querySelector('#s14-file').addEventListener('change',importer);
}

/* ---------- intégration ---------- */
function init(){
 App.ov=App.ov||{}; OV(); TH();
 appliquerTheme();
 // 1) route la sous-vue + ajoute le bouton dans la sous-navigation
 if(!window.__s14wrapRD){window.__s14wrapRD=true;
   const _rd=window.renderDonnees;
   window.renderDonnees=function(){
     if(App.donView==='s14ident'){try{donIdentite();}catch(e){console.warn('s14',e);}return;}
     _rd.apply(this,arguments);
     try{
       const nav=document.querySelector('#panel-donnees .subnav');
       if(nav&&!nav.querySelector('[data-v="s14ident"]')){
         const b=document.createElement('button'); b.dataset.v='s14ident';
         b.textContent="Identité de l'entité";
         b.addEventListener('click',()=>{App.donView='s14ident';renderDonnees();});
         nav.appendChild(b);}
     }catch(_){}
   };
 }
 // 2) enrichit la sous-navigation partagée (stage12) si elle existe
 if(typeof window.__s12subnav==='function'&&!window.__s14nav){
   window.__s14nav=true;
   const _sn=window.__s12subnav;
   window.__s12subnav=function(cur){
     let h=_sn(cur);
     if(h&&h.indexOf('s14ident')<0){
       h=h.replace('</div>',`<button data-v="s14ident" ${cur==='s14ident'?'aria-current="true"':''}>Identité de l'entité</button></div>`);
     }
     return h;
   };
 }
 // 3) l'en-tête reflète l'identité à chaque rendu
 if(!window.__s14wrapRA&&typeof window.renderAll==='function'){window.__s14wrapRA=true;
   const _ra=window.renderAll;
   window.renderAll=function(){_ra.apply(this,arguments);try{majEntete();}catch(e){console.warn('s14',e);}};
 }
 majEntete();
 try{renderDonnees();}catch(_){}
}
document.addEventListener('DOMContentLoaded',boot); boot();
})();
