(function(){
  function getApp(){
    try { return typeof App !== "undefined" ? App : null; }
    catch(e){ return null; }
  }

  const panelByPole = {
    "Finance":"etats",
    "Trésorerie":"treso",
    "RH":"rh",
    "Commercial":"commercial",
    "Achats":"achats",
    "Production":"prod",
    "RSE & Risques":"rse"
  };

  function fmtScore(r){
    return `${r.score}/100 · ${r.feu}`;
  }

  function gotoPanel(k){
    if(typeof selectTab === "function"){
      selectTab(k);
      return;
    }

    document.querySelectorAll(".panel").forEach(p => {
      p.classList.toggle("active", p.id === "panel-" + k);
    });

    document.querySelectorAll("#tabs [role=tab]").forEach(t => {
      const on = t.id === "tab-" + k;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
    });
  }

  function build(){
    const app = getApp();
    if(!app || !app.C || !app.C.sc || !app.C.sc.rows) return false;

    let host = document.getElementById("stage4-filter");
    if(!host){
      host = document.createElement("div");
      host.id = "stage4-filter";
      host.className = "stage4-filter";

      const tabs = document.getElementById("tabs");
      tabs.insertAdjacentElement("afterend", host);
    }

    const rows = app.C.sc.rows;
    const poles = [...new Set(rows.map(r => r.pole))];

    host.innerHTML = `
      <div class="stage4-box">
        <div class="stage4-controls">
          <strong>Exploration transversale</strong>

          <select id="stage4-pole" aria-label="Filtrer par pôle">
            <option value="">Tous les pôles</option>
            ${poles.map(p => `<option value="${p}">${p}</option>`).join("")}
          </select>

          <select id="stage4-feu" aria-label="Filtrer par feu">
            <option value="">Tous les feux</option>
            <option value="rouge">Rouge</option>
            <option value="orange">Orange</option>
            <option value="vert">Vert</option>
          </select>

          <input id="stage4-q" type="search" placeholder="Rechercher un indicateur…" aria-label="Rechercher un indicateur">
        </div>

        <div class="stage4-results" id="stage4-results"></div>
      </div>
    `;

    function render(){
      const pole = document.getElementById("stage4-pole").value;
      const feu = document.getElementById("stage4-feu").value;
      const q = document.getElementById("stage4-q").value.toLowerCase();

      const out = rows
        .filter(r => !pole || r.pole === pole)
        .filter(r => !feu || r.feu === feu)
        .filter(r => !q || r.lib.toLowerCase().includes(q) || r.pole.toLowerCase().includes(q))
        .sort((a,b) => a.score - b.score)
        .slice(0,12);

      document.getElementById("stage4-results").innerHTML = out.map(r => `
        <div class="stage4-item ${r.feu}" data-pole="${r.pole}">
          <strong>${r.lib}</strong>
          <span class="meta">${r.pole} · ${fmtScore(r)}</span>
        </div>
      `).join("");
    }

    host.querySelectorAll("select,input").forEach(el => {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    host.addEventListener("click", e => {
      const item = e.target.closest(".stage4-item");
      if(!item) return;

      const panel = panelByPole[item.dataset.pole] || "cockpit";
      gotoPanel(panel);
    });

    render();
    return true;
  }

  function refresh(){
    setTimeout(() => requestAnimationFrame(build), 150);
  }

  function boot(){
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if(build() || tries > 40) clearInterval(timer);
    }, 250);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.body.addEventListener("change", e => {
    if(e.target.closest("input.edit")) refresh();
  });

  document.body.addEventListener("click", e => {
    if(e.target.closest("#b-reset, .chip, .subnav button")) refresh();
  });

  window.EPM_STAGE4_REFRESH = refresh;
})();