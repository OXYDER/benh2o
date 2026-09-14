-- add-nav-outils.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter le libellé du
-- nouveau menu "Outils" dans le menu principal. Ne touche à rien d'autre.

UPDATE site_data
SET data = jsonb_set(data, '{nav,outils}', '"Outils"'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
