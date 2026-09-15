(function () {
  const CFG = {}; // rempli après le chargement de assets/contact.json

  /* ---------- Normalisation (pour comparer sans accents/majuscules) ---------- */
  function normalize(str) {
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  }

  // Développe les abréviations courantes de noms de municipalités québécoises
  // (ex. "St-Rémi" -> "saint-remi") pour que la recherche/auto-complétion
  // retrouve le bon nom même écrit en abrégé.
  function expandAbbreviations(normalized) {
    return normalized
      .replace(/\bste\b/g, "sainte")
      .replace(/\bst\b/g, "saint")
      .replace(/\bmtl\b/g, "montreal")
      .replace(/\bqc\b/g, "quebec");
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ---------- Remplir les liens de contact à partir de contact.json ---------- */
  /* ---------- Format standardisé des numéros : 1 (819) 823-6343 ---------- */
  function phoneDigits(raw) {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits[0] === "1") return digits.slice(1);
    if (digits.length === 10) return digits;
    return null;
  }
  function phoneHref(raw) {
    const d = phoneDigits(raw);
    return d ? "+1" + d : (raw || "").replace(/\s+/g, "");
  }
  function phoneDisplay(raw) {
    const d = phoneDigits(raw);
    if (!d) return raw || ""; // format non reconnu : on affiche tel quel plutôt que rien
    return `1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function setupNumberDisplay(id, text) {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  /* ---------- Bouton et panneau d'urgence (service à la clientèle H2O) ---------- */
  function setupUrgence(cfg) {
    const panel = document.getElementById("urgence-panel");
    if (!panel) return;
    const closeBtn = document.getElementById("urgence-close");
    const urgence = cfg.urgence || {};

    const callEl = document.getElementById("urgence-call");
    const callNumEl = document.getElementById("urgence-call-number");
    if (callEl && urgence.telLien) {
      callEl.href = "tel:" + phoneHref(urgence.telLien);
      if (callNumEl) callNumEl.textContent = phoneDisplay(urgence.telLien);
    }
    const smsEl = document.getElementById("urgence-sms");
    const smsNumEl = document.getElementById("urgence-sms-number");
    if (smsEl && urgence.smsLien) {
      smsEl.href = "sms:" + phoneHref(urgence.smsLien);
      if (smsNumEl) smsNumEl.textContent = phoneDisplay(urgence.smsLien);
    }
    const emailEl = document.getElementById("urgence-email");
    const emailLabelEl = document.getElementById("urgence-email-label");
    if (emailEl && urgence.courriel) {
      emailEl.href = "mailto:" + urgence.courriel;
      if (emailLabelEl) emailLabelEl.textContent = urgence.courriel;
    }

    function open() {
      panel.hidden = false;
      document.body.classList.add("gate-open");
    }
    function close() {
      panel.hidden = true;
      document.body.classList.remove("gate-open");
    }

    document.querySelectorAll("[data-urgence-trigger]").forEach((btn) => {
      btn.addEventListener("click", open);
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    panel.addEventListener("click", (e) => {
      if (e.target === panel) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) close();
    });
  }

  /* ---------- Modal Rendez-vous ---------- */
  function setupRendezVous() {
    const panel = document.getElementById("rdv-panel");
    if (!panel) return;
    const closeBtn = document.getElementById("rdv-close");
    const form = document.getElementById("rdv-form");
    const submitBtn = document.getElementById("rdv-submit");
    const status = document.getElementById("rdv-status");

    loadZoneData().then(() =>
      setupCityAutocomplete(document.getElementById("rdv-ville"), document.getElementById("rdv-ville-autocomplete"), getAllCityNames)
    );

    const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

    let horaire = null;
    let busy = [];
    let dataLoaded = false;
    let viewMonth = new Date();
    viewMonth.setDate(1);
    let selectedDate = null;

    const monthLabel = document.getElementById("rdv-cal-month");
    const gridEl = document.getElementById("rdv-cal-grid");
    const slotsEl = document.getElementById("rdv-slots");
    const infoEl = document.getElementById("rdv-selected-info");
    const dateInput = document.getElementById("rdv-date");
    const heureInput = document.getElementById("rdv-heure");
    const prevBtn = document.getElementById("rdv-cal-prev");
    const nextBtn = document.getElementById("rdv-cal-next");

    function toIso(d) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function dayConfig(date) {
      if (!horaire || !horaire.joursTravail) return null;
      return horaire.joursTravail[JOURS[date.getDay()]] || null;
    }

    function isDateAvailable(date, iso) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return false;
      const cfg = dayConfig(date);
      if (!cfg || !cfg.actif) return false;
      if ((horaire.datesBloquees || []).includes(iso)) return false;
      return true;
    }

    function renderCalendar() {
      if (!gridEl || !monthLabel) return;
      monthLabel.textContent = MOIS[viewMonth.getMonth()] + " " + viewMonth.getFullYear();

      const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
      const startOffset = firstDay.getDay(); // 0=dimanche
      const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

      gridEl.innerHTML = "";
      for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement("span");
        empty.className = "rdv-cal-day rdv-cal-day-empty";
        gridEl.appendChild(empty);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
        const iso = toIso(date);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rdv-cal-day";
        btn.textContent = String(day);

        if (!horaire || !dataLoaded) {
          btn.disabled = true;
        } else if (!isDateAvailable(date, iso)) {
          btn.classList.add("rdv-cal-day-disabled");
          btn.disabled = true;
        } else {
          btn.addEventListener("click", () => selectDate(iso, btn));
        }
        if (iso === selectedDate) btn.classList.add("rdv-cal-day-selected");
        gridEl.appendChild(btn);
      }
    }

    function selectDate(iso, btnEl) {
      selectedDate = iso;
      dateInput.value = iso;
      heureInput.value = "";
      gridEl.querySelectorAll(".rdv-cal-day-selected").forEach((el) => el.classList.remove("rdv-cal-day-selected"));
      if (btnEl) btnEl.classList.add("rdv-cal-day-selected");
      renderSlots(iso);
    }

    function renderSlots(iso) {
      if (!slotsEl) return;
      const date = new Date(iso + "T00:00:00");
      const cfg = dayConfig(date);
      slotsEl.innerHTML = "";
      if (!cfg || !cfg.actif) return;

      const dureeMin = Number(horaire.dureeCreneauMinutes) || 60;
      const [hDeb, mDeb] = cfg.debut.split(":").map(Number);
      const [hFin, mFin] = cfg.fin.split(":").map(Number);
      let cursor = hDeb * 60 + mDeb;
      const fin = hFin * 60 + mFin;

      const blocked = new Set(
        (horaire.creneauxBloques || []).filter((c) => c.date === iso).map((c) => c.heure)
      );
      const busySet = new Set(busy.filter((b) => b.date === iso).map((b) => b.heure));

      let any = false;
      while (cursor + dureeMin <= fin) {
        const h = String(Math.floor(cursor / 60)).padStart(2, "0");
        const m = String(cursor % 60).padStart(2, "0");
        const heureStr = `${h}:${m}`;
        if (!blocked.has(heureStr) && !busySet.has(heureStr)) {
          any = true;
          const b = document.createElement("button");
          b.type = "button";
          b.className = "rdv-slot-btn";
          b.textContent = heureStr;
          b.addEventListener("click", () => {
            heureInput.value = heureStr;
            slotsEl.querySelectorAll(".rdv-slot-btn").forEach((el) => el.classList.remove("selected"));
            b.classList.add("selected");
            if (infoEl) infoEl.textContent = `Rendez-vous demandé : ${iso} à ${heureStr}`;
          });
          slotsEl.appendChild(b);
        }
        cursor += dureeMin;
      }
      if (!any && infoEl) infoEl.textContent = "Aucun créneau disponible ce jour-là — choisis une autre date.";
    }

    async function loadScheduleData() {
      try {
        const [hRes, bRes] = await Promise.all([
          fetch("/api/horaire").then((r) => r.json()),
          fetch("/api/appointments/busy").then((r) => r.json()),
        ]);
        horaire = hRes && hRes.joursTravail ? hRes : { joursTravail: {}, dureeCreneauMinutes: 60, datesBloquees: [], creneauxBloques: [] };
        busy = bRes || [];
        dataLoaded = true;
      } catch (e) {
        horaire = { joursTravail: {}, dureeCreneauMinutes: 60, datesBloquees: [], creneauxBloques: [] };
        busy = [];
        dataLoaded = true;
      }
      renderCalendar();
    }

    if (prevBtn) prevBtn.addEventListener("click", () => {
      viewMonth.setMonth(viewMonth.getMonth() - 1);
      renderCalendar();
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      viewMonth.setMonth(viewMonth.getMonth() + 1);
      renderCalendar();
    });

    function open() {
      panel.hidden = false;
      document.body.classList.add("gate-open");
      if (!dataLoaded) loadScheduleData();
    }
    function close() {
      panel.hidden = true;
      document.body.classList.remove("gate-open");
    }

    document.querySelectorAll("[data-rdv-trigger]").forEach((btn) => {
      btn.addEventListener("click", open);
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    panel.addEventListener("click", (e) => {
      if (e.target === panel) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) close();
    });

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!dateInput.value || !heureInput.value) {
          if (status) {
            status.className = "form-status show error";
            status.textContent = "Choisis une date et une heure dans le calendrier avant d'envoyer.";
          }
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Envoi en cours…";
        if (status) {
          status.className = "form-status";
          status.textContent = "";
        }

        const lieu = form.querySelector('input[name="rdv-lieu"]:checked')?.value || "bureau";
        const payload = {
          nom: document.getElementById("rdv-nom").value.trim(),
          erabliere: document.getElementById("rdv-erabliere").value.trim(),
          nbEntailles: document.getElementById("rdv-entailles").value.trim(),
          adresse: document.getElementById("rdv-adresse").value.trim(),
          ville: document.getElementById("rdv-ville").value.trim(),
          dejaClient: form.querySelector('input[name="rdv-deja-client"]:checked')?.value === "oui",
          lieu,
          courriel: document.getElementById("rdv-courriel").value.trim(),
          telephone: document.getElementById("rdv-tel").value.trim(),
          dateDemandee: dateInput.value,
          heureDemandee: heureInput.value,
        };

        try {
          const res = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            form.reset();
            selectedDate = null;
            dateInput.value = "";
            heureInput.value = "";
            slotsEl.innerHTML = "";
            if (infoEl) infoEl.textContent = "";
            renderCalendar();
            if (status) {
              status.textContent = "Merci! Ta demande de rendez-vous m'a été envoyée — je te confirme rapidement.";
              status.classList.add("show", "ok");
            }
          } else {
            if (status) {
              status.textContent = data.error || "L'envoi a échoué. Réessaie plus tard ou contacte-moi directement.";
              status.classList.add("show", "error");
            }
          }
        } catch (err) {
          if (status) {
            status.textContent = "Impossible de contacter le serveur. Réessaie plus tard ou contacte-moi directement.";
            status.classList.add("show", "error");
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Envoyer la demande";
        }
      });
    }
  }

  function wireContactLinks() {
    const mobileRaw = CFG.telephoneMobileLien;
    const smsRaw = CFG.telephoneSmsLien || CFG.telephoneMobileLien;
    const h2oRaw = CFG.telephoneH2OLien;

    const telHref = "tel:" + phoneHref(mobileRaw);
    const smsHref = "sms:" + phoneHref(smsRaw);
    const h2oTelHref = "tel:" + phoneHref(h2oRaw);
    const mailHref = "mailto:" + (CFG.courriel || "");

    ["header-call", "hero-call", "channel-call"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = telHref;
    });
    ["hero-sms", "channel-sms"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = smsHref;
    });
    const emailEl = document.getElementById("channel-email");
    if (emailEl) emailEl.href = mailHref;

    const h2oEl = document.getElementById("channel-h2o");
    if (h2oEl) h2oEl.href = h2oTelHref;
    const h2oLabel = document.getElementById("channel-h2o-label");
    if (h2oLabel) h2oLabel.textContent = phoneDisplay(h2oRaw);

    const headerLabel = document.getElementById("header-call-label");
    if (headerLabel) headerLabel.textContent = phoneDisplay(mobileRaw);

    const messengerEl = document.getElementById("channel-messenger");
    if (messengerEl && CFG.messengerUsername) {
      messengerEl.href = /^https?:\/\//i.test(CFG.messengerUsername)
        ? CFG.messengerUsername
        : "https://m.me/" + CFG.messengerUsername;
    }

    const footerPhone = document.getElementById("footer-phone");
    if (footerPhone) footerPhone.textContent = phoneDisplay(mobileRaw);
    const footerEmail = document.getElementById("footer-email");
    if (footerEmail) footerEmail.textContent = CFG.courriel || "";

    setupNumberDisplay("channel-call-number", phoneDisplay(mobileRaw));
    setupNumberDisplay("channel-sms-number", phoneDisplay(smsRaw));
    setupNumberDisplay("channel-h2o-number", phoneDisplay(h2oRaw));

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* =========================================================
     ZONE — état et logique partagés entre la section de la page
     et la fenêtre d'accueil (première visite)
     ========================================================= */
  const Zone = {
    flat: [], // { municipality, mrc, region } — le secteur du client
    distributeurs: [],
    centroids: {}, // toutes les municipalités/lieux du Québec (nom -> [lat, lon])
    ready: null,
  };

  function buildFlatIndex(data) {
    const out = [];
    (data.regions || []).forEach((region) => {
      (region.mrcs || []).forEach((mrc) => {
        (mrc.municipalities || []).forEach((muni) => {
          out.push({ municipality: muni, mrc: mrc.name, region: region.name });
        });
      });
    });
    return out;
  }

  function loadZoneData() {
    if (Zone.ready) return Zone.ready;
    Zone.ready = Promise.all([
      fetch("/api/zones").then((r) => r.json()),
      fetch("/api/distributeurs").then((r) => r.json()),
      fetch("assets/data/municipality-centroids.json").then((r) => r.json()),
    ]).then(([zonesData, distributeurs, centroids]) => {
      Zone.flat = buildFlatIndex(zonesData);
      Zone.distributeurs = distributeurs;
      Zone.centroids = centroids;
      return { zonesData, distributeurs, centroids };
    });
    return Zone.ready;
  }

  function findNearestDistributeur(query) {
    const expanded = expandAbbreviations(query);
    const centroidNames = Object.keys(Zone.centroids);
    const matchName =
      centroidNames.find((n) => normalize(n) === query || normalize(n) === expanded) ||
      centroidNames.find((n) => {
        const m = normalize(n);
        return m.includes(query) || query.includes(m) || m.includes(expanded) || expanded.includes(m);
      });
    if (!matchName || !Zone.distributeurs.length) return null;

    const [lat, lon] = Zone.centroids[matchName];
    let nearest = null;
    let bestDist = Infinity;
    Zone.distributeurs.forEach((d) => {
      const dist = haversineKm(lat, lon, d.lat, d.lon);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = d;
      }
    });
    return nearest;
  }

  function findMatch(query) {
    const expanded = expandAbbreviations(query);
    let hit = Zone.flat.find((z) => normalize(z.municipality) === query || normalize(z.municipality) === expanded);
    if (hit) return { level: "municipality", ...hit };

    hit = Zone.flat.find((z) => {
      const m = normalize(z.municipality);
      return m.includes(query) || query.includes(m) || m.includes(expanded) || expanded.includes(m);
    });
    if (hit) return { level: "municipality", ...hit };

    hit = Zone.flat.find((z) => normalize(z.mrc).includes(query) || query.includes(normalize(z.mrc)));
    if (hit) return { level: "mrc", ...hit };

    hit = Zone.flat.find((z) => normalize(z.region).includes(query) || query.includes(normalize(z.region)));
    if (hit) return { level: "region", ...hit };

    return null;
  }

  // Retourne { ok, html } — utilisé à la fois par la section de la page et la fenêtre d'accueil.
  function evaluateQuery(rawQuery, options) {
    const simple = options && options.simple;
    const query = normalize(rawQuery);
    if (!query) return null;

    const match = findMatch(query);
    if (match) {
      const label =
        match.level === "municipality"
          ? match.municipality
          : match.level === "mrc"
          ? `la MRC ${match.mrc}`
          : `la région ${match.region}`;
      return {
        ok: true,
        html: simple
          ? `Bonne nouvelle : <strong>${label}</strong> fait partie de mon secteur — vous êtes au bon endroit!`
          : `Bonne nouvelle : <strong>${label}</strong> fait partie de mon secteur. <a href="#contact">Envoyez-moi votre demande</a> ou <a href="tel:${CFG.telephoneMobileLien || ""}">appelle directement</a>.`,
      };
    }

    const nearest = findNearestDistributeur(query);
    if (nearest) {
      const contactBits = [
        nearest.phone ? `<a href="tel:${nearest.phone.replace(/[^\d+]/g, "")}">${nearest.phone}</a>` : "",
        nearest.email ? `<a href="mailto:${nearest.email}">${nearest.email}</a>` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        ok: false,
        html: `Cette adresse est en dehors de mon secteur, mais elle est desservie par un autre distributeur H2O Innovation : <strong>${nearest.name}</strong>${nearest.address ? ` (${nearest.address})` : ""}${contactBits ? `<br>${contactBits}` : ""}`,
      };
    }

    return {
      ok: false,
      html: `Cette adresse semble en dehors de mon secteur. Le site <a href="${CFG.contactGeneralUrl || CFG.boutiqueUrl || "#"}" target="_blank" rel="noopener">h2oinnovation.net</a> peut te diriger vers le bon représentant.`,
    };
  }

  function getAllCityNames() {
    const names = new Set();
    Zone.flat.forEach((z) => names.add(z.municipality));
    Object.keys(Zone.centroids).forEach((n) => names.add(n));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "fr"));
  }

  // Widget d'auto-complétion réutilisable : montre des suggestions cliquables
  // (même si le texte tapé est abrégé, ex. "St-" -> "Saint-"), navigable au clavier.
  function setupCityAutocomplete(inputEl, listEl, getNames, onSelect) {
    if (!inputEl || !listEl) return;
    let items = [];
    let activeIndex = -1;

    function render(query) {
      const q = normalize(query);
      if (!q) {
        listEl.innerHTML = "";
        listEl.hidden = true;
        return;
      }
      const expanded = expandAbbreviations(q);
      const scored = getNames()
        .map((n) => {
          const norm = normalize(n);
          let score = 0;
          if (norm.startsWith(q) || norm.startsWith(expanded)) score = 3;
          else if (norm.includes(q) || norm.includes(expanded)) score = 2;
          return { n, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.n.localeCompare(b.n, "fr"))
        .slice(0, 8);
      items = scored.map((x) => x.n);
      activeIndex = -1;
      if (!items.length) {
        listEl.innerHTML = "";
        listEl.hidden = true;
        return;
      }
      listEl.innerHTML = items.map((n, i) => `<div class="autocomplete-item" data-idx="${i}">${n}</div>`).join("");
      listEl.hidden = false;
      listEl.querySelectorAll(".autocomplete-item").forEach((el) => {
        el.addEventListener("mousedown", (e) => {
          e.preventDefault();
          select(Number(el.dataset.idx));
        });
      });
    }

    function select(idx) {
      if (idx < 0 || idx >= items.length) return;
      inputEl.value = items[idx];
      listEl.innerHTML = "";
      listEl.hidden = true;
      if (onSelect) onSelect(items[idx]);
    }

    function updateActive() {
      listEl.querySelectorAll(".autocomplete-item").forEach((el, i) => el.classList.toggle("active", i === activeIndex));
    }

    inputEl.addEventListener("input", () => render(inputEl.value));
    inputEl.addEventListener("focus", () => {
      if (inputEl.value) render(inputEl.value);
    });
    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        listEl.hidden = true;
      }, 150);
    });
    inputEl.addEventListener("keydown", (e) => {
      if (listEl.hidden) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActive();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive();
      } else if (e.key === "Enter") {
        if (activeIndex >= 0) {
          e.preventDefault();
          select(activeIndex);
        }
      } else if (e.key === "Escape") {
        listEl.hidden = true;
      }
    });
  }

  /* ---------- Section « Est-ce que je couvre votre région? » ---------- */
  function setupZoneChecker() {
    const input = document.getElementById("zone-input");
    const button = document.getElementById("zone-submit");
    const result = document.getElementById("zone-result");
    const suggestions = document.getElementById("zone-autocomplete");
    const listToggle = document.getElementById("zone-list-toggle");
    const listBody = document.getElementById("zone-list-body");

    if (!input || !result) return;

    function renderGroupedList(data) {
      if (!listBody) return;
      const regions = (data.regions || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
      listBody.innerHTML = regions
        .map((region) => {
          const mrcs = region.mrcs
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "fr"))
            .map((mrc) => {
              const munis = mrc.municipalities.slice().sort((a, b) => a.localeCompare(b, "fr")).join(" · ");
              return `<div class="zone-mrc"><strong>MRC ${mrc.name}</strong> — ${munis}</div>`;
            })
            .join("");
          return `<div class="zone-region"><h4>${region.name}</h4>${mrcs}</div>`;
        })
        .join("");
    }

    if (listToggle && listBody) {
      listToggle.addEventListener("click", () => {
        listBody.classList.toggle("show");
        listToggle.textContent = listBody.classList.contains("show")
          ? "Masquer la liste"
          : "Voir les régions, MRC et municipalités couvertes";
      });
    }

    loadZoneData()
      .then(({ zonesData }) => {
        setupCityAutocomplete(input, suggestions, getAllCityNames);
        renderGroupedList(zonesData);
      })
      .catch(() => {
        if (listBody) listBody.textContent = "Liste de zones indisponible pour le moment.";
      });

    function check() {
      const r = evaluateQuery(input.value);
      if (!r) return;
      result.classList.remove("yes", "no");
      result.innerHTML = r.html;
      result.classList.add(r.ok ? "yes" : "no", "show");
    }

    if (button) button.addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
  }

  /* ---------- Fenêtre d'accueil (première visite) ---------- */

  function setupEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;

    const VISITED_KEY = "bl_visited_v1";
    if (localStorage.getItem(VISITED_KEY)) return;

    const card = gate.querySelector(".entry-gate-card");
    const input = document.getElementById("gate-input");
    const button = document.getElementById("gate-submit");
    const result = document.getElementById("gate-result");
    const suggestions = document.getElementById("gate-autocomplete");
    const skipLink = document.getElementById("gate-skip");
    const closeBtn = document.getElementById("gate-close");
    const continueBtn = document.getElementById("gate-continue");

    function open() {
      gate.hidden = false;
      document.body.classList.add("gate-open");
      setTimeout(() => input && input.focus(), 50);
    }
    function close() {
      gate.hidden = true;
      document.body.classList.remove("gate-open");
      localStorage.setItem(VISITED_KEY, "1");
    }

    loadZoneData().then(() => setupCityAutocomplete(input, suggestions, getAllCityNames));

    function check() {
      const typed = input.value.trim();
      const r = evaluateQuery(typed, { simple: true });
      if (!r) return;
      result.classList.remove("yes", "no");
      result.innerHTML = r.html;
      result.classList.add(r.ok ? "yes" : "no", "show");
      if (continueBtn) continueBtn.hidden = false;

      // Reflète aussi la recherche dans la section plus bas sur la page, pour la cohérence.
      const mainInput = document.getElementById("zone-input");
      const mainButton = document.getElementById("zone-submit");
      if (mainInput && mainButton) {
        mainInput.value = input.value;
        mainButton.click();
      }
    }

    if (button) button.addEventListener("click", check);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") check();
      });
    }
    if (skipLink) skipLink.addEventListener("click", (e) => { e.preventDefault(); close(); });
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (continueBtn) continueBtn.addEventListener("click", close);

    // Clic sur le fond sombre (en dehors de la carte) = fermer.
    gate.addEventListener("click", (e) => {
      if (e.target === gate) close();
    });
    // Touche Échap = fermer, peu importe où se trouve le focus.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !gate.hidden) close();
    });

    open();
  }

  /* ---------- Clavardage en direct (Chatwoot, ou lien direct alternatif) ---------- */
  function setupChat() {
    const chatButton = document.getElementById("channel-chat");
    const chatFallback = document.getElementById("chat-fallback");
    const chatStatus = document.getElementById("chat-status");
    const chat = CFG.chatLive || {};

    if (chat.actif && chat.chatwootBaseUrl && chat.chatwootWebsiteToken) {
      let chatwootReady = false;

      function fallbackToSms() {
        if (chatwootReady) return;
        if (chatStatus) chatStatus.textContent = "Le clavardage n'a pas pu se charger (probablement bloqué par une extension) — écris-moi par texto à la place.";
        if (chatButton) chatButton.textContent = "Texter";
      }

      const openChatwoot = () => {
        if (window.$chatwoot && chatwootReady) {
          window.$chatwoot.toggle();
        } else {
          window.location.href = "sms:" + (CFG.telephoneSmsLien || CFG.telephoneMobileLien || "");
        }
      };
      if (chatButton) chatButton.addEventListener("click", openChatwoot);
      if (chatFallback) chatFallback.addEventListener("click", openChatwoot);

      // On cache la bulle par défaut de Chatwoot pour n'afficher que la nôtre.
      window.chatwootSettings = {
        hideMessageBubble: true,
        position: "right",
        locale: "fr",
        type: "standard",
      };

      const baseUrl = chat.chatwootBaseUrl.replace(/\/$/, "");
      const s1 = document.createElement("script");
      s1.src = baseUrl + "/packs/js/sdk.js";
      s1.defer = true;
      s1.async = true;
      s1.onerror = fallbackToSms;
      s1.onload = function () {
        window.chatwootSDK.run({
          websiteToken: chat.chatwootWebsiteToken,
          baseUrl: baseUrl,
        });
      };
      document.body.appendChild(s1);

      window.addEventListener("chatwoot:ready", function () {
        chatwootReady = true;
        if (chatFallback) chatFallback.classList.add("show");
      });

      setTimeout(fallbackToSms, 4000);
    } else if (chat.lienDirect) {
      if (chatStatus) chatStatus.textContent = "Posez votre question en direct via notre service de clavardage.";
      if (chatButton) {
        chatButton.addEventListener("click", () => {
          window.open(chat.lienDirect, "_blank", "noopener");
        });
      }
    } else {
      if (chatStatus) chatStatus.textContent = "Clavardage bientôt disponible — en attendant, écris-moi par texto.";
      if (chatButton) {
        chatButton.textContent = "Texter";
        chatButton.addEventListener("click", () => {
          window.location.href = "sms:" + (CFG.telephoneSmsLien || CFG.telephoneMobileLien || "");
        });
      }
    }
  }

  /* ---------- Formulaire (FormSubmit, sans serveur requis) ---------- */
  function setupForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const submitBtn = document.getElementById("contact-submit");
    const status = document.getElementById("form-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Envoi en cours…";
      }
      if (status) {
        status.className = "form-status";
        status.textContent = "";
      }

      const payload = {
        name: document.getElementById("f-name").value.trim(),
        erabliere: document.getElementById("f-erabliere").value.trim(),
        ville: document.getElementById("f-ville").value.trim(),
        tel: document.getElementById("f-tel").value.trim(),
        courriel: document.getElementById("f-courriel").value.trim(),
        message: document.getElementById("f-message").value.trim(),
      };

      try {
        const res = await fetch("/api/contact-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          form.reset();
          if (status) {
            status.textContent = "Merci! Ta demande m'a été envoyée, je te réponds dès que possible.";
            status.classList.add("show", "ok");
          }
        } else {
          if (status) {
            status.textContent = data.error || "L'envoi a échoué. Réessaie plus tard ou contacte-moi directement.";
            status.classList.add("show", "error");
          }
        }
      } catch (e) {
        if (status) {
          status.textContent = "Impossible de contacter le serveur. Réessaie plus tard ou contacte-moi directement.";
          status.classList.add("show", "error");
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Envoyer";
        }
      }
    });
  }

  /* ---------- Contenu éditable des sections + thème ---------- */
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  function applyContent(data) {
    document.querySelectorAll("[data-c]").forEach((el) => {
      const val = getPath(data, el.dataset.c);
      if (val === undefined || val === null) return;
      if (el.hasAttribute("data-c-html")) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    // Texte de substitution (placeholder) éditable pour les champs de saisie.
    document.querySelectorAll("[data-c-placeholder]").forEach((el) => {
      const val = getPath(data, el.dataset.cPlaceholder);
      if (val !== undefined && val !== null) el.setAttribute("placeholder", val);
    });

    // Liste de badges cliquables (ex. équipements -> catégories du site h2oinnovation.net).
    document.querySelectorAll("[data-c-links]").forEach((el) => {
      const items = getPath(data, el.dataset.cLinks);
      if (!Array.isArray(items)) return;
      el.innerHTML = items
        .map((item) =>
          item.url
            ? `<a class="pill" href="${item.url}" target="_blank" rel="noopener">${item.label}</a>`
            : `<span class="pill">${item.label}</span>`
        )
        .join("");
    });
  }

  function applyTheme(themeId, themes) {
    const theme = (themes || []).find((t) => t.id === themeId) || (themes || [])[0];
    if (!theme) return;
    const root = document.documentElement.style;
    Object.entries(theme.vars || {}).forEach(([name, value]) => root.setProperty(name, value));
    if (theme.serif) root.setProperty("--serif", theme.serif);
    if (theme.sans) root.setProperty("--sans", theme.sans);
    document.documentElement.classList.toggle("theme-neon", theme.id === "neon-cyberacericole");
    document.documentElement.classList.toggle("theme-marine", theme.id === "marine-profond");
    try {
      localStorage.setItem("bl_cached_theme", JSON.stringify(theme));
    } catch (e) {}
  }

  function setupThemePicker(themes, currentUserThemeId) {
    const picker = document.getElementById("theme-picker");
    const tab = document.getElementById("theme-picker-tab");
    const listEl = document.getElementById("theme-picker-list");
    const resetBtn = document.getElementById("theme-picker-reset");
    if (!picker || !tab || !listEl) return;
    if (listEl.dataset.built) return; // évite de reconstruire si setupContent est rappelé
    listEl.dataset.built = "1";

    listEl.innerHTML = themes
      .map((t) => {
        const swatch = t.vars["--spruce-950"] || t.vars["--birch-050"] || "#ccc";
        const accent = t.vars["--amber-600"] || "#1E9BFF";
        const active = t.id === currentUserThemeId;
        return `
          <button type="button" class="theme-picker-swatch${active ? " active" : ""}" data-theme-id="${t.id}">
            <span class="theme-picker-dot" style="background:${swatch}; border-color:${accent};"></span>
            <span>${t.name}</span>
          </button>
        `;
      })
      .join("");

    tab.addEventListener("click", () => {
      picker.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (picker.classList.contains("open") && !picker.contains(e.target)) {
        picker.classList.remove("open");
      }
    });

    listEl.querySelectorAll(".theme-picker-swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.themeId;
        try {
          localStorage.setItem(USER_THEME_KEY, themeId);
        } catch (e) {}
        applyTheme(themeId, themes);
        listEl.querySelectorAll(".theme-picker-swatch").forEach((b) => b.classList.toggle("active", b === btn));
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        try {
          localStorage.removeItem(USER_THEME_KEY);
        } catch (e) {}
        location.reload();
      });
    }
  }

  const USER_THEME_KEY = "bl_user_theme";

  function applyOgTags(data) {
    const setMeta = (id, value) => {
      const el = document.getElementById(id);
      if (el && value) el.setAttribute("content", value);
    };
    const pageTitle = document.title;
    const metaDescEl = document.getElementById("meta-description");
    const pageDesc = metaDescEl ? metaDescEl.getAttribute("content") : null;
    setMeta("og-title", pageTitle);
    setMeta("twitter-title", pageTitle);
    setMeta("og-description", pageDesc);
    setMeta("twitter-description", pageDesc);
    setMeta("og-url", location.href);
    const ogImage = data.site && data.site.ogImage;
    if (ogImage) {
      const absoluteUrl = ogImage.startsWith("http") ? ogImage : location.origin + ogImage;
      setMeta("og-image", absoluteUrl);
      setMeta("twitter-image", absoluteUrl);
    }
  }

  function setupContent() {
    fetch("/api/content")
      .then((res) => res.json())
      .then((data) => {
        applyContent(data);
        if (data.site && data.site.pageTitle) {
          document.title = data.site.pageTitle;
        }
        if (data.site && data.site.metaDescription) {
          const metaEl = document.getElementById("meta-description");
          if (metaEl) metaEl.setAttribute("content", data.site.metaDescription);
        }
        applyOgTags(data);
        return fetch("assets/data/themes.json")
          .then((res) => res.json())
          .then((themeData) => {
            let userTheme = null;
            try {
              userTheme = localStorage.getItem(USER_THEME_KEY);
            } catch (e) {}
            const themeIdToUse = userTheme || data.activeTheme;
            applyTheme(themeIdToUse, themeData.themes);
            setupThemePicker(themeData.themes, themeIdToUse);
          })
          .catch(() => {});
      })
      .catch(() => {
        console.error("Impossible de charger /api/content");
      });
  }

  /* ---------- Menu de navigation (hamburger) ---------- */
  /* ---------- Recherche de produits (redirige vers h2oinnovation.net) ---------- */
  function openH2oSearch(query) {
    const q = query.trim();
    if (!q) return;
    const url = "https://h2oinnovation.net/int_fr/catalogsearch/result/?q=" + encodeURIComponent(q);
    window.open(url, "_blank", "noopener");
  }

  /* ---------- Nouvelles et Événements / Tutoriels ---------- */
  function setupPosts() {
    const modal = document.getElementById("post-modal");
    if (!modal) return;
    const closeBtn = document.getElementById("post-modal-close");
    const modalImg = document.getElementById("post-modal-img");
    const modalDate = document.getElementById("post-modal-date");
    const modalTitle = document.getElementById("post-modal-title");
    const modalBody = document.getElementById("post-modal-body");
    const modalFile = document.getElementById("post-modal-file");

    function openModal(post) {
      if (post.image_url) {
        modalImg.src = post.image_url;
        modalImg.hidden = false;
      } else {
        modalImg.hidden = true;
      }
      modalDate.textContent = formatPostDate(post.date_publication);
      const modalCategory = document.getElementById("post-modal-category");
      if (modalCategory) modalCategory.innerHTML = categoryBadgeHtml(post);
      modalTitle.textContent = post.titre;
      if (post.contenu) {
        modalBody.innerHTML = post.contenu;
        // Le contenu collé depuis Facebook (et d'autres sites) traîne avec lui des
        // classes et des propriétés de style (ex. height:16px sur un span vide) qui
        // forcent de l'espace — on retire seulement celles qui causent l'espacement
        // forcé, en gardant les couleurs/alignement choisis volontairement dans l'éditeur.
        const spacingProps = [
          "height", "min-height", "max-height",
          "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
          "margin", "margin-top", "margin-bottom", "margin-inline",
          "line-height", "white-space",
        ];
        modalBody.querySelectorAll("*").forEach((el) => {
          spacingProps.forEach((prop) => el.style.removeProperty(prop));
          el.removeAttribute("class");
        });
        modalBody.querySelectorAll("div, p, span").forEach((el) => {
          const text = el.textContent.replace(/\u00a0/g, "").trim();
          if (!text && !el.querySelector("img, table")) el.remove();
        });
        modalBody.querySelectorAll("a[href]").forEach((a) => {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener");
        });
      } else {
        modalBody.textContent = post.resume || "";
      }
      const modalGallery = document.getElementById("post-modal-gallery");
      if (modalGallery) {
        const images = Array.isArray(post.images) ? post.images : [];
        modalGallery.innerHTML = images
          .map((url, i) => `<button type="button" class="post-gallery-open" data-idx="${i}"><img src="${url}" alt="" loading="lazy"></button>`)
          .join("");
        modalGallery.hidden = images.length === 0;
        modalGallery.querySelectorAll(".post-gallery-open").forEach((btn) => {
          btn.addEventListener("click", () => openLightbox(images, Number(btn.dataset.idx)));
        });
      }
      if (modalFile) {
        if (post.fichier_url) {
          modalFile.href = post.fichier_url;
          modalFile.textContent = "Télécharger" + (post.fichier_nom ? " — " + post.fichier_nom : "");
          modalFile.hidden = false;
        } else {
          modalFile.hidden = true;
        }
      }
      setupShareButtons(post);
      const url = new URL(location.href);
      url.searchParams.set("post", post.id);
      history.pushState({ postId: post.id }, "", url);
      modal.hidden = false;
      document.body.classList.add("gate-open");
    }
    function closeModal(skipHistory) {
      modal.hidden = true;
      document.body.classList.remove("gate-open");
      if (!skipHistory) {
        const url = new URL(location.href);
        if (url.searchParams.has("post")) {
          url.searchParams.delete("post");
          history.pushState({}, "", url);
        }
      }
    }
    window.addEventListener("popstate", () => {
      if (!modal.hidden) closeModal(true);
    });

    function setupShareButtons(post) {
      const shareEl = document.getElementById("post-share");
      if (!shareEl) return;
      const shareUrl = new URL(location.href);
      shareUrl.searchParams.set("post", post.id);
      const url = shareUrl.toString();
      const title = post.titre;
      shareEl.querySelectorAll(".post-share-btn").forEach((btn) => {
        btn.onclick = () => {
          const type = btn.dataset.share;
          if (type === "facebook") {
            window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank", "noopener,width=600,height=500");
          } else if (type === "twitter") {
            window.open("https://twitter.com/intent/tweet?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(title), "_blank", "noopener,width=600,height=500");
          } else if (type === "linkedin") {
            window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url), "_blank", "noopener,width=600,height=500");
          } else if (type === "email") {
            window.location.href = "mailto:?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(url);
          } else if (type === "copy") {
            const done = () => {
              const original = btn.textContent;
              btn.textContent = "✓";
              setTimeout(() => { btn.textContent = original; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(done).catch(() => {});
            }
          }
        };
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", () => closeModal());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    const lightbox = document.getElementById("post-lightbox");
    const lightboxImg = document.getElementById("post-lightbox-img");
    const lightboxClose = document.getElementById("post-lightbox-close");
    const lightboxPrev = document.getElementById("post-lightbox-prev");
    const lightboxNext = document.getElementById("post-lightbox-next");
    let lightboxImages = [];
    let lightboxIndex = 0;

    function showLightboxImage() {
      if (lightboxImg) lightboxImg.src = lightboxImages[lightboxIndex];
      const multiple = lightboxImages.length > 1;
      if (lightboxPrev) lightboxPrev.hidden = !multiple;
      if (lightboxNext) lightboxNext.hidden = !multiple;
    }
    function openLightbox(images, index) {
      if (!lightbox || !images.length) return;
      lightboxImages = images;
      lightboxIndex = index;
      showLightboxImage();
      lightbox.hidden = false;
    }
    function closeLightbox() {
      if (lightbox) lightbox.hidden = true;
    }
    function lightboxStep(delta) {
      if (!lightboxImages.length) return;
      lightboxIndex = (lightboxIndex + delta + lightboxImages.length) % lightboxImages.length;
      showLightboxImage();
    }
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", () => lightboxStep(-1));
    if (lightboxNext) lightboxNext.addEventListener("click", () => lightboxStep(1));
    if (lightbox) {
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (!lightbox || lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") lightboxStep(-1);
      else if (e.key === "ArrowRight") lightboxStep(1);
    });

    function formatPostDate(d) {
      if (!d) return "";
      const [y, m, day] = d.toString().slice(0, 10).split("-").map(Number);
      const date = new Date(y, m - 1, day);
      return date.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
    }

    const CATEGORY_PALETTE = [
      "#1E9BFF", "#E8792E", "#2E9E5B", "#8B4FD1", "#D64550",
      "#0E9AA7", "#C9962C", "#B0479A", "#4A7FBF", "#5A9E2F",
    ];

    function categoryColor(nom) {
      let hash = 0;
      for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
      return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
    }

    function categoryBadgeHtml(p) {
      if (!p.categorie) return "";
      return `<span class="post-category-badge" style="background:${categoryColor(p.categorie)}">${p.categorie}</span>`;
    }

    function fileButtonHtml(p) {
      if (!p.fichier_url) return "";
      return `<a class="post-card-file" href="${p.fichier_url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">⬇ Télécharger${p.fichier_nom ? " — " + p.fichier_nom : ""}</a>`;
    }

    function cardHtml(p, i) {
      return `
        <article class="post-card">
          ${p.image_url ? `<img class="post-card-img post-card-img-clickable" src="${p.image_url}" alt="" loading="lazy" data-idx="${i}">` : ""}
          <div class="post-card-body">
            <div class="post-card-meta">
              <span class="post-card-date">${formatPostDate(p.date_publication)}</span>
              ${categoryBadgeHtml(p)}
            </div>
            <h3 class="post-card-title">${p.titre}</h3>
            ${p.resume ? `<p class="post-card-resume">${p.resume}</p>` : ""}
            ${fileButtonHtml(p)}
            <button class="post-card-more" type="button" data-idx="${i}">Lire plus</button>
          </div>
        </article>
      `;
    }

    function tableHtml(posts) {
      return `
        <table class="posts-table">
          <thead><tr><th>Date</th><th>Titre</th><th>Catégorie</th><th></th></tr></thead>
          <tbody>
            ${posts
              .map(
                (p, i) => `
              <tr class="posts-table-row" data-idx="${i}">
                <td>${formatPostDate(p.date_publication)}</td>
                <td>${p.titre}</td>
                <td>${categoryBadgeHtml(p) || "—"}</td>
                <td>${p.fichier_url ? fileButtonHtml(p) : ""}<button class="post-card-more" type="button" data-idx="${i}">Lire plus</button></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    function posterHtml(posts) {
      return posts
        .map(
          (p, i) => `
        <article class="post-poster">
          ${p.image_url ? `<img class="post-poster-img" src="${p.image_url}" alt="" loading="lazy">` : ""}
          <div class="post-poster-overlay">
            <div class="post-card-meta">
              <span class="post-card-date">${formatPostDate(p.date_publication)}</span>
              ${categoryBadgeHtml(p)}
            </div>
            <h3 class="post-poster-title">${p.titre}</h3>
            <button class="post-card-more post-poster-btn" type="button" data-idx="${i}">Lire plus</button>
          </div>
        </article>
      `
        )
        .join("");
    }

    function renderPostsList(containerEl, emptyEl, posts, mode, condensed) {
      if (!containerEl) return;
      containerEl.classList.remove("posts-grid", "posts-table-wrap", "posts-poster-list", "posts-condensed");
      if (!posts.length) {
        containerEl.innerHTML = "";
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = true;
      if (condensed) containerEl.classList.add("posts-condensed");

      if (mode === "tableau") {
        containerEl.classList.add("posts-table-wrap");
        containerEl.innerHTML = tableHtml(posts);
        containerEl.querySelectorAll(".posts-table-row, .post-card-more").forEach((el) => {
          el.addEventListener("click", () => openModal(posts[Number(el.dataset.idx)]));
        });
      } else if (mode === "affiche") {
        containerEl.classList.add("posts-poster-list");
        containerEl.innerHTML = posterHtml(posts);
        containerEl.querySelectorAll(".post-card-more").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal(posts[Number(btn.dataset.idx)]);
          });
        });
        containerEl.querySelectorAll(".post-poster").forEach((el, i) => {
          el.addEventListener("click", () => openModal(posts[i]));
        });
      } else {
        containerEl.classList.add("posts-grid");
        containerEl.innerHTML = posts.map((p, i) => cardHtml(p, i)).join("");
        containerEl.querySelectorAll(".post-card-more, .post-card-img-clickable").forEach((el) => {
          el.addEventListener("click", () => openModal(posts[Number(el.dataset.idx)]));
        });
      }
    }

    const VIEW_MODE_KEY = "bl_posts_view_mode";

    function loadType(type, gridId, emptyId, featuredId, filterId, contentKey, toggleId) {
      const gridEl = document.getElementById(gridId);
      const emptyEl = document.getElementById(emptyId);
      const featuredEl = document.getElementById(featuredId);
      const filterEl = document.getElementById(filterId);
      const toggleEl = document.getElementById(toggleId);
      let allPosts = [];
      let mode = "grille";
      let defaultMode = "grille";
      let currentCategory = "";

      function applyFilter(categorie) {
        currentCategory = categorie;
        const filtered = categorie ? allPosts.filter((p) => p.categorie === categorie) : allPosts;
        renderPostsList(gridEl, emptyEl, filtered, mode, false);
      }

      function setMode(newMode, save) {
        mode = newMode;
        if (save) {
          try { localStorage.setItem(VIEW_MODE_KEY, newMode); } catch (e) {}
        }
        if (toggleEl) {
          toggleEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.mode === newMode));
        }
        applyFilter(currentCategory);
      }

      if (toggleEl) {
        toggleEl.querySelectorAll("button").forEach((btn) => {
          btn.addEventListener("click", () => setMode(btn.dataset.mode, true));
        });
      }

      function renderFilters(categories) {
        if (!filterEl || !categories.length) return;
        filterEl.hidden = false;
        filterEl.innerHTML =
          `<button type="button" class="posts-filter-pill active" data-cat="">Toutes</button>` +
          categories.map((c) => `<button type="button" class="posts-filter-pill" data-cat="${c.nom}">${c.nom}</button>`).join("");
        filterEl.querySelectorAll(".posts-filter-pill").forEach((btn) => {
          btn.addEventListener("click", () => {
            filterEl.querySelectorAll(".posts-filter-pill").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            applyFilter(btn.dataset.cat);
          });
        });
      }

      Promise.all([
        fetch("/api/posts?type=" + encodeURIComponent(type)).then((r) => r.json()),
        fetch("/api/categories?type=" + encodeURIComponent(type)).then((r) => r.json()),
        fetch("/api/content").then((r) => r.json()),
      ])
        .then(([posts, categories, content]) => {
          allPosts = posts || [];
          defaultMode = (content && content[contentKey] && content[contentKey].affichage) || "grille";
          let savedMode = null;
          try { savedMode = localStorage.getItem(VIEW_MODE_KEY); } catch (e) {}
          mode = savedMode || defaultMode;
          if (toggleEl) {
            toggleEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
          }
          renderPostsList(gridEl, emptyEl, allPosts, mode, false);
          renderPostsList(featuredEl, null, allPosts.slice(0, 3), mode, true);
          renderFilters(categories || []);

          const params = new URLSearchParams(location.search);
          const wantedId = params.get("post");
          if (wantedId) {
            const wanted = allPosts.find((p) => String(p.id) === wantedId);
            if (wanted) openModal(wanted);
          }
        })
        .catch(() => {});
    }

    loadType("nouvelle", "nouvelles-full-grid", "nouvelles-full-empty", "nouvelles-featured", "nouvelles-filter", "nouvelles", "nouvelles-view-toggle");
    loadType("tutoriel", "tutoriels-full-grid", "tutoriels-full-empty", "tutoriels-featured", "tutoriels-filter", "tutoriels", "tutoriels-view-toggle");
    loadType("manuel", "manuels-full-grid", "manuels-full-empty", "manuels-featured", "manuels-filter", "manuels", "manuels-view-toggle");
    loadType("fiche", "fiches-full-grid", "fiches-full-empty", "fiches-featured", "fiches-filter", "fiches", "fiches-view-toggle");
  }

  function setupProductSearch() {
    [
      ["product-search-form", "product-search-input"],
      ["nav-product-search-form", "nav-product-search-input"],
    ].forEach(([formId, inputId]) => {
      const form = document.getElementById(formId);
      const input = document.getElementById(inputId);
      if (!form || !input) return;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        openH2oSearch(input.value);
      });
    });
  }

  /* ---------- Particules animées derrière la feuille d'érable (hero) ---------- */
  function setupLeafParticles() {
    const container = document.getElementById("leaf-particles");
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const COUNT = 22;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("div");
      p.className = "leaf-particle";
      const size = (Math.random() * 3 + 2).toFixed(1); // 2–5px
      const x = (Math.random() * 100).toFixed(1); // % horizontal
      const duration = (Math.random() * 4 + 5).toFixed(1); // 5–9s
      const delay = (Math.random() * -9).toFixed(1); // décalage négatif = déjà en vol au chargement
      const drift = (Math.random() * 60 - 30).toFixed(0); // dérive latérale -30 à 30px
      const rise = -(Math.random() * 120 + 260).toFixed(0); // hauteur de montée
      const tail = (Math.random() * 16 + 10).toFixed(0); // longueur de la traînée
      p.style.setProperty("--size", size + "px");
      p.style.setProperty("--x", x + "%");
      p.style.setProperty("--duration", duration + "s");
      p.style.setProperty("--delay", delay + "s");
      p.style.setProperty("--drift", drift + "px");
      p.style.setProperty("--rise", rise + "px");
      p.style.setProperty("--tail", tail + "px");
      container.appendChild(p);
    }
  }

  /* ---------- Surligne le lien du menu correspondant à la page/section actuelle ---------- */
  function setupNavActiveState() {
    const nav = document.getElementById("site-nav");
    if (!nav) return;

    const navLinks = Array.from(nav.querySelectorAll("a[href]"));
    const dropdownToggles = Array.from(nav.querySelectorAll(".site-nav-dropdown-toggle"));

    function clearActive() {
      navLinks.forEach((a) => a.classList.remove("active"));
      dropdownToggles.forEach((t) => t.classList.remove("active"));
    }

    function setActiveLink(link) {
      if (!link) return;
      clearActive();
      link.classList.add("active");
      const dropdown = link.closest(".site-nav-item-dropdown");
      if (dropdown) {
        const toggle = dropdown.querySelector(".site-nav-dropdown-toggle");
        if (toggle) toggle.classList.add("active");
      }
    }

    const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const isHome = currentPage === "" || currentPage === "index.html";

    // Sur les pages secondaires (nouvelles.html, tutoriels.html, etc.) : simple
    // correspondance par nom de fichier, pas de suivi au défilement.
    if (!isHome) {
      const match = navLinks.find((a) => {
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#")) return false;
        const hrefPage = href.split("#")[0].split("/").pop().toLowerCase();
        return hrefPage === currentPage;
      });
      if (match) setActiveLink(match);
      return;
    }

    // Sur la page d'accueil : suit la section visible au défilement.
    const sectionLinkMap = {};
    navLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#") && href.length > 1) sectionLinkMap[href.slice(1)] = a;
    });

    const sections = Object.keys(sectionLinkMap)
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    // Défaut : "Accueil" actif tant qu'on n'a pas défilé vers une autre section.
    setActiveLink(sectionLinkMap["home"]);

    const observer = new IntersectionObserver(
      (entries) => {
        let best = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
            best = entry;
          }
        });
        if (best) setActiveLink(sectionLinkMap[best.target.id]);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => observer.observe(s));
  }

  function setupNav() {
    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    const dropdowns = Array.from(document.querySelectorAll(".site-nav-item-dropdown"));

    function closeAllDropdowns() {
      dropdowns.forEach((d) => {
        d.classList.remove("open");
        const t = d.querySelector(".site-nav-dropdown-toggle");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }

    function open() {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      nav.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      closeAllDropdowns();
    }

    toggle.addEventListener("click", () => {
      if (nav.hidden) open();
      else close();
    });

    // Chaque bouton "▾" ouvre/ferme seulement son propre sous-menu — il ne ferme
    // jamais tout le menu (ce sont des <button>, pas des <a>, donc la délégation
    // ci-dessous ne les referme pas non plus).
    dropdowns.forEach((dropdown) => {
      const dToggle = dropdown.querySelector(".site-nav-dropdown-toggle");
      if (!dToggle) return;
      dToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !dropdown.classList.contains("open");
        closeAllDropdowns();
        if (willOpen) {
          dropdown.classList.add("open");
          dToggle.setAttribute("aria-expanded", "true");
        }
      });
    });

    // Un clic sur un vrai lien ou une action (rendez-vous, urgence, sous-lien produit…) referme tout le menu.
    nav.addEventListener("click", (e) => {
      if (
        e.target.closest("a") ||
        e.target.closest(".site-nav-submenu-btn") ||
        e.target.closest(".site-nav-urgence") ||
        e.target.closest(".site-nav-rdv-trigger")
      ) {
        close();
      }
    });

    document.addEventListener("click", (e) => {
      if (!nav.hidden && !nav.contains(e.target) && !toggle.contains(e.target)) {
        close();
      } else {
        dropdowns.forEach((d) => {
          if (!d.contains(e.target)) {
            d.classList.remove("open");
            const t = d.querySelector(".site-nav-dropdown-toggle");
            if (t) t.setAttribute("aria-expanded", "false");
          }
        });
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !nav.hidden) close();
    });
  }

  /* ---------- Bouton « Retour en haut » ---------- */
  function setupBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    const toggle = () => {
      btn.hidden = window.scrollY < 400;
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupZoneChecker();
    setupEntryGate();
    setupContent();
    setupNav();
    setupNavActiveState();
    setupLeafParticles();
    setupPosts();
    setupProductSearch();
    setupBackToTop();

    fetch("/api/contact")
      .then((res) => res.json())
      .then((data) => {
        Object.assign(CFG, data);
        wireContactLinks();
        setupUrgence(data);
        setupRendezVous();
        setupChat();
        setupForm();
      })
      .catch(() => {
        console.error("Impossible de charger /api/contact");
      });
  });
})();
