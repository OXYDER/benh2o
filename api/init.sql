-- Schéma initial pour benoitlaprise.com
-- Exécuté automatiquement au premier démarrage du conteneur Postgres
-- (monté dans /docker-entrypoint-initdb.d/ — voir docker-compose.yml)

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_data (
  key TEXT PRIMARY KEY,           -- 'contact' ou 'zones'
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Amorçage : reprend les données déjà en place sur le site au moment de la migration.
-- Aucun compte admin n'est créé ici (voir scripts/create-admin.js) — le mot de passe
-- ne doit jamais transiter par un fichier commité dans le projet.

INSERT INTO site_data (key, data) VALUES ('contact', '{
  "nom": "Benoît Laprise",
  "titre": "Représentant des ventes — H2O Innovation",
  "telephoneMobileAffiche": "819 000-0000",
  "telephoneMobileLien": "+18190000000",
  "telephoneSmsAffiche": "819 000-0000",
  "telephoneSmsLien": "+18190000000",
  "telephoneH2OAffiche": "1 866 990-3891",
  "telephoneH2OLien": "+18669903891",
  "courriel": "benoit.laprise@h2oinnovation.com",
  "messengerUsername": "TonNomDePageFacebook",
  "chatLive": {
    "actif": false,
    "chatwootBaseUrl": "https://chat.benoitlaprise.com",
    "chatwootWebsiteToken": "",
    "lienDirect": ""
  },
  "formsubmitEmail": "benoit.laprise@h2oinnovation.com",
  "boutiqueUrl": "https://h2oinnovation.net",
  "contactGeneralUrl": "https://h2oinnovation.net/contact"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_data (key, data) VALUES ('zones', '{
  "regions": [
    {
      "name": "Centre-du-Québec",
      "code": "17",
      "mrcs": [
        { "name": "Bécancour", "municipalities": ["Bécancour", "Fortierville", "Lemieux", "Manseau", "Parisville", "Sainte-Françoise"] },
        { "name": "Nicolet-Yamaska", "municipalities": ["Baie-du-Febvre", "Nicolet", "Pierreville", "Saint-Léonard-d''Aston", "Sainte-Eulalie", "Saint-Sylvère"] },
        { "name": "Arthabaska", "municipalities": ["Chesterville", "Daveluyville", "Ham-Nord", "Kingsey Falls", "Saint-Albert", "Saint-Christophe-d''Arthabaska", "Saint-Rosaire", "Saint-Samuel", "Saint-Valère", "Tingwick", "Victoriaville", "Warwick", "Princeville"] },
        { "name": "L''Érable", "municipalities": ["Inverness", "Laurierville", "Lyster", "Plessisville", "Saint-Ferdinand", "Villeroy"] },
        { "name": "Drummond", "municipalities": ["Drummondville", "Saint-Cyrille-de-Wendover", "Saint-Germain-de-Grantham", "Saint-Lucien", "Notre-Dame-du-Bon-Conseil"] }
      ]
    },
    {
      "name": "Chaudière-Appalaches",
      "code": "12",
      "mrcs": [
        { "name": "Lotbinière", "municipalities": ["Leclercville", "Val-Alain"] },
        { "name": "Les Appalaches", "municipalities": ["Irlande", "Kinnear''s Mills", "Saint-Fortunat", "Saint-Julien"] }
      ]
    },
    {
      "name": "Estrie",
      "code": "05",
      "mrcs": [
        { "name": "Les Sources", "municipalities": ["Danville", "Ham-Sud", "Saint-Adrien", "Saint-Camille", "Wotton", "Saint-Georges-de-Windsor", "Val-des-Sources"] },
        { "name": "Le Haut-Saint-François", "municipalities": ["Dudswell", "Weedon"] },
        { "name": "Le Val-Saint-François", "municipalities": ["Richmond", "Cleveland", "Saint-Claude", "Stoke", "Val-Joli"] }
      ]
    }
  ]
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

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
ON CONFLICT (key) DO NOTHING;
