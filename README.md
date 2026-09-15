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

## 3e. Nouvelles et Tutoriels — pages séparées

Pour garder la page d'accueil légère, « Nouvelles et Événements » et « Tutoriels »
sont maintenant des **pages séparées** (`nouvelles.html` et `tutoriels.html`), pas des
sections sur la page principale.

Sur la page d'accueil, chaque section ne montre que la **publication la plus récente**
en aperçu, avec un bouton « Voir toutes les nouvelles » / « Voir tous les tutoriels »
qui mène à la page complète. Les pages `nouvelles.html`/`tutoriels.html` ont le même
en-tête, menu et pied de page que le reste du site, et affichent la liste complète des
publications de leur type.

**Important pour les futurs changements de ces deux pages :** comme le site n'a pas de
système de gabarits, l'en-tête et le pied de page sont dupliqués dans `index.html`,
`nouvelles.html`, `tutoriels.html` et `admin.html`. Un changement au menu ou au pied de
page doit être répété dans les quatre fichiers — dis-le-moi si tu veux que je m'en
charge, je sais où chercher.

## 3f. Menu principal allégé

Le menu du haut regroupe les liens utilitaires en menus déroulants pour rester
lisible :

- **Produits H2O ▾** — recherche + catégories
- **Support & Contact ▾** — Nous joindre, Tutoriels, Manuels de l'utilisateur, Fiches
  Techniques, Rendez-vous, Formulaire de contact
- **URGENCE** reste en lien principal, à droite, en rouge (pas dans un sous-menu)

Le reste (Accueil, Territoire, Carte, Nouvelles, À propos) reste en liens directs.
Tous les libellés — y compris ceux des menus déroulants — sont éditables dans Contenu
de la page → Menu principal.

## 3g. Manuels de l'utilisateur / Fiches Techniques

Deux pages de plus, sur le même modèle que Nouvelles/Tutoriels : `manuels.html` et
`fiches-techniques.html`, chacune avec son lien dans le sous-menu Support & Contact.
Elles réutilisent le même système de publications (`/admin` → onglet Publications) —
choisis simplement le bon type dans le menu déroulant de chaque publication (Nouvelle
/ Événement, Tutoriel, Manuel de l'utilisateur, ou Fiche technique). Contrairement à
Nouvelles/Tutoriels, ces deux pages n'ont pas d'aperçu sur la page d'accueil — seul le
lien de menu y mène.

Les textes (étiquette, titre, description) de chaque page sont éditables dans Contenu
de la page.

## 3h. Catégories et fichiers téléchargeables

**Catégories** — dans `/admin` → Publications → section « Catégories » : choisis une
section (Nouvelles, Tutoriels, Manuels, Fiches Techniques), tape un nom, clique
Ajouter. Chaque section a ses propres catégories, indépendantes des autres. Une fois
créées, elles apparaissent dans le menu déroulant « Catégorie » de chaque publication,
et automatiquement comme filtres cliquables sur la page publique correspondante — pas
besoin de les ajouter ailleurs.

**Fichiers téléchargeables** — chaque publication a maintenant un champ « Fichier
téléchargeable » (en plus de l'image) : clique **Téléverser…**, choisis un PDF, un
Word ou un Excel directement depuis ton ordinateur (jusqu'à 20 Mo). Un bouton
« ⬇ Télécharger » apparaît alors automatiquement sur la carte et dans la fenêtre de
lecture complète. Les images aussi peuvent maintenant être téléversées directement,
en plus de coller un lien.

Techniquement, ces fichiers sont stockés dans un volume Docker partagé
(`benoitlaprise-uploads`) entre le site et l'API, servi directement par nginx — pas de
service externe requis.

## 3i. Éditeur de texte enrichi (WYSIWYG)

Le champ « Contenu complet » de chaque publication (Nouvelles, Tutoriels, Manuels,
Fiches Techniques) utilise maintenant un vrai éditeur de texte visuel (TinyMCE,
gratuit, chargé depuis un CDN — aucun compte requis) : gras, italique, souligné,
couleurs de texte et de fond, alignement, listes à puces et numérotées, liens,
images (par lien ou téléversées directement, via le même système que les images de
publication), et tableaux.

Le champ « Résumé » reste un texte simple (affiché tel quel sur les cartes, sans mise
en forme) — c'est voulu, pour garder les aperçus courts et sobres.

## 3j. Aperçu condensé sur l'accueil + choix du format d'affichage

**Sur la page d'accueil**, les sections « Nouvelles et Événements » et « Tutoriels »
affichent maintenant les **3 publications les plus récentes** (au lieu d'une seule),
dans une version condensée (cartes plus petites, largeur limitée) plutôt qu'en pleine
largeur — avec toujours un bouton vers la page complète.

**Format d'affichage** — dans `/admin` → Contenu de la page, chacune des 4 sections
(Nouvelles, Tutoriels, Manuels, Fiches Techniques) a maintenant un menu déroulant
« Format d'affichage » avec trois choix :
- **Grille** (par défaut) — cartes avec image, résumé et bouton « Lire plus »
- **Tableau** — liste compacte (date, titre, catégorie), pratique pour parcourir
  beaucoup de publications rapidement
- **Affiche** — grandes bannières visuelles avec l'image en fond et le titre en
  surimpression, pour un effet plus impactant

Le format choisi s'applique à la fois à la page complète et à l'aperçu condensé sur
l'accueil (quand la section en a un).

## 3k. Couleur par catégorie

Chaque catégorie s'affiche maintenant avec un badge de couleur — la même couleur
partout où cette catégorie apparaît (grille, tableau, affiche, page d'accueil, fenêtre
de lecture complète), peu importe la section (Nouvelles, Tutoriels, Manuels, Fiches
Techniques).

La couleur est calculée automatiquement à partir du nom de la catégorie (parmi une
dizaine de couleurs prévues) — pas besoin de choisir une couleur toi-même en créant
une catégorie, et le nom garde toujours la même couleur tant qu'il reste écrit
pareil.

## 3l. Le visiteur choisit aussi son format d'affichage

En plus du réglage par défaut dans `/admin`, chaque visiteur peut maintenant changer
lui-même la façon dont les publications s'affichent — trois petits boutons
(Grille / Tableau / Affiche) apparaissent en haut de chacune des 4 pages complètes.

Le choix du visiteur est mémorisé dans son navigateur (`localStorage`) et **partagé
entre les 4 sections** — s'il choisit « Tableau » sur la page Nouvelles, ce sera aussi
la vue par défaut s'il visite Tutoriels, Manuels ou Fiches Techniques ensuite, tant
qu'il ne change pas d'appareil ou ne vide pas les données de son navigateur.

Le format que tu choisis dans `/admin` reste la valeur par défaut pour tout nouveau
visiteur qui n'a jamais fait de choix — ton réglage n'est jamais écrasé, seule
l'affichage dans le navigateur du visiteur change.

## 3m. Galerie d'images supplémentaires

Chaque publication peut maintenant avoir, en plus de son image principale, une
**galerie d'images supplémentaires** — dans `/admin` → Publications, le bouton
« + Ajouter des images » permet de sélectionner **plusieurs photos à la fois** depuis
ton ordinateur. Chaque image ajoutée s'affiche en vignette avec un bouton pour la
retirer individuellement.

Ces images supplémentaires apparaissent sous forme de petite galerie cliquable (clic
= ouvre l'image en grand dans un nouvel onglet) dans la fenêtre « Lire plus » du site
public — l'image principale et les cartes/tableaux/affiches, eux, continuent de
n'utiliser que l'image principale.

## 3n. Corrections et améliorations de la fenêtre de lecture

**Sections encadrées corrigées** — certains contenus collés dans l'éditeur (ex.
copié depuis Facebook) amenaient avec eux des boîtes/cadres blancs autour de chaque
paragraphe. Une règle a été ajoutée pour neutraliser ce genre de mise en forme
importée, peu importe la source du texte collé.

**Image principale cliquable** — dans la vue Grille, cliquer directement sur l'image
d'une publication l'ouvre maintenant, sans obliger à viser le bouton « Lire plus ».

**Visionneuse d'images intégrée** — les images de la galerie s'ouvrent maintenant en
grand **directement sur le site** (pas dans un nouvel onglet), avec des flèches
gauche/droite pour passer d'une image à l'autre et un bouton pour fermer et revenir à
l'article. Fonctionne aussi au clavier (flèches et Échap).

## 3o. Partage sur réseaux sociaux + lien direct par publication

Chaque publication (Nouvelles, Tutoriels, Manuels, Fiches Techniques) a maintenant une
petite barre de partage en bas de sa fenêtre « Lire plus » : Facebook, X (Twitter),
LinkedIn, courriel, et un bouton pour copier le lien directement.

**Important — ce ne sont pas des liens génériques vers la page** : chaque bouton
partage un lien qui pointe **directement vers cette publication précise**. Quelqu'un
qui clique sur un lien partagé arrive automatiquement avec la bonne fenêtre déjà
ouverte, peu importe combien d'autres publications existent sur la page.

**Limite technique à connaître** : quand quelqu'un colle ce lien sur Facebook ou X,
l'aperçu généré (image, titre) affichera les informations générales du site plutôt
que celles de la publication précise — les robots de ces réseaux ne lisent que le
contenu déjà présent au premier chargement de la page, avant que le JavaScript ait
choisi quelle publication afficher. Le lien fonctionne parfaitement pour la personne
qui clique, seul l'aperçu visuel avant le clic reste générique. Corriger ça
demanderait de faire générer les pages différemment par le serveur pour chaque
publication — un changement d'architecture plus important, à envisager si l'aperçu
devient important pour toi.

## 3p. Thème « Marine Profond » (6e thème)

Une version plus sobre du thème néon — les mêmes fonds noir/marine profonds et le
même verre dépoli à l'en-tête, mais **un seul accent : le bleu H2O**, sans le rose ni
le vert fluo. Pensé pour garder l'effet moderne et distinctif tout en restant
confortable pour une clientèle plus âgée ou plus conservatrice.

Disponible dans `/admin` → Contenu de la page → Apparence du site, à essayer comme
les autres.

## 3q. Auto-complétion et auto-correction des noms de ville

Les champs où on tape un nom de municipalité — le vérificateur de secteur (page
d'accueil et fenêtre de première visite) et le champ Ville du formulaire de
Rendez-vous — proposent maintenant une vraie liste de suggestions cliquables
pendant que la personne tape, avec navigation au clavier (flèches + Entrée).

**Auto-correction des abréviations** — taper « St-Rémi » retrouve bien
« Saint-Rémi-de-Tingwick », même si l'abréviation ne correspond pas exactement au nom
officiel. Pareil pour « Ste- » → « Sainte- ». Ça s'applique à la fois à la liste de
suggestions et à la vérification elle-même (donc même sans cliquer une suggestion,
soumettre « St-Rémi » fonctionne).

## 3r. Convertisseur Acéricole

Nouvelle page (`convertisseur.html`, accessible via Support & Contact ▾ dans le menu)
avec quatre outils de calcul, basés sur des sources officielles (MAPAQ, PPAQ, Centre
ACER, CDL Inc.) :

1. **Rendement sève → sirop** (Règle de 87) — combien de sève il faut selon son taux
   de sucre pour produire une quantité donnée de sirop.
2. **Point d'ébullition selon l'altitude** — calcule le point d'ébullition réel de
   l'eau à ton altitude (formule barométrique standard), et la température exacte à
   laquelle ton sirop atteint 66° Brix (+3,94 °C / +7,1 °F au-dessus du point
   d'ébullition local), avec des repères approximatifs pour le beurre, la tire et le
   sucre d'érable.
3. **Conversions de produits d'érable** — litres, gallons (US et canadiens),
   kilogrammes, livres, pour le sirop, le beurre, la tire et le sucre granulé, à
   partir des facteurs de conversion officiels du MAPAQ.
4. **Estimation par nombre d'entailles** — fourchette large et clairement identifiée
   comme approximative, pour la planification.

Les textes de la page (étiquette, titre, description, avertissement) sont éditables
dans Contenu de la page → Page « Convertisseur Acéricole ». Les calculs eux-mêmes
sont dans `assets/convertisseur.js` — un changement de formule demanderait de
modifier ce fichier directement.

## 3s. Convertisseur Acéricole — formules officielles extraites de l'app Centre ACER

Après analyse du fichier APK du Convertisseur Acéricole officiel (décompilation du
bundle JavaScript React Native/Hermes), plusieurs formules ont été remplacées par
leurs versions **exactes**, et 5 nouveaux calculateurs ajoutés dans un 5e onglet
« Osmose, Lavage & Couleur » :

**Mis à jour avec les formules exactes :**
- **Point d'ébullition** — polynôme direct altitude → température (au lieu de mon
  approximation barométrique), et un polynôme séparé pour l'écart selon le ° Brix
  cible (fonctionne maintenant pour n'importe quel Brix, pas seulement 66)
- **Densité selon le Brix** — table officielle exacte à 36 points (interpolation
  linéaire), au lieu de mon approximation polynomiale

**Nouveaux, avec formules confirmées dans le code de l'app :**
- **Osmose (PEP)** — facteur de correction de température Filmtec exact (constantes
  2640/3020), permet de comparer le débit d'une membrane à différentes températures
- **Solution de lavage** — dilution d'un produit concentré vers une concentration cible
- **Surface d'une presse à terre diatomée** — surface de filtration totale (carrée ou
  cylindrique)
- **Transmittance d'un mélange** — moyenne pondérée **logarithmique** (pas une simple
  moyenne), cohérente avec la loi de Beer-Lambert
- **Volume pour une transmittance cible** — la même formule, résolue pour la quantité
  de sirop B inconnue

**Volontairement laissés de côté** — deux calculateurs (débit d'évaporation, débit
d'une pompe à vide) utilisent une correction thermodynamique multi-étapes plus
complexe (loi des gaz, bilan de matière multi-passe) dont la reproduction exacte à
partir du bytecode décompilé comportait trop d'incertitude pour être fiable sans
validation supplémentaire.

## 3t. Les deux derniers calculateurs (16/16)

**Débit d'une pompe à vide** — ajouté avec confiance : la correction pression/
température (loi des gaz combinée, conditions de référence standard 29,92126 po Hg
et 519,67 °R) a été tracée et vérifiée précisément dans le bytecode décompilé.

**Débit d'évaporation** — ajouté en **version simplifiée**. L'application originale
répartit ce calcul entre la panne à ailettes et la panne plate séparément; après
plusieurs tentatives de relecture du bytecode décompilé, cette répartition précise
restait ambiguë (variables réutilisées de façon à créer de l'incertitude réelle sur
l'ordre des opérations). Plutôt que de deviner, l'outil ici donne un **bilan total**
(eau évaporée ÷ surface totale) — scientifiquement solide, mais moins détaillé que
l'original. Une amélioration future possible si les specs exactes de Centre ACER
deviennent disponibles autrement.

Le convertisseur couvre maintenant les 16 calculateurs de l'application originale.

## 3u. Concentration sève / concentré / sirop — le 17e outil

Un calculateur distinct de la « Règle de 87 » (rendement simple sève→sirop) : celui-ci
modélise un procédé avec **pré-concentration à l'osmose inverse**, en 3 étapes — sève
→ concentré (au Brix de sortie de ta membrane) → sirop fini — avec le taux de
séparation de la membrane et les pertes de procédé estimées, formule extraite
exactement de la fonction `convertConcentration` de l'application originale.

## 3v. Refonte de navigation : Calculateurs vs Convertisseurs

Le Convertisseur Acéricole a maintenant deux modes, choisis par deux gros boutons en
haut de la page :

- **Calculateurs** — les 5 catégories déjà en place (Rendement & Cuisson, Volumes,
  Densité & Dilution, Prix & Estimation, Équipement & Couleur), toujours accessibles
  ainsi qu'avant.
- **Convertisseurs** — nouveau, 12 catégories : Sirop/Beurre/Tire/Sucre (déplacé
  depuis Calculateurs), Concentration (°Brix ↔ gravité spécifique ↔ °Baumé), Poids,
  Pression, Température, Distance, Surface, Volume, Vitesse, Force, Énergie, Puissance.

Dans chaque mode, une rangée de puces sous les gros boutons sert de table des
matières : cliquer une puce fait défiler la page jusqu'à cet outil (au lieu de
cacher/montrer des onglets comme avant), avec un léger effet de surbrillance pour
confirmer l'arrivée au bon endroit. Tous les outils d'un même mode restent visibles
en même temps, l'un en dessous de l'autre.

Les 9 nouveaux convertisseurs généraux (Poids, Pression, Distance, Surface, Volume,
Vitesse, Force, Énergie, Puissance) utilisent un même moteur générique dans le code
(`UNIT_CATEGORIES` + `setupGenericConverters`) — entrer une valeur affiche
l'équivalent dans toutes les unités de la catégorie en même temps, facteurs de
conversion standards internationaux.

## 3w. Navigation simplifiée en liste plate + menu OUTILS dans le menu principal

Suite à un retour, la navigation du convertisseur est encore plus simple : sous
chacun des deux gros boutons (Calculateurs / Convertisseurs), une liste complète de
**tous les outils individuels** en liens directs (18 calculateurs, 12 convertisseurs)
— plus besoin de passer par une sous-catégorie intermédiaire. Cliquer un lien fait
défiler directement jusqu'à cet outil précis.

**Le bouton URGENCE du menu principal a été remplacé par un menu « Outils »**, avec
ses deux groupes (Calculateurs / Convertisseurs) et les 30 liens, accessible de
partout sur le site. La bulle flottante « 🚨 Urgence » (en bas de l'écran) et le
bouton d'urgence dans la fenêtre de première visite restent inchangés — seul le lien
dans la barre de menu du haut a été remplacé; l'accès à l'urgence reste donc
disponible partout, juste pas à cet endroit précis du menu.

Un clic sur un lien du menu Outils qui pointe vers un convertisseur (actuellement
caché derrière le mode Calculateurs) fait automatiquement basculer vers le bon mode
avant de faire défiler la page — géré par `activateModeForHash()` dans
`convertisseur.js`.

## 3x. Vouvoiement partout sur le site (texte client)

Sur demande, tout le texte destiné aux clients utilise maintenant le vouvoiement
(« vous », « votre », « vos ») au lieu du tutoiement — hero, vérificateur de secteur,
carte, fenêtre de rendez-vous, catalogue, publications, formulaire de contact, bouton
urgence, et l'ensemble du Convertisseur Acéricole. Corrigé à trois endroits pour que
ça tienne dans le temps :

1. Le texte statique dans les 6 pages HTML
2. Les valeurs par défaut dans `api/init.sql` (pour toute réinstallation future)
3. Un script de migration (`api/fix-vouvoiement.sql`) pour corriger le contenu déjà
   enregistré dans ta base actuelle

**Reste volontairement en tutoiement** : l'interface d'administration (`/admin`),
puisqu'elle s'adresse à toi et non à tes clients.

Prochain texte que j'écrirai pour le site suivra aussi le vouvoiement par défaut.

## 3y. Sélecteur de thème pour les visiteurs

Un petit onglet vertical « Thèmes », discret, collé au bord gauche de l'écran
(centré verticalement, sur les 6 pages). Cliquer dessus fait glisser un panneau avec
les 6 thèmes disponibles, chacun avec un aperçu de couleur.

**Le choix du visiteur est mémorisé** dans son navigateur (localStorage,
indépendamment de toi) et prime sur le thème par défaut que tu choisis dans
`/admin` — donc chaque visiteur peut personnaliser son affichage sans jamais changer
ce que les autres visiteurs voient. Un bouton « Thème par défaut du site » permet de
revenir au choix administrateur en tout temps.

Techniquement : la préférence est stockée sous la clé `bl_user_theme`
(différente de `bl_cached_theme`, qui sert uniquement à éviter le flash au
chargement — voir section 3g).

## 3z. Mode Clair/Sombre retiré

Le raccourci ☀️/🌙 causait trop de problèmes visuels à travers le site pour valoir
la peine d'être conservé — retiré complètement (HTML, CSS, JS, sur les 6 pages).

**Ce qui reste** : le sélecteur de thème lui-même (l'onglet « Thèmes » sur le bord
gauche, avec les 6 thèmes complets — dont Marine Profond, qui reste un vrai thème
sombre à part entière) continue de fonctionner normalement, exactement comme avant
d'avoir commencé à travailler sur le mode clair/sombre.

## 3zz. Liseuse de catalogue PDF

Un onglet « 📖 Catalogue », sur le même modèle que l'onglet « Thèmes » (empilé juste
en dessous, bord gauche de l'écran), qui ouvre une liseuse plein écran pour ton
catalogue PDF H2O Innovation — sans convertir le PDF en images, directement dans le
navigateur (librairie PDF.js de Mozilla).

**Comportement adapté à l'appareil** :
- **Ordinateur** : navigation page par page avec boutons précédent/suivant, zoom, et
  les touches flèches du clavier
- **Mobile** : défilement vertical continu — les pages se chargent au fur et à
  mesure que tu descends (pas les 100 pages d'un coup, pour rester rapide)

**Pour mettre ton catalogue en ligne** : va dans `/admin` → nouvel onglet
« Catalogue », téléverse ton PDF (jusqu'à 90 Mo). L'onglet « Catalogue » n'apparaît
sur le site public qu'une fois un catalogue téléversé — invisible avant ça.

**Changements techniques nécessaires** :
- nginx acceptait seulement 1 Mo par requête par défaut — augmenté à 100 Mo
  (`client_max_body_size`) pour permettre l'envoi d'un gros PDF
- Nouvel endpoint `/api/catalogue/upload` (backend) avec une limite dédiée de 90 Mo
- Le PDF est stocké dans le même volume que tes autres fichiers téléversés, aucune
  nouvelle infrastructure nécessaire

**Limite honnête** : la navigation est propre et professionnelle, mais ce n'est pas
l'effet « coin de page qui se retourne » en 3D comme Issuu — un ajout possible plus
tard si tu y tiens, mais nettement plus complexe à bien réussir.

## 3zzz. Liseuse — mise à jour (mode par défaut, vignettes, plein écran, favicon)

**Sur ordinateur :**
- Mode par défaut maintenant **Défilement** (au lieu de Page) — bascule possible
  vers « ▤ Page » avec le bouton dédié
- **Plein écran** (icône ⛶) via la vraie fonction du navigateur
- **Barre de vignettes** (icône 🗂, comme Adobe Reader) — miniatures de toutes les
  pages sur le côté gauche, chargées au fur et à mesure qu'on défile dans la liste
  (pas les 100 d'un coup), cliquables pour sauter directement à une page

**Sur mobile :** bouton fermer corrigé (utilisait `100vh`, corrigé en `100dvh` pour
tenir compte de la barre d'adresse du navigateur qui le poussait hors de l'écran
visible) — voir aussi section 3zz.

**Favicon** : remplacé par la feuille d'érable néon en rotation 3D fournie, fond
rendu transparent (la version originale avait un fond noir opaque), redimensionnée
à 64×64 pour rester légère.

## 3zzzz. Bogue des cartes de thèmes dans l'admin + image de partage (Open Graph)

**Bogue corrigé** : les cartes de thèmes dans `/admin` utilisaient la classe
`.theme-picker`, exactement le même nom que le petit widget flottant du site public
(l'onglet « Thèmes »). Comme l'admin charge aussi `style.css`, cette règle
(`position: fixed`) s'appliquait par erreur aux cartes, les faisant sortir de leur
emplacement normal. Renommée en `.admin-theme-grid` — aucune autre incidence.

**Menu principal et référencement — déjà en place** : le menu complet (tous les
libellés de liens) est éditable sous « Menu principal » et le titre/la description
pour les résultats Google sous « Titre de la page et référencement », dans l'onglet
Contenu de la page. Le bogue ci-dessus rendait probablement la page difficile à lire
correctement.

**Nouveau — Image de partage (Open Graph)** : un vrai ajout, celui-là. Le site
n'avait aucune image ni aperçu personnalisé quand un lien est partagé sur Facebook,
LinkedIn ou Messenger. Ajouté :
- Un champ dans `/admin` → Contenu de la page → section référencement, pour
  téléverser une image de partage (environ 1200×630 px recommandé)
- Les balises Open Graph et Twitter Card nécessaires sur les 6 pages, remplies
  automatiquement (titre et description reprennent ceux déjà utilisés pour Google;
  l'image vient du nouveau champ)

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

## 4b. URL propres (sans .html)

Le site n'affiche plus l'extension `.html` dans les adresses : `benoitlaprise.com/nouvelles`
au lieu de `.../nouvelles.html`, et ainsi de suite pour `/tutoriels`, `/manuels`,
`/fiches-techniques` et `/admin`. La page d'accueil répond à `benoitlaprise.com/`
directement.

Les anciennes adresses avec `.html` fonctionnent toujours, mais redirigent
automatiquement (redirection 301) vers la version propre — aucun lien déjà partagé ou
indexé par Google ne se retrouve cassé.

C'est géré entièrement dans `nginx.conf` (pas de changement à faire dans `/admin` ou
dans le contenu). Si tu ajoutes une nouvelle page HTML au site plus tard, il faudra
ajouter le même genre de règle dans `nginx.conf` pour qu'elle profite aussi d'une
adresse sans extension.

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
