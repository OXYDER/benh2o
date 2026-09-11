-- add-channels-rdv.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter la nouvelle
-- ligne "Prendre un rendez-vous" dans la section Nous joindre.
-- Ne touche à rien d'autre.

UPDATE site_data
SET data = jsonb_set(data, '{channels,rdv}', '{"title": "Prendre un rendez-vous", "desc": "Choisis directement une date et une heure qui te conviennent.", "bouton": "Réserver"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
