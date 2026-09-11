-- add-horaire-and-rdv-texts.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour :
--   1) créer ton horaire de travail par défaut (lundi-vendredi 8h-17h,fins de semaine fermées,
--      rendez-vous d'une heure) — modifiable ensuite dans /admin
--   2) ajouter tous les textes du formulaire de rendez-vous (labels, exemples,
--      bouton) comme champs éditables
-- Ne touche à rien d'autre.
--
-- Si tu as déjà configuré ton horaire ou modifié ces textes dans /admin depuis,
-- NE RELANCE PAS ce script.

INSERT INTO site_data (key, data) VALUES ('horaire', '{"joursTravail": {"lundi": {"actif": true, "debut": "08:00", "fin": "17:00"}, "mardi": {"actif": true, "debut": "08:00", "fin": "17:00"}, "mercredi": {"actif": true, "debut": "08:00", "fin": "17:00"}, "jeudi": {"actif": true, "debut": "08:00", "fin": "17:00"}, "vendredi": {"actif": true, "debut": "08:00", "fin": "17:00"}, "samedi": {"actif": false, "debut": "08:00", "fin": "12:00"}, "dimanche": {"actif": false, "debut": "08:00", "fin": "12:00"}}, "dureeCreneauMinutes": 60, "datesBloquees": [], "creneauxBloques": []}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

UPDATE site_data
SET data = jsonb_set(data, '{rdv}', (data->'rdv') || '{"labelNom": "Nom", "labelErabliere": "Nom de l''érablière", "labelEntailles": "Nombre d''entailles", "placeholderEntailles": "Ex. : 8000", "labelVille": "Ville", "labelAdresse": "Adresse", "placeholderAdresse": "Numéro et rue", "labelDejaClient": "Es-tu déjà client chez H2O Innovation?", "labelLieu": "Lieu du rendez-vous", "lieuBureau": "À ton bureau (Ham-Nord)", "lieuClient": "Chez moi (à mon érablière)", "labelDateHeure": "Date et heure souhaitées", "labelCourriel": "Courriel", "labelTelephone": "Téléphone", "note": "Un des deux (courriel ou téléphone) est nécessaire pour te confirmer le rendez-vous.", "submitButton": "Envoyer la demande"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
