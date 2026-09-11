FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY admin.html /usr/share/nginx/html/admin.html
COPY nouvelles.html /usr/share/nginx/html/nouvelles.html
COPY tutoriels.html /usr/share/nginx/html/tutoriels.html
COPY manuels.html /usr/share/nginx/html/manuels.html
COPY fiches-techniques.html /usr/share/nginx/html/fiches-techniques.html
COPY assets/ /usr/share/nginx/html/assets/
RUN chmod -R a+rX /usr/share/nginx/html

EXPOSE 80
