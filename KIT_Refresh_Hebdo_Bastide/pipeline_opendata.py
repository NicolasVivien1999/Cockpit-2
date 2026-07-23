#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pipeline open data — Cockpit Maison Bastide (version CI / GitHub Actions)
=========================================================================
Version autonome du notebook Pipeline_OpenData_Bastide.ipynb :
- lit les référentiels dans referentiels/*.csv (sinon jeu de démonstration) ;
- collecte : Etalab, BCE (Frankfurter), BODACC, Google News RSS, ADEME
  Base Carbone, Eurostat, Banque mondiale (coton), jours fériés ;
- bonus : si la variable d'environnement PAPPERS_TOKEN est définie,
  enrichit aussi via Pappers (comptes annuels, forme juridique) ;
- écrit docs/cockpit_data_v2.json (servable via GitHub Pages).

Conception défensive : chaque section gère ses échecs (⚠ dans le rapport),
le JSON est produit avec ce qui a réussi. Code de sortie 0 sauf si aucune
écriture n'est possible.
"""
import os, re, sys, json, time
from datetime import date, datetime, timedelta

import requests
import pandas as pd
import feedparser

# ── Configuration ────────────────────────────────────────────────────────────
SORTIE        = os.environ.get("SORTIE_JSON", "docs/cockpit_data_v2.json")
PAUSE         = 0.4
JOURS_VEILLE  = 14
MAX_ARTICLES  = 80
PAPPERS_TOKEN = os.environ.get("PAPPERS_TOKEN")  # optionnel

# Chemin du cockpit d'où l'on lit l'identité de l'entreprise (secteur, NAF, ville).
# Modifiable par variable d'environnement COCKPIT_HTML.
COCKPIT_HTML  = os.environ.get("COCKPIT_HTML", "")
CHEMINS_HTML  = [COCKPIT_HTML] if COCKPIT_HTML else [
    "docs/index.html", "index.html",
    "docs/COCKPIT_360_BASTIDE_Couche4.html", "COCKPIT_360_BASTIDE_Couche4.html",
]

RSS_PERSO = []  # flux RSS additionnels, quel que soit le secteur

# ── Profils sectoriels ───────────────────────────────────────────────────────
# Indexés par les 2 premiers chiffres du code NAF (division NACE). Chaque profil
# pilote : les thèmes de veille presse, les termes Google Trends, la facette
# RappelConso, l'indice de prix Eurostat (COICOP) et la matière première suivie.
PROFILS = {
    ("13", "14", "47.71", "47.72"): {
        "nom": "Mode, textile & habillement",
        "themes": {
            "Prêt-à-porter & retail":   'prêt-à-porter enseigne OR boutique France',
            "Textile & sourcing":       'textile sourcing OR "near-shoring" OR coton prix',
            "E-commerce mode":          'e-commerce mode habillement France',
            "Conjoncture consommation": 'consommation habillement France INSEE',
        },
        "trends": ["seconde main mode", "lin vêtement", "manteau laine", "robe été"],
        "rappel_facette": "Vêtements, accessoires de mode",
        "coicop": ("CP03", "Habillement et chaussures"),
        "matiere": ("Cotton", "coton"),
    },
    ("10", "11", "47.11", "56"): {
        "nom": "Agroalimentaire & restauration",
        "themes": {
            "Filière alimentaire":      'filière alimentaire France industrie agroalimentaire',
            "Matières premières":       'prix blé OR sucre OR huile matière première alimentaire',
            "Distribution & restauration": 'grande distribution OR restauration France chiffres',
            "Réglementation sanitaire": 'sécurité alimentaire réglementation France',
        },
        "trends": ["produits locaux", "bio alimentation", "livraison repas", "vrac"],
        "rappel_facette": "Alimentation",
        "coicop": ("CP01", "Produits alimentaires et boissons non alcoolisées"),
        "matiere": ("Wheat", "blé"),
    },
    ("41", "42", "43", "23"): {
        "nom": "Construction & BTP",
        "themes": {
            "Marché de la construction": 'construction bâtiment France mises en chantier',
            "Matériaux & coûts":         'prix matériaux construction acier ciment',
            "Réglementation & normes":   'RE2020 OR rénovation énergétique réglementation',
            "Commande publique":         'appels offres travaux publics France',
        },
        "trends": ["rénovation énergétique", "pompe à chaleur", "isolation maison", "extension maison"],
        "rappel_facette": None,
        "coicop": ("CP04", "Logement, eau, électricité"),
        "matiere": ("Steel", "acier"),
    },
    ("62", "63", "58", "26"): {
        "nom": "Numérique & informatique",
        "themes": {
            "Marché IT & logiciels":  'marché logiciel France ESN chiffres',
            "Cybersécurité":          'cybersécurité entreprise France attaque',
            "IA & innovation":        'intelligence artificielle entreprise France adoption',
            "Réglementation données": 'RGPD OR AI Act OR NIS2 conformité entreprise',
        },
        "trends": ["cybersécurité", "intelligence artificielle", "cloud souverain", "logiciel gestion"],
        "rappel_facette": None,
        "coicop": ("CP08", "Communications"),
        "matiere": None,
    },
    ("86", "87", "88", "21"): {
        "nom": "Santé & médico-social",
        "themes": {
            "Politique de santé":     'politique santé France financement établissements',
            "Tarification & ONDAM":   'ONDAM OR tarification hospitalière France',
            "Ressources humaines":    'pénurie soignants recrutement santé France',
            "Réglementation":         'HAS OR certification établissement santé',
        },
        "trends": ["téléconsultation", "maison de santé", "aide à domicile", "mutuelle santé"],
        "rappel_facette": "Hygiène-Beauté",
        "coicop": ("CP06", "Santé"),
        "matiere": None,
    },
    ("49", "50", "51", "52", "53"): {
        "nom": "Transport & logistique",
        "themes": {
            "Fret & supply chain":  'fret transport routier France coûts',
            "Carburants & énergie": 'prix gazole professionnel transport France',
            "Logistique & entrepôts": 'logistique entrepôt France immobilier',
            "Réglementation transport": 'réglementation transport routier Europe',
        },
        "trends": ["livraison express", "transport routier", "logistique verte", "fret maritime"],
        "rappel_facette": None,
        "coicop": ("CP07", "Transports"),
        "matiere": ("Crude oil, Brent", "pétrole Brent"),
    },
    ("69", "70", "71", "73"): {
        "nom": "Conseil & services aux entreprises",
        "themes": {
            "Marché du conseil":      'marché conseil France cabinets chiffres',
            "Conjoncture entreprises": 'défaillances entreprises France conjoncture',
            "Réglementation & normes": 'CSRD OR réglementation comptable entreprises France',
            "Talents & recrutement":   'recrutement cadres France tension marché',
        },
        "trends": ["conseil en gestion", "audit financier", "transformation digitale", "CSRD"],
        "rappel_facette": None,
        "coicop": None,
        "matiere": None,
    },
}

PROFIL_GENERIQUE = {
    "nom": "Profil générique",
    "themes": None,      # construit depuis le libellé NAF
    "trends": None,      # idem
    "rappel_facette": None,
    "coicop": None,
    "matiere": None,
}

MOTS_VIDES = {"de", "des", "du", "en", "et", "la", "le", "les", "d", "l", "au", "aux",
              "pour", "sur", "autres", "spécialisé", "magasin", "activités", "n.c.a.",
              "non", "classées", "ailleurs"}

def mots_cles(libelle, n=4):
    """Extrait les mots porteurs d'un libellé NAF (repli générique)."""
    mots = re.findall(r"[A-Za-zÀ-ÿ]{4,}", str(libelle or ""))
    out = []
    for m in mots:
        if m.lower() not in MOTS_VIDES and m.lower() not in [o.lower() for o in out]:
            out.append(m)
    return out[:n]

def profil_secteur(naf, naf_lib, secteur):
    """Choisit le profil de veille à partir du code NAF, avec repli sur le libellé."""
    code = re.sub(r"[^0-9]", "", str(naf or ""))
    cle4 = (code[:2] + "." + code[2:4]) if len(code) >= 4 else ""
    div = code[:2]
    for cles, prof in PROFILS.items():
        if div in cles or cle4 in cles:
            return {**prof, "origine": f"NAF {naf} → {prof['nom']}"}
    # Repli : on fabrique des requêtes à partir du libellé NAF / secteur déclaré
    base = mots_cles(naf_lib) or mots_cles(secteur) or ["entreprise"]
    expr = " ".join(base[:3])
    gen = dict(PROFIL_GENERIQUE)
    gen.update({
        "nom": (secteur or naf_lib or "Secteur non identifié"),
        "themes": {
            "Marché & secteur":    f"{expr} France marché",
            "Conjoncture":         f"{expr} France conjoncture entreprises",
            "Réglementation":      f"{expr} réglementation France",
            "Innovation & usages": f"{expr} tendance innovation",
        },
        "trends": base[:4],
        "origine": f"repli générique depuis « {naf_lib or secteur} »",
    })
    return gen

session = requests.Session()
session.headers.update({"User-Agent": "CockpitBastide/2.1 (refresh hebdomadaire CI)"})
RAPPORT = {}

def api_get(url, params=None, tries=3, as_json=True):
    for i in range(tries):
        try:
            r = session.get(url, params=params, timeout=30)
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 * (i + 1)); continue
            r.raise_for_status()
            return r.json() if as_json else r.text
        except Exception as e:
            if i == tries - 1:
                print(f"   ⚠ {url.split('?')[0]} : {e}")
                return None
            time.sleep(1.5 * (i + 1))

def section(nom):
    """Décorateur : isole une section, consigne succès/échec dans RAPPORT."""
    def deco(fn):
        def run(*a, **k):
            try:
                out = fn(*a, **k)
                return out
            except Exception as e:
                print(f"   ⚠ section {nom} : {e}")
                RAPPORT[nom] = f"échec : {e}"
                return None
        return run
    return deco

@section("profil_entreprise")
def profil_entreprise():
    """Lit l'identité de l'entreprise directement dans le cockpit HTML."""
    ident = {}
    for chemin in CHEMINS_HTML:
        if not chemin or not os.path.exists(chemin):
            continue
        try:
            html = open(chemin, encoding="utf-8").read()
            i = html.find("window.DATA=")
            if i < 0:
                continue
            s = html[i + len("window.DATA="):]
            depth = 0
            for j, ch in enumerate(s):
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        ident = json.loads(s[:j + 1]).get("ident", {})
                        break
            if ident:
                print(f"→ identité lue dans {chemin}")
                break
        except Exception as e:
            print(f"   ⚠ lecture {chemin} : {e}")
    prof = profil_secteur(ident.get("naf"), ident.get("naf_lib"), ident.get("secteur"))
    info = {"raison": ident.get("raison"), "naf": ident.get("naf"),
            "naf_lib": ident.get("naf_lib"), "secteur": ident.get("secteur"),
            "ville": ident.get("ville"), "profil_veille": prof["nom"],
            "origine": prof.get("origine", "défaut")}
    RAPPORT["profil_entreprise"] = (f"{info['raison'] or 'entreprise inconnue'} · "
                                    f"{prof['nom']} ({prof.get('origine','défaut')})")
    print(f"   profil de veille : {prof['nom']}")
    return info, prof


DEMO_CLIENTS = [
    {"code": "CW001", "nom_recherche": "Galeries Lafayette", "canal": "Wholesale",
     "ca_interne": 1418, "encours": 486, "dso": 88},
    {"code": "CW002", "nom_recherche": "Printemps", "canal": "Wholesale",
     "ca_interne": 640, "encours": 150, "dso": 61},
]
DEMO_FOURNISSEURS = [
    {"code": "F013", "nom_recherche": "Filatures Aquitaine", "pays": "France",
     "devise": "EUR", "vol25": 312},
    {"code": "F001", "nom_recherche": "Ningbo Textile", "pays": "Chine",
     "devise": "USD", "vol25": 3630},
]


# ── 1 · Référentiels + Etalab (+ Pappers si token) ──────────────────────────
def charger(nom, demo):
    chemin = os.path.join("referentiels", nom)
    if os.path.exists(chemin):
        print(f"→ {chemin}")
        return pd.read_csv(chemin)
    print(f"→ démo intégrée ({nom} absent)")
    return pd.DataFrame(demo)

def etalab(query):
    d = api_get("https://recherche-entreprises.api.gouv.fr/search",
                {"q": str(query), "per_page": 1}) or {}
    r = (d.get("results") or [{}])[0]; siege = r.get("siege") or {}
    return {"siren": r.get("siren"),
            "nom_officiel": r.get("nom_complet") or r.get("nom_raison_sociale"),
            "naf": r.get("activite_principale"),
            "effectif_tranche": r.get("tranche_effectif_salarie"),
            "statut": {"A": "Active", "C": "Cessée"}.get(r.get("etat_administratif")),
            "ville_officielle": siege.get("libelle_commune")}

def pappers(siren):
    if not (PAPPERS_TOKEN and siren):
        return {}
    d = api_get("https://api.pappers.fr/v2/entreprise",
                {"api_token": PAPPERS_TOKEN, "siren": siren}) or {}
    fin = (d.get("finances") or [{}])[0]
    return {"forme_juridique": d.get("forme_juridique"),
            "annee_comptes": fin.get("annee"),
            "ca_publie": fin.get("chiffre_affaires"),
            "resultat_publie": fin.get("resultat"),
            "capitaux_propres": fin.get("capitaux_propres"),
            "procedure_collective": bool(d.get("procedures_collectives"))}

@section("identite_tiers")
def enrichir_tiers():
    clients      = charger("clients_bastide.csv", DEMO_CLIENTS).to_dict("records")
    fournisseurs = charger("fournisseurs_bastide.csv", DEMO_FOURNISSEURS).to_dict("records")
    resolus = 0
    for t in clients + fournisseurs:
        q = t.get("siren") or t.get("nom_recherche") or t.get("nom")
        eta = etalab(q) if q else {}
        t.update(eta)
        if eta.get("siren"):
            resolus += 1
            t.update(pappers(eta["siren"]))
        time.sleep(PAUSE)
    RAPPORT["identite_tiers"] = f"{resolus}/{len(clients)+len(fournisseurs)} résolus" + \
                                (" (+Pappers)" if PAPPERS_TOKEN else "")
    return clients, fournisseurs

# ── 2 · Change BCE ───────────────────────────────────────────────────────────
@section("change_bce")
def fx_bce(devises=("USD", "CNY", "GBP")):
    latest = api_get("https://api.frankfurter.app/latest",
                     {"from": "EUR", "to": ",".join(devises)}) or {}
    debut = (date.today() - timedelta(days=365)).isoformat()
    hist  = api_get(f"https://api.frankfurter.app/{debut}..",
                    {"from": "EUR", "to": ",".join(devises)}) or {}
    rates, serie, var = latest.get("rates", {}), hist.get("rates", {}), {}
    if serie:
        d0 = sorted(serie)[0]
        for dv in devises:
            a, b = serie[d0].get(dv), rates.get(dv)
            if a and b: var[dv] = round((b / a - 1) * 100, 1)
    if rates:
        RAPPORT["change_bce"] = f"{len(rates)} devises au {latest.get('date')}"
    return {"date": latest.get("date"), "base": "EUR", "rates": rates,
            "variation_1an_pct": var}

# ── 3 · BODACC ───────────────────────────────────────────────────────────────
ALERTE_RX = re.compile(r"collective|sauvegarde|redressement|liquidation|radiation", re.I)

@section("bodacc")
def veille_bodacc(tiers):
    out = []
    for t in tiers:
        ann = []
        if t.get("siren"):
            d = api_get("https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/",
                        {"dataset": "annonces-commerciales", "q": t["siren"],
                         "rows": 5, "sort": "dateparution"}) or {}
            for rec in d.get("records", []):
                f = rec.get("fields", {})
                ann.append({"date": f.get("dateparution"), "type": f.get("familleavis_lib"),
                            "tribunal": f.get("tribunal"),
                            "detail": (f.get("publicationavis") or "")[:80]})
            time.sleep(PAUSE)
        alerte = any(ALERTE_RX.search(str(a.get("type") or "")) for a in ann)
        t["bodacc_alerte"] = alerte
        out.append({"code": t.get("code"),
                    "nom": t.get("nom_officiel") or t.get("nom_recherche"),
                    "siren": t.get("siren"), "annonces": ann, "alerte": alerte})
    RAPPORT["bodacc"] = f"{sum(1 for v in out if v['alerte'])} alerte(s) / {len(out)} tiers"
    return out

# ── 4 · Veille presse ────────────────────────────────────────────────────────
@section("veille_presse")
def collecter_veille(themes=None):
    themes = themes or {}
    limite = datetime.now() - timedelta(days=JOURS_VEILLE)
    vus, articles = set(), []
    sources = [(th, feedparser.parse(
        "https://news.google.com/rss/search?q=" + requests.utils.quote(q) +
        "&hl=fr&gl=FR&ceid=FR:fr")) for th, q in themes.items()]
    sources += [("Flux perso", feedparser.parse(u)) for u in RSS_PERSO]
    for theme, feed in sources:
        for e in feed.entries[:25]:
            titre = (e.get("title") or "").strip()
            cle = titre.lower()[:90]
            if not titre or cle in vus: continue
            try: pub = datetime(*e.published_parsed[:6])
            except Exception: pub = datetime.now()
            if pub < limite: continue
            vus.add(cle)
            articles.append({"theme": theme, "titre": titre,
                             "source": (e.get("source") or {}).get("title") or feed.feed.get("title", ""),
                             "date": pub.date().isoformat(), "lien": e.get("link")})
        time.sleep(0.3)
    articles = sorted(articles, key=lambda a: a["date"], reverse=True)[:MAX_ARTICLES]
    RAPPORT["veille_presse"] = f"{len(articles)} articles"
    return articles

def prompt_digest(articles, info=None, themes=None):
    info = info or {}
    lignes = "\n".join(f"- [{a['theme']}] {a['date']} — {a['titre']} ({a['source']})"
                       for a in articles[:40])
    raison  = info.get("raison") or "l'entreprise"
    secteur = info.get("naf_lib") or info.get("secteur") or "son secteur"
    ville   = f" ({info['ville']})" if info.get("ville") else ""
    rubriques = " · ".join(list((themes or {}).keys())[:4]) or "Marché · Conjoncture · Réglementation · Innovation"
    return (f"Tu es le contrôleur de gestion de {raison}{ville} — activité : {secteur}. "
            f"Voici la veille des {JOURS_VEILLE} derniers jours :\n{lignes}\n\n"
            f"Produis un digest structuré selon ces rubriques ({rubriques}) : pour chacune, "
            f"2-3 faits saillants et leur implication concrète pour {raison}. "
            "Termine par les 3 signaux à surveiller. N'invente rien qui ne soit pas dans la liste.")

# ── 5 · CO₂ ADEME ────────────────────────────────────────────────────────────
@section("co2_ademe")
def co2_ademe():
    def facteurs(recherche, n=5):
        for slug in ("base-carboner", "base-carbone"):
            d = api_get(f"https://data.ademe.fr/data-fair/api/v1/datasets/{slug}/lines",
                        {"q": recherche, "size": n,
                         "select": "Nom_base_français,Total_poste_non_décomposé,Unité_français"})
            if d and d.get("results"):
                return [{"nom": r.get("Nom_base_français"),
                         "valeur": r.get("Total_poste_non_décomposé"),
                         "unite": r.get("Unité_français")} for r in d["results"]]
        return []
    def choisir(cands, defaut):
        for r in cands:
            v = r.get("valeur")
            if isinstance(v, (int, float)) and 0 < v < 3000:
                return {"valeur": v, "source": r["nom"], "unite": r.get("unite")}
        return {"valeur": defaut, "source": "défaut cockpit (ADEME indisponible)",
                "unite": "gCO2e/t.km"}
    mar = choisir(facteurs("porte-conteneurs transport marchandises"), 12)
    rou = choisir(facteurs("articulé PTAC transport marchandises routier"), 90)
    RAPPORT["co2_ademe"] = f"maritime={mar['valeur']} / routier={rou['valeur']}"
    return {"provenance": "ADEME Base Carbone®",
            "maritime_g_tkm": mar, "routier_g_tkm": rou}

# ── 6 · Conjoncture ──────────────────────────────────────────────────────────
@section("conjoncture")
def conjoncture(coicop=None, matiere=None):
    out = {}
    code, libelle = coicop if coicop else ("CP00", "Ensemble")
    d = api_get("https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr",
                {"format": "JSON", "lang": "FR", "geo": "FR", "coicop": code,
                 "unit": "RCH_A", "lastTimePeriod": "12"})
    if d and "value" in d:
        inv = {v: k for k, v in d["dimension"]["time"]["category"]["index"].items()}
        out["ipch_pct"] = dict(sorted({inv[int(i)]: v for i, v in d["value"].items()}.items()))
        out["ipch_libelle"] = libelle
    if matiere:
        cle, nom = matiere
        try:
            url = ("https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/"
                   "related/CMO-Historical-Data-Monthly.xlsx")
            raw = session.get(url, timeout=60); raw.raise_for_status()
            xl = pd.read_excel(raw.content, sheet_name="Monthly Prices", header=4)
            col = [c for c in xl.columns if cle.lower() in str(c).lower()]
            if col:
                serie = xl[["Unnamed: 0", col[0]]].dropna().tail(13)
                out["matiere_premiere"] = {
                    "nom": nom,
                    "serie": {str(r.iloc[0]): round(float(r.iloc[1]), 3)
                              for _, r in serie.iterrows()}}
        except Exception as e:
            print("   ⚠ Pink Sheet Banque mondiale :", e)
    jf = api_get(f"https://calendrier.api.gouv.fr/jours-feries/metropole/{date.today().year}.json") or {}
    out["jours_feries"] = jf
    RAPPORT["conjoncture"] = (f"IPCH {libelle} {len(out.get('ipch_pct', {}))} mois · "
                              f"matière {len((out.get('matiere_premiere') or {}).get('serie', {}))} mois · "
                              f"{len(jf)} fériés")
    return out

# ── 7 · Rappels produits — RappelConso (data.gouv, ouvert) ──────────────────
@section("rappels_produits")
def rappels_produits(facette=None, mots=None, limite_jours=90, taille=60):
    """Rappels officiels de produits pertinents pour le secteur de l'entreprise."""
    if not facette and not mots:
        RAPPORT["rappels_produits"] = "sans objet pour ce secteur"
        return []
    d = {}
    if facette:
        d = api_get("https://data.economie.gouv.fr/api/records/1.0/search/",
                    {"dataset": "rappelconso0", "rows": taille,
                     "sort": "date_de_publication",
                     "refine.categorie_de_produit": facette}) or {}
    # repli : recherche plein texte si la facette a changé de nom
    if not d.get("records") and mots:
        d = api_get("https://data.economie.gouv.fr/api/records/1.0/search/",
                    {"dataset": "rappelconso0", "rows": taille,
                     "sort": "date_de_publication",
                     "q": " OR ".join(mots)}) or {}
    limite = (date.today() - timedelta(days=limite_jours)).isoformat()
    out = []
    for rec in d.get("records", []):
        f = rec.get("fields", {})
        dpub = (f.get("date_de_publication") or "")[:10]
        if dpub and dpub < limite:
            continue
        out.append({"date": dpub,
                    "marque": f.get("nom_de_la_marque_du_produit"),
                    "produit": (f.get("noms_des_modeles_ou_references") or "")[:80],
                    "motif": (f.get("motif_du_rappel") or "")[:90],
                    "risques": (f.get("risques_encourus_par_le_consommateur") or "")[:80],
                    "lien": f.get("lien_vers_la_fiche_rappel")})
    RAPPORT["rappels_produits"] = f"{len(out)} rappel(s) ({limite_jours} j)"
    return out

# ── 8 · Baromètre sectoriel — Banque de France Webstat + Fevad (presse) ─────
@section("barometre")
def barometre(secteur_nom=None):
    """Climat des affaires (Banque de France) + publications sectorielles."""
    out = {}
    # Banque de France — API Webstat (série climat des affaires commerce de détail).
    # L'API BdF nécessite parfois un en-tête ; on tente en ouvert, repli silencieux.
    bdf = api_get("https://api.webstat.banque-france.fr/webstat-fr/v1/data/CLIMAT/"
                  "ICA.M.FR.COMMERCE_DETAIL",
                  as_json=True)
    if bdf:
        out["climat_commerce_detail_bdf"] = "série récupérée (Banque de France Webstat)"
    # Fevad n'expose pas d'API : on capte ses publications via un flux presse dédié.
    requete = (f"{secteur_nom} France baromètre OR bilan chiffres"
               if secteur_nom else "Fevad e-commerce France bilan chiffres")
    feed = feedparser.parse("https://news.google.com/rss/search?q=" +
                            requests.utils.quote(requete) +
                            "&hl=fr&gl=FR&ceid=FR:fr")
    limite = datetime.now() - timedelta(days=45)
    art = []
    for e in feed.entries[:12]:
        titre = (e.get("title") or "").strip()
        if not titre:
            continue
        try:
            pub = datetime(*e.published_parsed[:6])
        except Exception:
            pub = datetime.now()
        if pub < limite:
            continue
        art.append({"titre": titre, "date": pub.date().isoformat(),
                    "source": (e.get("source") or {}).get("title") or "Fevad/presse",
                    "lien": e.get("link")})
    out["publications_secteur"] = art
    RAPPORT["barometre"] = (("BdF ok · " if out.get("climat_commerce_detail_bdf") else "BdF indispo · ")
                            + f"{len(art)} publication(s) secteur")
    return out

# ── 9 · Tendances de recherche — Google Trends (best effort) ────────────────
@section("tendances_recherche")
def tendances_recherche(termes=None):
    """Intérêt de recherche Google (signal de demande). Service non officiel : best effort."""
    termes = termes or []
    if not termes:
        RAPPORT["tendances_recherche"] = "aucun terme défini pour ce secteur"
        return {}
    try:
        from pytrends.request import TrendReq
    except Exception:
        RAPPORT["tendances_recherche"] = "pytrends absent (pip install pytrends)"
        return {}
    out = {}
    try:
        pt = TrendReq(hl="fr-FR", tz=60)
        pt.build_payload(termes[:5], timeframe="today 12-m", geo="FR")
        df = pt.interest_over_time()
        if df is not None and not df.empty:
            df = df.tail(12)
            for t in termes[:5]:
                if t in df.columns:
                    serie = {str(idx.date()): int(v) for idx, v in df[t].items()}
                    vals = list(serie.values())
                    tendance = "▲" if len(vals) >= 2 and vals[-1] > vals[0] else \
                               ("▼" if len(vals) >= 2 and vals[-1] < vals[0] else "→")
                    out[t] = {"serie": serie, "dernier": vals[-1] if vals else None,
                              "tendance": tendance}
        RAPPORT["tendances_recherche"] = f"{len(out)}/{len(termes[:5])} termes"
    except Exception as e:
        RAPPORT["tendances_recherche"] = f"indisponible : {e}"
    return out

# ── Assemblage ───────────────────────────────────────────────────────────────
def main():
    print("=== Rafraîchissement cockpit Bastide —", datetime.now().isoformat(timespec="seconds"), "===")
    pe = profil_entreprise() or ({}, dict(PROFIL_GENERIQUE, nom="défaut", themes={}, trends=[]))
    info, prof = pe if isinstance(pe, tuple) else ({}, dict(PROFIL_GENERIQUE, themes={}, trends=[]))

    tiers = enrichir_tiers() or ([], [])
    clients, fournisseurs = tiers if isinstance(tiers, tuple) else ([], [])
    fx      = fx_bce() or {}
    bod     = veille_bodacc(clients + fournisseurs) or []
    presse  = collecter_veille(prof.get("themes")) or []
    co2     = co2_ademe() or {}
    conj    = conjoncture(prof.get("coicop"), prof.get("matiere")) or {}
    rappels = rappels_produits(prof.get("rappel_facette"),
                               mots_cles(info.get("naf_lib")) or None) or []
    baro    = barometre(prof.get("nom")) or {}
    trends  = tendances_recherche(prof.get("trends")) or {}

    paquet = {
        "meta": {"genere_le": datetime.now().isoformat(timespec="seconds"),
                 "pipeline": "refresh-hebdo CI v3.0 (veille adaptative)",
                 "sources": ["Etalab", "BCE/Frankfurter", "BODACC", "Google News RSS",
                             "ADEME Base Carbone", "Eurostat", "Banque mondiale",
                             "calendrier.api.gouv.fr", "RappelConso", "Banque de France",
                             "Google Trends"] + (["Pappers"] if PAPPERS_TOKEN else []),
                 "rapport_sections": RAPPORT},
        "entreprise": {**info, "themes_veille": list((prof.get("themes") or {}).keys())},
        "fx": fx, "clients": clients, "fournisseurs": fournisseurs,
        "veille": {"bodacc": bod, "presse": presse,
                   "prompt_digest": prompt_digest(presse, info, prof.get("themes")),
                   "rappels_produits": rappels},
        "co2": co2, "conjoncture": conj,
        "secteur": {"barometre": baro, "tendances_recherche": trends},
    }
    os.makedirs(os.path.dirname(SORTIE) or ".", exist_ok=True)
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump(paquet, f, ensure_ascii=False, indent=1)
    print(f"✅ écrit : {SORTIE}")
    print(json.dumps(RAPPORT, ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("✗ échec fatal :", e)
        sys.exit(1)
