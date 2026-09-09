-- seed-distributeurs.sql
-- À exécuter UNE FOIS sur ta base de données déjà en marche pour insérer
-- le réseau de distributeurs H2O Innovation (utilisé pour rediriger les
-- visiteurs hors zone vers le distributeur le plus proche).
--
-- Sans danger à relancer : si tu as déjà modifié la liste dans /admin,
-- NE RELANCE PAS ce script, ça écraserait tes changements.

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
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
