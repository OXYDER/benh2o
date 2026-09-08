(function () {
  const CFG = {}; // rempli après le chargement de assets/contact.json

  /* ---------- Normalisation (pour comparer sans accents/majuscules) ---------- */
  function normalize(str) {
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /* ---------- Remplir les liens de contact à partir de contact.json ---------- */
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

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Vérificateur de zone (Région > MRC > Municipalité) ---------- */
  function setupZoneChecker() {
    const input = document.getElementById("zone-input");
    const button = document.getElementById("zone-submit");
    const result = document.getElementById("zone-result");
    const suggestions = document.getElementById("zone-suggestions");
    const listToggle = document.getElementById("zone-list-toggle");
    const listBody = document.getElementById("zone-list-body");

    if (!input || !result) return;

    let flat = []; // { municipality, mrc, region }

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

    function renderSuggestions() {
      if (!suggestions) return;
      suggestions.innerHTML = flat
        .map((z) => `<option value="${z.municipality}"></option>`)
        .join("");
    }

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

    fetch("assets/zones.json")
      .then((res) => res.json())
      .then((data) => {
        flat = buildFlatIndex(data);
        renderSuggestions();
        renderGroupedList(data);
      })
      .catch(() => {
        if (listBody) listBody.textContent = "Liste de zones indisponible pour le moment.";
      });

    function findMatch(query) {
      // priorité : municipalité exacte, puis municipalité partielle, puis MRC, puis région
      let hit = flat.find((z) => normalize(z.municipality) === query);
      if (hit) return { level: "municipality", ...hit };

      hit = flat.find((z) => normalize(z.municipality).includes(query) || query.includes(normalize(z.municipality)));
      if (hit) return { level: "municipality", ...hit };

      hit = flat.find((z) => normalize(z.mrc).includes(query) || query.includes(normalize(z.mrc)));
      if (hit) return { level: "mrc", ...hit };

      hit = flat.find((z) => normalize(z.region).includes(query) || query.includes(normalize(z.region)));
      if (hit) return { level: "region", ...hit };

      return null;
    }

    function check() {
      const query = normalize(input.value);
      if (!query) return;

      const match = findMatch(query);
      result.classList.remove("yes", "no");

      if (match) {
        const label =
          match.level === "municipality"
            ? match.municipality
            : match.level === "mrc"
            ? `la MRC ${match.mrc}`
            : `la région ${match.region}`;
        result.innerHTML = `Bonne nouvelle : <strong>${label}</strong> fait partie de mon secteur. <a href="#contact">Envoie-moi ta demande</a> ou <a href="tel:${CFG.telephoneMobileLien || ""}">appelle directement</a>.`;
        result.classList.add("yes");
      } else {
        result.innerHTML = `Cette adresse semble en dehors de mon secteur. Le site <a href="${CFG.contactGeneralUrl || CFG.boutiqueUrl || "#"}" target="_blank" rel="noopener">h2oinnovation.net</a> peut te diriger vers le bon représentant.`;
        result.classList.add("no");
      }
      result.classList.add("show");
    }

    if (button) button.addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
  }

  /* ---------- Clavardage en direct (Tawk.to, ou lien direct alternatif) ---------- */
  function setupChat() {
    const chatButton = document.getElementById("channel-chat");
    const chatFallback = document.getElementById("chat-fallback");
    const chatStatus = document.getElementById("chat-status");
    const chat = CFG.chatLive || {};

    if (chat.actif && chat.propertyId && chat.widgetId) {
      const s1 = document.createElement("script");
      s1.async = true;
      s1.src = `https://embed.tawk.to/${chat.propertyId}/${chat.widgetId}`;
      s1.setAttribute("crossorigin", "*");
      document.body.appendChild(s1);

      const openTawk = () => {
        if (window.Tawk_API && window.Tawk_API.toggle) window.Tawk_API.toggle();
      };
      if (chatButton) chatButton.addEventListener("click", openTawk);
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_API.onLoad = function () {
        if (chatFallback) chatFallback.classList.add("show");
      };
      if (chatFallback) chatFallback.addEventListener("click", openTawk);
    } else if (chat.lienDirect) {
      // Un autre service de chat est utilisé : on ouvre simplement son lien.
      if (chatStatus) chatStatus.textContent = "Pose ta question en direct via notre service de clavardage.";
      if (chatButton) {
        chatButton.addEventListener("click", () => {
          window.open(chat.lienDirect, "_blank", "noopener");
        });
      }
    } else {
      // Chat pas encore configuré : on redirige vers le texto en attendant.
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

  document.addEventListener("DOMContentLoaded", () => {
    setupZoneChecker();

    fetch("assets/contact.json")
      .then((res) => res.json())
      .then((data) => {
        Object.assign(CFG, data);
        wireContactLinks();
        setupChat();
        setupForm();
      })
      .catch(() => {
        console.error("Impossible de charger assets/contact.json");
      });
  });
})();
