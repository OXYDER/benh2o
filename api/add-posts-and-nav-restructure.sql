-- add-posts-and-nav-restructure.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour :
--   1) créer la table "posts" (Nouvelles et Événements + Tutoriels)
--   2) ajouter les textes des deux nouvelles sections
--   3) ajouter les libellés du menu restructuré (Nouvelles, Tutoriels, Support & Contact)
-- Ne touche à rien d'autre.
--
-- Si tu as déjà modifié ces textes dans /admin depuis, NE RELANCE PAS la partie
-- jsonb_set/UPDATE (le CREATE TABLE, lui, ne fait jamais rien si la table existe déjà).

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'nouvelle',
  titre TEXT NOT NULL,
  resume TEXT,
  contenu TEXT,
  image_url TEXT,
  date_publication DATE NOT NULL DEFAULT CURRENT_DATE,
  publie BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(
               jsonb_set(data, '{nouvelles}', '{"tag": "Actualités", "title": "Nouvelles et Événements", "description": "Les nouveautés H2O Innovation, les événements auxquels je participe, et les beaux moments vécus avec mes clients."}'::jsonb, true),
               '{tutoriels}', '{"tag": "Ressources", "title": "Tutoriels, informations et modes d''emploi", "description": "Des guides et conseils pratiques pour bien utiliser et entretenir ton équipement."}'::jsonb, true
             ),
             '{nav}', (data->'nav') || '{"nouvelles": "Nouvelles", "tutoriels": "Tutoriels", "support": "Support & Contact"}'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
