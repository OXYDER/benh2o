-- add-categories-and-files.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter :
--   1) la table des catégories (post_categories)
--   2) les colonnes categorie, fichier_url et fichier_nom sur la table posts
--      (existante, ne perd aucune donnée déjà enregistrée)
-- Sans danger à relancer.

CREATE TABLE IF NOT EXISTS post_categories (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, nom)
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS categorie TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fichier_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS fichier_nom TEXT;
