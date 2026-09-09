(function () {
  const mapEl = document.getElementById("coverage-map");
  if (!mapEl || typeof L === "undefined") return;

  const RED = "#E24444";
  const RED_FILL = "#E24444";

  /* ---------- Enveloppe convexe (Andrew's monotone chain) ---------- */
  function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }
  function convexHull(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length <= 2) return pts;

    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  // Agrandit légèrement le polygone autour de son centre pour que la zone
  // "déborde" un peu au-delà des points plutôt que de les toucher pile.
  function inflateHull(hull, factor) {
    const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
    return hull.map((p) => [cx + (p[0] - cx) * factor, cy + (p[1] - cy) * factor]);
  }

  async function init() {
    let zonesData, coords;
    try {
      const [zonesRes, coordsRes] = await Promise.all([
        fetch("/api/zones"),
        fetch("assets/data/municipality-coords.json"),
      ]);
      zonesData = await zonesRes.json();
      coords = await coordsRes.json();
    } catch (e) {
      mapEl.innerHTML = '<p style="padding:20px;color:#B3403A">Impossible de charger la carte.</p>';
      return;
    }

    const map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const allLatLngs = [];

    (zonesData.regions || []).forEach((region) => {
      (region.mrcs || []).forEach((mrc) => {
        const mrcPoints = [];

        mrc.municipalities.forEach((name) => {
          const c = coords[name];
          if (!c) return; // pas de coordonnée connue pour cette municipalité
          mrcPoints.push(c);
          allLatLngs.push(c);

          L.circleMarker(c, {
            radius: 5,
            color: "#8A1F1F",
            weight: 1.5,
            fillColor: RED,
            fillOpacity: 0.95,
          })
            .addTo(map)
            .bindPopup(`<strong>${name}</strong><br>MRC ${mrc.name}<br>${region.name}`);
        });

        if (mrcPoints.length >= 3) {
          const hull = inflateHull(convexHull(mrcPoints), 1.18);
          L.polygon(hull, {
            color: RED,
            weight: 1.5,
            fillColor: RED_FILL,
            fillOpacity: 0.12,
            dashArray: "4 4",
          }).addTo(map).bindPopup(`<strong>MRC ${mrc.name}</strong><br>${region.name}`);
        } else if (mrcPoints.length > 0) {
          // pas assez de points pour un polygone : un cercle discret suffit
          const centerLat = mrcPoints.reduce((s, p) => s + p[0], 0) / mrcPoints.length;
          const centerLng = mrcPoints.reduce((s, p) => s + p[1], 0) / mrcPoints.length;
          L.circle([centerLat, centerLng], {
            radius: 6000,
            color: RED,
            weight: 1.5,
            fillColor: RED_FILL,
            fillOpacity: 0.12,
            dashArray: "4 4",
          }).addTo(map).bindPopup(`<strong>MRC ${mrc.name}</strong><br>${region.name}`);
        }
      });
    });

    if (allLatLngs.length) {
      map.fitBounds(allLatLngs, { padding: [30, 30] });
    } else {
      map.setView([46.2, -72.0], 8);
    }

    // Réactive le zoom à la molette seulement quand on interagit avec la carte,
    // pour ne pas piéger le défilement de la page.
    mapEl.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
    mapEl.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
  }

  document.addEventListener("DOMContentLoaded", init);
})();
