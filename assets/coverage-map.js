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
    let zonesData, boundaries, distributeurs;
    try {
      const [zonesRes, boundariesRes, distRes] = await Promise.all([
        fetch("/api/zones"),
        fetch("assets/data/municipality-boundaries.geojson"),
        fetch("/api/distributeurs"),
      ]);
      zonesData = await zonesRes.json();
      boundaries = await boundariesRes.json();
      distributeurs = await distRes.json();
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
    const centers = [];

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
      if (l.getBounds) {
        bounds.push(l.getBounds());
        centers.push(l.getBounds().getCenter());
      }
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

    // Épingles des autres distributeurs H2O Innovation (repère, discret).
    const DIST_COLOR = "#1E9BFF";
    (distributeurs || []).forEach((d) => {
      if (typeof d.lat !== "number" || typeof d.lon !== "number") return;
      L.circleMarker([d.lat, d.lon], {
        radius: 6,
        color: "#0B4C80",
        weight: 1.5,
        fillColor: DIST_COLOR,
        fillOpacity: 0.9,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${d.name}</strong>` +
          (d.address ? `<br>${d.address}` : "") +
          (d.phone ? `<br>${d.phone}` : "") +
          (d.email ? `<br>${d.email}` : "")
        );
    });

    // Une seule grosse épingle, au centre de ton secteur.
    if (centers.length) {
      const avgLat = centers.reduce((s, c) => s + c.lat, 0) / centers.length;
      const avgLon = centers.reduce((s, c) => s + c.lng, 0) / centers.length;
      const benoitIcon = L.divIcon({
        className: "benoit-pin",
        html: '<div class="benoit-pin-dot"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([avgLat, avgLon], { icon: benoitIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup("<strong>Benoît Laprise</strong><br>Centre de mon secteur")
        .bindTooltip("Benoît Laprise", { permanent: false, direction: "top" });
    }

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Le zoom à la molette ne s'active qu'après un clic sur la carte — comme ça,
    // le simple fait de défiler la page en passant par-dessus la carte ne la
    // zoom/dézoom pas par accident. Une fois activé, on zoome normalement (sans
    // combinaison de touches) jusqu'à ce qu'on clique ailleurs sur la page.
    const zoomHint = document.createElement("div");
    zoomHint.className = "map-zoom-hint";
    zoomHint.textContent = "Cliquer pour activer le zoom";
    mapEl.appendChild(zoomHint);

    mapEl.addEventListener("click", () => {
      map.scrollWheelZoom.enable();
      mapEl.classList.add("map-active");
    });
    document.addEventListener("click", (e) => {
      if (!mapEl.contains(e.target)) {
        map.scrollWheelZoom.disable();
        mapEl.classList.remove("map-active");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
