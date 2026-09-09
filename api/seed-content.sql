-- seed-content.sql
-- À exécuter UNE FOIS sur ta base de données déjà en marche pour remplir
-- l'onglet "Contenu de la page" avec les textes déjà en place sur le site.
-- (init.sql ne s'exécute qu'automatiquement sur une base neuve — la tienne
-- tournait déjà avant l'ajout de cette section, donc elle ne l'a jamais eu.)
--
-- Sans danger à relancer plusieurs fois : si tu as déjà modifié du contenu
-- dans /admin, NE RELANCE PAS ce script, ça écraserait tes changements avec
-- les textes d'origine du site.

INSERT INTO site_data (key, data) VALUES ('content', '{
  "activeTheme": "navy-electrique",
  "hero": {
    "eyebrow": "Ton représentant régional",
    "headlineHtml": "L''eau d''érable, <em>un seul contact</em> pour ta région.",
    "lead": "J''accompagne les acériculteurs de mon secteur pour l''osmose inverse, la filtration et le service après-vente H2O Innovation — par téléphone, texto, courriel, Messenger ou clavardage, selon ce qui te convient.",
    "ctaCall": "Appeler maintenant",
    "ctaSms": "Texter",
    "ctaZone": "Vérifier ma région"
  },
  "zone": {
    "tag": "Territoire",
    "title": "Est-ce que je couvre ta région?",
    "description": "Entre le nom de ta ville ou de ta MRC. Je ne dessers qu''un secteur précis — si tu es ailleurs, je te dirige directement vers le bon représentant."
  },
  "map": {
    "tag": "Vue d''ensemble",
    "title": "Mon secteur, en un coup d''œil",
    "description": "Chaque zone rouge est une municipalité que je dessers — pas la MRC en entier, seulement les municipalités précises de mon secteur. Clique sur une zone pour voir son nom — déplace-toi et zoome librement sur la carte.",
    "note": "Frontières municipales officielles (Statistique Canada). Pour une confirmation précise de ton secteur, utilise le vérificateur ci-dessus ou contacte-moi directement."
  },
  "channels": {
    "tag": "Nous joindre",
    "title": "Choisis le moyen qui te convient",
    "description": "Même question, cinq façons de me la poser. Réponse habituellement en moins d''une journée ouvrable.",
    "phone": {
      "title": "Téléphone",
      "desc": "Pour une question rapide ou un dépannage urgent sur le système."
    },
    "sms": {
      "title": "Texto (SMS)",
      "desc": "Écris-moi directement, je réponds dès que possible."
    },
    "email": {
      "title": "Courriel",
      "desc": "Pour une demande détaillée ou l''envoi de documents."
    },
    "messenger": {
      "title": "Messenger",
      "desc": "Pour rester dans une conversation que tu as déjà l''habitude d''utiliser."
    },
    "chat": {
      "title": "Clavardage en direct",
      "desc": "Pose ta question en direct sur cette page pendant mes heures de bureau."
    },
    "h2o": {
      "title": "Ligne générale H2O Innovation"
    }
  },
  "about": {
    "tag": "À propos",
    "title": "Un seul point de contact pour ton secteur",
    "p1": "Je suis représentant des ventes chez H2O Innovation pour la division érablière. Mon travail : t''aider à choisir, entretenir et faire évoluer ton système d''osmose inverse et de filtration, du premier devis jusqu''au service après-vente.",
    "p2Html": "Cette page centralise tous les moyens de me joindre. Éventuellement, tu pourras aussi générer une demande de devis directement ici, reliée à la boutique <a href=\"https://h2oinnovation.net\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--amber-300)\">h2oinnovation.net</a>.",
    "stat1Value": "1",
    "stat1Label": "représentant dédié à ton secteur",
    "stat2Value": "5",
    "stat2Label": "façons de me joindre, une seule réponse",
    "stat3Value": "H2O",
    "stat3Label": "Innovation — division érablière"
  },
  "form": {
    "tag": "Formulaire",
    "title": "Envoyer une demande",
    "description": "Pour une demande d''information générale ou un premier pas vers un devis. Je te reviens directement par téléphone ou courriel.",
    "note": "En envoyant ce formulaire, ta demande m''est acheminée directement par courriel."
  },
  "footer": {
    "line1": "Représentant régional — Division Érablière",
    "line2": "H2O Innovation",
    "copyrightSuffix": "Benoît Laprise — Représentant indépendant de secteur, H2O Innovation."
  }
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
