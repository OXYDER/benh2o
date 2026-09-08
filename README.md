# benoitlaprise.com

Page de contact pour Benoît Laprise, représentant des ventes — division érablière, H2O Innovation.
Site statique (HTML/CSS/JS), sans base de données, pensé pour être déployé comme tes autres projets :
Docker → Portainer → Nginx Proxy Manager.

## 1. Avant de déployer — à configurer

Tout se passe dans **`assets/config.js`**. Ouvre ce fichier et remplace :

| Champ | Description |
|---|---|
| `telephoneAffiche` / `telephoneLien` | Ton numéro, affiché et en format `+1...` pour les liens tel:/sms: |
| `courriel` | Ton courriel H2O Innovation |
| `messengerUsername` | Le nom d'utilisateur de ta page Facebook (pour le lien m.me/...) |
| `tawkTo` | Voir section 3 ci-dessous pour le clavardage en direct |
| `formsubmitEmail` | Courriel qui reçoit les demandes du formulaire (voir section 4) |
| `zones` | **Important** : remplace la liste d'exemple par tes vraies villes/MRC couvertes |
| `contactGeneralUrl` | Lien vers h2oinnovation.net/contact, proposé aux gens hors de ta zone |

Aucune connaissance en programmation n'est requise pour cette étape — seulement remplacer le texte entre guillemets.

## 2. Vérificateur de zone

Le champ `zones` dans `config.js` est la liste complète des villes/MRC où tu peux vendre.
La comparaison ignore les accents et les majuscules, et fonctionne aussi si la personne
tape juste une partie du nom (ex. « Victo » trouve « Victoriaville »).

Si quelqu'un est hors zone, la page l'informe et propose le lien `contactGeneralUrl`
plutôt que de le laisser te contacter directement.

## 3. Clavardage en direct (chat live)

Le plus simple et gratuit : [Tawk.to](https://www.tawk.to)

1. Crée un compte gratuit sur tawk.to
2. Dans **Administration > Channels**, récupère ton **Property ID** et ton **Widget ID**
3. Dans `config.js`, mets `tawkTo.actif = true` et colle les deux identifiants

Tant que ce n'est pas configuré, le bouton « Clavarder » redirige automatiquement vers le texto,
donc rien n'est brisé en attendant.

## 4. Formulaire de contact

Utilise [FormSubmit.co](https://formsubmit.co) — gratuit, aucun serveur ni base de données requis.

1. La première fois que quelqu'un soumet le formulaire, FormSubmit t'envoie un courriel de confirmation
   à l'adresse indiquée dans `formsubmitEmail` — il faut cliquer sur le lien de confirmation une seule fois.
2. Ensuite, chaque soumission t'arrive directement par courriel.

Si tu préfères un formulaire relié à ta propre base de données plus tard (pour les devis, par exemple),
ce sera la prochaine étape — voir section 6.

## 5. Déploiement (Docker / Portainer / Nginx Proxy Manager)

Même pattern que tes autres projets :

**Option A — build l'image toi-même**
```bash
docker build -t benoitlaprise-site .
docker run -d --name benoitlaprise -p 8090:80 benoitlaprise-site
```
Puis dans Nginx Proxy Manager, ajoute un Proxy Host `benoitlaprise.com` → `http://<IP_NAS>:8090`.

**Option B — via Portainer (Stacks)**
```yaml
version: "3"
services:
  benoitlaprise:
    build: .
    container_name: benoitlaprise
    restart: unless-stopped
    ports:
      - "8090:80"
```
Colle ce contenu dans un nouveau Stack Portainer pointant vers ce dossier (ou vers le repo GitHub une fois poussé sur OXYDER), déploie, puis ajoute le Proxy Host dans NPM comme d'habitude.

**Option C — montage direct dans un nginx existant**
Si tu as déjà un conteneur nginx générique, tu peux simplement monter `index.html` et `assets/`
comme volume dans son dossier `html/`, sans passer par le Dockerfile.

## 6. Prochaines étapes (roadmap)

- Générateur de devis relié à la boutique h2oinnovation.net (paniers, produits, envoi automatique)
- Intégration SMS entrant (Twilio) si tu veux répondre aux textos directement depuis un tableau de bord plutôt que ton téléphone
- Historique des demandes reçues via le formulaire (actuellement, tout part par courriel seulement — rien n'est stocké)

## Structure du projet

```
index.html          → la page
assets/style.css     → tout le visuel (palette, typographie, mise en page)
assets/script.js      → logique (zone, liens de contact, chat, formulaire)
assets/config.js      → TES informations — le seul fichier à modifier au quotidien
Dockerfile / nginx.conf → déploiement
```
