/* =====================================================================
   Étape 6b — Ajustement des graphiques à l'impression
   Chart.js dimensionne ses canvas sur la taille écran ; à l'impression,
   les encarts rétrécissent mais le redimensionnement (ResizeObserver)
   est asynchrone et arrive après la capture PDF → les graphiques
   débordent. On force donc un resize SYNCHRONE sur beforeprint, quand
   la CSS d'impression est déjà appliquée.
   ===================================================================== */
(function(){
'use strict';
function eachChart(fn){
  if(typeof App==='undefined'||!App||!App.charts)return;
  for(const id in App.charts){ try{ const c=App.charts[id]; if(c)fn(c); }catch(_){ } }
}
function fitAll(){ eachChart(c=>{ c.resize(); c.update('none'); }); }

// beforeprint : la CSS @media print est active → les conteneurs ont leur taille finale
window.addEventListener('beforeprint', fitAll);
// afterprint : on rétablit la taille écran (en plus du handler natif du cockpit)
window.addEventListener('afterprint', ()=>{ setTimeout(fitAll, 60); });

// Filet de sécurité : si l'impression est déclenchée par matchMedia (certains flux)
try{
  const mq=window.matchMedia('print');
  const onCh=e=>{ if(e.matches)fitAll(); else setTimeout(fitAll,60); };
  if(mq.addEventListener)mq.addEventListener('change',onCh);
  else if(mq.addListener)mq.addListener(onCh);
}catch(_){ }
})();
