-- add-rendezvous.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter le système de
-- rendez-vous : la table qui stocke les demandes, et les textes de la section
-- (titre, description) + le libellé du menu.
--
-- Sans danger à relancer : CREATE TABLE IF NOT EXISTS ne touche pas à une table
-- déjà créée. Le jsonb_set écrase seulement les champs "rdv" et "nav.rdv" — si
-- tu les as déjà modifiés dans /admin, NE RELANCE PAS la partie jsonb_set.

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  erabliere TEXT,
  nb_entailles TEXT,
  adresse TEXT,
  ville TEXT NOT NULL,
  deja_client BOOLEAN DEFAULT false,
  lieu TEXT NOT NULL DEFAULT 'bureau',
  courriel TEXT,
  telephone TEXT,
  date_demandee DATE NOT NULL,
  heure_demandee TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date_alternative DATE,
  heure_alternative TEXT,
  note_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(data, '{rdv}', '{"tag": "Rendez-vous", "title": "Prendre rendez-vous", "description": "Choisis la date, l''heure et le lieu qui te conviennent. Je confirme ta demande rapidement — par courriel ou par téléphone."}'::jsonb, true),
             '{nav,rdv}', '"Rendez-vous"'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
