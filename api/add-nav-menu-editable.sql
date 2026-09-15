-- add-nav-menu-editable.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter la structure du menu
-- principal (navMenu), éditable dans /admin. Reconstitue exactement le menu actuel
-- comme point de départ — rien ne change visuellement tant que tu ne le modifies
-- pas toi-même dans l'admin.

UPDATE site_data
SET data = jsonb_set(data, '{navMenu}', '[{"type": "link", "label": "Accueil", "url": "#home"}, {"type": "link", "label": "Territoire", "url": "#zone"}, {"type": "link", "label": "Carte", "url": "#carte"}, {"type": "products", "label": "Produits H2O"}, {"type": "link", "label": "Nouvelles", "url": "/nouvelles"}, {"type": "link", "label": "À propos", "url": "#about"}, {"type": "dropdown", "label": "Support & Contact", "children": [{"type": "separator", "label": "Contact"}, {"type": "link", "label": "Nous joindre", "url": "#channels"}, {"type": "action", "label": "Rendez-vous", "action": "rdv"}, {"type": "link", "label": "Formulaire de contact", "url": "#contact"}, {"type": "separator", "label": "Informations"}, {"type": "link", "label": "Tutoriels", "url": "/tutoriels"}, {"type": "link", "label": "Manuels de l''utilisateur", "url": "/manuels"}, {"type": "link", "label": "Fiches Techniques", "url": "/fiches-techniques"}, {"type": "link", "label": "Convertisseur Acéricole", "url": "/convertisseur"}]}, {"type": "dropdown", "label": "Outils", "children": [{"type": "link", "label": "Calculateurs", "url": "/convertisseur#mode-calculateurs"}, {"type": "link", "label": "Convertisseurs", "url": "/convertisseur#mode-convertisseurs"}]}]'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
