-- update-about-content.sql
-- À exécuter UNE FOIS sur ta base déjà en marche pour remplacer le texte de la
-- section "À propos" par le nouveau texte (philosophie de vente).
-- Ne touche à rien d'autre dans le contenu (en-tête, zone, carte, canaux, formulaire, pied de page).
--
-- Si tu as déjà modifié le texte de la section "À propos" dans /admin depuis, NE RELANCE
-- PAS ce script, ça écraserait tes changements.

UPDATE site_data
SET data = jsonb_set(data, '{about}', '{
  "tag": "À propos",
  "title": "Du bois à la cabane, à vos côtés à chaque étape",
  "intro": "En acériculture, chaque détail compte. Du premier gallon de sève qui sort du bois jusqu''à la dernière goutte de sirop, je crois que le bon équipement, le bon conseil et un service humain peuvent faire toute la différence.",
  "quote1": "Je ne veux pas simplement vous vendre un produit. Je veux comprendre votre érablière, vos besoins et vos projets afin de vous proposer la bonne solution.",
  "body1": "Que vous soyez acériculteur débutant, producteur établi ou prêt à faire évoluer votre installation, je suis là pour vous accompagner dans vos choix et vous aider à bâtir une installation efficace, fiable et adaptée à votre réalité.",
  "equipmentLabel": "Je peux vous conseiller pour une vaste gamme d''équipements et de fournitures acéricoles :",
  "equipmentList": "Évaporateurs, Séparateurs par osmose inverse, Relâcheurs et extracteurs, Pompes à vacuum, Maîtres-lignes, Tubulure, Pompes, Outils, Capteurs de monitoring, Systèmes de surveillance et de contrôle à distance",
  "body2": "Mais surtout, je veux être votre personne-ressource. Vous avez une question? Un projet? Un équipement qui vous cause problème? Vous hésitez entre deux solutions? Appelez-moi, écrivez-moi ou parlez-moi de votre projet. Je prendrai le temps de vous écouter, de vous expliquer vos options et de vous conseiller honnêtement.",
  "quote2": "Parce que pour moi, vendre un équipement, ce n''est pas simplement faire une transaction. C''est commencer une relation.",
  "body3": "Je veux que vous puissiez compter sur moi avant, pendant et après votre achat : pour vos conseils, votre installation, votre mise en route, vos pièces, vos fournitures, votre dépannage et votre service après-vente. Mon objectif est simple : vous aider à produire mieux, à travailler plus efficacement et à investir dans des équipements qui ont réellement leur place dans votre érablière.",
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
