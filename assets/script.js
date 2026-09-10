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
  function setupNumberDisplay(id, text) {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function wireContactLinks() {
    const telHref = "tel:" + (CFG.telephoneMobileLien || "");
    const smsHref = "sms:" + (CFG.telephoneSmsLien || CFG.telephoneMobileLien || "");
    const h2oTelHref = "tel:" + (CFG.telephoneH2OLien || "");
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
    if (h2oLabel && CFG.telephoneH2OAffiche) h2oLabel.textContent = CFG.telephoneH2OAffiche;

    const headerLabel = document.getElementById("header-call-label");
    if (headerLabel && CFG.telephoneMobileAffiche) headerLabel.textContent = CFG.telephoneMobileAffiche;

    const messengerEl = document.getElementById("channel-messenger");
    if (messengerEl && CFG.messengerUsername) {
      messengerEl.href = /^https?:\/\//i.test(CFG.messengerUsername)
        ? CFG.messengerUsername
        : "https://m.me/" + CFG.messengerUsername;
    }

    const footerPhone = document.getElementById("footer-phone");
    if (footerPhone) footerPhone.textContent = CFG.telephoneMobileAffiche || "";
    const footerEmail = document.getElementById("footer-email");
    if (footerEmail) footerEmail.textContent = CFG.courriel || "";

    setupNumberDisplay("channel-call-number", CFG.telephoneMobileAffiche);
    setupNumberDisplay("channel-sms-number", CFG.telephoneSmsAffiche || CFG.telephoneMobileAffiche);
    setupNumberDisplay("channel-h2o-number", CFG.telephoneH2OAffiche);

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* =========================================================
     ZONE — état et logique partagés entre la section de la page
     et la fenêtre d'accueil (première visite)
     ========================================================= */
  const Zone = {
    flat: [], // { municipality, mrc, region } — ton secteur
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
    const centroidNames = Object.keys(Zone.centroids);
    const matchName =
      centroidNames.find((n) => normalize(n) === query) ||
      centroidNames.find((n) => normalize(n).includes(query) || query.includes(normalize(n)));
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
    let hit = Zone.flat.find((z) => normalize(z.municipality) === query);
    if (hit) return { level: "municipality", ...hit };

    hit = Zone.flat.find((z) => normalize(z.municipality).includes(query) || query.includes(normalize(z.municipality)));
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
          ? `Bonne nouvelle : <strong>${label}</strong> fait partie de mon secteur — tu es au bon endroit!`
          : `Bonne nouvelle : <strong>${label}</strong> fait partie de mon secteur. <a href="#contact">Envoie-moi ta demande</a> ou <a href="tel:${CFG.telephoneMobileLien || ""}">appelle directement</a>.`,
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

  function renderSuggestionsInto(datalistEl) {
    if (!datalistEl) return;
    const names = new Set();
    Zone.flat.forEach((z) => names.add(z.municipality));
    Object.keys(Zone.centroids).forEach((n) => names.add(n));
    datalistEl.innerHTML = Array.from(names)
      .sort((a, b) => a.localeCompare(b, "fr"))
      .map((n) => `<option value="${n}"></option>`)
      .join("");
  }

  /* ---------- Section « Est-ce que je couvre ta région? » ---------- */
  function setupZoneChecker() {
    const input = document.getElementById("zone-input");
    const button = document.getElementById("zone-submit");
    const result = document.getElementById("zone-result");
    const suggestions = document.getElementById("zone-suggestions");
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
        renderSuggestionsInto(suggestions);
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
  const VISITOR_CITY_KEY = "bl_visitor_city";

  function showVisitorBadge() {
    const city = localStorage.getItem(VISITOR_CITY_KEY);
    const badge = document.getElementById("visitor-badge");
    const cityEl = document.getElementById("visitor-city");
    if (city && badge && cityEl) {
      cityEl.textContent = city;
      badge.hidden = false;
    }
  }

  function setupEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;

    const VISITED_KEY = "bl_visited_v1";
    if (localStorage.getItem(VISITED_KEY)) return;

    const card = gate.querySelector(".entry-gate-card");
    const input = document.getElementById("gate-input");
    const button = document.getElementById("gate-submit");
    const result = document.getElementById("gate-result");
    const suggestions = document.getElementById("gate-suggestions");
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
      const remember = document.getElementById("gate-remember");
      if (remember && remember.checked) {
        localStorage.setItem(VISITED_KEY, "1");
      }
    }

    loadZoneData().then(() => renderSuggestionsInto(suggestions));

    function check() {
      const typed = input.value.trim();
      const r = evaluateQuery(typed, { simple: true });
      if (!r) return;
      result.classList.remove("yes", "no");
      result.innerHTML = r.html;
      result.classList.add(r.ok ? "yes" : "no", "show");
      if (continueBtn) continueBtn.hidden = false;

      // Retient la ville indiquée (seulement si le visiteur a écrit quelque chose)
      // pour la réafficher ailleurs sur le site — jamais si le champ est resté vide.
      if (typed) {
        localStorage.setItem(VISITOR_CITY_KEY, typed);
        showVisitorBadge();
      }

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
      if (chatStatus) chatStatus.textContent = "Pose ta question en direct via notre service de clavardage.";
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
    const email = CFG.formsubmitEmail || CFG.courriel;
    if (email) {
      form.action = `https://formsubmit.co/${email}`;
    }
    const hiddenFields = {
      _subject: "Nouvelle demande — benoitlaprise.com",
      _template: "table",
      _captcha: "false"
    };
    Object.entries(hiddenFields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
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

    // Champs texte "virgule-séparée" affichés comme une liste de badges (ex. équipements).
    document.querySelectorAll("[data-c-list]").forEach((el) => {
      const val = getPath(data, el.dataset.cList);
      if (val === undefined || val === null) return;
      const items = val.split(",").map((s) => s.trim()).filter(Boolean);
      el.innerHTML = items.map((item) => `<span class="pill">${item}</span>`).join("");
    });
  }

  function applyTheme(themeId, themes) {
    const theme = (themes || []).find((t) => t.id === themeId) || (themes || [])[0];
    if (!theme) return;
    const root = document.documentElement.style;
    Object.entries(theme.vars || {}).forEach(([name, value]) => root.setProperty(name, value));
    if (theme.serif) root.setProperty("--serif", theme.serif);
    if (theme.sans) root.setProperty("--sans", theme.sans);
  }

  function setupContent() {
    fetch("/api/content")
      .then((res) => res.json())
      .then((data) => {
        applyContent(data);
        return fetch("assets/data/themes.json")
          .then((res) => res.json())
          .then((themeData) => applyTheme(data.activeTheme, themeData.themes))
          .catch(() => {});
      })
      .catch(() => {
        console.error("Impossible de charger /api/content");
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupZoneChecker();
    setupEntryGate();
    setupContent();
    showVisitorBadge();

    fetch("/api/contact")
      .then((res) => res.json())
      .then((data) => {
        Object.assign(CFG, data);
        wireContactLinks();
        setupChat();
        setupForm();
      })
      .catch(() => {
        console.error("Impossible de charger /api/contact");
      });
  });
})();
