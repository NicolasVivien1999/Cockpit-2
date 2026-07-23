# Kit de rafraîchissement hebdomadaire — Cockpit Maison Bastide

Chaque lundi matin, GitHub exécute la collecte open data et committe
`docs/cockpit_data_v2.json`. Zéro serveur à gérer, gratuit (dépôt public
ou minutes incluses d'un dépôt privé).

## Installation (10 minutes, une seule fois)

1. **Créer un dépôt GitHub** (public ou privé), par ex. `cockpit-bastide-data`.
2. **Y déposer le contenu de ce kit** (glisser-déposer via l'interface web
   suffit) : `pipeline_opendata.py`, `requirements.txt`, `referentiels/`,
   `.github/workflows/refresh-hebdo.yml`.
3. **Autoriser le bot à écrire** : *Settings → Actions → General →
   Workflow permissions →* cocher **Read and write permissions** → Save.
4. **Tester tout de suite** : onglet *Actions* → « Rafraîchissement
   hebdomadaire du cockpit » → **Run workflow**. Au vert, le fichier
   `docs/cockpit_data_v2.json` apparaît dans le dépôt.
5. C'est en place : le cron (`lundi 05h17 UTC`) prend le relais chaque semaine.

## Brancher tes vraies données

Remplace les deux CSV du dossier `referentiels/` par tes tiers réels
(mêmes colonnes ; ajoute une colonne `siren` pour fiabiliser la résolution).

## Option Pappers (comptes annuels des tiers)

*Settings → Secrets and variables → Actions → New repository secret* :
nom `PAPPERS_TOKEN`, valeur = ta clé. Le script la détecte tout seul au
run suivant — aucun autre changement.

## Supprimer l'import manuel (fortement recommandé)

Par défaut, tu télécharges le JSON et tu l'importes dans le cockpit.
Pour que **tout se fasse seul**, héberge le cockpit au même endroit que
sa collecte :

1. Dépose le contenu du paquet `PAGES_Cockpit_AutoAlimente.zip` dans le
   dossier `docs/` du dépôt (le cockpit y est nommé `index.html`).
2. *Settings → Pages → Source : Deploy from a branch → Branch : main,
   dossier `/docs` → Save*.
3. Après 1-2 minutes, GitHub affiche l'adresse de ton site :
   `https://<toncompte>.github.io/<dépôt>/`

Le robot écrit `docs/cockpit_data_v2.json` chaque lundi, **à côté** du
cockpit. À l'ouverture, le cockpit compare la date de la collecte servie
à celle qu'il a en mémoire : si elle est plus récente, il l'adopte
automatiquement (message « Collecte actualisée »). Une collecte plus
ancienne n'écrase jamais une plus récente, et l'import manuel reste
disponible en secours.

⚠ Sur un dépôt public, cette adresse est publique : n'y héberge le
cockpit que si ses données peuvent être vues de tous. Sinon, dépôt privé
(Pages privé = offre payante) ou import manuel.

## Veille adaptative (v3.0) — pilotée par le secteur de l'entreprise

Le pipeline lit l'identité de l'entreprise **directement dans le cockpit
HTML** (`docs/index.html`, bloc `ident` : code NAF, libellé d'activité,
secteur, ville) et en déduit tout le paramétrage de la veille : thèmes de
presse, termes suivis dans Google Trends, catégorie RappelConso, indice
de prix Eurostat et matière première.

Sept profils sont fournis : mode/textile · agroalimentaire & restauration
· construction/BTP · numérique · santé & médico-social · transport &
logistique · conseil & services. Un **repli générique** fabrique
automatiquement des requêtes à partir du libellé NAF pour tout secteur
non prévu — la veille fonctionne donc pour n'importe quelle entreprise.

**Changer de secteur ne demande aucune ligne de code** : il suffit que le
cockpit porte le bon code NAF. Au run suivant, la veille se recalibre.
Pour ajouter ou affiner un profil, modifie le dictionnaire `PROFILS` en
tête de `pipeline_opendata.py`. Si le cockpit n'est pas dans `docs/`,
indique son chemin via la variable d'environnement `COCKPIT_HTML`.

## Sources collectées

Identité des tiers (Etalab) · change EUR (BCE) · annonces légales (BODACC) ·
veille presse (Google News RSS) · **rappels produits mode/textile
(RappelConso)** · **baromètre secteur (Banque de France + publications
Fevad)** · **tendances de recherche (Google Trends)** · facteurs CO₂
(ADEME) · inflation habillement (Eurostat) · coton (Banque mondiale) ·
jours fériés. Pappers en option (secret `PAPPERS_TOKEN`).

Les trois sources sectorielles sont *best effort* : Google Trends passe par
un service non officiel et la série Banque de France peut exiger une clé
selon les périodes. En cas d'échec, un ⚠ apparaît dans le rapport et le
reste de la collecte se poursuit normalement.

## Personnaliser

- Fréquence : ligne `cron:` du workflow (`"17 5 * * 1,4"` = lundi + jeudi).
- Profils sectoriels (thèmes, Trends, RappelConso, IPCH, matière) :
  dictionnaire `PROFILS` en tête de `pipeline_opendata.py`.
- Flux RSS additionnels, valables quel que soit le secteur : `RSS_PERSO`.
- Le run affiche un **rapport par section** dans les logs Actions ; une
  API indisponible met un ⚠ sans bloquer les autres.
