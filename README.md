# benoitlaprise.com

Page de contact pour Benoît Laprise, représentant des ventes — division érablière, H2O Innovation.
Site statique (HTML/CSS/JS), sans base de données, pensé pour être déployé comme tes autres projets :
Docker → Portainer → Nginx Proxy Manager.

## 1. Avant de déployer — à configurer

Tes coordonnées (téléphones, courriel, Messenger, chat) vivent dans **`assets/contact.json`**
et se modifient directement depuis la page **`/admin.html`** du site, sans toucher au code —
section « Mes informations de contact » en haut de la page. Voir section 2 pour le
fonctionnement complet de l'administration.

Si tu préfères éditer le fichier à la main, il est simple et commenté :

| Champ | Description |
|---|---|
| `telephoneMobileAffiche` / `telephoneMobileLien` | Ton numéro mobile (appels), affiché et en format `+1...` |
| `telephoneSmsAffiche` / `telephoneSmsLien` | Ton numéro de texto — laisse vide pour réutiliser le mobile |
| `telephoneH2OAffiche` / `telephoneH2OLien` | La ligne générale H2O Innovation (service à la clientèle) |
| `courriel` | Ton courriel affiché sur le site |
| `messengerUsername` | Le nom d'utilisateur de ta page Facebook (ou un lien complet) |
| `chatLive` | Voir section 3 ci-dessous pour le clavardage en direct |
| `formsubmitEmail` | Courriel qui reçoit les demandes du formulaire (voir section 4) |
| `boutiqueUrl` / `contactGeneralUrl` | Liens vers h2oinnovation.net, proposés aux gens hors de ta zone |

## 2. Vérificateur de zone — régions, MRC, municipalités

La zone couverte vit maintenant dans **`assets/zones.json`**, organisée en hiérarchie :
région → MRC → municipalités. La comparaison ignore les accents et les majuscules, et
fonctionne aussi si la personne tape juste une partie du nom, une MRC, ou même une région
(ex. « Victo » trouve « Victoriaville »; « Bécancour » seul trouve la MRC).

Si quelqu'un est hors zone, la page l'informe et propose le lien `contactGeneralUrl`
(dans `contact.json`) plutôt que de le laisser te contacter directement.

### Modifier tes infos et tes zones toi-même — page `/admin.html`

Une page d'administration te permet de tout gérer sans toucher au code : tes coordonnées
(section du haut) et tes régions/MRC/municipalités (section du bas) :

1. Va sur `https://benoit.resotik.ca/admin.html` (ou ton domaine)
2. Modifie ce que tu veux — tout se sauvegarde automatiquement comme brouillon dans
   ton navigateur pendant que tu travailles
3. Clique **Télécharger contact.json** et/ou **Télécharger zones.json** selon ce que tu as changé
4. Remplace le(s) fichier(s) correspondant(s) dans `assets/` par ceux téléchargés
5. `git add -A && git commit -m "mise à jour des infos" && git push`
6. Sur le NAS : `./deploy.sh`

⚠️ **Cette page n'a aucun mot de passe.** Le brouillon reste local au navigateur de la
personne tant qu'elle ne télécharge pas le fichier, mais n'importe qui connaissant l'adresse
peut l'ouvrir. Pour une vraie protection, ajoute une **liste d'accès** (nom d'utilisateur/
mot de passe) sur le chemin `/admin.html` directement dans Nginx Proxy Manager
(onglet *Access Lists* du Proxy Host) — c'est protégé au niveau du serveur, pas du navigateur.

## 3. Clavardage en direct (chat live)

Le plus simple et gratuit : [Tawk.to](https://www.tawk.to)

1. Crée un compte gratuit sur tawk.to
2. Dans **Administration > Channels**, récupère ton **Property ID** et ton **Widget ID**
3. Dans `/admin.html`, coche **Activer le widget Tawk.to** et colle les deux identifiants
   (ou édite `chatLive.actif`, `chatLive.propertyId`, `chatLive.widgetId` directement dans `contact.json`)

Tant que ce n'est pas configuré, le bouton « Clavarder » redirige automatiquement vers le texto,
donc rien n'est brisé en attendant. Tu peux aussi utiliser un autre service de clavardage en
laissant Tawk.to désactivé et en collant son lien direct dans le champ **Lien direct** de l'admin.

## 4. Formulaire de contact

Utilise [FormSubmit.co](https://formsubmit.co) — gratuit, aucun serveur ni base de données requis.

1. La première fois que quelqu'un soumet le formulaire, FormSubmit t'envoie un courriel de confirmation
   à l'adresse indiquée dans `formsubmitEmail` — il faut cliquer sur le lien de confirmation une seule fois.
2. Ensuite, chaque soumission t'arrive directement par courriel.

Si tu préfères un formulaire relié à ta propre base de données plus tard (pour les devis, par exemple),
ce sera la prochaine étape — voir section 6.

## 5. GitHub (repo OXYDER)

Le projet est déjà initialisé en local avec un premier commit. Pour le pousser sur GitHub, comme tes autres projets :

1. Crée un nouveau repo vide sur GitHub (`OXYDER/benh2o`) — **ne coche pas** « Initialize with README » pour éviter un conflit avec le commit déjà fait.
2. Depuis ce dossier, sur ta machine :
   ```bash
   git remote add origin https://github.com/OXYDER/benh2o.git
   git branch -M main
   git push -u origin main
   ```
3. Ensuite, chaque fois que tu modifies le site (localement ou via Claude), un simple :
   ```bash
   git add -A
   git commit -m "description du changement"
   git push
   ```
   met à jour GitHub.

## 6. Déploiement sur le NAS (Docker / Portainer / Nginx Proxy Manager)

**Première installation sur le NAS** — clone le repo directement là où tu gardes tes autres projets :
```bash
git clone https://github.com/OXYDER/benh2o.git
cd benh2o
docker compose up -d --build
```
Puis dans Nginx Proxy Manager, ajoute un Proxy Host `benoit.resotik.ca` → `http://<IP_NAS>:8090`, comme d'habitude.
(Le jour où tu loues `benoitlaprise.com`, il suffira d'ajouter un deuxième Proxy Host vers la même adresse, et de mettre à jour `server_name` dans `nginx.conf`.)

**Mises à jour suivantes** — utilise `deploy.sh`, inclus dans le repo :
```bash
./deploy.sh
```
Ce script fait `git pull`, reconstruit l'image et redémarre le conteneur. Tu peux :
- le lancer manuellement en SSH sur le NAS après chaque `git push`, ou
- l'ajouter au **Planificateur de tâches** de Synology (tâche déclenchée, script défini par l'utilisateur → chemin vers `deploy.sh`) pour l'exécuter automatiquement à intervalle régulier (ex. toutes les nuits).

Si tu préfères gérer le conteneur depuis l'interface Portainer plutôt qu'en ligne de commande, tu peux aussi créer un Stack Portainer qui pointe vers ce repo GitHub — Portainer offre une option de re-pull/redeploy automatique intégrée, ce qui remplacerait `deploy.sh`.

**Option sans Docker — montage direct dans un nginx existant**
Si tu as déjà un conteneur nginx générique, tu peux monter `index.html` et `assets/`
comme volume dans son dossier `html/`, sans passer par le Dockerfile.

## 7. Prochaines étapes (roadmap)

- Générateur de devis relié à la boutique h2oinnovation.net (paniers, produits, envoi automatique)
- Intégration SMS entrant (Twilio) si tu veux répondre aux textos directement depuis un tableau de bord plutôt que ton téléphone
- Historique des demandes reçues via le formulaire (actuellement, tout part par courriel seulement — rien n'est stocké)

## Structure du projet

```
index.html              → la page publique
admin.html               → administration (coordonnées + régions/MRC/municipalités)
assets/style.css        → tout le visuel (palette, typographie, mise en page)
assets/admin.css        → visuel de la page d'administration
assets/script.js        → logique (zone, liens de contact, chat, formulaire)
assets/admin.js          → logique des éditeurs de contact.json et zones.json
assets/contact.json      → TES coordonnées — éditable via /admin.html
assets/zones.json        → régions/MRC/municipalités couvertes — éditable via /admin.html
Dockerfile / nginx.conf / docker-compose.yml → déploiement
deploy.sh                → script de mise à jour (git pull + rebuild + restart)
```
