(function(){
  function A(){
    try { return typeof App !== "undefined" ? App : null; }
    catch(e){ return null; }
  }

  const fmtK = v => Number.isFinite(v)
    ? new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(v/1000)+" k€"
    : "—";

  const fmtPct = v => Number.isFinite(v)
    ? new Intl.NumberFormat("fr-FR",{style:"percent",maximumFractionDigits:1}).format(v)
    : "—";

  const fmtN = v => Number.isFinite(v)
    ? new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(v)
    : "—";

  const tone = v => v < 0 ? "neg" : v > 0 ? "pos" : "";

  function node(label,value,level=0,extra=""){
    return `
      <div class="driver-node level-${level} ${extra}">
        <strong>${label}</strong>
        <span class="v">${value}</span>
      </div>`;
  }

  function block(title,html,note=""){
    return `
      <div class="card">
        <h3>${title}</h3>
        <div class="driver-tree">${html}</div>
        ${note ? `<p class="driver-note">${note}</p>` : ""}
      </div>`;
  }

  function injectAfterKpis(panelId, html){
    const p = document.getElementById(panelId);
    if (!p) return;
    p.querySelectorAll(".driver-stage2").forEach(e => e.remove());

    const wrap = document.createElement("div");
    wrap.className = "driver-stage2";
    wrap.innerHTML = html;

    const kpis = p.querySelector(".kpis");
    if (kpis) kpis.insertAdjacentElement("afterend", wrap);
    else p.appendChild(wrap);
  }

  function inject(){
    const app = A();
    if (!app || !app.C) return false;

    const C = app.C;
    const V = C.sc && C.sc.V ? C.sc.V : {};

    injectAfterKpis("panel-cockpit", `
      <div class="driver-grid">
        ${block("Driver tree — Rentabilité 2025", `
          ${node("Résultat net", fmtK(C.s25?.rn), 0, tone(C.s25?.rn))}
          ${node("Résultat d’exploitation", fmtK(C.s25?.rex), 1, tone(C.s25?.rex))}
          ${node("EBE", fmtK(C.s25?.ebe), 2, tone(C.s25?.ebe))}
          ${node("Chiffre d’affaires", fmtK(C.s25?.ca), 2)}
          ${node("Marge commerciale", fmtK(C.s25?.mc)+" · "+fmtPct(C.s25?.mc/C.s25?.ca), 2)}
        `)}
        ${block("Driver tree — Trésorerie", `
          ${node("Trésorerie nette 30/06/26", fmtK(C.t26?.tn0626), 0, tone(C.t26?.tn0626))}
          ${node("Point bas 2026", fmtK(C.t26?.pointBas), 1, "warn")}
          ${node("Runway", fmtN(C.t26?.runway)+" mois", 2, C.t26?.runway < 4 ? "warn" : "pos")}
        `)}
      </div>
    `);

    injectAfterKpis("panel-rh", `
      <div class="driver-grid">
        ${block("Driver tree — Social", `
          ${node("Masse salariale 2025", fmtK(C.rh?.p25?.ms), 0)}
          ${node("Atterrissage MS 2026", fmtK(C.rh?.msAttT), 1)}
          ${node("Écart total", fmtK(C.rh?.ecartTotal), 1, tone(C.rh?.ecartTotal))}
          ${node("Effet effectif", fmtK(C.rh?.effetEffectif), 2, tone(C.rh?.effetEffectif))}
          ${node("Effet coût moyen", fmtK(C.rh?.effetCout), 2, tone(C.rh?.effetCout))}
        `)}
        ${block("Driver tree — Tensions RH", `
          ${node("Absentéisme", fmtPct(V.RH_ABS), 0, V.RH_ABS > .055 ? "warn" : "pos")}
          ${node("Intérim / masse salariale", fmtPct(V.RH_INTER), 1, V.RH_INTER > .06 ? "neg" : "pos")}
          ${node("Turnover", fmtPct(C.rh?.turnover), 1, C.rh?.turnover > .18 ? "warn" : "pos")}
          ${node("GVT", fmtPct(C.rh?.gvt), 1, C.rh?.gvt > .03 ? "warn" : "pos")}
        `)}
      </div>
    `);

    injectAfterKpis("panel-atterrissage", `
      <div class="driver-grid">
        ${block("Driver tree — Atterrissage EBE", `
          ${node("EBE tendanciel", fmtK(C.att?.attT?.ebe), 0, tone(C.att?.attT?.ebe))}
          ${node("Budget EBE", fmtK(C.att?.bud?.ebe), 1)}
          ${node("Écart vs budget", fmtK((C.att?.attT?.ebe||0)-(C.att?.bud?.ebe||0)), 1, "neg")}
          ${node("CA tendanciel", fmtK(C.att?.attT?.ca), 2)}
          ${node("Marge tendancielle", fmtK(C.att?.attT?.marge), 2)}
        `)}
      </div>
    `);

    injectAfterKpis("panel-commercial", `
      <div class="driver-grid">
        ${block("Driver tree — Performance commerciale", `
          ${node("Croissance CA atterrissage", fmtPct(V.COM_CROIS), 0, V.COM_CROIS < .04 ? "warn" : "pos")}
          ${node("Transformation pipeline", fmtPct(V.COM_TRANSF), 1, V.COM_TRANSF < .55 ? "warn" : "pos")}
          ${node("Concentration top 5 wholesale", fmtPct(V.COM_TOP5), 1, V.COM_TOP5 > .60 ? "warn" : "pos")}
          ${node("Taux de remise moyen", fmtPct(V.COM_REMISE), 1, V.COM_REMISE > .11 ? "warn" : "pos")}
        `)}
      </div>
    `);

    injectAfterKpis("panel-achats", `
      <div class="driver-grid">
        ${block("Driver tree — Stocks & achats", `
          ${node("DIO comptable", fmtN(V.TRE_DIO)+" j", 0, V.TRE_DIO > 150 ? "neg" : "pos")}
          ${node("Part de stock dormant", fmtPct(V.ACH_DORM), 1, V.ACH_DORM > .15 ? "neg" : "pos")}
          ${node("Dépendance 1er fournisseur", fmtPct(V.ACH_DEP1), 1, V.ACH_DEP1 > .35 ? "warn" : "pos")}
          ${node("Taux de service fournisseurs", fmtPct(V.ACH_SERV), 1, V.ACH_SERV < .92 ? "warn" : "pos")}
        `)}
      </div>
    `);

    return true;
  }

  function boot(){
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (inject() || tries > 40) clearInterval(t);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
``