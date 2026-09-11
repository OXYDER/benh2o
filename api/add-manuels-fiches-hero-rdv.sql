-- add-manuels-fiches-hero-rdv.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter :
--   1) les textes des deux nouvelles pages "Manuels de l'utilisateur" et
--      "Fiches Techniques"
--   2) les libellés de menu correspondants
--   3) le texte du bouton "Rendez-vous" ajouté dans le hero de la page d'accueil
-- Ne touche à rien d'autre.
--
-- Si tu as déjà modifié ces textes dans /admin depuis, NE RELANCE PAS ce script.

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(
               jsonb_set(
                 jsonb_set(data, '{manuels}', '{"tag": "Documentation", "title": "Manuels de l''utilisateur", "description": "Les guides complets pour installer, configurer et utiliser ton équipement H2O Innovation."}'::jsonb, true),
                 '{fiches}', '{"tag": "Documentation", "title": "Fiches Techniques", "description": "Spécifications, caractéristiques et données techniques de l''équipement H2O Innovation."}'::jsonb, true
               ),
               '{nav}', (data->'nav') || '{"manuels": "Manuels de l''utilisateur", "fiches": "Fiches Techniques"}'::jsonb, true
             ),
             '{hero}', (data->'hero') || '{"ctaRdv": "Rendez-vous"}'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
