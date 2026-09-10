-- add-urgence-contact.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter les coordonnées
-- du bouton URGENCE (service à la clientèle et service technique H2O Innovation).
-- Ne touche à rien d'autre dans tes informations de contact.
--
-- Si tu changes ces coordonnées plus tard dans /admin, NE RELANCE PAS ce script,
-- ça écraserait tes changements.

UPDATE site_data
SET data = jsonb_set(data, '{urgence}', '{
  "telLien": "819 344-2288",
  "smsLien": "819 803-0384",
  "courriel": "serv@h2oinnovation.com"
}'::jsonb, true),
    updated_at = now()
WHERE key = 'contact';
