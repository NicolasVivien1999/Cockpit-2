(function(){
  function getApp(){
    try { return typeof App !== "undefined" ? App : null; }
    catch(e){ return null; }
  }

  function ensureAssistantTab(){
    const tabs = document.getElementById("tabs");
    const main = document.getElementById("main");
    if(!tabs || !main) return false;

    if(!document.getElementById("tab-assistant")){
      const tab = document.createElement("button");
      tab.id = "tab-assistant";
      tab.setAttribute("role","tab");
      tab.setAttribute("aria-controls","panel-assistant");
      tab.setAttribute("aria-selected","false");
      tab.tabIndex = -1;
      tab.style.setProperty("--tabc","#6B4FA3");
      tab.textContent = "Assistant IA";

      tab.addEventListener("click", function(){
        document.querySelectorAll("#tabs [role=tab]").forEach(t=>{
          t.setAttribute("aria-selected","false");
          t.tabIndex = -1;
        });

        document.querySelectorAll(".panel").forEach(p=>{
          p.classList.remove("active");
        });

        tab.setAttribute("aria-selected","true");
        tab.tabIndex = 0;

        const panel = document.getElementById("panel-assistant");
        if(panel) panel.classList.add("active");
      });

      tabs.appendChild(tab);
    }

    if(!document.getElementById("panel-assistant")){
      const panel = document.createElement("section");
      panel.className = "panel";
      panel.id = "panel-assistant";
      panel.setAttribute("role","tabpanel");
      panel.setAttribute("tabindex","0");
      panel.setAttribute("aria-labelledby","tab-assistant");
      panel.style.setProperty("--tabc","#6B4FA3");
      main.appendChild(panel);
    }

    return true;
  }

  function fmt(un,v){
    if(!Number.isFinite(v)) return "—";
    const nf = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1});
    const nf0 = new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});

    if(un === "%") return nf.format(v*100)+" %";
    if(un === "k€") return nf0.format(v/1000)+" k€";
    if(un === "€") return nf0.format(v)+" €";
    if(un === "j") return nf.format(v)+" j";
    if(un === "mois") return nf.format(v)+" mois";
    return nf.format(v)+(un ? " "+un : "");
  }

  function selectedRows(C, scope){
    const rows = C.sc.rows || [];
    if(scope === "red") return rows.filter(r => r.feu === "rouge");
    if(scope === "watch") return rows.filter(r => r.feu === "rouge" || r.feu === "orange");
    return rows;
  }

  function buildPrompt(mode, scope){
    const app = getApp();
    if(!app || !app.C || !app.st) return "Données du cockpit indisponibles.";

    const C = app.C;
    const st = app.st;
    const ident = st.ident || {};
    const rows = selectedRows(C, scope).sort((a,b)=>a.score-b.score);

    const kpis = rows.map(r =>
`- ${r.pole} | ${r.lib}
  Valeur : ${fmt(r.un,r.val)}
  Seuil : ${fmt(r.un,r.seuil)}
  Cible : ${fmt(r.un,r.cible)}
  Sens : ${r.sens}
  Score : ${r.score}/100
  Feu : ${r.feu}`
    ).join("\n");

    return `Tu es consultant senior en stratégie, contrôle de gestion, contrôle de gestion sociale, data analyse et BI.

CONTEXTE ENTREPRISE
- Raison sociale : ${ident.raison || "à compléter"}
- Secteur : ${ident.secteur || "à compléter"}
- Activité / code NAF : ${ident.naf_lib || ident.naf || "à compléter"}
- Localisation : ${ident.ville || "à compléter"}
- Effectif : ${ident.effectif || "à compléter"}
- Devise : ${ident.devise || "EUR"}
- Date de situation : ${ident.date_situation || "à compléter"}

MODE D’ANALYSE DEMANDÉ
${mode}

SYNTHÈSE DU COCKPIT
- Score global de santé : ${C.sc.global}/100
- Scores par pôle :
${C.sc.poleScores.map(p => `  - ${p.pole} : ${p.score}/100`).join("\n")}

INDICATEURS À ANALYSER
${kpis}

MISSION
1. Identifier les priorités stratégiques et opérationnelles.
2. Distinguer les signaux critiques, les signaux sous surveillance et les signaux conformes.
3. Proposer des hypothèses explicatives prudentes, sans inventer de données absentes.
4. Suggérer les analyses complémentaires à mener.
5. Proposer des pistes d’action adaptées à une PME/TPE.
6. Identifier les benchmarks ou bonnes pratiques sectorielles à rechercher.
7. Indiquer quelles données externes seraient utiles : marché, concurrence, technologie, réglementation, sourcing, emploi, prix, financement.

CONTRAINTES
- Ne pas supposer de données non fournies.
- Si une recommandation dépend d’un contexte non disponible, l’indiquer clairement.
- Prioriser les actions selon impact, urgence et faisabilité.
- Produire une réponse structurée et exploitable par un dirigeant non spécialiste.`;
  }

  function renderAssistant(){
    if(!ensureAssistantTab()) return false;

    const panel = document.getElementById("panel-assistant");
    if(!panel) return false;

    panel.innerHTML = `
      <h2>Assistant stratégique IA</h2>
      <p class="lead">
        Générateur de prompt structuré à partir des données recalculées du cockpit.
      </p>

      <div class="card ai-prompt-stage5">
        <h3>Génération du prompt</h3>

        <div class="ai-prompt-tools">
          <select id="ai-mode">
            <option>Diagnostic stratégique global</option>
            <option>Contrôle de gestion financier</option>
            <option>Contrôle de gestion sociale</option>
            <option>Plan de redressement trésorerie</option>
            <option>Analyse commerciale et croissance</option>
            <option>Benchmark sectoriel et veille concurrentielle</option>
            <option>Analyse data / BI / indicateurs complémentaires</option>
          </select>

          <select id="ai-scope">
            <option value="watch">KPI rouges + orange</option>
            <option value="red">KPI rouges uniquement</option>
            <option value="all">Tous les KPI</option>
          </select>

          <button class="primary" id="ai-refresh">Générer</button>
          <button id="ai-copy">Copier</button>
        </div>

        <div class="ai-prompt-box">
          <textarea id="ai-prompt-output"></textarea>
        </div>
      </div>
    `;

    const out = panel.querySelector("#ai-prompt-output");
    const mode = panel.querySelector("#ai-mode");
    const scope = panel.querySelector("#ai-scope");

    function refresh(){
      out.value = buildPrompt(mode.value, scope.value);
    }

    panel.querySelector("#ai-refresh").addEventListener("click", refresh);
    mode.addEventListener("change", refresh);
    scope.addEventListener("change", refresh);

    panel.querySelector("#ai-copy").addEventListener("click", async ()=>{
      await navigator.clipboard.writeText(out.value);
      panel.querySelector("#ai-copy").textContent = "Copié";
      setTimeout(()=>panel.querySelector("#ai-copy").textContent = "Copier",1200);
    });

    refresh();
    return true;
  }

  function boot(){
    let tries = 0;
    const timer = setInterval(()=>{
      tries++;
      if(renderAssistant() || tries > 40) clearInterval(timer);
    },250);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const tabs = document.getElementById("tabs");
  if(tabs){
    const observer = new MutationObserver(()=>{
      setTimeout(renderAssistant,100);
    });
    observer.observe(tabs,{childList:true});
  }

  document.body.addEventListener("change", e=>{
    if(e.target.closest("input.edit")) setTimeout(renderAssistant,180);
  });

  document.body.addEventListener("click", e=>{
    if(e.target.closest("#b-reset")) setTimeout(renderAssistant,220);
  });

  window.EPM_STAGE5_AI_PROMPT_REFRESH = renderAssistant;
})();