-- add-rdv-dejaclient-radio.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter les textes
-- des choix "Oui"/"Non" (case à cocher remplacée par un choix radio).
-- Ne touche à rien d'autre.

UPDATE site_data
SET data = jsonb_set(data, '{rdv}', (data->'rdv') || '{"dejaClientOui": "Oui", "dejaClientNon": "Non"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
