(function () {
  const mapEl = document.getElementById("coverage-map");
  if (!mapEl || typeof L === "undefined") return;

  const RED = "#C8352E";
  const RED_FILL = "#E24444";

  function normalize(str) {
    return (str || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  async function init() {
    let zonesData, coords, mrcBoundaries;
    try {
      const [zonesRes, coordsRes, boundariesRes] = await Promise.all([
        fetch("/api/zones"),
        fetch("assets/data/municipality-coords.json"),
        fetch("assets/data/mrc-boundaries.geojson"),
      ]);
      zonesData = await zonesRes.json();
      coords = await coordsRes.json();
      mrcBoundaries = await boundariesRes.json();
    } catch (e) {
      mapEl.innerHTML = '<p style="padding:20px;color:#B3403A">Impossible de charger la carte.</p>';
      return;
    }

    const map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Limites MRC : Statistique Canada (Limites, Recensement 2021), Licence du gouvernement ouvert – Canada',
      maxZoom: 18,
    }).addTo(map);

    // Index des MRC couvertes (nom -> {region})
    const coveredMrcs = new Map();
    (zonesData.regions || []).forEach((region) => {
      (region.mrcs || []).forEach((mrc) => {
        coveredMrcs.set(normalize(mrc.name), { name: mrc.name, region: region.name });
      });
    });

    const bounds = [];

    // Frontières officielles des MRC couvertes
    const mrcLayer = L.geoJSON(mrcBoundaries, {
      filter: (feature) => coveredMrcs.has(normalize(feature.properties.mrc)),
      style: {
        color: RED,
        weight: 2,
        fillColor: RED_FILL,
        fillOpacity: 0.16,
      },
    }).addTo(map);

    mrcLayer.eachLayer((layer) => {
      const info = coveredMrcs.get(normalize(layer.feature.properties.mrc));
      layer.bindPopup(`<strong>MRC ${info.name}</strong><br>${info.region}`);
      layer.getBounds && bounds.push(layer.getBounds());
    });

    // Points pour chaque municipalité desservie
    (zonesData.regions || []).forEach((region) => {
      (region.mrcs || []).forEach((mrc) => {
        mrc.municipalities.forEach((name) => {
          const c = coords[name];
          if (!c) return;
          bounds.push(L.latLng(c[0], c[1]));
          L.circleMarker(c, {
            radius: 4.5,
            color: "#7A1C1C",
            weight: 1.5,
            fillColor: "#FFFFFF",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup(`<strong>${name}</strong><br>MRC ${mrc.name}<br>${region.name}`);
        });
      });
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([46.2, -72.0], 8);
    }

    mapEl.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
    mapEl.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
  }

  document.addEventListener("DOMContentLoaded", init);
})();
