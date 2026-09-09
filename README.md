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
sur `https://benoitlaprise.com/admin` et connecte-toi.

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

## 3. Clavardage en direct — Chatwoot (auto-hébergé, open source)

Le site utilise [Chatwoot](https://www.chatwoot.com) plutôt que Tawk.to : open source
(licence MIT), gratuit en auto-hébergement, et tes données de conversation restent sur
ton propre NAS au lieu de transiter par un service tiers — ça évite aussi les blocages
par les bloqueurs de publicité (le widget vient de ton propre domaine).

### 3.1 Premier démarrage

Chatwoot roule dans 4 conteneurs séparés (`chatwoot-rails`, `chatwoot-sidekiq`,
`chatwoot-db`, `chatwoot-redis`) — plus lourd qu'un simple script à coller, mais tu
gardes le contrôle total. Compte au moins **1 à 2 Go de RAM** additionnels pour ces
4 conteneurs — vérifie que ton NAS a la marge disponible vu tout ce qui tourne déjà
dessus (`docker stats` pour voir la consommation actuelle).

Remplis d'abord les secrets Chatwoot dans `.env`
(voir `.env.example` : `CHATWOOT_DB_PASSWORD` et `CHATWOOT_REDIS_PASSWORD` — génère-les
avec `openssl rand -hex 24` **et non `-base64`**, sinon un `/` ou un `+` dans le mot de
passe peut casser l'URL `redis://...` que Chatwoot construit avec — `CHATWOOT_SECRET_KEY_BASE`
avec `openssl rand -hex 64` —, et `CHATWOOT_FRONTEND_URL`, l'adresse publique où Chatwoot
sera accessible).

```bash
docker compose up -d chatwoot-db chatwoot-redis
docker compose run --rm chatwoot-rails bundle exec rails db:chatwoot_prepare
docker compose up -d
```

La commande `db:chatwoot_prepare` ne s'exécute qu'**une seule fois**, à l'installation
initiale — pas besoin de la relancer aux mises à jour suivantes.

### 3.2 Sous-domaine dédié

Chatwoot a besoin de sa **propre adresse** (pas un sous-chemin du site principal) —
ex. `chat.benoitlaprise.com`. Dans Nginx Proxy Manager, ajoute un nouveau Proxy Host
`chat.benoitlaprise.com` → `http://<IP_NAS>:8098`, avec certificat SSL. Cette adresse
doit correspondre exactement à `CHATWOOT_FRONTEND_URL` dans `.env`.

### 3.3 Créer ton compte et ton widget

1. Va sur `https://chat.benoitlaprise.com` et complète l'assistant de configuration
   initiale (ça crée ton compte administrateur Chatwoot — différent du compte de
   `/admin` du site)
2. Crée une **Inbox** de type **Website**
3. Dans les paramètres de cette Inbox, copie le **Website Token**
4. Dans `/admin` du site, onglet **Mes informations**, coche **Activer le widget
   Chatwoot**, colle l'adresse (`https://chat.benoitlaprise.com`) et le Website Token,
   puis **Enregistrer**

Tant que ce n'est pas configuré, le bouton « Clavarder » redirige automatiquement vers
le texto. Tu peux aussi utiliser un autre service de clavardage en laissant Chatwoot
désactivé et en collant un lien direct dans le champ **Lien direct**.

### 3.4 Mises à jour de Chatwoot

`./deploy.sh` ne met à jour que le site (`benoitlaprise`/`benoitlaprise-api`), pas
Chatwoot. Pour mettre Chatwoot à jour :
```bash
docker compose pull chatwoot-rails chatwoot-sidekiq
docker compose up -d chatwoot-rails chatwoot-sidekiq
```

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
Puis dans Nginx Proxy Manager, un Proxy Host `benoitlaprise.com` (et `www.benoitlaprise.com`)
→ `http://<IP_NAS>:8090`.

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

Une carte (Leaflet + OpenStreetMap, gratuits, sans clé requise) surligne en rouge les
**frontières officielles de chaque municipalité** que tu desservers — pas la MRC en
entier, seulement les municipalités précises de ton secteur. Les tracés viennent de
Statistique Canada (limites du Recensement 2021, Licence du gouvernement ouvert –
Canada) — de vrais polygones administratifs, pas des points approximatifs. Elle se met
à jour toute seule à partir des mêmes données que le vérificateur de zone
(`/api/zones`) — pas besoin de la retoucher quand tu modifies tes secteurs dans `/admin`.

**Limite à connaître :** le fichier `assets/data/municipality-boundaries.geojson`
contient les frontières de **toutes les municipalités de tes 10 MRC actuelles**
(152 municipalités), pas seulement les 56 que tu dessers aujourd'hui — donc si tu
ajoutes ou retires une municipalité **à l'intérieur de ces mêmes MRC** via `/admin`,
sa forme rouge apparaît ou disparaît automatiquement sur la carte, sans rien me
demander. Seul un ajout dans une **toute nouvelle MRC** (en dehors de tes 10 actuelles)
nécessiterait que je génère sa frontière et l'ajoute au fichier — dis-le-moi si ça
arrive.

## Structure du projet

```
index.html                    → la page publique
admin.html                     → administration (connexion + onglets)
nginx.conf                     → sert le site + relaie /api/ vers l'API
Dockerfile                     → image du site (nginx)
docker-compose.yml              → les 7 conteneurs (site, API, base de données + Chatwoot x4)
.env.example                    → modèle des secrets à copier en .env (jamais commité)
deploy.sh                       → script de mise à jour (git pull + rebuild + restart)

assets/style.css                → tout le visuel du site public
assets/admin.css                → visuel de l'administration
assets/script.js                → logique du site public (zone, contact, chat, formulaire)
assets/coverage-map.js           → carte interactive Leaflet du secteur couvert
assets/data/municipality-boundaries.geojson → vraies frontières des 56 municipalités couvertes (Statistique Canada)
assets/admin.js                 → logique de connexion + des deux onglets d'administration

api/server.js                   → serveur Node/Express : auth + API contact/zones
api/db.js                       → connexion à Postgres
api/init.sql                    → schéma de la base + données initiales
api/scripts/create-admin.js     → crée/modifie le compte administrateur (mot de passe)
api/Dockerfile                  → image de l'API
```
