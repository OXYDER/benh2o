-- add-site-header-nav-content.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter les nouveaux
-- champs éditables : titre de la page, description (référencement), en-tête
-- (nom + sous-titre) et tous les libellés du menu principal.
-- Ne touche à rien d'autre dans le contenu.
--
-- Si tu as déjà modifié ces textes dans /admin depuis, NE RELANCE PAS ce script.

UPDATE site_data
SET data = jsonb_set(jsonb_set(jsonb_set(data, '{site}', '{"pageTitle": "Benoît Laprise — Représentant, Division Érablière, H2O Innovation", "metaDescription": "Représentant régional H2O Innovation pour la division érablière. Contacte-moi par téléphone, texto, courriel, Messenger ou clavardage."}'::jsonb, true), '{header}', '{"brandName": "Benoît Laprise", "brandSubtitle": "Représentant des ventes"}'::jsonb, true), '{nav}', '{"home": "Accueil", "zone": "Territoire", "carte": "Carte", "produits": "Produits H2O", "channels": "Nous joindre", "about": "À propos", "contact": "Formulaire de contact", "urgence": "URGENCE"}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
