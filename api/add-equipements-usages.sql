-- add-equipements-usages.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter la nouvelle section
-- « Équipements usagés » : colonnes de la table posts, texte des pages (page
-- complète + vignette sur l'accueil), et lien dans le menu principal.
--
-- Le lien est ajouté à la FIN de ton menu actuel (sans écraser le reste, même si
-- tu l'as déjà personnalisé dans /admin) — tu peux ensuite le déplacer où tu veux
-- avec les flèches ↑ / ↓ dans l'onglet Menu.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS prix NUMERIC;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS annee INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS numero_serie TEXT;

UPDATE site_data
SET data = jsonb_set(data, '{equipements}', '{"tag": "Occasion", "title": "Équipements usagés", "description": "Équipements acéricoles usagés à vendre — osmoseurs, évaporateurs, pompes et autres. Prix, année et numéro de série indiqués pour chaque annonce.", "voirTout": "Voir tous les équipements usagés", "affichage": "grille"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';

UPDATE site_data
SET data = jsonb_set(data, '{navMenu}', COALESCE(data->'navMenu', '[]'::jsonb) || '{"type": "link", "label": "Équipements usagés", "url": "/equipements-usages"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(data->'navMenu', '[]'::jsonb)) e WHERE e->>'url' = '/equipements-usages'
  );
