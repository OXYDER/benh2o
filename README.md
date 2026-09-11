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

Protégée par courriel + mot de passe (voir 1.3). Une fois connecté, quatre onglets :

- **Mes informations** : téléphones (mobile, SMS, ligne générale H2O Innovation),
  courriel, Messenger, clavardage en direct
- **Zones de couverture** : régions, MRC, municipalités — ajoute, renomme, retire
- **Contenu de la page** : les textes de chaque section de la page principale, et un
  choix de thème (couleurs + polices) — voir section 2b ci-dessous
- **Distributeurs** : le réseau de distributeurs H2O Innovation utilisé pour la
  redirection hors zone — voir section 2 (Vérificateur de zone) ci-dessus

Chaque onglet a son propre bouton **Enregistrer** (l'onglet Zones s'enregistre
automatiquement à l'ajout/suppression) — les changements sont écrits dans Postgres et
visibles sur le site public immédiatement (le site public lit `/api/contact`,
`/api/zones` et `/api/content` à chaque chargement de page).

### Vérificateur de zone (page publique)

La comparaison ignore les accents et les majuscules, et fonctionne aussi si la personne
tape juste une partie du nom, une MRC, ou même une région (ex. « Victo » trouve
« Victoriaville »; « Bécancour » seul trouve la MRC).

**Hors zone :** la page reconnaît maintenant **2628 lieux à travers tout le Québec**
(`assets/data/municipality-centroids.json` — les 152 municipalités officielles de tes
10 MRC, plus 2476 autres municipalités/villages/lieux nommés de toute la province, via
[GeoNames.org](https://www.geonames.org), licence CC-BY 4.0). Peu importe où la personne
tape sa ville, la page l'oriente automatiquement vers le **distributeur H2O Innovation
le plus proche** (onglet **Distributeurs** de `/admin` — réseau de 17 distributeurs au
Québec, avec nom/adresse/téléphone/courriel/coordonnées), calculé par distance à vol
d'oiseau. Seul un lieu vraiment absent de cette liste (très rare) retombe sur le lien
générique `contactGeneralUrl` (onglet Mes informations de `/admin`).

**Onglet Distributeurs :** modifie le nom, l'adresse, le téléphone, le courriel ou les
coordonnées de n'importe quel distributeur, ou ajoutes-en un nouveau — la redirection
automatique se recalcule aussitôt enregistré. Les coordonnées (latitude/longitude)
se trouvent facilement sur Google Maps (clic droit sur l'endroit exact).

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

## 3a. Bouton Urgence — service à la clientèle H2O

Un bouton rouge flottant (coin inférieur gauche, visible sur toutes les pages) et un
bouton identique dans la fenêtre d'accueil — pensés pour la période des sucres, quand
un client a un bris urgent. Les deux ouvrent le même petit panneau avec trois façons de
rejoindre le **service à la clientèle et le service technique H2O Innovation**
directement (pas toi) : téléphone, texto, courriel.

Coordonnées éditables dans `/admin` → Mes informations → section « Bouton Urgence ».

## 3b. Section « Produits H2O »

Un moteur de recherche qui redirige vers `https://h2oinnovation.net/int_fr/catalogsearch/result/?q=...`
dans un nouvel onglet — aucun produit, prix ni image n'est copié ou affiché sur ton
site. C'est volontaire : leur catalogue change constamment (stock, prix), et
reproduire leur contenu créerait un site fragile (qui casse dès qu'ils changent leur
site) et poserait un problème de droits d'auteur sur leurs photos et descriptions.
Le texte de cette section (titre, description, bouton) est éditable dans `/admin` →
Contenu de la page.

**Badges d'équipements (section À propos) :** chaque badge (Évaporateurs, Pompes,
etc.) est maintenant un vrai lien vers la catégorie correspondante sur
h2oinnovation.net, éditable individuellement dans `/admin` → Contenu de la page →
À propos → « Badges d'équipements » (texte + lien, ajoute/retire-en librement).

## 3c. Rendez-vous

Un bouton **« Rendez-vous »** dans le menu principal ouvre un formulaire modal — le
client choisit une date, une heure, le lieu (à ton bureau de Ham-Nord ou chez lui), et
indique nom, érablière, nombre d'entailles, adresse et s'il est déjà client H2O
Innovation. La demande est enregistrée dans la base de données (table `appointments`)
et tu reçois un courriel de notification.

**Dans `/admin` → onglet Rendez-vous :** chaque demande s'affiche avec tous les
détails. Bouton **Confirmer**, ou **Refuser…** qui ouvre un petit formulaire pour
proposer une nouvelle date/heure et ajouter une note avant d'envoyer le refus. Si le
SMTP est actif (voir section 4), le client reçoit automatiquement un courriel de
confirmation ou de refus (avec la date alternative si tu en proposes une) — sinon,
l'admin affiche un avertissement te rappelant de le contacter toi-même.

Les textes de la section (titre, description) sont éditables dans Contenu de la page.

**Horaire et blocages (`/admin` → onglet Rendez-vous, en haut) :**
- **Jours et heures de travail** — active/désactive chaque jour de la semaine, avec une
  heure de début et de fin propre à chacun. Le calendrier public ne montre que les
  jours actifs, et seulement les créneaux compris dans ces heures.
- **Durée d'un rendez-vous** — détermine l'espacement des créneaux proposés (par
  défaut 60 minutes).
- **Dates complètement bloquées** — vacances, congés : la date entière disparaît du
  calendrier, même si c'est normalement un jour travaillé.
- **Créneaux précis bloqués** — bloque une heure donnée à une date donnée, sans
  bloquer le reste de la journée.

Le calendrier public (dans le modal Rendez-vous) ne peut pas techniquement afficher un
jour ou une heure qui ne respecte pas ces règles — les jours non travaillés sont grisés
et non cliquables, et seules les heures libres apparaissent comme créneaux. Le serveur
revalide aussi tout ça à la réception d'une demande, au cas où.

**Textes du formulaire** — tous les libellés, textes d'exemple et le bouton d'envoi du
modal Rendez-vous sont éditables dans Contenu de la page → « Modal Rendez-vous ».

## 3d. Nouvelles et Événements / Tutoriels

Deux sections de publications (nouveautés H2O, événements, moments clients pour l'une;
guides et modes d'emploi pour l'autre), gérées dans `/admin` → onglet **Publications**.

Chaque publication a : un type (Nouvelle/Événement ou Tutoriel), un titre, un résumé
(affiché sur la carte), un contenu complet (affiché en cliquant « Lire plus »), une
image optionnelle (colle un lien direct — héberge la photo où tu veux, Google Photos,
Facebook, etc.), une date, et un statut publié/brouillon. Une publication non publiée
reste enregistrée mais invisible sur le site — pratique pour préparer à l'avance.

## 3e. Menu principal allégé

Avec toutes ces sections, le menu du haut aurait été surchargé — deux liens
utilitaires ont été regroupés en menus déroulants pour rester lisible :

- **Produits H2O ▾** — recherche + catégories (existant)
- **Support & Contact ▾** — Nous joindre, Rendez-vous, Formulaire de contact, URGENCE

Le reste (Accueil, Territoire, Carte, Nouvelles, Tutoriels, À propos) reste en liens
directs. Tous les libellés — y compris ceux des deux menus déroulants — sont éditables
dans Contenu de la page → Menu principal.

## 4. Formulaire de contact

Deux façons d'envoyer les demandes du formulaire, gérées par le serveur (`POST
/api/contact-form`) — jamais directement depuis le navigateur :

**Par défaut : FormSubmit.co** (gratuit, aucune configuration). La première
soumission demande de confirmer l'adresse indiquée dans le champ « Courriel qui reçoit
le formulaire » (onglet Mes informations) — un seul clic à faire.

**Optionnel : ton propre serveur SMTP.** Dans `/admin` → Mes informations → section
« Envoi du formulaire de contact par SMTP » — coche **Activer l'envoi par SMTP**,
remplis l'hôte, le port, le nom d'utilisateur, le mot de passe et l'adresse qui reçoit
les demandes, puis **Enregistrer**. Le bouton **Tester la connexion** envoie un vrai
courriel de test avec la configuration enregistrée, pour confirmer que tout fonctionne
avant de compter dessus. Le mot de passe n'est jamais renvoyé au navigateur après
l'enregistrement (par sécurité) — laisse le champ vide pour le garder tel quel, ou
tape-en un nouveau pour le remplacer.

**Anti-spam :** peu importe la méthode choisie, un même visiteur ne peut pas envoyer
plus d'un message aux **2 minutes** (limite appliquée par le serveur, par adresse IP).

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

## 2d. Fenêtre d'accueil et carte enrichie

**Fenêtre d'accueil (première visite) :** dès qu'un nouveau visiteur arrive sur le site,
une fenêtre lui demande sa ville avant de continuer — il obtient tout de suite soit la
confirmation qu'il est dans ton secteur, soit le contact du distributeur le plus proche.
Elle ne s'affiche qu'une fois par navigateur (mémorisé via `localStorage` — un lien
« Passer cette étape » reste disponible pour ne jamais bloquer complètement quelqu'un).

**Autocomplétion :** le champ de recherche (fenêtre d'accueil et section de la page)
suggère maintenant les 2628 lieux reconnus à travers tout le Québec, pas seulement tes
municipalités couvertes.

**Carte enrichie :** en plus de ton secteur en rouge, la carte affiche maintenant :
- un point bleu pour chacun des 17 distributeurs du réseau (nom/adresse/téléphone/courriel au clic)
- un seul gros point ambre au centre géographique de ton secteur (calculé automatiquement à partir des municipalités couvertes)

Aussi éditables dans ce même onglet, tout en haut : le **titre de la page** et la
**description** (ce qui apparaît dans l'onglet du navigateur et dans les résultats
Google), le **nom et sous-titre de l'en-tête**, et **tous les libellés du menu
principal** (Accueil, Territoire, Carte, Produits H2O, Nous joindre, À propos,
Formulaire de contact, URGENCE).

**Lien admin discret :** un petit lien « Administration » est présent dans le pied de
page de chaque page publique, à côté du droit d'auteur — mène directement à `/admin`.

## 2c. Contenu de la page et apparence (thèmes)

L'onglet **Contenu de la page** de `/admin` regroupe les textes de chaque section de
la page principale (en-tête, vérificateur de zone, carte, canaux de contact, à propos,
formulaire, pied de page) — modifie-les directement, `Enregistrer`, et la page publique
se met à jour au prochain chargement (elle lit `/api/content`).

**Choix de thème :** en haut de cet onglet, 4 combinaisons de couleurs et de polices
prédéfinies (`assets/data/themes.json`) — clique une carte pour la sélectionner, puis
`Enregistrer`. Ce ne sont pas des couleurs choisies librement : chaque thème a été conçu
pour rester lisible et cohérent dans toutes les sections du site.

**Ce qui n'est PAS éditable depuis l'admin, par choix :** la disposition des sections,
leurs dimensions, et leur position sur la page. Un éditeur visuel complet (façon
Wix/Webflow) avec aperçu en temps réel et contraintes responsive est un projet
nettement plus lourd qu'un formulaire de texte — pour ce genre de changement, plus
sûr et plus rapide de me le demander directement, comme pour le reste du site.

**Une seule source de vérité :** `index.html` ne contient plus aucun texte par défaut
pour les champs éditables — seulement la structure (les balises) avec leur attribut
`data-c`. Tout le texte vient exclusivement de la base de données (`/api/content`), lu
au chargement de la page. Ça évite d'avoir à garder deux copies du texte synchronisées
(le code ET la base) — la source unique, c'est `/admin`. La contrepartie : sur une
**base neuve** sans données, ou si `/api/content` échoue, les sections concernées
s'affichent vides plutôt que d'afficher un texte de repli — c'est pourquoi `api/init.sql`
doit toujours contenir un contenu complet et à jour pour les nouvelles installations.

## Structure du projet

```
index.html                    → la page publique
admin.html                     → administration (connexion + onglets)
nginx.conf                     → sert le site + relaie /api/ vers l'API
Dockerfile                     → image du site (nginx)
docker-compose.yml              → les 7 conteneurs (site, API, base de données + Chatwoot x4)
.env.example                    → modèle des secrets à copier en .env (jamais commité)
deploy.sh                       → script de mise à jour (git pull + rebuild + restart)

assets/style.css                → tout le visuel du site public (variables de couleur/police éditées par les thèmes)
assets/admin.css                → visuel de l'administration
assets/script.js                → logique du site public (zone, contact, chat, formulaire, contenu/thème)
assets/coverage-map.js           → carte interactive Leaflet du secteur couvert
assets/data/municipality-boundaries.geojson → vraies frontières des 152 municipalités des 10 MRC (Statistique Canada)
assets/data/themes.json          → catalogue des 4 thèmes prédéfinis (couleurs + polices)
assets/admin.js                 → logique de connexion + des trois onglets d'administration

api/server.js                   → serveur Node/Express : auth + API contact/zones/content
api/db.js                       → connexion à Postgres
api/init.sql                    → schéma de la base + données initiales
api/seed-content.sql            → injecte le contenu de départ sur une base déjà existante
api/seed-distributeurs.sql       → injecte le réseau de distributeurs sur une base déjà existante
api/scripts/create-admin.js     → crée/modifie le compte administrateur (mot de passe)
api/Dockerfile                  → image de l'API
```
