-- add-post-images-gallery.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter la colonne
-- "images" (galerie d'images supplémentaires) à la table posts.
-- Sans danger à relancer, et ne touche à aucune donnée déjà enregistrée.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
