(function () {
  const mapEl = document.getElementById("coverage-map");
  if (!mapEl || typeof L === "undefined") return;

  const RED = "#C8352E";
  const RED_FILL = "#E24444";

  function normalize(str) {
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u2010-\u2015\u2212]/g, "-") // tirets « spéciaux » (en dash, em dash, etc.) -> tiret standard
      .replace(/\s+/g, " ") // espaces multiples/insécables -> un seul espace normal
      .toLowerCase()
      .trim();
  }

  async function init() {
    let zonesData, boundaries;
    try {
      const [zonesRes, boundariesRes] = await Promise.all([
        fetch("/api/zones"),
        fetch("assets/data/municipality-boundaries.geojson"),
      ]);
      zonesData = await zonesRes.json();
      boundaries = await boundariesRes.json();
    } catch (e) {
      mapEl.innerHTML = '<p style="padding:20px;color:#B3403A">Impossible de charger la carte.</p>';
      return;
    }

    const map = L.map(mapEl, { scrollWheelZoom: false }).setView([46.2, -72.0], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Limites municipales : Statistique Canada (Limites, Recensement 2021), Licence du gouvernement ouvert – Canada',
      maxZoom: 18,
    }).addTo(map);

    // Index des municipalités couvertes (nom -> {mrc, region})
    const covered = new Map();
    (zonesData.regions || []).forEach((region) => {
      (region.mrcs || []).forEach((mrc) => {
        mrc.municipalities.forEach((name) => {
          covered.set(normalize(name), { name, mrc: mrc.name, region: region.name });
        });
      });
    });

    const bounds = [];

    const layer = L.geoJSON(boundaries, {
      filter: (feature) => covered.has(normalize(feature.properties.municipality)),
      style: {
        color: RED,
        weight: 2,
        fillColor: RED_FILL,
        fillOpacity: 0.35,
      },
    }).addTo(map);

    layer.eachLayer((l) => {
      const info = covered.get(normalize(l.feature.properties.municipality));
      l.bindPopup(`<strong>${info.name}</strong><br>MRC ${info.mrc}<br>${info.region}`);
      if (l.getBounds) bounds.push(l.getBounds());
    });

    // Diagnostic : signale toute municipalité sélectionnée dans /admin qui n'a
    // pas trouvé de frontière correspondante (nom mal orthographié, tiret
    // spécial invisible, municipalité fusionnée/disparue, etc.)
    const matchedKeys = new Set(
      boundaries.features.map((f) => normalize(f.properties.municipality))
    );
    covered.forEach((info, key) => {
      if (!matchedKeys.has(key)) {
        console.warn(
          `Carte : aucune frontière trouvée pour "${info.name}" (MRC ${info.mrc}). ` +
          `Vérifie l'orthographe exacte dans /admin, ou cette municipalité n'existe peut-être plus (fusion municipale).`
        );
      }
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapEl.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
    mapEl.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
  }

  document.addEventListener("DOMContentLoaded", init);
})();
