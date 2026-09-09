-- update-about-content-v2.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour remplacer le texte de la
-- section "À propos" par la version finale (paragraphes + mise en évidence bleue).
-- Ne touche à rien d'autre dans le contenu.
--
-- Si tu as modifié le texte de la section "À propos" dans /admin depuis la dernière
-- fois, NE RELANCE PAS ce script, ça écraserait tes changements.

UPDATE site_data
SET data = jsonb_set(data, '{about}', '{
  "tag": "À propos",
  "title": "Du bois à la cabane, à vos côtés à chaque étape",
  "bodyHtml": "<p>En acériculture, chaque détail compte. Du premier gallon de sève qui sort du bois jusqu''à la dernière goutte de sirop, <strong>je crois que le bon équipement, le bon conseil et un service humain peuvent faire toute la différence.</strong></p>\n<p>Je ne veux pas simplement vous vendre un produit. <strong>Je veux comprendre votre érablière, vos besoins et vos projets afin de vous proposer la bonne solution.</strong></p>\n<p>Que vous soyez acériculteur débutant, producteur établi ou prêt à faire évoluer votre installation, je suis là pour vous accompagner dans vos choix et vous aider à bâtir une installation efficace, fiable et adaptée à votre réalité.</p>\n<p>Je peux vous conseiller pour une vaste gamme d''équipements et de fournitures acéricoles : <strong>évaporateurs, séparateurs par osmose inverse, extracteurs, pompes vacuum, maîtres-lignes, tubulure, pompes, outils, systèmes de surveillance et de contrôle à distance</strong> et bien plus encore.</p>\n<p>Mais surtout, <strong>je veux être votre personne-ressource.</strong></p>\n<p>Vous avez une question? Un projet? Un équipement qui vous cause problème? Vous hésitez entre deux solutions? <strong>Appelez-moi, écrivez-moi ou parlez-moi de votre projet.</strong> Je prendrai le temps de vous écouter, de vous expliquer vos options et de vous conseiller honnêtement.</p>\n<p>Parce que pour moi, vendre un équipement, ce n''est pas simplement faire une transaction.<br><strong>C''est commencer une relation.</strong></p>\n<p>Je veux que vous puissiez compter sur moi avant, pendant et après votre achat : pour vos conseils, votre installation, votre mise en route, vos pièces, vos fournitures, votre dépannage et votre service après-vente.</p>\n<p>Mon objectif est simple : <strong>vous aider à produire mieux, à travailler plus efficacement et à investir dans des équipements qui ont réellement leur place dans votre érablière.</strong></p>",
  "taglineHtml": "Du bois à la cabane.<br>Je vous accompagne à chaque étape.<br><strong>Vous produisez le sirop. Je m''occupe de vous aider à bien vous équiper.</strong>",
  "stat1Value": "1",
  "stat1Label": "représentant dédié à ton secteur",
  "stat2Value": "5",
  "stat2Label": "façons de me joindre, une seule réponse",
  "stat3Value": "H2O",
  "stat3Label": "Innovation — division érablière"
}'::jsonb, true),
    updated_at = now()
WHERE key = 'content';
