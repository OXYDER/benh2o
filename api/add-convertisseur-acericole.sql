-- add-convertisseur-acericole.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter les textes de la
-- nouvelle page "Convertisseur Acéricole" et son lien de menu.
-- Ne touche à rien d'autre.

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(data, '{convertisseur}', '{"tag": "Outil pratique", "title": "Convertisseur Acéricole", "description": "Rendement sève-sirop, point d''ébullition selon l''altitude, et conversions entre litres, gallons, kilogrammes et livres pour tes produits d''érable.", "avertissement": "Outil fourni à titre indicatif pour la planification. Toujours vérifier la densité finale de ton sirop avec un réfractomètre calibré avant la mise en contenant."}'::jsonb, true),
             '{nav}', (data->'nav') || '{"convertisseur": "Convertisseur Acéricole"}'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
