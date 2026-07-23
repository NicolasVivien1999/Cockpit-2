(function epmStage1Ux(){
  const all = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function classifyKpis(){
    all('.kpi').forEach(kpi => {
      const text = (kpi.textContent || '').toLowerCase();

      if (/alerte|tension|négatif|risque|perte|critique|cbc|dormant|retour|turnover|intérim/.test(text)) {
        kpi.classList.add('ux-risk');
      } else if (/cible|excellent|ok|maîtrisé|service|trs|marge|valorisation/.test(text)) {
        kpi.classList.add('ux-good');
      } else if (/surveillance|budget|atterrissage|écart|prévision|runway/.test(text)) {
        kpi.classList.add('ux-watch');
      }

      kpi.setAttribute('tabindex','0');
      kpi.setAttribute('role','group');
    });
  }

  function improveTables(){
    all('.twrap table').forEach(table => {
      if (!table.getAttribute('role')) table.setAttribute('role','table');
      all('th', table).forEach(th => th.setAttribute('scope','col'));
    });
  }

  function addPanelLandmarks(){
    all('.panel').forEach(panel => {
      if (!panel.getAttribute('aria-label')) {
        const title = panel.querySelector('h2')?.textContent?.trim();
        if (title) panel.setAttribute('aria-label', title);
      }
    });
  }

  function run(){
    classifyKpis();
    improveTables();
    addPanelLandmarks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  const main = document.getElementById('main');
  if (main) {
    const mo = new MutationObserver(() => window.requestAnimationFrame(run));
    mo.observe(main,{childList:true,subtree:true});
  }
})();