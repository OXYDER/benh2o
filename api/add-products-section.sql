-- add-products-section.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour :
--   1) ajouter la nouvelle section "Produits H2O" (moteur de recherche)
--   2) transformer les badges d'équipements de la section À propos en vrais liens
--      vers les catégories correspondantes sur h2oinnovation.net
-- Ne touche à rien d'autre dans le contenu.
--
-- Si tu as déjà modifié ces sections dans /admin depuis, NE RELANCE PAS ce script,
-- ça écraserait tes changements.

UPDATE site_data
SET data = jsonb_set(
              jsonb_set(data, '{products}', '{"tag": "Catalogue", "title": "Trouve le bon produit H2O Innovation", "description": "Cherche directement dans le catalogue officiel H2O Innovation — évaporateurs, tubulure, pompes, filtration et bien plus. Les résultats s''ouvrent dans un nouvel onglet, directement sur h2oinnovation.net.", "searchButton": "Rechercher", "searchNote": "Besoin d''aide pour choisir? Écris-moi directement — je peux te conseiller sur le bon produit pour ton érablière."}'::jsonb, true),
              '{about,equipmentItems}', '[{"label": "Évaporateurs", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/evaporation/id/232/"}, {"label": "Séparateurs par osmose inverse", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/osmoses-inverses/id/603/"}, {"label": "Relâcheurs et extracteurs", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/extracteurs/id/261/"}, {"label": "Pompes à vacuum", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/pompes-a-vide-seules/id/578/"}, {"label": "Maîtres-lignes", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/maitre-lignes/id/402/"}, {"label": "Tubulure", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/tubulures/id/401/"}, {"label": "Pompes", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/pompes-a-vide/id/227/"}, {"label": "Outils", "url": "https://h2oinnovation.net/int_fr/catalog/category/view/s/outils/id/437/"}, {"label": "Capteurs de monitoring", "url": "https://h2oinnovation.net/int_fr/h2o-monitoring-surveillance-sans-fil/capteurs-et-sondes.html"}, {"label": "Systèmes de surveillance et de contrôle à distance", "url": "https://h2oinnovation.net/int_fr/h2o-monitoring-surveillance-sans-fil.html"}]'::jsonb, true
            ),
    updated_at = now()
WHERE key = 'content';

-- Retire l'ancien champ "equipmentList" (comma-separated), devenu inutile.
UPDATE site_data
SET data = data #- '{about,equipmentList}'
WHERE key = 'content';
