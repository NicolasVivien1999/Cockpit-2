(function(){
  function getApp(){
    try { return typeof App !== "undefined" ? App : null; }
    catch(e){ return null; }
  }

  const nf = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1});
  const nf0 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});

  function fmtUnit(un,v){
    if(!Number.isFinite(v)) return "—";
    if(un === "%") return nf.format(v * 100) + " %";
    if(un === "k€") return nf0.format(v / 1000) + " k€";
    if(un === "€") return nf0.format(v) + " €";
    if(un === "j") return nf.format(v) + " j";
    if(un === "mois") return nf.format(v) + " mois";
    if(un === "x") return nf.format(v) + "x";
    if(un === "ans") return nf.format(v) + " ans";
    if(un === "h") return nf.format(v) + " h";
    if(un === "nb") return nf.format(v);
    return nf.format(v);
  }

  function findKpi(C, code){
    return C.sc?.rows?.find(r => r.code === code);
  }

  function statusFromThresholds(r){
    if(!r) return "warning";

    const v = r.val;
    const seuil = r.seuil;
    const cible = r.cible;

    if(!Number.isFinite(v) || !Number.isFinite(seuil) || !Number.isFinite(cible)){
      return "warning";
    }

    if(r.sens === "haut"){
      if(v < seuil) return "critical";
      if(v < cible) return "warning";
      return "good";
    }

    if(r.sens === "bas"){
      if(v > seuil) return "critical";
      if(v > cible) return "warning";
      return "good";
    }

    return "warning";
  }

  function dynamicSentence(r){
    if(!r) return "";

    const val = fmtUnit(r.un, r.val);
    const seuil = fmtUnit(r.un, r.seuil);
    const cible = fmtUnit(r.un, r.cible);

    if(r.sens === "haut"){
      if(r.val < r.seuil){
        return `${r.lib} ressort à ${val}, sous le seuil d’alerte de ${seuil}. Le signal est défavorable et nécessite une action prioritaire.`;
      }

      if(r.val < r.cible){
        return `${r.lib} ressort à ${val}. L’indicateur est au-dessus du seuil d’alerte de ${seuil}, mais reste inférieur à la cible de ${cible}.`;
      }

      return `${r.lib} ressort à ${val}, au niveau ou au-dessus de la cible de ${cible}. Le signal est favorable.`;
    }

    if(r.sens === "bas"){
      if(r.val > r.seuil){
        return `${r.lib} ressort à ${val}, au-dessus du seuil d’alerte de ${seuil}. Le dépassement constitue un point de risque.`;
      }

      if(r.val > r.cible){
        return `${r.lib} ressort à ${val}. L’indicateur est sous le seuil d’alerte de ${seuil}, mais reste supérieur à la cible de ${cible}.`;
      }

      return `${r.lib} ressort à ${val}, au niveau ou en dessous de la cible de ${cible}. Le signal est favorable.`;
    }

    return `${r.lib} ressort à ${val}.`;
  }

  function card(title, r){
    const type = statusFromThresholds(r);

    return `
      <div class="narrative-card ${type}">
        <strong>${title}</strong>
        <p>${dynamicSentence(r)}</p>
      </div>`;
  }

  function injectAfterKpis(panelId, html){
    const p = document.getElementById(panelId);
    if(!p) return;

    p.querySelectorAll(".narrative-stage3").forEach(e => e.remove());

    const wrap = document.createElement("div");
    wrap.className = "narrative-stage3";
    wrap.innerHTML = html;

    const kpis = p.querySelector(".kpis");
    if(kpis) kpis.insertAdjacentElement("afterend", wrap);
    else p.appendChild(wrap);
  }

  function inject(){
    const app = getApp();
    if(!app || !app.C || !app.C.sc) return false;

    const C = app.C;

    injectAfterKpis("panel-cockpit", `
      <div class="card">
        <h3>Narration automatique — synthèse direction</h3>
        <div class="narrative-grid">
          ${card("Rentabilité", findKpi(C,"FIN_RN"))}
          ${card("Trésorerie", findKpi(C,"TRE_NETTE"))}
          ${card("Runway", findKpi(C,"TRE_RUNWAY"))}
          ${card("Stocks", findKpi(C,"ACH_DORM"))}
        </div>
      </div>
    `);

    injectAfterKpis("panel-rh", `
      <div class="card">
        <h3>Narration automatique — social</h3>
        <div class="narrative-grid">
          ${card("Absentéisme", findKpi(C,"RH_ABS"))}
          ${card("Turnover", findKpi(C,"RH_TURN"))}
          ${card("Masse salariale / CA", findKpi(C,"RH_MSCA"))}
          ${card("Intérim", findKpi(C,"RH_INTER"))}
        </div>
      </div>
    `);

    injectAfterKpis("panel-commercial", `
      <div class="card">
        <h3>Narration automatique — commercial</h3>
        <div class="narrative-grid">
          ${card("Croissance", findKpi(C,"COM_CROIS"))}
          ${card("Pipeline", findKpi(C,"COM_TRANSF"))}
          ${card("Concentration clients", findKpi(C,"COM_TOP5"))}
          ${card("Remises", findKpi(C,"COM_REMISE"))}
        </div>
      </div>
    `);

    injectAfterKpis("panel-achats", `
      <div class="card">
        <h3>Narration automatique — achats & stocks</h3>
        <div class="narrative-grid">
          ${card("Dépendance fournisseur", findKpi(C,"ACH_DEP1"))}
          ${card("Service fournisseurs", findKpi(C,"ACH_SERV"))}
          ${card("Stock dormant", findKpi(C,"ACH_DORM"))}
          ${card("Couverture stock", findKpi(C,"ACH_COUV"))}
        </div>
      </div>
    `);

    injectAfterKpis("panel-atterrissage", `
      <div class="card">
        <h3>Narration automatique — atterrissage</h3>
        <div class="narrative-grid">
          ${card("Croissance CA", findKpi(C,"COM_CROIS"))}
          ${card("Taux EBE", findKpi(C,"FIN_EBE"))}
          ${card("CAF", findKpi(C,"FIN_CAF"))}
          ${card("Résultat net", findKpi(C,"FIN_RN"))}
        </div>
      </div>
    `);

    return true;
  }

  function refresh(){
    setTimeout(() => {
      window.requestAnimationFrame(inject);
    }, 120);
  }

  function boot(){
    let tries = 0;

    const timer = setInterval(() => {
      tries++;
      if(inject() || tries > 40) clearInterval(timer);
    }, 250);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.body.addEventListener("change", e => {
    if(e.target.closest("input.edit")){
      refresh();
    }
  });

  document.body.addEventListener("click", e => {
    if(e.target.closest(".chip, .subnav button, #b-reset")){
      refresh();
    }
  });

  window.EPM_STAGE3_REFRESH = refresh;
})();