-- add-products-category-label.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter le petit titre
-- affiché au-dessus des badges de catégories dans la section "Produits H2O".
-- Ne touche à rien d'autre.
--
-- Si tu as déjà modifié ce texte dans /admin depuis, NE RELANCE PAS ce script.

UPDATE site_data
SET data = jsonb_set(data, '{products,categoriesLabel}', '"Ou accède directement à une catégorie :"'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
