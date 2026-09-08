(function () {
  const CFG = window.BL_CONFIG || {};

  /* ---------- Normalisation (pour comparer sans accents/majuscules) ---------- */
  function normalize(str) {
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /* ---------- Remplir les liens de contact à partir de config.js ---------- */
  function wireContactLinks() {
    const telHref = "tel:" + (CFG.telephoneLien || "");
    const smsHref = "sms:" + (CFG.telephoneLien || "");
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

    const headerLabel = document.getElementById("header-call-label");
    if (headerLabel && CFG.telephoneAffiche) headerLabel.textContent = CFG.telephoneAffiche;

    const messengerEl = document.getElementById("channel-messenger");
    if (messengerEl && CFG.messengerUsername) {
      messengerEl.href = "https://m.me/" + CFG.messengerUsername;
    }

    const footerPhone = document.getElementById("footer-phone");
    if (footerPhone) footerPhone.textContent = CFG.telephoneAffiche || "";
    const footerEmail = document.getElementById("footer-email");
    if (footerEmail) footerEmail.textContent = CFG.courriel || "";

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Vérificateur de zone ---------- */
  function setupZoneChecker() {
    const input = document.getElementById("zone-input");
    const button = document.getElementById("zone-submit");
    const result = document.getElementById("zone-result");
    const suggestions = document.getElementById("zone-suggestions");
    const listToggle = document.getElementById("zone-list-toggle");
    const listBody = document.getElementById("zone-list-body");
    const zones = Array.isArray(CFG.zones) ? CFG.zones : [];

    if (suggestions) {
      suggestions.innerHTML = zones
        .map((z) => `<option value="${z}"></option>`)
        .join("");
    }

    if (listBody) {
      listBody.textContent = zones.slice().sort((a, b) => a.localeCompare(b, "fr")).join(" · ");
    }
    if (listToggle && listBody) {
      listToggle.addEventListener("click", () => {
        listBody.classList.toggle("show");
        listToggle.textContent = listBody.classList.contains("show")
          ? "Masquer la liste"
          : "Voir les municipalités et MRC couvertes";
      });
    }

    function check() {
      const query = normalize(input.value);
      if (!query) return;

      const match = zones.find((z) => {
        const nz = normalize(z);
        return nz === query || nz.includes(query) || query.includes(nz);
      });

      result.classList.remove("yes", "no");
      if (match) {
        result.innerHTML = `Bonne nouvelle : <strong>${match}</strong> fait partie de mon secteur. <a href="#contact">Envoie-moi ta demande</a> ou <a href="tel:${CFG.telephoneLien || ""}">appelle directement</a>.`;
        result.classList.add("yes");
      } else {
        result.innerHTML = `Cette adresse semble en dehors de mon secteur. Le site <a href="${CFG.contactGeneralUrl || CFG.boutiqueUrl || "#"}" target="_blank" rel="noopener">h2oinnovation.net</a> peut te diriger vers le bon représentant.`;
        result.classList.add("no");
      }
      result.classList.add("show");
    }

    if (button) button.addEventListener("click", check);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") check();
      });
    }
  }

  /* ---------- Clavardage en direct (Tawk.to) ---------- */
  function setupChat() {
    const chatButton = document.getElementById("channel-chat");
    const chatFallback = document.getElementById("chat-fallback");
    const chatStatus = document.getElementById("chat-status");
    const tawk = CFG.tawkTo || {};

    if (tawk.actif && tawk.propertyId && tawk.widgetId) {
      const s1 = document.createElement("script");
      s1.async = true;
      s1.src = `https://embed.tawk.to/${tawk.propertyId}/${tawk.widgetId}`;
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
    } else {
      // Chat pas encore configuré : on redirige vers le texto en attendant.
      if (chatStatus) chatStatus.textContent = "Clavardage bientôt disponible — en attendant, écris-moi par texto.";
      if (chatButton) {
        chatButton.textContent = "Texter";
        chatButton.addEventListener("click", () => {
          window.location.href = "sms:" + (CFG.telephoneLien || "");
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
    wireContactLinks();
    setupZoneChecker();
    setupChat();
    setupForm();
  });
})();
