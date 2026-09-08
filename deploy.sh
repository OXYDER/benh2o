#!/bin/bash
# deploy.sh — met à jour benoitlaprise.com sur le NAS
# -----------------------------------------------------
# Usage : ./deploy.sh
# À lancer depuis le dossier du repo sur le NAS, en SSH ou via
# une tâche planifiée Synology (Panneau de configuration > Planificateur de tâches).

set -e

echo "→ Récupération des dernières modifications (GitHub)…"
git pull origin main

echo "→ Reconstruction de l'image Docker…"
docker compose build

echo "→ Redémarrage du conteneur…"
docker compose up -d

echo "→ Nettoyage des anciennes images…"
docker image prune -f

echo "✓ benoitlaprise.com est à jour."
