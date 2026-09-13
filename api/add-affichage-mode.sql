-- add-affichage-mode.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter le réglage
-- "format d'affichage" (grille / tableau / affiche) aux quatre sections de
-- publications. Toutes sont réglées sur "grille" par défaut (comportement
-- actuel inchangé tant que tu ne changes pas le réglage dans /admin).
--
-- Si tu as déjà choisi un format dans /admin depuis, NE RELANCE PAS ce script.

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(
               jsonb_set(
                 jsonb_set(data, '{nouvelles,affichage}', '"grille"'::jsonb, true),
                 '{tutoriels,affichage}', '"grille"'::jsonb, true
               ),
               '{manuels,affichage}', '"grille"'::jsonb, true
             ),
             '{fiches,affichage}', '"grille"'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
