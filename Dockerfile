FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html-src/index.html
COPY admin.html /usr/share/nginx/html-src/admin.html
COPY nouvelles.html /usr/share/nginx/html-src/nouvelles.html
COPY tutoriels.html /usr/share/nginx/html-src/tutoriels.html
COPY manuels.html /usr/share/nginx/html-src/manuels.html
COPY fiches-techniques.html /usr/share/nginx/html-src/fiches-techniques.html
COPY equipements-usages.html /usr/share/nginx/html-src/equipements-usages.html
COPY convertisseur.html /usr/share/nginx/html-src/convertisseur.html
COPY carte.html /usr/share/nginx/html-src/carte.html
COPY trop-plein-bassin.html /usr/share/nginx/html-src/trop-plein-bassin.html
COPY assets/ /usr/share/nginx/html-src/assets/
RUN chmod -R a+rX /usr/share/nginx/html-src
COPY docker-entrypoint-pages.sh /docker-entrypoint.d/50-sync-pages.sh
RUN chmod +x /docker-entrypoint.d/50-sync-pages.sh

EXPOSE 80
