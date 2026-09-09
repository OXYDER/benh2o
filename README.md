# benoitlaprise.com

Page de contact pour Benoît Laprise, représentant des ventes — H2O Innovation.
Déployé comme tes autres projets : Docker → Portainer → Nginx Proxy Manager, sur le repo
GitHub `OXYDER/benh2o`.

## Architecture

Le site a maintenant trois conteneurs (au lieu d'un seul) :

```
benoitlaprise        → nginx, sert le site public (index.html) et relaie /api/ vers l'API
benoitlaprise-api    → petit serveur Node.js (auth + lecture/écriture des données)
benoitlaprise-db     → Postgres — stocke tes coordonnées et tes zones de couverture
```

Tes coordonnées et ta zone de couverture ne sont plus dans des fichiers du projet
(`config.js`, `zones.json`) — elles vivent dans Postgres et se modifient depuis
**`/admin`**, protégée par courriel + mot de passe. Les changements sont **enregistrés
immédiatement** dès que tu cliques "Enregistrer" — pas de fichier à télécharger ni de
`git push` requis pour ça.

## 1. Premier démarrage — secrets et compte admin

### 1.1 Fichier `.env` (jamais commité)

```bash
cp .env.example .env
```

Édite `.env` et mets de vraies valeurs pour `DB_PASSWORD` et `JWT_SECRET` (une longue
chaîne aléatoire chacun — `openssl rand -base64 48` en génère une bonne). Ce fichier reste
sur le NAS, jamais sur GitHub (déjà dans `.gitignore`).

### 1.2 Démarrer les conteneurs

```bash
docker compose up -d --build
```

Au premier démarrage, Postgres crée automatiquement les tables et récupère tes données
actuelles (`api/init.sql`) — rien à perdre.

### 1.3 Créer ton compte administrateur

**Ton mot de passe ne doit jamais être écrit dans un fichier du projet ni collé ailleurs
que dans ton propre terminal.** Une fois les conteneurs démarrés, sur le NAS :

```bash
docker compose exec benoitlaprise-api node scripts/create-admin.js "ton@courriel.com" "TonMotDePasse"
```

Tu peux relancer cette commande n'importe quand pour changer le mot de passe. Va ensuite
sur `https://benoit.resotik.ca/admin` et connecte-toi.

## 2. Administration — `/admin`

Protégée par courriel + mot de passe (voir 1.3). Une fois connecté, deux onglets :

- **Mes informations** : téléphones (mobile, SMS, ligne générale H2O Innovation),
  courriel, Messenger, clavardage en direct
- **Zones de couverture** : régions, MRC, municipalités — ajoute, renomme, retire

Chaque onglet a son propre bouton **Enregistrer** — les changements sont écrits dans
Postgres et visibles sur le site public immédiatement (le site public lit `/api/contact`
et `/api/zones` à chaque chargement de page).

### Vérificateur de zone (page publique)

La comparaison ignore les accents et les majuscules, et fonctionne aussi si la personne
tape juste une partie du nom, une MRC, ou même une région (ex. « Victo » trouve
« Victoriaville »; « Bécancour » seul trouve la MRC).

## 3. Clavardage en direct (chat live)

Le plus simple et gratuit : [Tawk.to](https://www.tawk.to)

1. Crée un compte gratuit sur tawk.to
2. Dans **Administration > Channels**, récupère ton **Property ID** et ton **Widget ID**
3. Dans `/admin`, onglet **Mes informations**, coche **Activer le widget Tawk.to**,
   colle les deux identifiants, puis **Enregistrer**

Tant que ce n'est pas configuré, le bouton « Clavarder » redirige automatiquement vers le
texto. Tu peux aussi utiliser un autre service de clavardage en laissant Tawk.to désactivé
et en collant son lien direct dans le champ **Lien direct**.

## 4. Formulaire de contact

Utilise [FormSubmit.co](https://formsubmit.co) — gratuit, aucune configuration serveur
requise. La première soumission demande de confirmer l'adresse indiquée dans le champ
« Courriel qui reçoit le formulaire » (onglet Mes informations) — un seul clic à faire.

## 5. GitHub (repo OXYDER/benh2o)

```bash
git add -A
git commit -m "description du changement"
git push
```

## 6. Déploiement sur le NAS

**Première installation :**
```bash
git clone https://github.com/OXYDER/benh2o.git
cd benh2o
cp .env.example .env   # puis édite .env — voir section 1.1
docker compose up -d --build
docker compose exec benoitlaprise-api node scripts/create-admin.js "ton@courriel.com" "TonMotDePasse"
```
Puis dans Nginx Proxy Manager, un Proxy Host `benoit.resotik.ca` → `http://<IP_NAS>:8090`,
comme d'habitude. (Le jour où tu loues `benoitlaprise.com`, ajoute un deuxième Proxy Host
vers la même adresse, et mets à jour `server_name` dans `nginx.conf`.)

**Mises à jour suivantes :**
```bash
./deploy.sh
```
Ce script fait `git pull`, reconstruit les images (site + API) et redémarre les
conteneurs. `.env` et la base de données ne sont jamais touchés par un déploiement — tes
données et ton mot de passe restent en place.

### Protéger `/admin` davantage (optionnel)

L'authentification par courriel/mot de passe protège déjà les actions de modification.
Si tu veux une couche supplémentaire (empêcher même de voir l'écran de connexion), ajoute
une liste d'accès sur le chemin `/admin` directement dans Nginx Proxy Manager
(onglet *Access Lists* du Proxy Host).

## 7. Prochaines étapes (roadmap)

- Générateur de devis relié à la boutique h2oinnovation.net (paniers, produits, envoi automatique)
- Intégration SMS entrant (Twilio) si tu veux répondre aux textos directement depuis un tableau de bord plutôt que ton téléphone
- Historique des demandes reçues via le formulaire (actuellement, tout part par courriel seulement — rien n'est stocké)
- Support de plusieurs comptes admin si un jour quelqu'un d'autre doit gérer le site

## 2b. Carte interactive du secteur

Une carte (Leaflet + OpenStreetMap, gratuits, sans clé requise) affiche les **frontières
officielles** de tes 10 MRC couvertes en rouge, avec un point pour chaque municipalité.
Les frontières de MRC viennent de Statistique Canada (limites du Recensement 2021,
Licence du gouvernement ouvert – Canada) — ce sont de vrais tracés administratifs, pas
une approximation. Elle se met à jour toute seule à partir des mêmes données que le
vérificateur de zone (`/api/zones`) — pas besoin de la retoucher quand tu modifies tes
secteurs dans `/admin`.

**Limites à connaître :**
- Les frontières de MRC (`assets/data/mrc-boundaries.geojson`) sont figées au moment où
  ce fichier a été généré — si tu ajoutes une **nouvelle MRC** dans `/admin` qui n'y est
  pas encore, sa zone rouge n'apparaîtra simplement pas sur la carte (les municipalités
  du reste du site continuent de fonctionner normalement). Dis-le-moi si ça arrive, je
  peux ajouter la nouvelle MRC au fichier.
- Les points de municipalités viennent de `assets/data/municipality-coords.json`, une
  liste de coordonnées approximatives (centre-ville), pas de tracés cadastraux parcelle
  par parcelle. Même règle si tu ajoutes une nouvelle municipalité : ajoute sa
  latitude/longitude dans ce fichier pour qu'elle apparaisse sur la carte.

## Structure du projet

```
index.html                    → la page publique
admin.html                     → administration (connexion + onglets)
nginx.conf                     → sert le site + relaie /api/ vers l'API
Dockerfile                     → image du site (nginx)
docker-compose.yml              → les 3 conteneurs (site, API, base de données)
.env.example                    → modèle des secrets à copier en .env (jamais commité)
deploy.sh                       → script de mise à jour (git pull + rebuild + restart)

assets/style.css                → tout le visuel du site public
assets/admin.css                → visuel de l'administration
assets/script.js                → logique du site public (zone, contact, chat, formulaire)
assets/coverage-map.js           → carte interactive Leaflet du secteur couvert
assets/data/mrc-boundaries.geojson → vraies frontières des 10 MRC couvertes (Statistique Canada)
assets/data/municipality-coords.json → coordonnées approximatives des municipalités (pour la carte)
assets/admin.js                 → logique de connexion + des deux onglets d'administration

api/server.js                   → serveur Node/Express : auth + API contact/zones
api/db.js                       → connexion à Postgres
api/init.sql                    → schéma de la base + données initiales
api/scripts/create-admin.js     → crée/modifie le compte administrateur (mot de passe)
api/Dockerfile                  → image de l'API
```
