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
    "description": "Chaque zone rouge est une municipalité que je dessers — pas la MRC en entier, seulement les municipalités précises de mon secteur. Les points bleus sont les autres distributeurs H2O Innovation, et le gros point ambre marque le centre de mon secteur. Clique sur une zone ou un point pour en savoir plus — déplace-toi et zoome librement sur la carte.",
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
    "title": "Du bois à la cabane, à vos côtés à chaque étape",
    "bodyHtml": "<p>En acériculture, chaque détail compte. Du premier gallon de sève qui sort du bois jusqu'à la dernière goutte de sirop, <strong>je crois que le bon équipement, le bon conseil et un service humain peuvent faire toute la différence.</strong></p>\n<p>Je ne veux pas simplement vous vendre un produit. <strong>Je veux comprendre votre érablière, vos besoins et vos projets afin de vous proposer la bonne solution.</strong></p>\n<p>Que vous soyez acériculteur débutant, producteur établi ou prêt à faire évoluer votre installation, je suis là pour vous accompagner dans vos choix et vous aider à bâtir une installation efficace, fiable et adaptée à votre réalité.</p>\n<p>Je peux vous conseiller pour une vaste gamme d'équipements et de fournitures acéricoles : <strong>évaporateurs, séparateurs par osmose inverse, extracteurs, pompes vacuum, maîtres-lignes, tubulure, pompes, outils, systèmes de surveillance et de contrôle à distance</strong> et bien plus encore.</p>\n<p>Mais surtout, <strong>je veux être votre personne-ressource.</strong></p>\n<p>Vous avez une question? Un projet? Un équipement qui vous cause problème? Vous hésitez entre deux solutions? <strong>Appelez-moi, écrivez-moi ou parlez-moi de votre projet.</strong> Je prendrai le temps de vous écouter, de vous expliquer vos options et de vous conseiller honnêtement.</p>\n<p>Parce que pour moi, vendre un équipement, ce n'est pas simplement faire une transaction.<br><strong>C'est commencer une relation.</strong></p>\n<p>Je veux que vous puissiez compter sur moi avant, pendant et après votre achat : pour vos conseils, votre installation, votre mise en route, vos pièces, vos fournitures, votre dépannage et votre service après-vente.</p>\n<p>Mon objectif est simple : <strong>vous aider à produire mieux, à travailler plus efficacement et à investir dans des équipements qui ont réellement leur place dans votre érablière.</strong></p>",
    "taglineHtml": "Du bois à la cabane.<br>Je vous accompagne à chaque étape.<br><strong>Vous produisez le sirop. Je m'occupe de vous aider à bien vous équiper.</strong>",
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

INSERT INTO site_data (key, data) VALUES ('distributeurs', '[
  {
    "name": "Équipement Cusson",
    "address": "5003 Rue St-Joseph, Valcourt, QC",
    "phone": "819-679-7223",
    "email": "antoinecusson@hotmail.com",
    "lat": 45.5049174,
    "lon": -72.3159119
  },
  {
    "name": "Équipement d''érablière Messier",
    "address": "2219 Rang St-Pierre, Saint-Ours, QC",
    "phone": "450-881-1595",
    "email": "equipementmessier@hotmail.com",
    "lat": 45.911063,
    "lon": -73.1498694
  },
  {
    "name": "Équipement Dubois Inc.",
    "address": "1654 Route 269, Kinnear''s Mills, QC",
    "phone": "418-424-3507",
    "email": "",
    "lat": 46.222918,
    "lon": -71.3782252
  },
  {
    "name": "Équipement D.G Marcoux",
    "address": "930 Avenue Principale, Saint-Élzéar, QC",
    "phone": "418-387-7848",
    "email": "equipementdg@outlook.com",
    "lat": 46.3994258,
    "lon": -71.0574031
  },
  {
    "name": "Garage Bernard Hardy",
    "address": "455 Rue Saint-Paul, Saint-Ubalde, QC",
    "phone": "418-227-2059",
    "email": "info@garagebh.com",
    "lat": 46.7567483,
    "lon": -72.2722675
  },
  {
    "name": "Les Entreprises LJAM",
    "address": "1054 Chemin Denison Est, Shefford, QC",
    "phone": "579-365-1963",
    "email": "ljam@videotron.ca",
    "lat": 45.3839405,
    "lon": -72.6632033
  },
  {
    "name": "Pompes Couture",
    "address": "694 42e Rue Nord, Saint-Georges, QC",
    "phone": "418-228-5639",
    "email": "services@pompescouture.com",
    "lat": 46.1272541,
    "lon": -70.7013026
  },
  {
    "name": "Matériaux Fernand Caron",
    "address": "407 Route 132, Saint-Simon-de-Rimouski, QC",
    "phone": "418-738-2811",
    "email": "matfcaron@gmail.com",
    "lat": 48.2075739,
    "lon": -69.0368258
  },
  {
    "name": "Centre Mécanique Saint-Pamphile",
    "address": "1645 Rte Elgin N, Saint-Pamphile, QC",
    "phone": "418-356-5015",
    "email": "centremecanique@hotmail.com",
    "lat": 46.9857624,
    "lon": -69.8177397
  },
  {
    "name": "Les Entreprises Brault 4 Saisons",
    "address": "181 Rang Clinton, Woburn, QC",
    "phone": "819-583-9612",
    "email": "brault4saisons@outlook.com",
    "lat": 45.486564,
    "lon": -70.903816
  },
  {
    "name": "E.D&R vente et installation d''équipement d''érablière",
    "address": "121 Route 147 Sud, Coaticook, QC",
    "phone": "819-849-6222",
    "email": "equipementdr@gmail.com",
    "lat": 45.111721,
    "lon": -71.7917978
  },
  {
    "name": "Érablière Brix et Compagnie",
    "address": "365 rang Saint Ambroise, Oka, QC",
    "phone": "514-914-1358",
    "email": "erablierebrixetcompagnie@gmail.com",
    "lat": 45.5230999,
    "lon": -74.0897472
  },
  {
    "name": "Domaine BIMA",
    "address": "421 Rue Centrale, St-Stanislas-de-Kostka, QC",
    "phone": "450-807-7376",
    "email": "domainebima@hotmail.com",
    "lat": 45.1724067,
    "lon": -74.1226543
  },
  {
    "name": "Les Équipements Modernes",
    "address": "6561 chemin de Saint-Jean, St-Félix-de-Valois, QC",
    "phone": "450-889-2781",
    "email": "eric@equipementsmodernes.com",
    "lat": 46.1883931,
    "lon": -73.4755205
  },
  {
    "name": "Équipro André Bolduc",
    "address": "127 Rue Principale, Lambton, QC",
    "phone": "418-486-7071",
    "email": "equipro@tellambton.net",
    "lat": 45.8433168,
    "lon": -71.0875882
  },
  {
    "name": "Équipements Erabrix",
    "address": "1037 Avenue Champlain, Disraeli, QC",
    "phone": "418-327-7505",
    "email": "equipementserabrix@gmail.com",
    "lat": 45.908666,
    "lon": -71.362131
  },
  {
    "name": "René Ouellet et Fils inc.",
    "address": "237 Chemin Principal, St-Pierre-de-Lamy, QC",
    "phone": "581-337-1558",
    "email": "reneouelletetfils@gmail.com",
    "lat": 48.0033311,
    "lon": -69.0356078
  }
]'::jsonb)
ON CONFLICT (key) DO NOTHING;
