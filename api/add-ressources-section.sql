-- add-ressources-section.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter le texte de la
-- nouvelle section « Ressources » combinée (tutoriels + manuels + fiches
-- techniques) sur la page d'accueil.

UPDATE site_data
SET data = jsonb_set(data, '{ressources}', '{"tag": "Ressources", "title": "Tutoriels, manuels et fiches techniques", "description": "Des guides et conseils pratiques pour bien utiliser, installer et entretenir votre équipement.", "voirTutoriels": "Voir plus de tutoriels", "voirManuels": "Voir plus de manuels", "voirFiches": "Voir plus de fiches techniques"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
