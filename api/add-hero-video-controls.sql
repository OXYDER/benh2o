-- add-hero-video-controls.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour ajouter les réglages de la
-- vidéo d'arrière-plan (activer/désactiver, opacité), éditables dans /admin.
-- Valeurs par défaut = ce qui est déjà en ligne (activée, 22 %) — rien ne change
-- visuellement tant que tu ne modifies pas toi-même dans l'admin.

UPDATE site_data
SET data = jsonb_set(
             jsonb_set(data, '{hero,videoEnabled}', 'true'::jsonb, true),
             '{hero,videoOpacity}', '22'::jsonb, true
           ),
    updated_at = now()
WHERE key = 'content';
