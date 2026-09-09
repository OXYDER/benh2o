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
    "propertyId": "000000000000000000000000",
    "widgetId": "1abcdefgh",
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
