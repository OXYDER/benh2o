#!/bin/sh
# Copie les pages fraîchement construites (image Docker) dans le volume partagé
# à chaque démarrage du conteneur, pour que le contenu déployé reste à jour.
# /usr/share/nginx/html/uploads est un volume séparé, monté sur un chemin plus
# précis — cette copie ne le touche pas puisque html-src n'a pas de dossier uploads.
set -e
mkdir -p /usr/share/nginx/html
cp -r /usr/share/nginx/html-src/. /usr/share/nginx/html/
