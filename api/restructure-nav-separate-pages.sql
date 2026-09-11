-- restructure-nav-separate-pages.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter :
--   1) le texte "Voir toutes les nouvelles" / "Voir tous les tutoriels" (nouveaux
--      liens sur la page d'accueil, vers les nouvelles pages séparées)
-- Ne touche à rien d'autre. Le menu (nav.*) a déjà été ajouté par une migration
-- précédente (add-posts-and-nav-restructure.sql) — si tu ne l'as pas encore lancée,
-- lance-la d'abord.

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(data, '{nouvelles,voirTout}', '"Voir toutes les nouvelles"'::jsonb, true),
             '{tutoriels,voirTout}', '"Voir tous les tutoriels"'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
